import raw from "../../../data/ai/rankings.json";
import { roundMeasurements } from "@/lib/format";
import type { MatchLevel, MissionConditions } from "@/lib/scoring";

/**
 * data/ai/rankings.json: scores computed in code by the prep (see lib/scoring.ts) with
 * one-sentence AI-written reasons. Safe to use in the browser (about 36 KB).
 */
export interface RankingRow {
  study_id: string;
  short_name: string;
  oxygen: MatchLevel;
  pressure: MatchLevel;
  gravity: MatchLevel;
  fuel: MatchLevel;
  score: number;
  assumed: string[];
  why: string | null;
}

export interface RankingMissionDef {
  name: string;
  o2_min: number;
  o2_max: number;
  p_max: number;
  p_min: number;
  g: number;
  note: string;
}

export interface RankingMission {
  mission: RankingMissionDef;
  studies: RankingRow[];
  model: string | null;
}

export interface RankingsFile {
  generated: string;
  scoring: string;
  missions: Record<string, RankingMission>;
}

/** rankings.json with over-precise numbers in the AI-written reasons rounded for display. */
export const RANKINGS: RankingsFile = (() => {
  const file = raw as unknown as RankingsFile;
  const missions = Object.fromEntries(
    Object.entries(file.missions).map(([key, m]) => [
      key,
      { ...m, studies: m.studies.map((s) => ({ ...s, why: s.why ? roundMeasurements(s.why) : s.why })) },
    ]),
  );
  return { ...file, missions };
})();

export function rankingMission(key: string): RankingMission {
  const mission = RANKINGS.missions[key];
  if (!mission) throw new Error(`rankings.json has no mission "${key}".`);
  return mission;
}

export function conditionsFromRanking(def: RankingMissionDef): MissionConditions {
  return { o2Min: def.o2_min, o2Max: def.o2_max, pMinAtm: def.p_min, pMaxAtm: def.p_max, g: def.g };
}
