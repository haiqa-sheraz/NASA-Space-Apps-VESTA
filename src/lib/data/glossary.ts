import "server-only";
import { sentenceCase } from "@/lib/format";
import { getStudies, getStudyProfiles } from "./server";

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface StudyGlossaryTerm extends GlossaryTerm {
  studies: { id: string; shortName: string }[];
}

/** The core terms, with the approved design's definitions. */
export const CORE_TERMS: GlossaryTerm[] = [
  { term: "Microgravity", definition: "Very weak apparent gravity, as in orbit. Things float, and hot air doesn't rise." },
  { term: "Flammability limit", definition: "The edge of the conditions, such as oxygen level or airflow, where a material can keep burning." },
  { term: "Opposed flow", definition: "Air moving against the direction the flame is spreading." },
  { term: "Concurrent flow", definition: "Air moving in the same direction the flame is spreading." },
  { term: "Cool flame", definition: "A faint, low-temperature flame that can keep burning after the visible flame goes out." },
  { term: "Soot", definition: "Tiny carbon particles made by a flame. They glow yellow and become smoke." },
  { term: "Smoke point", definition: "The largest flame that can burn without giving off soot as smoke." },
];

/** Study terms that repeat a core term in other words (opposed and concurrent flow are core terms). */
const COVERED_BY_CORE = new Set(["opposed vs concurrent flow", "concurrent flame spread", "opposed flame spread"]);
/** Different spellings of the same term. */
const SAME_AS: Record<string, string> = { sibal: "sibal cloth" };

const keyOf = (term: string) => {
  const k = term
    .replace(/\s*\(.*?\)\s*/g, " ")
    .trim()
    .toLowerCase()
    .replace(/co-flow/g, "coflow")
    .replace(/\s+/g, " ");
  return SAME_AS[k] ?? k;
};

const finish = (text: string) => {
  const t = sentenceCase(text.trim());
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

/**
 * More terms, from the glossaries in the AI study profiles (AI-written). Each term keeps the first
 * definition found and links to every study that uses it. Core terms are not repeated.
 */
export function getStudyGlossary(): StudyGlossaryTerm[] {
  const names = new Map(getStudies().map((s) => [s.id, s.short_name]));
  const core = new Set(CORE_TERMS.map((t) => keyOf(t.term)));
  const terms = new Map<string, StudyGlossaryTerm>();
  for (const file of getStudyProfiles()) {
    for (const entry of file.profile.glossary ?? []) {
      if (!entry.term?.trim() || !entry.definition?.trim()) continue;
      const key = keyOf(entry.term);
      if (core.has(key) || COVERED_BY_CORE.has(key)) continue;
      const study = { id: file.study_id, shortName: names.get(file.study_id) ?? file.study_id };
      const found = terms.get(key);
      if (found) {
        if (!found.studies.some((s) => s.id === study.id)) found.studies.push(study);
      } else {
        terms.set(key, { term: sentenceCase(entry.term.trim()), definition: finish(entry.definition), studies: [study] });
      }
    }
  }
  return [...terms.values()].sort((a, b) => a.term.localeCompare(b.term, "en-US", { sensitivity: "base" }));
}
