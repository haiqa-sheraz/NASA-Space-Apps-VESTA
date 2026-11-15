/**
 * Site-wide facts about Vesta itself (not NASA data).
 * A value set to null is not shown anywhere until the project owner provides it,
 * so the site never shows placeholder text.
 */
export const SITE = {
  name: "Vesta",
  tagline: "Fire bends the rules in space. Know it before it knows you.",
  description:
    "Summaries, rankings and plain-language insights from NASA's microgravity fire experiments.",
  purpose: "NASA's microgravity fire experiments, easy to find, compare and understand.",
  challengeName: "NASA Space Apps Challenge 2026: Flame in Freefall",
  /** Home hero badge. */
  heroBadge: "Built for NASA Space Apps Challenge 2026: Flame in Freefall",
  /** Shown in the footer on every page. */
  disclaimer: "Not an official NASA website.",
  whyVesta:
    "In Roman myth, Vesta guarded the hearth, the fire at the heart of every home. Vesta is also the asteroid NASA's Dawn spacecraft orbited. We're guarding the fire in the first homes beyond Earth.",
  githubUrl: "https://github.com/haiqa-sheraz/NASA-Space-Apps-VESTA",
  /** Shown in the footer as "© 2026 {creatorName}". */
  creatorName: "Haiqa Sheraz Alhassan" as string | null,
  /** Open-source license for the code, shown as "Code: {codeLicense}". Matches LICENSE. */
  codeLicense: "Apache 2.0" as string | null,
  /** The challenge page (problem statement) on spaceappschallenge.org. */
  challengeUrl: "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/" as string | null,
} as const;

/** The team, as written by the project owner (About page, "About the team"). */
export const TEAM = {
  name: "Team Neural Nebula",
  intro: "We built Vesta for the NASA Space Apps Challenge 2026, for the challenge “Flame in Freefall.”",
  members: [
    {
      name: "Haiqa Sheraz Alhassan",
      role: "Team lead and primary developer",
      bio: "AI engineer, currently pursuing a master's degree in AI and Applied Data Science. Passionate about building AI tools with NASA's open data.",
      linkedin: "https://www.linkedin.com/in/haiqa-sheraz-alhassan-630296204/",
    },
    {
      name: "Hamza Hassan",
      role: "Team member, research and analysis",
      bio: "Pursuing a bachelor's degree in Computer Science. Helped research NASA's fire experiments and analyze the data.",
      linkedin: "https://www.linkedin.com/in/hamza-ul-hassan-405a93274/",
    },
  ],
} as const;
