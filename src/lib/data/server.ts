import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Facts, SiteStats, Study, StudyProfileFile, TestRow } from "./types";

/**
 * Build-time access to data/ (the cleaned outputs of the Python prep).
 * Pages are statically generated, so these reads happen during `next build`.
 * Server-only: keeps the 1.6 MB test table out of browser bundles.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const cache = new Map<string, unknown>();

function readJson<T>(relativePath: string): T {
  if (!cache.has(relativePath)) {
    const raw = fs.readFileSync(path.join(DATA_DIR, relativePath), "utf-8");
    cache.set(relativePath, JSON.parse(raw));
  }
  return cache.get(relativePath) as T;
}

export function getStudies(): Study[] {
  return readJson<Study[]>("studies.json");
}

export function getStudy(id: string): Study | undefined {
  return getStudies().find((s) => s.id === id);
}

export function getFacts(): Facts {
  return readJson<Facts>("facts.json");
}

export function getTests(): TestRow[] {
  return readJson<TestRow[]>("tests.json");
}

export function getStudyProfiles(): StudyProfileFile[] {
  const dir = path.join(DATA_DIR, "ai", "studies");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson<StudyProfileFile>(path.posix.join("ai", "studies", f)));
}

/**
 * Distinct NASA reports cited by the study profiles: PSI final reports (by PSI number)
 * and NTRS records (by 11-digit NTRS ID, from the citation URL or the title).
 * Other sources (web pages, a video transcript) are not counted as reports.
 */
function countNasaReports(profiles: StudyProfileFile[]): number {
  const ids = new Set<string>();
  for (const p of profiles) {
    for (const src of p.sources) {
      const text = `${src.url ?? ""} ${src.title}`;
      const ntrs = text.match(/(?:ntrs\.nasa\.gov\/citations\/|NTRS )(\d{11})/);
      const psi = (src.url ?? "").match(/investigations\/(PSI-\d+)/);
      if (ntrs) ids.add(`NTRS ${ntrs[1]}`);
      else if (psi) ids.add(psi[1]);
    }
  }
  return ids.size;
}

/** Counts for the footer stats strip, all computed from data/. */
export function getSiteStats(): SiteStats {
  const facts = getFacts();
  const profiles = getStudyProfiles();
  const rankings = readJson<{ generated: string }>("ai/rankings.json");
  const stamps = [facts.generated, rankings.generated, ...profiles.map((p) => p.generated)].filter(Boolean);
  const newest = stamps.sort().at(-1) ?? facts.generated;

  return {
    studies: getStudies().length,
    tests: getTests().filter((t) => t.is_test === true).length,
    nasaReports: countNasaReports(profiles),
    fireSafetyJobs: facts.key_numbers.fire_safety_jobs,
    dataUpdated: newest.slice(0, 10),
  };
}
