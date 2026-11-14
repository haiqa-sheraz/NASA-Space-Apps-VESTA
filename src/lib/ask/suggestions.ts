import type { AskContextInfo } from "@/lib/state/ask";

/**
 * Suggested questions for the Ask panel, by page. Kept to a small fixed set so each one
 * can have a saved answer (READ_ME_FIRST section 5: saved answers for suggested questions).
 * Wording for the BASS-II study page is copied from the approved design.
 */
const GENERAL = [
  "Which experiments tested above 30% oxygen?",
  "Is there fire data in Moon gravity?",
  "What did SAME find about the station's smoke detectors?",
  "Did NASA invent the smoke detector?",
];

const STUDY_SPECIFIC: Record<string, (missionInSentence: string) => string[]> = {
  "bass-ii": (mission) => [
    "Why did the rod burn at lower oxygen in space?",
    "What airflow keeps a thin plastic sheet burning?",
    `What does BASS-II mean for ${mission}?`,
    "How does BASS-II compare to BASS?",
  ],
};

export function suggestionsFor(args: {
  pathname: string;
  context: AskContextInfo | null;
  missionInSentence: string;
}): string[] {
  const { pathname, context, missionInSentence } = args;

  if (context?.kind === "study") {
    const specific = STUDY_SPECIFIC[context.id];
    if (specific) return specific(missionInSentence);
    return [
      `What did ${context.label} find?`,
      `How was ${context.label} run?`,
      `What does ${context.label} mean for ${missionInSentence}?`,
    ];
  }

  if (pathname.startsWith("/planner")) {
    return [
      `Which studies best match ${missionInSentence}?`,
      "Is there fire data in Moon gravity?",
      "Which experiments tested above 30% oxygen?",
    ];
  }
  if (pathname.startsWith("/explore")) {
    return [
      "Which studies burned solid materials?",
      "Which experiments tested above 30% oxygen?",
      "How does BASS-II compare to BASS?",
    ];
  }
  if (pathname.startsWith("/compare")) {
    return [
      "How does BASS-II compare to BASS?",
      "How do FLEX and FLEX-2 differ?",
      "Which experiments tested above 30% oxygen?",
    ];
  }
  if (pathname.startsWith("/insights")) {
    return [
      "What did SAME find about the station's smoke detectors?",
      "Is there fire data in Moon gravity?",
      "How did FLEX test putting fires out?",
    ];
  }
  if (pathname.startsWith("/data")) {
    return [
      "Which experiments tested above 30% oxygen?",
      "Which studies measured smoke particles?",
      "What did SPICE measure?",
    ];
  }
  if (pathname.startsWith("/learn")) {
    return [
      "Why are flames round and blue in space?",
      "What is a cool flame?",
      "What is the smoke point?",
    ];
  }
  if (pathname.startsWith("/earth-benefits")) {
    return [
      "Did NASA invent the smoke detector?",
      "How did space research lead to lighter firefighter air tanks?",
      "What replaced the station's CO₂ fire extinguishers?",
    ];
  }
  return GENERAL;
}
