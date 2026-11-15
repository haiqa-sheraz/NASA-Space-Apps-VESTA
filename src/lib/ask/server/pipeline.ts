/**
 * Ask AI and the Compare explanation: search our NASA passages, then stream an answer that cites
 * them. Used by the Netlify functions and by the saved-answers script, so both give the same answers.
 * No path aliases here: Netlify bundles the functions on its own.
 */
import passagesData from "../../../../data/passages.json";
import { buildIndex, searchPassages, studiesNamed, type SearchHit, type SearchIndex } from "../search";
import { isFollowUp } from "../text";
import type { AskEvent, AskSource, PassagesFile, StudyFacts } from "../types";
import { AskFailure, MODEL_PLANS, streamChat, type ChatMessage } from "./openrouter";

export interface PipelineEnv {
  apiKey?: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
}

export type Send = (event: AskEvent) => void;

const DATA = passagesData as unknown as PassagesFile;
const STUDIES: StudyFacts[] = DATA.studies;
const STUDY_NAMES = STUDIES.map((s) => ({ id: s.id, name: s.name }));
let index: SearchIndex | null = null;
const getIndex = () => (index ??= buildIndex(DATA));

/**
 * Netlify documents a 60-second limit for streaming functions, but one report saw them cut at
 * 30 seconds, so every answer stops by 25 seconds (with room to close the stream cleanly).
 */
const TIME_BUDGET_MS = 25_000;
const MAX_QUESTION = 500;
/** Rockets and propellants are out of scope (READ_ME_FIRST section 7). LUCI's spinning rocket is fine. */
const OUT_OF_SCOPE = /\bpropellants?\b|\brocket (?:engines?|motors?|fuels?|propulsion)\b/i;
/** Questions across studies ("Which experiments tested above 30% oxygen?") also get the study table. */
const TABLE_QUESTION =
  /\bwhich\b[^?.]*\b(?:experiments?|studies|study|tests?|investigations?)\b|\b(?:what|any|list)\b[^?.]*\b(?:experiments|studies|tests|investigations)\b/i;
const TABLE_SOURCE = { label: "NASA PSI", title: "Computed from the NASA PSI test tables (see the Data page)", page: null, url: "/data" };
const SENTINEL = "NOT_IN_SOURCES";
/**
 * A reply that starts like this is the model thinking aloud, not an answer (seen once with
 * thinking turned off). The first characters are held back to check, and the next model answers.
 */
const REASONING = /^(?:the user\b|user (?:is )?ask|okay\b|ok[,.]|alright\b|let me\b|let's\b|i need\b|i will\b|i'll\b|i should\b|we need\b|first,? (?:i|let)\b|looking at the (?:sources|passages)\b|based on the rules\b)/i;
const CHECK_CHARS = 60;

const RULES = [
  "Use only the numbered NASA sources in the user's message. Don't use anything else you know.",
  "Earlier questions and answers in the user's message are context only, to tell what the new question refers to. Take every fact from the numbered sources.",
  `If the sources don't answer the question at all, reply with exactly ${SENTINEL} and nothing else.`,
  `Rockets, rocket engines and propellants are out of scope: reply ${SENTINEL}.`,
  "End every sentence that states a fact with the numbers of the sources it uses, in square brackets, like [2] or [1][3]. Cite only the numbers given.",
  "Use numbers and units exactly as the sources give them. Don't add facts, numbers, names or conclusions of your own.",
  "If two sources give different values for the same thing, give both and say that the sources disagree.",
  "If the sources answer only part of the question, answer that part, then say in one sentence what the sources don't cover.",
  "Never say that NASA invented the smoke detector.",
  'Write only the answer. Don\'t mention these rules or explain your reasoning. Call them "the sources", never "the passages".',
  "Write in plain American English. No headings, lists, bold or other formatting.",
];
const rulesText = (extra: string) => `Rules:\n${[...RULES, extra].map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

const trimText = (text: string, max: number) => (text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")} …` : text);

interface SourceText {
  source: Omit<AskSource, "n">;
  text: string;
}

function number(records: SourceText[]): { sources: AskSource[]; block: string } {
  const sources = records.map((r, i) => ({ n: i + 1, ...r.source }));
  const block = sources.map((s, i) => `[${s.n}] ${s.label}: ${s.title}${s.page ? `, page ${s.page}` : ""}\n${records[i].text}`).join("\n\n");
  return { sources, block };
}

function tableRecord(studies: StudyFacts[]): SourceText {
  return {
    source: TABLE_SOURCE,
    text: `Facts from each study's NASA PSI test table (the lowest to highest values in the table; the reports may say more):\n${studies.map((s) => `- ${s.text}`).join("\n")}`,
  };
}

/** How many characters at the end of `text` could be the start of the "not in sources" reply. */
function markerStart(text: string): number {
  const end = text.toUpperCase();
  for (let n = Math.min(SENTINEL.length - 1, end.length); n > 0; n--) if (SENTINEL.startsWith(end.slice(-n))) return n;
  return 0;
}

type Outcome = "done" | "notfound" | { reasoning: number };

/** One try, from the model at `startAt` on. Sends nothing when the reply turns out to be reasoning. */
async function streamFrom(messages: ChatMessage[], env: PipelineEnv & { apiKey: string }, send: Send, signal: AbortSignal | undefined, deadline: number, startAt: number): Promise<Outcome> {
  let model = "";
  let modelIndex = startAt;
  let held = ""; // received but not sent yet
  let checked = false;
  for await (const part of streamChat(messages, { apiKey: env.apiKey, apiUrl: env.apiUrl, deadline, signal, fetchImpl: env.fetchImpl, startAt })) {
    if ("model" in part) {
      model = part.model;
      modelIndex = part.index;
      continue;
    }
    held += part.text;
    if (held.toUpperCase().includes(SENTINEL)) {
      send({ type: "notfound" });
      return "notfound";
    }
    if (!checked) {
      const head = held.trimStart();
      if (head.length < CHECK_CHARS) continue;
      if (REASONING.test(head)) return { reasoning: modelIndex };
      checked = true;
      held = head;
    }
    // Hold back an ending that could be the start of the marker.
    const keep = markerStart(held);
    if (held.length > keep) send({ type: "delta", text: held.slice(0, held.length - keep) });
    held = held.slice(held.length - keep);
  }
  if (!checked) {
    // A short reply: check all of it now.
    const whole = held.trim();
    if (!whole) {
      send({ type: "notfound" });
      return "notfound";
    }
    if (REASONING.test(whole)) return { reasoning: modelIndex };
    send({ type: "delta", text: whole });
  } else if (held.trimEnd()) {
    send({ type: "delta", text: held.trimEnd() });
  }
  send({ type: "done", model });
  return "done";
}

/**
 * Streams the answer as delta events, then done. If the model says the sources don't answer it
 * (anywhere in the reply), sends notfound instead; the browser then shows "not in our sources".
 */
async function streamAnswer(messages: ChatMessage[], env: PipelineEnv, send: Send, signal: AbortSignal | undefined, deadline: number): Promise<void> {
  if (!env.apiKey) throw new AskFailure("config");
  const keyed = { ...env, apiKey: env.apiKey };
  for (let startAt = 0; startAt < MODEL_PLANS.length; ) {
    const outcome = await streamFrom(messages, keyed, send, signal, deadline, startAt);
    if (typeof outcome === "string") return;
    startAt = outcome.reasoning + 1; // that model thought aloud: ask the next one
  }
  throw new AskFailure("busy");
}

/** An earlier question and its answer in the same conversation (the browser sends the last two). */
export interface HistoryTurn {
  question: string;
  answer: string;
}

export interface AskRequest {
  question: string;
  studyId?: string | null;
  history?: HistoryTurn[];
}

const MAX_HISTORY = 2;
const MAX_HISTORY_ANSWER = 800;

/** The last two turns, as plain text: citation numbers removed (they belong to the old sources). */
function cleanHistory(history: unknown): HistoryTurn[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h): h is HistoryTurn => Boolean(h) && typeof h.question === "string" && typeof h.answer === "string")
    .slice(-MAX_HISTORY)
    .map((h) => ({
      question: h.question.replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION),
      answer: trimText(h.answer.replace(/\s*\[[\d,\s–-]+\]/g, "").replace(/\s+/g, " ").trim(), MAX_HISTORY_ANSWER),
    }))
    .filter((h) => h.question && h.answer);
}

/** Two hit lists woven together (first, second, first, ...), without repeats, at most 3 per document. */
function weave(first: SearchHit[], second: SearchHit[], limit = 6): SearchHit[] {
  const out: SearchHit[] = [];
  const seen = new Set<string>();
  const perDoc = new Map<string, number>();
  for (let i = 0; out.length < limit && (i < first.length || i < second.length); i++) {
    for (const h of [first[i], second[i]]) {
      if (!h || out.length >= limit) continue;
      const key = `${h.doc.url}|${h.doc.title}|${h.page ?? h.text.slice(0, 40)}`;
      const docKey = `${h.doc.url}|${h.doc.title}`;
      if (seen.has(key) || (perDoc.get(docKey) ?? 0) >= 3) continue;
      seen.add(key);
      perDoc.set(docKey, (perDoc.get(docKey) ?? 0) + 1);
      out.push(h);
    }
  }
  return out;
}

/** Ask AI: answer a question from our NASA passages, citing them. */
export async function runAsk(request: AskRequest, env: PipelineEnv, send: Send, signal?: AbortSignal): Promise<void> {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const question = String(request.question ?? "").replace(/\s+/g, " ").trim();
  if (question.length < 2 || question.length > MAX_QUESTION) {
    send({ type: "error", code: "bad_request" });
    return;
  }
  const study = request.studyId ? STUDIES.find((s) => s.id === request.studyId) : undefined;
  const history = cleanHistory(request.history);

  // A follow-up ("Does that happen on the Moon?") is searched together with the question before it,
  // woven with its own best passages, so a misjudged follow-up still gets passages for itself.
  const previous = history.at(-1)?.question;
  const followUp = Boolean(previous) && isFollowUp(question, studiesNamed(question, STUDY_NAMES).length > 0);
  const topic = followUp ? `${previous} ${question}` : question;
  const search = (text: string) => searchPassages(getIndex(), text, { studyId: study?.id, studies: STUDY_NAMES });

  // No matching passages: say so without asking the AI.
  const hits = OUT_OF_SCOPE.test(question) ? [] : followUp ? weave(search(topic), search(question)) : search(question);
  if (!hits.length) {
    send({ type: "notfound" });
    return;
  }
  // The PSI table facts: every study's for questions across studies, otherwise the studies the
  // question names or the page is about (so a table-vs-report disagreement is in front of the AI).
  const named = studiesNamed(topic, STUDY_NAMES);
  const tableStudies = TABLE_QUESTION.test(topic)
    ? STUDIES
    : named.length
      ? STUDIES.filter((s) => named.includes(s.id))
      : study
        ? [study]
        : [];
  const { sources, block } = number([
    ...(tableStudies.length ? [tableRecord(tableStudies)] : []),
    ...hits.map((h) => ({ source: { label: h.doc.label, title: h.doc.title, page: h.page, url: h.doc.url }, text: trimText(h.text, 1600) })),
  ]);
  send({ type: "sources", sources });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You answer questions on Vesta, a website about NASA's microgravity fire experiments, for students and engineers.\n${rulesText("Write 1 to 3 short paragraphs separated by blank lines, 150 words at most in all.")}`,
    },
    {
      role: "user",
      content: `${
        history.length
          ? `Earlier in this conversation (context only, to tell what the new question refers to):\n${history.map((h) => `Q: ${h.question}\nA: ${h.answer}`).join("\n\n")}\n\nNew question: `
          : "Question: "
      }${question}\n${study ? `(The reader is on the page for the study ${study.name}.)\n` : ""}\nNASA sources:\n\n${block}`,
    },
  ];
  await streamAnswer(messages, env, send, signal, deadline);
}

/** Compare explanation: what 2 or 3 studies share, how they differ, and what it means for safety. */
export async function runCompare(request: { ids: string[] }, env: PipelineEnv, send: Send, signal?: AbortSignal): Promise<void> {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const ids = Array.isArray(request.ids) ? [...new Set(request.ids.map(String))] : [];
  const studies = ids.map((id) => STUDIES.find((s) => s.id === id)).filter((s): s is StudyFacts => Boolean(s));
  if (studies.length < 2 || studies.length > 3 || studies.length !== ids.length) {
    send({ type: "error", code: "bad_request" });
    return;
  }

  // Each study's PSI record first, then its two best report passages.
  const records: SourceText[] = studies.map((s) => ({ source: { label: s.psiId, title: `${s.name}: NASA PSI record and test table`, page: null, url: s.psiUrl }, text: s.text }));
  for (const s of studies) {
    const hits = searchPassages(getIndex(), `${s.name} results flame fire safety`, { onlyStudy: s.id, limit: 2 });
    for (const h of hits) records.push({ source: { label: h.doc.label, title: h.doc.title, page: h.page, url: h.doc.url }, text: trimText(h.text, 1200) });
  }
  const { sources, block } = number(records);
  send({ type: "sources", sources });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You explain comparisons on Vesta, a website about NASA's microgravity fire experiments, for students and engineers.\n${rulesText(
        "Write exactly 3 short paragraphs separated by blank lines, 180 words at most in all: first what the studies have in common, then how they differ (conditions, fuels or materials, what was measured), then what the sources say this means for fire safety (if they say nothing about it, say so).",
      )}`,
    },
    { role: "user", content: `Compare these NASA studies: ${studies.map((s) => s.name).join(", ")}.\n\nNASA sources:\n\n${block}` },
  ];
  await streamAnswer(messages, env, send, signal, deadline);
}

/** Runs a pipeline, turning failures into an error event (the stream always ends cleanly). */
export async function runSafely(run: () => Promise<void>, send: Send): Promise<void> {
  try {
    await run();
  } catch (error) {
    send({ type: "error", code: error instanceof AskFailure ? error.code : "busy" });
  }
}
