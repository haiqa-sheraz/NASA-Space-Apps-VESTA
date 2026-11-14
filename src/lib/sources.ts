import { SITE } from "@/lib/site";

/** A source shown as a chip: a short label, the full title, and a link when we have one. */
export interface SourceRef {
  label: string;
  title: string | null;
  url: string | null;
  page?: number | null;
}

export const ntrsUrl = (id: string) => `https://ntrs.nasa.gov/citations/${id}`;

/**
 * Links for documents the AI prep recorded without a URL, taken from the project's
 * citation list (citations_updated.docx). NASA asks for record links, not download links.
 */
const KNOWN_DOCUMENTS: { test: RegExp; label: string; url: string }[] = [
  { test: /fire detection white paper/i, label: "NTRS 20210022143", url: ntrsUrl("20210022143") },
  {
    test: /researcher'?s guide/i,
    label: "Researcher's Guide",
    url: "https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/",
  },
  { test: /sciencecasts/i, label: "NASA ScienceCasts", url: "https://www.youtube.com/watch?v=W1oXykoz9zg" },
];

/** Turns a recorded source (title plus optional URL) into a chip label and link. */
export function resolveSource(title: string, url: string | null, page?: number | null): SourceRef {
  const psi = url?.match(/investigations\/(PSI-\d+)/);
  if (psi) return { label: psi[1], title, url, page };

  const ntrs = `${url ?? ""} ${title}`.match(/(?:ntrs\.nasa\.gov\/citations\/|NTRS )(\d{11})/);
  if (ntrs) return { label: `NTRS ${ntrs[1]}`, title, url: url ?? ntrsUrl(ntrs[1]), page };

  const known = KNOWN_DOCUMENTS.find((doc) => doc.test.test(title));
  if (known) return { label: known.label, title, url: known.url, page };

  return { label: title, title, url, page };
}

export const PROBLEM_STATEMENT: SourceRef = {
  label: "Problem statement",
  title: `${SITE.challengeName} (problem statement)`,
  url: SITE.challengeUrl,
};

/** Computed from the PSI test tables by our prep code; the tables are on the Data page. */
export const PSI_TABLES: SourceRef = {
  label: "NASA PSI",
  title: "Computed from the NASA PSI test tables (see the Data page)",
  url: "/data",
};

/** Sources as written in data/ai/findings.json. */
export function findingSource(key: string): SourceRef {
  if (/computed from PSI tables/i.test(key)) return PSI_TABLES;
  return resolveSource(key, null);
}

export const EXPLORATION_ATMOSPHERE: SourceRef = {
  label: "NTRS 20150021491",
  title: "Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere (NASA, 2015)",
  url: ntrsUrl("20150021491"),
};

export const LUCI: SourceRef = {
  label: "NTRS 20250010653",
  title: "Lunar Combustion Investigation: Flammability Results from a Rotating Sounding Rocket (2025)",
  url: ntrsUrl("20250010653"),
};

export const FM2: SourceRef = {
  label: "NASA FM2",
  title: "Flammability of Materials on the Moon (FM2), NASA",
  url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/",
};

export function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = s.url ?? s.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
