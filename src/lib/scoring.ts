/**
 * Mission match scoring. This is an exact port of match() in prep_step2_ai.py, the code that
 * wrote data/ai/rankings.json. Preset missions read their scores from that file; Custom uses
 * this port. A build-time check (lib/data/server.ts) recomputes every preset score with this
 * code and stops the build if any differ.
 */

export type MatchLevel = "yes" | "partial" | "no";
export type FuelKind = "solid" | "gas emulating solids" | "gas" | "liquid" | "sensor" | "analysis";

/** FUEL_KIND and GAS_SOLIDS from prep_step2_ai.py. */
const FUEL_KIND_BY_FAMILY: Record<string, FuelKind> = {
  glovebox_air_tunnel: "solid",
  cargo_ship_fires: "solid",
  burning_droplets: "liquid",
  acme_gas_flames: "gas",
  smoke_and_dust_sensors: "sensor",
  ground_study: "analysis",
};
const FUEL_KIND_BY_STUDY: Record<string, FuelKind> = {
  spice: "gas",
  slice: "gas",
  "acme-bre": "gas emulating solids",
};

export function fuelKindOf(studyId: string, hardwareFamily: string): FuelKind {
  return FUEL_KIND_BY_STUDY[studyId] ?? FUEL_KIND_BY_FAMILY[hardwareFamily] ?? "analysis";
}

export const PSI_PER_ATM = 14.696;
export const atmToPsi = (atm: number) => atm * PSI_PER_ATM;
export const psiToAtm = (psi: number) => psi / PSI_PER_ATM;

/** Points per condition. A "yes" earns all of them, "partial" half, "no" none. */
export const WEIGHTS = { oxygen: 35, pressure: 25, gravity: 15, fuel: 25 } as const;

export interface ScoringStudy {
  id: string;
  environment: "space" | "ground";
  hardwareFamily: string;
  oxygenRange: readonly [number, number] | null;
  pressureRange: readonly [number, number] | null;
  tests: number;
}

/** Mission conditions in the units the prep used: oxygen %, pressure atm, gravity g. */
export interface MissionConditions {
  o2Min: number;
  o2Max: number;
  pMinAtm: number;
  pMaxAtm: number;
  g: number;
}

export interface MatchResult {
  oxygen: MatchLevel;
  pressure: MatchLevel;
  gravity: MatchLevel;
  fuel: MatchLevel;
  score: number;
  assumed: string[];
}

/** Python's round(): halves go to the nearest even integer (12.5 -> 12, 67.5 -> 68). */
export function pyRound(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

const VALUE: Record<MatchLevel, number> = { yes: 1, partial: 0.5, no: 0 };

export function scoreStudy(s: ScoringStudy, m: MissionConditions): MatchResult {
  const o2 = s.oxygenRange ?? [21, 21];
  const o2Assumed = !s.oxygenRange;
  const p = s.pressureRange ?? [1.0, 1.0];
  const pAssumed = !s.pressureRange;

  let oxygen: MatchLevel;
  if (o2[1] >= m.o2Min && o2[0] <= m.o2Max) oxygen = "yes";
  else if (o2[1] >= m.o2Min - 5) oxygen = "partial";
  else oxygen = "no";

  let pressure: MatchLevel;
  if (p[0] <= m.pMaxAtm + 1e-6 && p[1] >= m.pMinAtm - 1e-6) pressure = "yes";
  else if (p[0] <= m.pMaxAtm + 0.2) pressure = "partial";
  else pressure = "no";

  // PSI has 0 g and 1 g data only: they bound the Moon and Mars.
  const gravity: MatchLevel = m.g === 0 ? (s.environment === "space" ? "yes" : "no") : "partial";

  const kind = fuelKindOf(s.id, s.hardwareFamily);
  const fuel: MatchLevel =
    kind === "solid" ? "yes" : ["gas emulating solids", "gas", "liquid", "sensor"].includes(kind) ? "partial" : "no";

  const score = pyRound(
    WEIGHTS.oxygen * VALUE[oxygen] +
      WEIGHTS.pressure * VALUE[pressure] +
      WEIGHTS.gravity * VALUE[gravity] +
      WEIGHTS.fuel * VALUE[fuel],
  );

  const assumed: string[] = [];
  if (o2Assumed) assumed.push("oxygen 21% (cabin air)");
  if (pAssumed) assumed.push("pressure about 1 atm");
  return { oxygen, pressure, gravity, fuel, score, assumed };
}

/** Studies the prep ranks: flown in space with at least one test in their table. */
export function isRankable(s: Pick<ScoringStudy, "environment" | "tests">): boolean {
  return s.environment === "space" && s.tests > 0;
}

/** Same order as the prep: highest score first, then more tests first, then data order. */
export function rankStudies<T extends ScoringStudy>(studies: T[], m: MissionConditions) {
  return studies
    .filter(isRankable)
    .map((study) => ({ study, match: scoreStudy(study, m) }))
    .sort((a, b) => b.match.score - a.match.score || b.study.tests - a.study.tests);
}

export type Relevance = "High" | "Medium" | "Low";

/** Badge level for a match score: 70 or more is High, 40 to 69 Medium, under 40 Low. */
export function relevanceOf(score: number): Relevance {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}
