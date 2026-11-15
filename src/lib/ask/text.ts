/**
 * Text helpers for Ask AI, shared by the browser, the Netlify functions and the scripts.
 * No path aliases here: Netlify bundles the functions on its own.
 */

/**
 * Words that carry no meaning for search. "nasa" is in nearly every passage, so it counts as one too.
 * "same" is kept out on purpose: SAME is a study name.
 */
const STOPWORDS = new Set(
  (
    "a about above after again against all also am an and any are aren as at be because been before being below between both but by can " +
    "cannot could couldn did didn do does doesn doing don down during each few for from further had has have having he her here hers " +
    "him his how i if in into is isn it its itself just me more most my no nor not now of off on once only or other our ours out over " +
    "own she should so some such than that the their theirs them then there these they this those through to too under until up " +
    "very was wasn we were weren what when where which while who whom why will with would you your yours tell explain describe know " +
    "nasa vesta please much many get got use used using like let us show give find found"
  ).split(" "),
);

/** A light stemmer, so "flames" finds "flame" and "detection" finds "detector". */
export function stem(token: string): string {
  let t = token;
  if (t.length <= 3 || /^\d/.test(t)) return t;
  if (t.endsWith("ies") && t.length > 4) t = `${t.slice(0, -3)}y`;
  else if (t.endsWith("s") && !/(ss|us|is)$/.test(t)) t = t.slice(0, -1);
  for (const suffix of ["ation", "ions", "ion", "ings", "ing", "ers", "er", "ors", "or", "ed", "ly"]) {
    if (t.endsWith(suffix) && t.length - suffix.length >= 4) {
      t = t.slice(0, -suffix.length);
      break;
    }
  }
  if (t.endsWith("e") && t.length > 4) t = t.slice(0, -1);
  return t;
}

/** Lowercase word tokens, with subscripts read as digits ("CO₂" is "co2"). */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Search terms: words without stopwords, stemmed. */
export function terms(text: string): string[] {
  return words(text)
    .filter((w) => !STOPWORDS.has(w) && (w.length > 1 || /\d/.test(w)))
    .map(stem);
}

/** Words that point back to the question before: "Does that happen on the Moon?", "What about 30%?" */
const POINTS_BACK =
  /^(?:and|but|so|also|then|what about|how about|what else|tell me more)\b|\b(?:it|its|they|them|their|those|these)\b|\b(?:does|did|is|was|would|could|can|do|about|of|for|in|with|from) (?:that|this)\b/i;

/**
 * Whether a question only makes sense after the one before it: it points back ("that", "it",
 * "what about"), or it is too short to search on its own ("Why?", "What about 30%?").
 * A question that names a study stands on its own unless it points back.
 */
export function isFollowUp(question: string, namesAStudy: boolean): boolean {
  if (POINTS_BACK.test(question)) return true;
  if (namesAStudy) return false;
  return terms(question).length <= 1;
}

/** How a question is matched to a saved answer: case, spacing and end punctuation don't matter. */
export function questionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[’']/g, "'")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
