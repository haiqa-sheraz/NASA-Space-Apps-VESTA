import { rankingMission } from "@/lib/data/rankings";
import type { StudyIndexEntry } from "@/lib/data/types";
import { customReason, missionView } from "@/lib/mission-view";
import { MISSIONS, type CustomConditions, type MissionId } from "@/lib/missions";
import { rankStudies, type MatchResult } from "@/lib/scoring";

export interface RankedItem {
  study: StudyIndexEntry;
  match: MatchResult;
  /** One-line reason: AI-written for preset missions, computed for Custom. */
  why: string;
  whyIsAi: boolean;
}

/**
 * Ranked studies for a mission. Presets read scores and reasons from rankings.json;
 * Custom scores with the same rules in lib/scoring.ts. Used by Home, Explore, Study and Planner,
 * so every page shows the same numbers.
 */
export function rankedFor(missionId: MissionId, custom: CustomConditions, index: StudyIndexEntry[]): RankedItem[] {
  const byId = new Map(index.map((s) => [s.id, s]));
  const key = MISSIONS[missionId].rankingKey;

  if (key) {
    return rankingMission(key).studies.flatMap((row) => {
      const study = byId.get(row.study_id);
      if (!study) return [];
      const match: MatchResult = {
        oxygen: row.oxygen,
        pressure: row.pressure,
        gravity: row.gravity,
        fuel: row.fuel,
        score: row.score,
        assumed: row.assumed,
      };
      return [{ study, match, why: row.why ?? customReason(match), whyIsAi: Boolean(row.why) }];
    });
  }

  const view = missionView(missionId, custom);
  return rankStudies(index, view.conditions).map(({ study, match }) => ({
    study,
    match,
    why: customReason(match),
    whyIsAi: false,
  }));
}
