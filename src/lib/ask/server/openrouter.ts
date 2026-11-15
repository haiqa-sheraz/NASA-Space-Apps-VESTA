/**
 * Streams an answer from OpenRouter, falling back through the free models in order
 * (READ_ME_FIRST section 4a): Nemotron 3.5 Super VL with thinking off, then ERNIE 5.5 Flash,
 * then OpenRouter's free router. Server only (the key never reaches the browser).
 * No path aliases here: Netlify bundles the functions on its own.
 */
import type { AskErrorCode } from "../types";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ModelPlan {
  id: string;
  /** Extra request fields for this model. */
  body: Record<string, unknown>;
  /** Give up on this model if no text arrives in this time. */
  firstTextMs: number;
}

const ROUTER = "openrouter/free";

export const MODEL_PLANS: ModelPlan[] = [
  // Each model may wait this long for its first words; within the 25-second budget a slow first
  // model still leaves the next one time to answer.
  { id: "nvidia/nemotron-3.5-super-vl:free", body: { reasoning: { enabled: false }, max_tokens: 900 }, firstTextMs: 10_000 },
  // ERNIE always thinks before answering, so it gets room for that (about 8,000 tokens).
  { id: "baidu/ernie-5.5-flash-preview:free", body: { reasoning: { effort: "low", exclude: true }, max_tokens: 8000 }, firstTextMs: 10_000 },
  { id: ROUTER, body: { max_tokens: 900 }, firstTextMs: 8_000 },
];

export class AskFailure extends Error {
  constructor(public code: AskErrorCode) {
    super(code);
  }
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface StreamOptions {
  apiKey: string;
  apiUrl?: string;
  /** Time (ms since epoch) by which everything must be finished. */
  deadline: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Skip the models before this one in MODEL_PLANS (after one gave an unusable reply). */
  startAt?: number;
}

/** Daily free-model limit or no credits: every model would fail the same way, so stop at once. */
const isQuotaError = (status: number, body: string) => status === 402 || (status === 429 && /per[- ]day|daily|free-models-per-day|credits/i.test(body));

/**
 * Yields { model, index } once a model starts answering (index is its place in MODEL_PLANS), then
 * { text } pieces. Throws AskFailure("limit") for the daily limit, AskFailure("config") for a bad
 * key, and AskFailure("busy") when no model could answer in time.
 */
export async function* streamChat(messages: ChatMessage[], options: StreamOptions): AsyncGenerator<{ model: string; index: number } | { text: string }> {
  const doFetch = options.fetchImpl ?? fetch;
  for (let index = options.startAt ?? 0; index < MODEL_PLANS.length; index++) {
    const plan = MODEL_PLANS[index];
    const remaining = options.deadline - Date.now();
    if (remaining < 4_000) break;
    if (options.signal?.aborted) throw new AskFailure("busy");

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort);
    // Until the first text arrives, wait at most firstTextMs; after that, until the deadline.
    let timer = setTimeout(() => controller.abort(), Math.min(plan.firstTextMs, remaining));
    let started = false;

    try {
      const res = await doFetch(options.apiUrl ?? OPENROUTER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json", "X-Title": "Vesta" },
        body: JSON.stringify({ model: plan.id, messages, stream: true, temperature: 0.2, ...plan.body }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403) throw new AskFailure("config");
        if (isQuotaError(res.status, body)) throw new AskFailure("limit");
        continue; // 429 from a busy provider, 404 for a retired model, 5xx: try the next model
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let failedMidway = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line.startsWith("data:")) continue; // ": OPENROUTER PROCESSING" keep-alive comments
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          let chunk: { model?: string; error?: { message?: string; code?: number }; choices?: { delta?: { content?: string } }[] };
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }
          if (chunk.error) {
            if (!started && isQuotaError(chunk.error.code ?? 0, chunk.error.message ?? "")) throw new AskFailure("limit");
            failedMidway = true;
            break;
          }
          const text = chunk.choices?.[0]?.delta?.content;
          if (text) {
            if (!started) {
              started = true;
              clearTimeout(timer);
              timer = setTimeout(() => controller.abort(), Math.max(1_000, options.deadline - Date.now()));
              // The free router picks a model itself; record which one, so the answer credits it.
              yield { model: plan.id === ROUTER && typeof chunk.model === "string" && chunk.model ? chunk.model : plan.id, index };
            }
            yield { text };
          }
        }
        if (failedMidway) break;
      }
      if (started && !failedMidway) return; // a complete answer
      if (started) throw new AskFailure("busy"); // stopped partway: don't mix two models' answers
      // No text at all: try the next model.
    } catch (error) {
      if (error instanceof AskFailure) throw error;
      if (started) throw new AskFailure("busy"); // cut off partway (time limit or network)
      if (options.signal?.aborted) throw new AskFailure("busy");
      // Timed out before any text, or a network error: try the next model.
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      // Ends the request if we stopped reading early (for example, the "not in sources" reply).
      controller.abort();
    }
  }
  throw new AskFailure("busy");
}
