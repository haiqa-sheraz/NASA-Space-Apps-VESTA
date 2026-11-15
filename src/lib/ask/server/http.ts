/**
 * Request handling for the Ask AI and Compare explanation functions (Netlify Functions, newer
 * format: Request in, streamed Response out). The local runner (scripts/dev-functions.ts) uses
 * the same functions. The OpenRouter key is read from the environment, never sent to the browser.
 * No path aliases here: Netlify bundles the functions on its own.
 */
import type { AskEvent } from "../types";
import { runAsk, runCompare, runSafely, type HistoryTurn, type PipelineEnv, type Send } from "./pipeline";

/** A question, plus up to two earlier questions and answers for follow-ups. */
const MAX_BODY_CHARS = 8_000;
/** Per visitor: at most 8 questions a minute (ASK_RATE_LIMIT overrides it), to protect the free model quota from scripts. */
const RATE_WINDOW_MS = 60_000;
const recent = new Map<string, number[]>();

function rateLimited(ip: string | undefined): boolean {
  if (!ip) return false;
  const max = Number(process.env.ASK_RATE_LIMIT) || 8;
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  times.push(now);
  if (recent.size > 10_000) recent.clear();
  recent.set(ip, times);
  return times.length > max;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

/** Streams the pipeline's events as newline-delimited JSON. */
function streamEvents(run: (send: Send, signal: AbortSignal) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send: Send = (event: AskEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The visitor left; nothing more to send.
        }
      };
      await runSafely(() => run(send, abort.signal), send);
      try {
        controller.close();
      } catch {
        // already closed
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text().catch(() => "");
  if (!text || text.length > MAX_BODY_CHARS) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const envFromProcess = (): PipelineEnv => ({ apiKey: process.env.OPENROUTER_API_KEY, apiUrl: process.env.OPENROUTER_API_URL || undefined });

type Context = { ip?: string } | undefined;

async function handle(req: Request, context: Context, run: (body: Record<string, unknown>, send: Send, signal: AbortSignal) => Promise<void>): Promise<Response> {
  if (req.method !== "POST") return jsonResponse(405, { error: "Use POST." });
  const ip = context?.ip ?? req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  if (rateLimited(ip)) return jsonResponse(429, { error: "Too many questions. Wait a minute and try again." });
  const body = await readBody(req);
  if (!body) return jsonResponse(400, { error: "Send a JSON body." });
  return streamEvents((send, signal) => run(body, send, signal));
}

/** POST /.netlify/functions/ask  { question, studyId?, history?: [{ question, answer }] } (the pipeline checks history) */
export function askFunction(req: Request, context?: Context): Promise<Response> {
  const env = envFromProcess();
  return handle(req, context, (body, send, signal) =>
    runAsk(
      { question: String(body.question ?? ""), studyId: typeof body.studyId === "string" ? body.studyId : null, history: body.history as HistoryTurn[] | undefined },
      env,
      send,
      signal,
    ),
  );
}

/** POST /.netlify/functions/compare  { ids: [2 or 3 study ids] } */
export function compareFunction(req: Request, context?: Context): Promise<Response> {
  const env = envFromProcess();
  return handle(req, context, (body, send, signal) => runCompare({ ids: Array.isArray(body.ids) ? (body.ids as unknown[]).map(String) : [] }, env, send, signal));
}
