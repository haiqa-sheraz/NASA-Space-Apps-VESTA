/**
 * Keyword search (BM25) over the NASA passages in data/passages.json.
 * No path aliases here: Netlify bundles the functions on its own.
 */
import { stem, terms } from "./text";
import type { PassageDoc, PassagesFile } from "./types";

export interface SearchHit {
  doc: PassageDoc;
  page: number | null;
  studies: string[];
  text: string;
  score: number;
}

export interface SearchIndex {
  file: PassagesFile;
  tf: Map<string, number>[];
  length: number[];
  avgLength: number;
  df: Map<string, number>;
  /** 1, or less for passages that are only a table of contents. */
  weight: number[];
}

export interface StudyName {
  id: string;
  name: string;
}

export interface SearchOptions {
  /** The study the visitor is asking about (the Ask panel's context): its passages rank higher. */
  studyId?: string | null;
  /** Only passages from this study (used by the Compare explanation). */
  onlyStudy?: string;
  /** Study names, so a question that names a study ranks that study's passages higher. */
  studies?: StudyName[];
  limit?: number;
}

const K1 = 1.2;
const B = 0.75;
/** Words the reports use for the same thing: a question about the Moon finds "lunar" passages. */
const SYNONYMS: string[][] = [
  ["moon", "lunar"],
  ["mars", "martian"],
  ["oxygen", "o2"],
  ["round", "spherical", "sphere"],
  ["space", "microgravity"],
  ["airflow", "flow"],
  ["plastic", "pmma"],
  ["extinguish", "suppress", "suppressant", "suppression"],
].map((group) => group.map(stem)); // search compares stems ("space" is "spac")
/** Tables of contents list "Results ...... 16" without saying anything; they rank far lower. */
const TOC_WEIGHT = 0.25;
const isTableOfContents = (text: string) => (text.match(/(?:\. ?){6,}/g)?.length ?? 0) >= 3;
/**
 * "What did FLEX find?" names only the study, which matches its setup and procedure pages as well
 * as its results. For questions about findings, words that mark results add a little to the score.
 */
const FINDINGS_QUESTION = /\b(find|found|findings?|learn(ed|t)?|discover(ed|ies|y)?|results?|conclu\w*|show(ed|n)?)\b/i;
const RESULT_TERMS = ["results", "findings", "showed", "conclusions", "demonstrated", "observed", "revealed"].map(stem);
const RESULT_WEIGHT = 0.5;
/** Below this BM25 score, the best passage isn't a good enough match, and the answer is "not in our sources". */
export const MIN_SCORE = 4;
/** Passages scoring under this share of the best one are dropped. */
const RELATIVE_CUTOFF = 0.4;
const MAX_PER_DOC = 3;
export const TOP_K = 6;

export function buildIndex(file: PassagesFile): SearchIndex {
  const df = new Map<string, number>();
  const tf: Map<string, number>[] = [];
  const length: number[] = [];
  for (const p of file.passages) {
    const counts = new Map<string, number>();
    const tokens = terms(p.t);
    for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    tf.push(counts);
    length.push(tokens.length);
  }
  const avgLength = length.reduce((a, b) => a + b, 0) / Math.max(1, length.length);
  const weight = file.passages.map((p) => (isTableOfContents(p.t) ? TOC_WEIGHT : 1));
  return { file, tf, length, avgLength, df, weight };
}

const escape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

/** Studies named in the question, matched as whole names ("BASS" doesn't match "BASS-II"). */
export function studiesNamed(question: string, studies: StudyName[]): string[] {
  const q = question.toLowerCase();
  return studies.filter((s) => new RegExp(`(^|[^a-z0-9-])${escape(s.name.toLowerCase())}($|[^a-z0-9-])`).test(q)).map((s) => s.id);
}

/**
 * The best passages for a question: up to 6, at most 3 from one document and 1 from one page.
 * A passage must contain enough of the question's terms (all of them for 1 or 2 terms, half for
 * more), and the best one must score at least MIN_SCORE. Otherwise there are no hits.
 */
export function searchPassages(index: SearchIndex, question: string, options: SearchOptions = {}): SearchHit[] {
  const qTerms = [...new Set(terms(question))];
  if (!qTerms.length) return [];
  const required = qTerms.length <= 2 ? qTerms.length : Math.ceil(qTerms.length / 2);
  // Each question term matches itself or a synonym (the best one counts once).
  const groups = qTerms.map((t) => SYNONYMS.find((g) => g.includes(t)) ?? [t]);
  const extra = FINDINGS_QUESTION.test(question) ? RESULT_TERMS.filter((t) => !qTerms.includes(t)) : [];
  const named = new Set(options.studies ? studiesNamed(question, options.studies) : []);
  // A named study's own passages match its name even where the text doesn't repeat it, with the same
  // score however often it does, so the rest of the question decides which of them rank first.
  const nameTerms = new Set((options.studies ?? []).filter((s) => named.has(s.id)).flatMap((s) => terms(s.name)));
  const N = index.file.passages.length;
  const idf = (t: string) => {
    const n = index.df.get(t) ?? 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };
  const idfs = new Map([...groups.flat(), ...extra].map((t) => [t, idf(t)]));

  const scored: { i: number; score: number }[] = [];
  index.file.passages.forEach((p, i) => {
    if (options.onlyStudy && !p.s.includes(options.onlyStudy)) return;
    const counts = index.tf[i];
    const norm = K1 * (1 - B + (B * index.length[i]) / index.avgLength);
    const bm25 = (t: string) => {
      const f = counts.get(t);
      return f ? idfs.get(t)! * ((f * (K1 + 1)) / (f + norm)) : 0;
    };
    const ownStudy = named.size > 0 && p.s.some((s) => named.has(s));
    let matched = 0;
    let score = 0;
    for (const group of groups) {
      if (ownStudy && nameTerms.has(group[0])) {
        // As if the name appeared many times: the most a term can score in BM25.
        matched += 1;
        score += idfs.get(group[0])! * (K1 + 1);
        continue;
      }
      const best = Math.max(...group.map(bm25));
      if (best > 0) {
        matched += 1;
        score += best;
      }
    }
    if (matched < required) return;
    for (const t of extra) score += RESULT_WEIGHT * bm25(t);
    score *= index.weight[i];
    if (options.studyId && p.s.includes(options.studyId)) score *= 1.3;
    if (named.size && p.s.some((s) => named.has(s))) score *= 1.5;
    scored.push({ i, score });
  });

  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  const top = scored[0]?.score ?? 0;
  if (top < MIN_SCORE) return [];

  const hits: SearchHit[] = [];
  const perDoc = new Map<number, number>();
  const pages = new Set<string>();
  for (const { i, score } of scored) {
    if (score < top * RELATIVE_CUTOFF || hits.length >= (options.limit ?? TOP_K)) break;
    const p = index.file.passages[i];
    const pageKey = `${p.d}:${p.p ?? i}`;
    if (pages.has(pageKey) || (perDoc.get(p.d) ?? 0) >= MAX_PER_DOC) continue;
    pages.add(pageKey);
    perDoc.set(p.d, (perDoc.get(p.d) ?? 0) + 1);
    hits.push({ doc: index.file.docs[p.d], page: p.p, studies: p.s, text: p.t, score });
  }
  return hits;
}
