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
 * citation list (citations_updated.docx). NASA asks for record links, not download links;
 * a download link is used only where the citation list has no record page.
 * `title` replaces a recorded title that is only a file name.
 */
const KNOWN_DOCUMENTS: { test: RegExp; label: string; url: string; title?: string }[] = [
  { test: /fire detection white paper/i, label: "NTRS 20210022143", url: ntrsUrl("20210022143") },
  {
    // The 2015 guide is cited by page, so it links to the PDF those pages are in.
    test: /researcher'?s guide to iss combustion science/i,
    label: "Researcher's Guide",
    url: "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
  },
  {
    test: /researcher'?s guide/i,
    label: "Researcher's Guide",
    url: "https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/",
  },
  { test: /sciencecasts/i, label: "NASA ScienceCasts", url: "https://www.youtube.com/watch?v=W1oXykoz9zg" },
  {
    test: /multi-parameter aerosol scattering sensor/i,
    label: "NASA T2: MPASS",
    url: "https://technology.nasa.gov/patent/LEW-TOPS-19",
    title: "Multi-Parameter Aerosol Scattering Sensor (NASA Technology Transfer portal)",
  },
  {
    test: /PV2009_6536/i,
    label: "AIAA 2009-6536",
    url: "https://spinoff.nasa.gov/pdf/PV2009_6536.pdf",
    title: "NASA Technologies and Emergency First Responders (AIAA 2009-6536, NASA Spinoff)",
  },
  {
    test: /spaceship storage tanks/i,
    label: "NASA Spinoff: tanks",
    url: "https://www.nasa.gov/technology/tech-transfer-spinoffs/spaceship-storage-tanks-take-off-on-earth/",
    title: "Spaceship Storage Tanks Take Off on Earth (NASA Spinoff)",
  },
  {
    test: /studying combustion and fire safety/i,
    label: "NASA: combustion research",
    url: "https://www.nasa.gov/missions/station/iss-research/studying-combustion-and-fire-safety/",
    title: "Studying Combustion and Fire Safety (NASA)",
  },
  {
    test: /zero-leak valve/i,
    label: "Spinoff 2020: valve",
    url: "https://spinoff.nasa.gov/node/11065",
    title: "Zero-Leak Valve Holds Tight in Demanding Environments (NASA Spinoff, 2020)",
  },
  {
    test: /spinoff: fire detector/i,
    label: "Spinoff 1978: detector",
    url: "https://spinoff.nasa.gov/node/9407",
    title: "Fire Detector (NASA Spinoff, 1978)",
  },
  {
    test: /fireman'?s air tanks/i,
    label: "Spinoff 1976: air tanks",
    url: "https://spinoff.nasa.gov/node/9582",
    title: "Fireman's Air Tanks (NASA Spinoff, 1976)",
  },
  {
    test: /fire attire/i,
    label: "Spinoff 1982: fire attire",
    url: "https://spinoff.nasa.gov/node/9918",
    title: "New Technology for the Fire Attire (NASA Spinoff, 1982)",
  },
  {
    test: /fire aboard space station mir/i,
    label: "NASA: Mir fire",
    url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/",
    title: "25 Years Ago: Fire Aboard Space Station Mir (NASA, 2022)",
  },
  { test: /^apollo 1 \(/i, label: "NASA: Apollo 1", url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1" },
  { test: /^apollo 13 \(/i, label: "NASA: Apollo 13", url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13" },
  {
    test: /\(FLARE\)/,
    label: "NASA FLARE",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-limits-at-reduced-g-experiment-flare/",
  },
  {
    test: /\(FM2\)/,
    label: "NASA FM2",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/",
  },
  {
    test: /\(SoFIE\)/,
    label: "NASA SoFIE",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/solid-fuel-ignition-and-extinction-sofie/",
  },
  {
    test: /fluids and combustion facility/i,
    label: "NASA FCF",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/science-facilities-on-the-iss/fluids-combustion-facility/",
  },
  {
    test: /tech briefs/i,
    label: "Tech Briefs",
    url: "https://www.techbriefs.com/component/content/article/12913-nasa-experiment-measures-smoke-in-space",
    title: "NASA Experiment Measures Smoke in Space (Tech Briefs)",
  },
  {
    test: /eurekalert/i,
    label: "EurekAlert!",
    url: "https://www.eurekalert.org/news-releases/575615",
    title: "Studying flames in microgravity is helping make combustion on Earth cleaner, and space safer (EurekAlert!)",
  },
];

/** Turns a recorded source (title plus optional URL) into a chip label and link. */
export function resolveSource(title: string, url: string | null, page?: number | null): SourceRef {
  const psi = url?.match(/investigations\/(PSI-\d+)/);
  if (psi) return { label: psi[1], title, url, page };

  const ntrs = `${url ?? ""} ${title}`.match(/(?:ntrs\.nasa\.gov\/citations\/|NTRS )(\d{11})/);
  if (ntrs) return { label: `NTRS ${ntrs[1]}`, title, url: url ?? ntrsUrl(ntrs[1]), page };

  const known = KNOWN_DOCUMENTS.find((doc) => doc.test.test(title));
  if (known) return { label: known.label, title: known.title ?? title, url: known.url, page };

  return { label: title, title, url, page };
}

/** An NTRS record as a source chip. */
export const ntrsRef = (id: string, title: string): SourceRef => ({ label: `NTRS ${id}`, title, url: ntrsUrl(id) });

/* Fire history pages from the challenge's official resources (citations_updated.docx). */
export const APOLLO_1: SourceRef = {
  label: "NASA: Apollo 1",
  title: "Apollo 1 (NASA Safety Center)",
  url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1",
};

export const APOLLO_13: SourceRef = {
  label: "NASA: Apollo 13",
  title: "Apollo 13 (NASA Safety Center)",
  url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13",
};

export const MIR_FIRE: SourceRef = {
  label: "NASA: Mir fire",
  title: "25 Years Ago: Fire Aboard Space Station Mir (NASA, 2022)",
  url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/",
};

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
