import "server-only";
import { fmtNum } from "@/lib/format";
import type { JobId } from "@/lib/jobs";
import { fuelKindOf } from "@/lib/scoring";
import { FM2, LUCI, PROBLEM_STATEMENT, PSI_TABLES, findingSource, ntrsUrl, resolveSource, type SourceRef } from "@/lib/sources";
import { rankingMission } from "./rankings";
import { getFacts, getFindings, getStudies, getStudyIndex, getStudyProfile, getTests } from "./server";

/* ------------------------------------------------------------------ job tabs */

export type CardIcon = "gauge" | "wind" | "flame" | "alert" | "smoke" | "thermometer";

export interface InsightCard {
  id: string;
  title: string;
  simple: string;
  /** AI-written expert wording, when there is one. */
  expert: string | null;
  icon: CardIcon;
  sources: SourceRef[];
  link: { href: string; label: string } | null;
}

/**
 * Short card titles for the headline findings (data/ai/findings.json), from the approved design.
 * The card text itself always comes from findings.json.
 */
const FINDING_CARDS: Record<string, { title: string; icon: CardIcon }> = {
  f1: { title: "Lower oxygen is not enough", icon: "gauge" },
  f2: { title: "Airflow decides", icon: "wind" },
  f5: { title: "Moon-base air is untested for solids", icon: "alert" },
  f3: { title: "Detectors can miss some smoke", icon: "smoke" },
  f4: { title: "A fire can hide as a cool flame", icon: "thermometer" },
};

/** Card order within each job tab (the Saffire card sits third on Prevent, as designed). */
const CARD_ORDER: Record<JobId, string[]> = {
  prevent: ["f1", "f2", "saffire", "f5"],
  detect: ["f3"],
  put_out: ["f4"],
};

function findingCards(): Map<string, InsightCard> {
  const cards = new Map<string, InsightCard>();
  for (const f of getFindings()) {
    const meta = FINDING_CARDS[f.id];
    if (!meta) throw new Error(`Finding ${f.id} has no card title in lib/data/insights.ts.`);
    const sources = f.sources.map(findingSource);
    if (!f.study_id) sources.push(PROBLEM_STATEMENT);
    cards.set(f.id, {
      id: f.id,
      title: meta.title,
      simple: f.simple,
      expert: f.expert,
      icon: meta.icon,
      sources,
      link: f.study_id ? { href: `/study/${f.study_id}`, label: "Open study" } : null,
    });
  }
  // The Saffire card, from the design's content kit. It states what Saffire did (no measurements),
  // sourced to NASA's 2018 Saffire paper, which the Saffire profiles cite.
  const saffireCited = ["saffire-i", "saffire-ii", "saffire-iii"].some((id) =>
    getStudyProfile(id)?.sources.some((s) => (s.url ?? "").endsWith("/20180005168")),
  );
  if (!saffireCited) throw new Error("No Saffire profile cites NTRS 20180005168; review the Saffire insight card.");
  cards.set("saffire", {
    id: "saffire",
    title: "Big fires grow differently",
    simple: "Saffire burned large fabric samples in an empty cargo ship to see how big fires grow.",
    expert: null,
    icon: "flame",
    sources: [{ label: "NTRS 20180005168", title: "Saffire: A Novel Approach to Study of Spacecraft Fire Safety", url: ntrsUrl("20180005168") }],
    link: { href: "/explore?family=cargo_ship_fires", label: "See the studies" },
  });
  return cards;
}

export interface InsightResult {
  studyId: string;
  studyName: string;
  simple: string;
  expert: string;
  meaning: string;
  source: SourceRef | null;
}

export interface LinkedStudy {
  id: string;
  shortName: string;
  fullName: string;
  familyName: string;
}

export interface JobInsights {
  job: JobId;
  cards: InsightCard[];
  results: InsightResult[];
  linked: LinkedStudy[];
}

export function getJobInsights(job: JobId): JobInsights {
  const all = findingCards();
  const cards = CARD_ORDER[job].map((id) => {
    const card = all.get(id);
    if (!card) throw new Error(`Insight card "${id}" is missing.`);
    return card;
  });
  // Every headline finding for this job must have a card.
  for (const f of getFindings()) {
    if (f.job === job && !CARD_ORDER[job].includes(f.id)) throw new Error(`Finding ${f.id} (${job}) has no place on the Insights page.`);
  }

  const results: InsightResult[] = [];
  for (const s of getStudies()) {
    const file = getStudyProfile(s.id);
    for (const r of file?.profile.results ?? []) {
      if (r.job !== job) continue;
      results.push({
        studyId: s.id,
        studyName: s.short_name,
        simple: r.result_simple,
        expert: r.result_expert,
        meaning: r.safety_meaning,
        source: r.source_detail
          ? resolveSource(r.source_detail.title, r.source_detail.url, r.source_detail.page)
          : r.source?.trim() === "T"
            ? { label: s.psi_id, title: "PSI data table", url: s.psi_url }
            : null,
      });
    }
  }

  const linked = getStudyIndex()
    .filter((s) => s.jobs.includes(job))
    .map((s) => ({ id: s.id, shortName: s.shortName, fullName: s.fullName, familyName: s.familyName }));

  return { job, cards, results, linked };
}

/* ------------------------------------------------------------------ Prevent chart */

/**
 * "Lowest oxygen where a plastic rod kept burning": the two values are read from headline
 * finding f1 ("…kept burning at 13.6% oxygen in space but stopped at 16% on Earth"), which cites
 * NTRS 20160000593. The build stops if that sentence changes shape.
 */
export function getOxygenLimitChart() {
  const f1 = getFindings().find((f) => f.id === "f1");
  const match = f1?.simple.match(/(\d+(?:\.\d+)?)% oxygen in space but stopped at (\d+(?:\.\d+)?)% on Earth/);
  if (!f1 || !match) throw new Error("Finding f1 no longer states the space and Earth oxygen limits; review the Insights chart.");
  return {
    space: Number(match[1]),
    earth: Number(match[2]),
    sources: f1.sources.map(findingSource),
    studyId: f1.study_id,
  };
}

/* ------------------------------------------------------------------ Equipment */

export const EQUIPMENT_AREAS = ["materials", "detectors", "extinguishers", "ventilation"] as const;
export type EquipmentArea = (typeof EQUIPMENT_AREAS)[number];

export interface EquipmentNote {
  studyId: string;
  studyName: string;
  note: string;
  source: SourceRef | null;
}

export function getEquipmentInsights(): Record<EquipmentArea, EquipmentNote[]> {
  const out = { materials: [], detectors: [], extinguishers: [], ventilation: [] } as Record<EquipmentArea, EquipmentNote[]>;
  for (const s of getStudies()) {
    const file = getStudyProfile(s.id);
    if (!file) continue;
    // Equipment notes don't name a page, so they cite the study's first source (its main report).
    const first = file.sources[0];
    const source = first ? resolveSource(first.title, first.url) : { label: s.psi_id, title: "PSI record", url: s.psi_url };
    for (const e of file.profile.equipment ?? []) {
      if (!(EQUIPMENT_AREAS as readonly string[]).includes(e.area)) throw new Error(`Unknown equipment area "${e.area}" in ${s.id}.`);
      out[e.area as EquipmentArea].push({ studyId: s.id, studyName: s.short_name, note: e.note, source });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ Gaps and gravity */

export interface CoverageRow {
  kind: "solid" | "liquid" | "gas";
  label: string;
  range: [number, number] | null;
  tests: number;
  studies: { id: string; shortName: string; psiId: string; psiUrl: string }[];
}

/**
 * Oxygen tested in the gas around the flame, by fuel type, from every real test in tests.json.
 * Inside-out flames are left out: their oxygen flows from the burner, not the cabin air.
 */
export function getCoverage() {
  const studies = new Map(getStudies().map((s) => [s.id, s]));
  const rows: Record<CoverageRow["kind"], CoverageRow> = {
    solid: { kind: "solid", label: "Solid materials", range: null, tests: 0, studies: [] },
    liquid: { kind: "liquid", label: "Liquid drops", range: null, tests: 0, studies: [] },
    gas: { kind: "gas", label: "Gas flames", range: null, tests: 0, studies: [] },
  };
  let bre: [number, number] | null = null;
  const insideOut = { range: null as [number, number] | null, tests: 0, studies: new Set<string>() };
  const widen = (r: [number, number] | null, lo: number, hi: number): [number, number] => (r ? [Math.min(r[0], lo), Math.max(r[1], hi)] : [lo, hi]);

  for (const t of getTests()) {
    if (!t.is_test) continue;
    const lo = t.oxygen_pct_min ?? t.oxygen_pct_max;
    const hi = t.oxygen_pct_max ?? t.oxygen_pct_min;
    if (lo === null || hi === null) continue;
    const study = studies.get(t.study_id)!;
    if (t.flags.some((f) => f.startsWith("inside-out flame"))) {
      insideOut.range = widen(insideOut.range, lo, hi);
      insideOut.tests += 1;
      insideOut.studies.add(study.short_name);
      continue;
    }
    const kind = fuelKindOf(study.id, study.hardware_family);
    const rowKind = kind === "solid" ? "solid" : kind === "liquid" ? "liquid" : kind === "gas" || kind === "gas emulating solids" ? "gas" : null;
    if (!rowKind) continue;
    const row = rows[rowKind];
    row.range = widen(row.range, lo, hi);
    row.tests += 1;
    if (!row.studies.some((x) => x.id === study.id)) {
      row.studies.push({ id: study.id, shortName: study.short_name, psiId: study.psi_id, psiUrl: study.psi_url });
    }
    if (kind === "gas emulating solids") bre = widen(bre, lo, hi);
  }

  const facts = getFacts();
  const solid = rows.solid.range;
  if (!solid || Math.abs(solid[1] - facts.highest_oxygen_solid_materials_pct) > 1e-9) {
    throw new Error("Solid-material oxygen coverage no longer matches facts.json; review the coverage map.");
  }
  if (!bre || Math.abs(bre[1] - facts.highest_oxygen_bre_pct) > 1e-9) {
    throw new Error("ACME BRE oxygen no longer matches facts.json; review the coverage map.");
  }

  const iss = rankingMission("spacecraft-iss").mission;
  const moon = rankingMission("moon-base").mission;
  const explore = rankingMission("mars-base").mission;
  const references = [
    { key: "iss", label: `ISS ${fmtNum(iss.o2_min)}%`, value: iss.o2_min, style: "solid" as const },
    { key: "moon", label: `Moon base ${fmtNum(moon.o2_min)}%+`, value: moon.o2_min, style: "dashed" as const },
    { key: "explore", label: `Exploration atmosphere ${fmtNum(explore.o2_min)}%`, value: explore.o2_min, style: "dotted" as const },
  ];
  const top = Math.max(...Object.values(rows).map((r) => r.range?.[1] ?? 0), ...references.map((r) => r.value));
  const axisMax = Math.ceil((top + 1) / 10) * 10;

  const sources: SourceRef[] = [];
  for (const row of Object.values(rows)) {
    for (const s of row.studies) sources.push({ label: s.psiId, title: `${s.shortName} data table`, url: s.psiUrl });
  }
  sources.push(PROBLEM_STATEMENT);

  return {
    rows: Object.values(rows),
    bre: { range: bre, shortName: studies.get("acme-bre")!.short_name },
    insideOut: { range: insideOut.range, tests: insideOut.tests, studies: [...insideOut.studies] },
    references,
    moonO2: moon.o2_min,
    axisMax,
    sources,
  };
}

/** Where fire data exists between 0 g and 1 g. Counts from studies.json; Moon and Mars from rankings.json. */
export function getGravityBounds() {
  const studies = getStudies();
  const facts = getFacts();
  if (facts.studies_by_gravity["partial gravity"] !== 0) throw new Error("facts.json now lists partial-gravity studies; review the gravity scale.");
  const eField = studies.find((s) => s.id === "acme-e-field");
  if (!eField || eField.environment !== "space") throw new Error("ACME E-FIELD Flames is missing or not a space study; review the gravity scale.");
  return {
    space: studies.filter((s) => s.environment === "space").length,
    ground: studies.filter((s) => s.environment === "ground").length,
    moonG: rankingMission("moon-base").mission.g,
    marsG: rankingMission("mars-base").mission.g,
    eField: { id: eField.id, shortName: eField.short_name },
    sources: [PSI_TABLES, LUCI, FM2],
  };
}
