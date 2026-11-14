/**
 * Shared types for Ask AI and the Compare explanation (browser, Netlify functions and scripts).
 * No path aliases here: Netlify bundles the functions on its own.
 */

/** A source the answer may cite as [n]. */
export interface AskSource {
  n: number;
  /** Chip label, e.g. "PSI-25" or "NTRS 20160000593". */
  label: string;
  title: string;
  /** Page in the PDF, or null for web pages and table records. */
  page: number | null;
  url: string;
}

export type AskErrorCode = "limit" | "busy" | "rate" | "config" | "bad_request";

/** One line of the newline-delimited JSON stream the functions send back. */
export type AskEvent =
  | { type: "sources"; sources: AskSource[] }
  | { type: "delta"; text: string }
  | { type: "notfound" }
  | { type: "done"; model: string }
  | { type: "error"; code: AskErrorCode };

/** data/saved_answers.json: suggested questions answered once by the same pipeline. */
export interface SavedAnswer {
  question: string;
  /** The study page the question is suggested on, used as search context (null elsewhere). */
  studyId: string | null;
  /** Answer text with [n] citations, or null when the question isn't in our sources. */
  answer: string | null;
  notFound: boolean;
  sources: AskSource[];
  model: string | null;
  generated: string;
}

export interface SavedAnswersFile {
  generated: string | null;
  answers: SavedAnswer[];
}

/** data/passages.json: NASA text passages for search, built by scripts/build-passages.ts. */
export interface PassageDoc {
  title: string;
  label: string;
  url: string;
  /** "report", "paper", "poster", "scan", "web" or "transcript". */
  kind: string;
}

export interface PassageRecord {
  /** Index into docs. */
  d: number;
  /** PDF page, or null for web pages and transcripts. */
  p: number | null;
  /** Study ids the document belongs to. */
  s: string[];
  /** The passage text. */
  t: string;
}

/** One study's facts from its PSI test table, in a sentence or two, for Ask AI and Compare. */
export interface StudyFacts {
  id: string;
  name: string;
  psiId: string;
  psiUrl: string;
  text: string;
}

export interface PassagesFile {
  generated: string;
  note: string;
  docs: PassageDoc[];
  passages: PassageRecord[];
  studies: StudyFacts[];
}

/** Readable names for the models, for the "Answered by" line. */
export const MODEL_NAMES: Record<string, string> = {
  "nvidia/nemotron-3.5-super-vl:free": "Nemotron 3.5 Super VL",
  "baidu/ernie-5.5-flash-preview:free": "ERNIE 5.5 Flash",
  "openrouter/free": "OpenRouter free model",
};

export const modelName = (id: string | null) => (id ? (MODEL_NAMES[id] ?? id) : "");
