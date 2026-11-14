import "server-only";
import type {
  AirflowData,
  ExplainerInfo,
  FlexOutcome,
  GasResult,
  GasesData,
  GravityData,
  MissionAirData,
  OxygenData,
  SaffireFlight,
} from "@/lib/explainer-types";
import { fmtNum } from "@/lib/format";
import { missionView } from "@/lib/mission-view";
import { DEFAULT_CUSTOM, type MissionId } from "@/lib/missions";
import { EXPLORATION_ATMOSPHERE, PROBLEM_STATEMENT, dedupeSources, findingSource, ntrsRef, type SourceRef } from "@/lib/sources";
import { getGravityBounds, getOxygenLimitChart } from "./insights";
import { rankingMission } from "./rankings";
import { getFindings, getStudy, getStudyTests } from "./server";
import type { Study } from "./types";

/**
 * Data and text for the interactive explainers on Learn and in the Journey.
 * Every number is read from data/ (findings, test tables, rankings); if the wording a number is
 * read from changes, the build stops so the explainer can be reviewed instead of becoming wrong.
 */

const MAX_WORDS = 60;

function checkLength(name: string, text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > MAX_WORDS) throw new Error(`${name} text has ${words} words; the design allows ${MAX_WORDS}.`);
  return text;
}

function requireStudy(id: string): Study {
  const study = getStudy(id);
  if (!study) throw new Error(`Study ${id} is missing from studies.json.`);
  return study;
}

/** A study's PSI record as a source chip. */
export function psiSource(study: Study, label = study.psi_id): SourceRef {
  return { label, title: `${study.short_name}: ${study.full_name} (NASA PSI record and test table)`, url: study.psi_url };
}

/* ------------------------------------------------------------------ BASS-II limits */

export function getOxygenData(): OxygenData {
  const chart = getOxygenLimitChart();
  const iss = rankingMission("spacecraft-iss").mission;
  if (iss.o2_min !== iss.o2_max) throw new Error("ISS oxygen in rankings.json is now a range; review the oxygen explainer.");
  return { space: chart.space, earth: chart.earth, iss: iss.o2_min, sources: chart.sources };
}

export function getAirflowData(): AirflowData {
  const f2 = getFindings().find((f) => f.id === "f2");
  const match = f2?.simple.match(/died out below about (\d+(?:\.\d+)?) cm\/s of airflow and blew out near (\d+(?:\.\d+)?) cm\/s/);
  if (!f2 || !match) throw new Error("Finding f2 no longer states the BASS-II airflow limits; review the airflow explainer.");
  return { quench: Number(match[1]), blowoff: Number(match[2]), sources: f2.sources.map(findingSource) };
}

/* ------------------------------------------------------------------ Texts (60 words at most) */

export const GRAVITY_TEXT =
  "On Earth, hot air rises and pulls fresh air in from below, so flames stand tall. In orbit, hot air doesn't rise. Oxygen drifts in from all sides, and the flame turns round, dim and blue.";

export const airflowText = (a: AirflowData) =>
  checkLength(
    "Airflow",
    `Without rising hot air, a flame in orbit depends on the airflow around it. Too little and it starves. Too much and it blows out. For thin plastic sheets in BASS-II, flames died out below about ${fmtNum(a.quench)} cm/s and blew out near ${fmtNum(a.blowoff)} cm/s. Move the fan to find both edges.`,
  );

export const oxygenText = (o: OxygenData) =>
  checkLength(
    "Oxygen",
    `Every fire needs enough oxygen. On Earth, a plastic rod stopped burning at ${fmtNum(o.earth)}% oxygen. In space, the same kind of rod kept burning at ${fmtNum(o.space)}%. Slide the oxygen down and see which flame goes out first.`,
  );

export const SMOKE_RACE_TEXT =
  "On Earth, smoke rises to a detector on the ceiling. In orbit, it drifts wherever the air takes it. In the SAME tests, the station's smoke detector missed Kapton smoke in half the tests. Race the two smoke clouds to the detector.";

export const HIDDEN_FLAME_TEXT =
  "Sometimes a fire only looks like it's out. Large fuel drops kept burning in a low-temperature regime after the visible flame went out. This faint cool flame is very hard to see. Watch the bright flame die and the hidden one carry on.";

export const SMOKE_POINT_TEXT =
  "Turn up the fuel and a flame grows taller. At a certain size, soot starts escaping from its tip as smoke. That size is the smoke point. SPICE measured smoke points of gas flames on the space station, because soot carries a fire's heat and becomes the smoke that detectors look for.";

export const COOL_FLAME_SOURCE = ntrsRef("20140006750", "Cool-Flame Extinction during n-Alkane Droplet Combustion in Microgravity (2014)");

/**
 * Sources for the smoke race: the SAME Kapton result (finding f3) and the detector placement come
 * from the 2021 white paper; the longer detection times come from SAME's final report (PSI-102):
 * "mixing dominates the smoke transport and ... detection time lags are longer than in normal gravity."
 */
export function smokeRaceSources(): SourceRef[] {
  const f3 = getFindings().find((f) => f.id === "f3");
  if (!f3 || !/kapton/i.test(f3.simple)) throw new Error("Finding f3 no longer describes the SAME Kapton result; review the smoke race.");
  return dedupeSources([...f3.sources.map(findingSource), psiSource(requireStudy("same"))]);
}

export function smokePointSources(): SourceRef[] {
  const spice = requireStudy("spice");
  return [
    psiSource(spice, `${spice.short_name} (${spice.psi_id})`),
    ntrsRef("20090014827", "Smoke Point In Co-flow Experiment (SPICE) description (2009)"),
  ];
}

/** The six Learn explainers, in the approved design's order. */
export function getExplainers(): ExplainerInfo[] {
  const oxygen = getOxygenData();
  const airflow = getAirflowData();
  return [
    { key: "gravity", title: "Gravity switch", blurb: "Flip between Earth and space and watch the flame change shape.", text: GRAVITY_TEXT, sources: [PROBLEM_STATEMENT] },
    { key: "fan", title: "Fan slider", blurb: "Change the airflow and find where a flame dies out or blows out.", text: airflowText(airflow), sources: airflow.sources },
    { key: "oxygen", title: "Oxygen slider", blurb: "Lower the oxygen and see which flame goes out first.", text: oxygenText(oxygen), sources: oxygen.sources },
    { key: "smoke-race", title: "Smoke race", blurb: "See why smoke reaches a detector slower without gravity.", text: SMOKE_RACE_TEXT, sources: smokeRaceSources() },
    { key: "hidden-flame", title: "Hidden flame", blurb: "Watch the bright flame die while a faint cool flame keeps going.", text: HIDDEN_FLAME_TEXT, sources: [COOL_FLAME_SOURCE] },
    { key: "smoke-point", title: "Soot and the smoke point", blurb: "Turn up the fuel and see when a flame starts to smoke.", text: SMOKE_POINT_TEXT, sources: smokePointSources() },
  ];
}

/* ------------------------------------------------------------------ Saffire sample sizes */

/** "0.37 cm thick, 40.6 cm long, 94 cm wide" -> { width: 40.6, length: 94 } (null if a size is missing). */
function parseSample(size: string | null): { width: number; length: number } | null {
  if (!size) return null;
  const long = size.match(/(\d+(?:\.\d+)?) cm long/);
  const wide = size.match(/(\d+(?:\.\d+)?) cm wide/);
  if (!long || !wide) return null;
  const a = Number(long[1]);
  const b = Number(wide[1]);
  return { width: Math.min(a, b), length: Math.max(a, b) };
}

export const SAFFIRE_IDS = ["saffire-i", "saffire-ii", "saffire-iii"] as const;

/** Each Saffire flight's materials and largest sample, read from its PSI test table. */
export function getSaffireFlights(): SaffireFlight[] {
  return SAFFIRE_IDS.map((id) => {
    const study = requireStudy(id);
    const rows = getStudyTests(id).filter((r) => r.is_test);
    const samples = rows.map((r) => parseSample(r.sample_size)).filter((s): s is { width: number; length: number } => s !== null);
    if (!samples.length) throw new Error(`No sample sizes could be read from the ${study.short_name} table; review the Saffire chapter.`);
    const sample = samples.reduce((a, b) => (b.width * b.length > a.width * a.length ? b : a));
    const materials = [...new Set(rows.map((r) => r.material).filter((m): m is string => Boolean(m)))];
    return { id, shortName: study.short_name, psi: psiSource(study), materials, sample };
  });
}

export const SAFFIRE_SOURCE = ntrsRef("20180005168", "Saffire: A Novel Approach to Study of Spacecraft Fire Safety Using Un-manned Spacecraft (2017)");

/* ------------------------------------------------------------------ FLEX gases */

const OUTCOMES: FlexOutcome[] = ["extinction", "disruption", "completion"];

/** FLEX tests grouped by the gas added to the air (from the PSI-69 table): how many, and how each ended. */
export function getGasesData(): GasesData {
  const flex = requireStudy("flex");
  const rows = getStudyTests("flex").filter((r) => r.is_test);
  type Acc = { tests: number; gas: number[]; oxygen: number[]; outcomes: Record<FlexOutcome, number> };
  const empty = (): Acc => ({ tests: 0, gas: [], oxygen: [], outcomes: { extinction: 0, disruption: 0, completion: 0 } });
  const groups: Record<GasResult["id"], Acc> = { co2: empty(), he: empty(), none: empty() };

  for (const r of rows) {
    let id: GasResult["id"] = "none";
    let pct: number | null = null;
    if (r.diluent) {
      const m = r.diluent.match(/^(CO2|He) (\d+(?:\.\d+)?)%$/);
      if (!m) throw new Error(`Unexpected FLEX diluent "${r.diluent}"; review the gas chapter.`);
      id = m[1] === "CO2" ? "co2" : "he";
      pct = Number(m[2]);
    }
    if (!OUTCOMES.includes(r.outcome as FlexOutcome)) throw new Error(`Unexpected FLEX outcome "${r.outcome}"; review the gas chapter.`);
    const g = groups[id];
    g.tests += 1;
    g.outcomes[r.outcome as FlexOutcome] += 1;
    if (pct !== null) g.gas.push(pct);
    if (r.oxygen_pct_min !== null) g.oxygen.push(r.oxygen_pct_min);
    if (r.oxygen_pct_max !== null) g.oxygen.push(r.oxygen_pct_max);
  }

  const span = (values: number[]): [number, number] => [Math.min(...values), Math.max(...values)];
  const labels = { co2: "Added CO₂", he: "Added helium", none: "No added gas" } as const;
  const gases: GasResult[] = (["co2", "he", "none"] as const).map((id) => {
    const g = groups[id];
    if (!g.tests || !g.oxygen.length) throw new Error(`FLEX has no "${labels[id]}" tests; review the gas chapter.`);
    return { id, label: labels[id], tests: g.tests, gasPct: g.gas.length ? span(g.gas) : null, oxygenPct: span(g.oxygen), outcomes: g.outcomes };
  });

  const fuels = [...new Set(rows.map((r) => r.fuel).filter((f): f is string => Boolean(f)))].map((f) => f.toLowerCase());
  return {
    gases,
    fuels,
    sources: [
      psiSource(flex),
      ntrsRef("20150023456", "Detailed Results From the Flame Extinguishment Experiment (FLEX) March 2009 to December 2011 (NASA/TP-2015-216046)"),
    ],
  };
}

/* ------------------------------------------------------------------ Missions and gravity */

const PREVIEW_MISSIONS: MissionId[] = ["iss", "moon", "mars", "rover"];

export function getMissionAirData(): MissionAirData {
  return {
    views: PREVIEW_MISSIONS.map((id) => missionView(id, DEFAULT_CUSTOM)),
    sources: [PROBLEM_STATEMENT, EXPLORATION_ATMOSPHERE],
  };
}

export function getGravityData(): GravityData {
  const g = getGravityBounds();
  return { space: g.space, ground: g.ground, moonG: g.moonG, marsG: g.marsG, eFieldName: g.eField.shortName, sources: dedupeSources(g.sources) };
}
