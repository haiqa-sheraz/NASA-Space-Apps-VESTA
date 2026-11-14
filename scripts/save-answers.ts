/**
 * Runs every suggested question (src/lib/ask/suggestions.ts) through the same Ask AI pipeline
 * once, and saves the results to data/saved_answers.json: question, answer, sources and model.
 * The site shows these at once, with no AI call, and when the AI is busy or out of free questions.
 *
 * Run from the project root (Bun reads OPENROUTER_API_KEY from .env):
 *   bun run save-answers                 answer the questions not saved yet (at most 40 AI requests)
 *   bun run save-answers -- --max 10     at most 10 AI requests this run
 *   bun run save-answers -- --force      answer every question again
 *   bun run save-answers -- --list       only list the questions and whether each is saved
 *
 * Resumable: questions already saved are skipped, so a run stopped by the daily limit can go on
 * the next day. The free OpenRouter plan allows 50 requests a day, failed ones included.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runAsk, runSafely } from "../src/lib/ask/server/pipeline";
import { allSuggestions } from "../src/lib/ask/suggestions";
import { questionKey } from "../src/lib/ask/text";
import type { AskErrorCode, AskEvent, AskSource, SavedAnswer, SavedAnswersFile } from "../src/lib/ask/types";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "data", "saved_answers.json");
const studies: { id: string; short_name: string; environment: string }[] = JSON.parse(readFileSync(join(ROOT, "data", "studies.json"), "utf-8"));

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const maxIndex = args.indexOf("--max");
const maxCalls = maxIndex >= 0 ? Number(args[maxIndex + 1]) : 40;
if (!Number.isFinite(maxCalls) || maxCalls < 0) throw new Error("--max needs a number, like --max 10.");

const file: SavedAnswersFile = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf-8")) : { generated: null, answers: [] };
const byKey = new Map(file.answers.map((a) => [questionKey(a.question), a]));
const questions = allSuggestions(studies);

if (flag("--list")) {
  for (const q of questions) console.log(`${byKey.has(questionKey(q.question)) ? "saved   " : "missing "} ${q.question}${q.studyId ? `  (${q.studyId})` : ""}`);
  console.log(`\n${questions.filter((q) => byKey.has(questionKey(q.question))).length} of ${questions.length} saved.`);
  process.exit(0);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error("Set OPENROUTER_API_KEY in .env first.");
  process.exit(1);
}

const save = () => {
  const order = new Map(questions.map((q, i) => [questionKey(q.question), i]));
  const answers = [...byKey.values()].sort((a, b) => (order.get(questionKey(a.question)) ?? 999) - (order.get(questionKey(b.question)) ?? 999));
  writeFileSync(OUT, `${JSON.stringify({ generated: new Date().toISOString(), answers }, null, 2)}\n`);
};

// Every request to OpenRouter counts against the daily limit, failed ones and fallbacks included.
let calls = 0;
const countingFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  calls += 1;
  return fetch(input, init);
}) as typeof fetch;
const env = { apiKey: process.env.OPENROUTER_API_KEY, apiUrl: process.env.OPENROUTER_API_URL || undefined, fetchImpl: countingFetch };
let saved = 0;
let stoppedFor: AskErrorCode | null = null;

for (const { question, studyId } of questions) {
  const key = questionKey(question);
  if (byKey.has(key) && !flag("--force")) continue;
  if (calls >= maxCalls) {
    console.log(`Reached --max ${maxCalls} AI requests; run again to continue.`);
    break;
  }

  let text = "";
  let sources: AskSource[] = [];
  let model: string | null = null;
  // Set inside the callback below, so TypeScript must not narrow it to its first value.
  let outcome = "busy" as "done" | "notfound" | AskErrorCode;
  const send = (event: AskEvent) => {
    if (event.type === "sources") sources = event.sources;
    else if (event.type === "delta") text += event.text;
    else if (event.type === "done") {
      model = event.model;
      outcome = "done";
    } else if (event.type === "notfound") outcome = "notfound";
    else if (event.type === "error") outcome = event.code;
  };
  // runSafely turns failures (daily limit, bad key, busy) into an error event, as on the site.
  await runSafely(() => runAsk({ question, studyId }, env, send), send);
  const usedAi = sources.length > 0;

  if (outcome === "done" || outcome === "notfound") {
    const record: SavedAnswer = {
      question,
      studyId,
      answer: outcome === "done" ? text.trim() : null,
      notFound: outcome === "notfound",
      sources: outcome === "done" ? sources : [],
      model: outcome === "done" ? model : null,
      generated: new Date().toISOString(),
    };
    byKey.set(key, record);
    saved += 1;
    save();
    console.log(`${outcome === "done" ? "saved   " : "not in sources"}  ${question}${usedAi ? `  (${model ?? "AI said not in sources"})` : "  (no AI call)"}`);
  } else {
    console.log(`failed (${outcome})  ${question}`);
    if (outcome === "limit" || outcome === "config") {
      stoppedFor = outcome;
      break;
    }
  }
  // Free models allow about 20 requests a minute; keep well under that.
  if (usedAi) await new Promise((r) => setTimeout(r, 3500));
}

const total = questions.filter((q) => byKey.has(questionKey(q.question))).length;
console.log(`\nSaved ${saved} this run (${calls} AI requests). ${total} of ${questions.length} suggested questions now have saved answers.`);
if (stoppedFor === "limit") console.log("Stopped: the daily free limit was reached. Run again tomorrow to finish.");
if (stoppedFor === "config") console.log("Stopped: the OpenRouter key was refused. Check OPENROUTER_API_KEY in .env.");
