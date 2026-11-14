/**
 * Site-wide facts about Vesta itself (not NASA data).
 * Values set to null are not shown anywhere until the project owner fills them in,
 * so the site never shows placeholder text.
 */
export const SITE = {
  name: "Vesta",
  tagline: "Fire bends the rules in space. Know it before it knows you.",
  description:
    "Summaries, rankings and plain-language insights from NASA's microgravity fire experiments.",
  challengeBadge: "NASA Space Apps Challenge 2026: Flame in Freefall",
  githubUrl: "https://github.com/haiqa-sheraz/NASA-Space-Apps-VESTA",
  /** Shown in the footer as "© 2026 {creatorName}". */
  creatorName: null as string | null,
  /** Open-source license name for the code, shown as "Code: {codeLicense}". Must match LICENSE. */
  codeLicense: null as string | null,
} as const;
