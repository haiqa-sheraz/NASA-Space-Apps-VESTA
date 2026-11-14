/**
 * Suggested questions for the Ask panel, by page. A fixed set (no wording that changes with the
 * mission), so every suggestion can have a saved answer in data/saved_answers.json.
 * Wording for the BASS-II study page follows the approved design where our sources can answer it.
 * No path aliases here: the saved-answers script imports this file too.
 */

export interface SuggestionContext {
  kind: "study";
  id: string;
  label: string;
  /** Ground studies have no reports in our sources, so they get the general questions. */
  ground?: boolean;
}

const GENERAL = [
  "Which experiments tested above 30% oxygen?",
  "Is there fire data in Moon gravity?",
  "What did SAME find about the station's smoke detectors?",
  "Did NASA invent the smoke detector?",
];

const STUDY_SPECIFIC: Record<string, string[]> = {
  // Two of the design's four were replaced: the BASS-II sources say nothing about a Moon base,
  // and don't give one airflow that keeps a thin sheet burning.
  "bass-ii": [
    "Why did the rod burn at lower oxygen in space?",
    "How does airflow change flame spread in space?",
    "Do materials burn more readily in space than on Earth?",
    "How does BASS-II compare to BASS?",
  ],
};

const studyQuestions = (label: string) => [`What did ${label} find?`, "Which experiments tested above 30% oxygen?", "Is there fire data in Moon gravity?"];

const PAGES: { prefix: string; questions: string[] }[] = [
  { prefix: "/planner", questions: ["What cabin air is planned for the Moon?", "Is there fire data in Moon gravity?", "Which experiments tested above 30% oxygen?"] },
  { prefix: "/explore", questions: ["Which studies burned solid materials?", "Which experiments tested above 30% oxygen?", "How does BASS-II compare to BASS?"] },
  { prefix: "/compare", questions: ["How does BASS-II compare to BASS?", "How do FLEX and FLEX-2 differ?", "Which experiments tested above 30% oxygen?"] },
  { prefix: "/insights", questions: ["What did SAME find about the station's smoke detectors?", "Is there fire data in Moon gravity?", "How did FLEX test fire suppressants?"] },
  { prefix: "/data", questions: ["Which experiments tested above 30% oxygen?", "Which studies measured smoke particles?", "What did SPICE measure?"] },
  { prefix: "/learn", questions: ["Why are flames round and blue in space?", "What is a cool flame?", "What is the smoke point?"] },
  {
    prefix: "/earth-benefits",
    questions: ["Did NASA invent the smoke detector?", "How did space research lead to lighter firefighter air tanks?", "What replaced the station's CO₂ fire extinguishers?"],
  },
];

export function suggestionsFor(args: { pathname: string; context: SuggestionContext | null }): string[] {
  const { pathname, context } = args;
  if (context?.kind === "study") {
    if (context.ground) return GENERAL;
    return STUDY_SPECIFIC[context.id] ?? studyQuestions(context.label);
  }
  return PAGES.find((p) => pathname.startsWith(p.prefix))?.questions ?? GENERAL;
}

/** Every suggested question once, with the study it is asked about (for the saved-answers script). */
export function allSuggestions(studies: { id: string; short_name: string; environment: string }[]): { question: string; studyId: string | null }[] {
  const out = new Map<string, { question: string; studyId: string | null }>();
  const add = (question: string, studyId: string | null) => {
    if (!out.has(question)) out.set(question, { question, studyId });
  };
  GENERAL.forEach((q) => add(q, null));
  PAGES.forEach((p) => p.questions.forEach((q) => add(q, null)));
  for (const s of studies) {
    if (s.environment === "ground") continue;
    (STUDY_SPECIFIC[s.id] ?? studyQuestions(s.short_name)).forEach((q) => add(q, s.id));
  }
  return [...out.values()];
}
