/**
 * Browser side of Ask AI and the Compare explanation: reads the functions' streamed events,
 * loads the saved answers, and splits an answer into paragraphs with their citations.
 */
import { questionKey } from "./text";
import type { AskErrorCode, AskEvent, AskSource, SavedAnswer, SavedAnswersFile } from "./types";

/** POSTs to a function and calls onEvent for each streamed event. Always ends with a final event. */
export async function streamApi(path: string, body: unknown, onEvent: (event: AskEvent) => void, signal: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (error) {
    if (signal.aborted) throw error;
    onEvent({ type: "error", code: "busy" });
    return;
  }
  if (!res.ok || !res.body) {
    const code: AskErrorCode = res.status === 429 ? "rate" : res.status === 400 || res.status === 413 ? "bad_request" : "busy";
    onEvent({ type: "error", code });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  const handleLine = (line: string) => {
    if (!line.trim()) return;
    let event: AskEvent;
    try {
      event = JSON.parse(line) as AskEvent;
    } catch {
      return;
    }
    if (event.type === "done" || event.type === "notfound" || event.type === "error") finished = true;
    onEvent(event);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      handleLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  handleLine(buffer + decoder.decode());
  // The connection ended without a final event: the answer was cut off.
  if (!finished) onEvent({ type: "error", code: "busy" });
}

let savedAnswers: Promise<Map<string, SavedAnswer>> | null = null;

/** The saved answers (data/saved_answers.json), loaded the first time Ask needs them. */
export function loadSavedAnswers(): Promise<Map<string, SavedAnswer>> {
  savedAnswers ??= import("../../../data/saved_answers.json")
    .then((mod) => {
      const file = (mod.default ?? mod) as unknown as SavedAnswersFile;
      return new Map(file.answers.map((a) => [questionKey(a.question), a] as const));
    })
    .catch(() => new Map<string, SavedAnswer>());
  return savedAnswers;
}

export interface AnswerParagraph {
  text: string;
  /** Source numbers cited in this paragraph, in order, only ones that exist. */
  cites: number[];
}

const CITATION = /\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g;

/**
 * Splits an answer into paragraphs, takes the [n] citations out of the text and lists them per
 * paragraph. While the answer is still streaming, a half-written citation at the end is hidden.
 */
export function splitAnswer(answer: string, sourceCount: number, streaming = false): AnswerParagraph[] {
  let text = answer.replace(/\*\*|__/g, "");
  if (streaming) text = text.replace(/\s*\[[\d,\s–-]*$/, "");
  return text
    .split(/\n+/)
    .map((p) => p.replace(/^\s*[-*•]\s+/, "").trim())
    .filter(Boolean)
    .map((p) => {
      const cites: number[] = [];
      for (const match of p.matchAll(CITATION)) {
        for (const part of match[1].split(/\s*,\s*/)) {
          const span = part.split(/\s*[–-]\s*/).map(Number);
          const [a, b] = span.length === 2 ? span : [span[0], span[0]];
          for (let n = a; n <= Math.min(b, a + 6); n++) if (n >= 1 && n <= sourceCount && !cites.includes(n)) cites.push(n);
        }
      }
      const clean = p
        .replace(CITATION, "")
        .replace(/\s+([.,;:!?])/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trim();
      return { text: clean, cites };
    })
    .filter((p) => p.text);
}

/** The sources an answer cites, in the order first cited; all of them if it cites none. */
export function citedSources(paragraphs: AnswerParagraph[], sources: AskSource[]): AskSource[] {
  const order: number[] = [];
  for (const p of paragraphs) for (const n of p.cites) if (!order.includes(n)) order.push(n);
  if (!order.length) return sources;
  return order.map((n) => sources[n - 1]).filter((s): s is AskSource => Boolean(s));
}
