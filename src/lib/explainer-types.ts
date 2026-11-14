import type { MissionView } from "@/lib/mission-view";
import type { SourceRef } from "@/lib/sources";

/**
 * Data for the interactive explainers (Learn and the Journey). Built at build time from data/
 * by src/lib/data/explainers.ts, so every number on screen comes from the data files.
 */

/** BASS-II plastic rod: lowest oxygen where it kept burning in space, and where it stopped on Earth. */
export interface OxygenData {
  space: number;
  earth: number;
  /** ISS cabin air, % oxygen. */
  iss: number;
  sources: SourceRef[];
}

/** BASS-II thin plastic sheets: flames died out below `quench` and blew out near `blowoff` (cm/s). */
export interface AirflowData {
  quench: number;
  blowoff: number;
  sources: SourceRef[];
}

export interface SaffireFlight {
  id: string;
  shortName: string;
  psi: SourceRef;
  /** Materials named in the flight's test table. */
  materials: string[];
  /** The largest sample in the table, in cm (width is the shorter side). */
  sample: { width: number; length: number };
}

export type FlexOutcome = "extinction" | "disruption" | "completion";

export interface GasResult {
  id: "co2" | "he" | "none";
  label: string;
  tests: number;
  /** Share of the added gas in the mix, % (null for "no added gas"). */
  gasPct: [number, number] | null;
  oxygenPct: [number, number];
  outcomes: Record<FlexOutcome, number>;
}

export interface GasesData {
  gases: GasResult[];
  fuels: string[];
  sources: SourceRef[];
}

export interface GravityData {
  space: number;
  ground: number;
  moonG: number;
  marsG: number;
  eFieldName: string;
  sources: SourceRef[];
}

export interface MissionAirData {
  views: MissionView[];
  sources: SourceRef[];
}

export type ExplainerKey = "gravity" | "fan" | "oxygen" | "smoke-race" | "hidden-flame" | "smoke-point";

export interface ExplainerInfo {
  key: ExplainerKey;
  title: string;
  /** One line for the Learn card. */
  blurb: string;
  /** The explainer text (60 words at most). */
  text: string;
  sources: SourceRef[];
}
