import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { SavedAnswersFile } from "@/lib/ask/types";
import { COLUMN_GUIDE } from "@/lib/column-guide";
import { roundMeasurements, roundMeasurementsDeep } from "@/lib/format";
import { rowFlags, unclassifiedNotes } from "@/lib/test-rows";
import { JOB_IDS, isJobId, type JobId } from "@/lib/jobs";
import { MISSION_LIST } from "@/lib/missions";
import { fuelKindOf, rankStudies } from "@/lib/scoring";
import { RANKINGS, conditionsFromRanking } from "./rankings";
import type { EarthBenefitsFile, Facts, Finding, SiteStats, Study, StudyIndexEntry, StudyProfileFile, TestRow } from "./types";

/**
 * Build-time access to data/ (the cleaned outputs of the Python prep).
 * Pages are statically generated, so these reads happen during `next build`.
 * Server-only: keeps the 1.6 MB test table out of browser bundles.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const cache = new Map<string, unknown>();

function readText(relativePath: string): string {
  const key = `text:${relativePath}`;
  if (!cache.has(key)) cache.set(key, fs.readFileSync(path.join(DATA_DIR, relativePath), "utf-8"));
  return cache.get(key) as string;
}

function readJson<T>(relativePath: string): T {
  const key = `json:${relativePath}`;
  if (!cache.has(key)) cache.set(key, JSON.parse(readText(relativePath)));
  return cache.get(key) as T;
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

export function getStudyTests(id: string): TestRow[] {
  return getTests().filter((t) => t.study_id === id);
}

/** Headline findings, with over-precise % and atm values rounded for display. */
export function getFindings(): Finding[] {
  if (!cache.has("findings")) {
    const raw = readJson<Finding[]>("ai/findings.json");
    cache.set("findings", raw.map((f) => ({ ...f, simple: roundMeasurements(f.simple), expert: f.expert ? roundMeasurements(f.expert) : f.expert })));
  }
  return cache.get("findings") as Finding[];
}

/** AI study profiles. The profile text has over-precise % and atm values rounded for display. */
export function getStudyProfiles(): StudyProfileFile[] {
  if (!cache.has("profiles")) {
    const dir = path.join(DATA_DIR, "ai", "studies");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    cache.set(
      "profiles",
      files.map((f) => {
        const file = readJson<StudyProfileFile>(path.posix.join("ai", "studies", f));
        return { ...file, profile: roundMeasurementsDeep(file.profile) };
      }),
    );
  }
  return cache.get("profiles") as StudyProfileFile[];
}

/** Saved answers to the suggested Ask AI questions (scripts/save-answers.ts). */
export function getSavedAnswers(): SavedAnswersFile {
  return readJson<SavedAnswersFile>("saved_answers.json");
}

export function getStudyProfile(id: string): StudyProfileFile | undefined {
  return getStudyProfiles().find((p) => p.study_id === id);
}

/** The AI-written Earth-benefit stories, with over-precise % and atm values rounded for display. */
export function getEarthBenefitsFile(): EarthBenefitsFile {
  if (!cache.has("earth")) {
    const raw = readJson<EarthBenefitsFile>("ai/earth_benefits.json");
    cache.set("earth", { ...raw, stories: roundMeasurementsDeep(raw.stories) });
  }
  return cache.get("earth") as EarthBenefitsFile;
}

/** Fire-safety jobs for a study, from its AI profile (none for ground studies). */
export function studyJobs(id: string): JobId[] {
  const jobs = getStudyProfile(id)?.profile.jobs ?? [];
  return JOB_IDS.filter((j) => jobs.includes(j));
}

/** The compact list of all 24 studies used by Explore, the Planner and Home. */
export function getStudyIndex(): StudyIndexEntry[] {
  validateData();
  return getStudies().map((s) => {
    const jobs = studyJobs(s.id);
    const status: StudyIndexEntry["status"] = s.environment === "ground" ? "ground" : s.tests > 0 ? "ranked" : "planned";
    const profile = getStudyProfile(s.id);
    const profileFuels = profile?.profile.key_facts.fuels ?? [];
    return {
      id: s.id,
      environment: s.environment,
      hardwareFamily: s.hardware_family,
      oxygenRange: s.oxygen_pct_range,
      pressureRange: s.pressure_atm_range,
      tests: s.tests,
      shortName: s.short_name,
      fullName: s.full_name,
      psiId: s.psi_id,
      familyName: s.hardware_family_name,
      jobs,
      // Profiled studies with no fire-safety job (CFI, SLICE) get the neutral "Flame science" tag.
      flameScience: Boolean(profile) && jobs.length === 0,
      tableRows: s.table_rows,
      years: s.years,
      fuelKind: fuelKindOf(s.id, s.hardware_family),
      status,
      searchText: [s.short_name, s.full_name, s.psi_id, s.hardware_family_name, ...s.fuels, ...s.materials, ...profileFuels]
        .join(" ")
        .toLowerCase(),
    };
  });
}

/** Studies per fire-safety job, from the AI profiles' job tags. */
export function getJobCounts(): Record<JobId, number> {
  const counts = { prevent: 0, detect: 0, put_out: 0 } as Record<JobId, number>;
  for (const s of getStudies()) for (const j of studyJobs(s.id)) counts[j] += 1;
  return counts;
}

/** Home key numbers, counted from studies.json (and checked against facts.json). */
export function getKeyNumbers() {
  validateData();
  const studies = getStudies();
  return {
    studies: studies.length,
    inSpace: studies.filter((s) => s.environment === "space").length,
    onGround: studies.filter((s) => s.environment === "ground").length,
    families: new Set(studies.map((s) => s.hardware_family)).size,
    jobs: getFacts().key_numbers.fire_safety_jobs,
  };
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
  const stamps = [facts.generated, RANKINGS.generated, ...profiles.map((p) => p.generated)].filter(Boolean);
  const newest = stamps.sort().at(-1) ?? facts.generated;

  return {
    studies: getStudies().length,
    tests: getTests().filter((t) => t.is_test === true).length,
    nasaReports: countNasaReports(profiles),
    fireSafetyJobs: facts.key_numbers.fire_safety_jobs,
    dataUpdated: newest.slice(0, 10),
  };
}

/** Lines of data/tests.csv: one header line, then one line per record (checked in validateData). */
function testsCsvLines(): string[] {
  const text = readText("tests.csv").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

/** All of data/tests.csv, byte for byte (checked in validateData). */
export function getTestsCsv(): string {
  validateData();
  return readText("tests.csv");
}

/** The JSON download: every row of tests.json with the column guide and a short note. */
export function getTestsJsonDownload(): string {
  validateData();
  const tests = getTests();
  return JSON.stringify(
    {
      title: "Vesta test table: cleaned data from NASA's microgravity fire experiments",
      source: "NASA Physical Sciences Informatics (PSI) experiment tables, cleaned by Vesta's data prep",
      data_updated: getSiteStats().dataUpdated,
      row_count: tests.length,
      test_count: tests.filter((t) => t.is_test === true).length,
      notes: [
        "Each row is one record from a PSI experiment table. is_test is false for duplicate, planned, blank and flow-visualization rows.",
        "Values are kept at full precision. The website rounds them for display.",
        "Not an official NASA website. Data: NASA PSI and NTRS.",
      ],
      column_guide: COLUMN_GUIDE,
      rows: tests,
    },
    null,
    1,
  );
}

/** Counts for the Data page summary strip. */
export function getDataSummary() {
  validateData();
  const tests = getTests();
  const header = testsCsvLines()[0];
  return {
    tests: tests.filter((t) => t.is_test === true).length,
    rows: tests.length,
    studiesWithTables: getStudies().filter((s) => s.table_rows > 0).length,
    columns: header.split(",").length,
    flaggedRows: tests.filter((t) => rowFlags(t).length > 0).length,
  };
}

/** One study's rows from data/tests.csv, byte for byte, with the same header. */
export function getStudyCsv(id: string): string {
  validateData();
  const [header, ...rows] = testsCsvLines();
  return [header, ...rows.filter((line) => line.startsWith(`${id},`))].join("\n") + "\n";
}

/** Fixes for name typos in the PSI citations (READ_ME_AFTER_IMPLEMENTATION section 6). */
const AUTHOR_FIXES: Record<string, string> = {
  "Bhattachjee,Subrata": "Bhattacharjee,Subrata",
  "Takahashi,Funiaki": "Takahashi,Fumiaki",
  "Ris,John L de": "de Ris,John L.",
};

/** "Ferkul,Paul" -> "Paul Ferkul" */
export function formatAuthor(raw: string): string {
  const fixed = AUTHOR_FIXES[raw] ?? raw;
  const [last, first] = fixed.split(",");
  return first ? `${first.trim()} ${last.trim()}` : fixed.trim();
}

let validated = false;

/**
 * Consistency checks between the data files and this code. Any failure stops the build with
 * a message, instead of the site quietly showing wrong numbers.
 */
export function validateData() {
  if (validated) return;
  const problems: string[] = [];
  const studies = getStudies();
  const facts = getFacts();
  const kn = facts.key_numbers;

  if (studies.length !== kn.studies) problems.push(`studies.json has ${studies.length} studies, facts.json says ${kn.studies}.`);
  const space = studies.filter((s) => s.environment === "space").length;
  const ground = studies.filter((s) => s.environment === "ground").length;
  if (space !== kn.studies_in_space || ground !== kn.studies_on_ground)
    problems.push(`Space/ground counts (${space}/${ground}) differ from facts.json (${kn.studies_in_space}/${kn.studies_on_ground}).`);
  const families = new Set(studies.map((s) => s.hardware_family)).size;
  if (families !== kn.hardware_families) problems.push(`${families} hardware families, facts.json says ${kn.hardware_families}.`);
  if (kn.fire_safety_jobs !== JOB_IDS.length) problems.push(`facts.json lists ${kn.fire_safety_jobs} jobs; the site has ${JOB_IDS.length}.`);

  // tests.csv must have exactly one line per tests.json record, in the same order.
  const tests = getTests();
  const lines = testsCsvLines();
  const header = lines[0]?.split(",") ?? [];
  const guide = COLUMN_GUIDE.map((c) => c.column);
  if (header.join(",") !== guide.join(",")) {
    problems.push(`The column guide (${guide.length} columns) doesn't match the tests.csv header (${header.length} columns).`);
  }
  if (lines.length - 1 !== tests.length) {
    problems.push(`tests.csv has ${lines.length - 1} data lines but tests.json has ${tests.length} rows.`);
  } else {
    tests.forEach((t, i) => {
      if (!lines[i + 1].startsWith(`${t.study_id},`)) problems.push(`tests.csv line ${i + 2} is not ${t.study_id}.`);
    });
  }

  // Every row note must be classed as a quality flag or a cleaning note (src/lib/test-rows.ts).
  for (const note of unclassifiedNotes(tests)) problems.push(`Row note not classified as a quality flag or cleaning note: "${note}".`);

  const ids = new Set(studies.map((s) => s.id));
  for (const p of getStudyProfiles()) {
    if (!ids.has(p.study_id)) problems.push(`Profile for unknown study "${p.study_id}".`);
    for (const j of p.profile.jobs) if (!isJobId(j)) problems.push(`Profile ${p.study_id} has unknown job "${j}".`);
  }
  for (const f of getFindings()) if (f.study_id && !ids.has(f.study_id)) problems.push(`Finding ${f.id} links unknown study.`);

  // Every preset mission's rankings must match the TypeScript port of the prep's scoring.
  const scoring = studies.map((s) => ({
    id: s.id,
    environment: s.environment,
    hardwareFamily: s.hardware_family,
    oxygenRange: s.oxygen_pct_range,
    pressureRange: s.pressure_atm_range,
    tests: s.tests,
  }));
  for (const mission of MISSION_LIST) {
    if (!mission.rankingKey) continue;
    const stored = RANKINGS.missions[mission.rankingKey];
    if (!stored) {
      problems.push(`rankings.json has no "${mission.rankingKey}" mission.`);
      continue;
    }
    const computed = rankStudies(scoring, conditionsFromRanking(stored.mission));
    if (computed.length !== stored.studies.length) problems.push(`${mission.label}: ${computed.length} ranked here, ${stored.studies.length} in rankings.json.`);
    stored.studies.forEach((row, i) => {
      const c = computed[i];
      if (!c || c.study.id !== row.study_id || c.match.score !== row.score || c.match.oxygen !== row.oxygen ||
        c.match.pressure !== row.pressure || c.match.gravity !== row.gravity || c.match.fuel !== row.fuel) {
        problems.push(`${mission.label} rank ${i + 1}: rankings.json has ${row.study_id} ${row.score}, scoring code gives ${c?.study.id} ${c?.match.score}.`);
      }
    });
  }

  if (problems.length) throw new Error(`Data check failed:\n- ${problems.join("\n- ")}`);
  validated = true;
}
