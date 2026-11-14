"use client";

import { useMemo } from "react";
import { MissionPicker } from "@/components/shell/MissionPicker";
import { MatchBar, MatchChip } from "@/components/ui/Tags";
import type { StudyIndexEntry } from "@/lib/data/types";
import { explainMatch, matchChipLabel, missionView } from "@/lib/mission-view";
import { MISSIONS } from "@/lib/missions";
import { rankedFor } from "@/lib/ranked";
import { relevanceOf, WEIGHTS } from "@/lib/scoring";
import { usePrefs } from "@/lib/state/prefs";

/** Study page: how well this study matches the chosen mission, with a reason for each condition. */
export function StudyRelevance({ study, index }: { study: StudyIndexEntry; index: StudyIndexEntry[] }) {
  const { mission, custom } = usePrefs();
  const view = missionView(mission, custom);
  const item = useMemo(
    () => (study.status === "ranked" ? rankedFor(mission, custom, index).find((r) => r.study.id === study.id) : undefined),
    [study, mission, custom, index],
  );
  const reasons = item ? explainMatch(study, item.match, view) : null;
  const title = mission === "custom" ? "Relevance to your custom conditions" : `Relevance to ${MISSIONS[mission].label}`;

  return (
    <aside className="panel pad stack g4" aria-labelledby="relevance-title">
      <div className="stack g3">
        <h2 id="relevance-title" className="h4">
          {title}
        </h2>
        <span className="self-start">
          <MissionPicker />
        </span>
      </div>
      {!item ? (
        <p className="small muted">
          {study.status === "ground"
            ? "Not ranked. Ground studies analyze data on Earth and have no test conditions to match."
            : `Not ranked. ${study.shortName} lists planned tests only, so there are no tested conditions to match.`}
        </p>
      ) : (
        <>
          <div className="stack g1">
            <MatchBar score={item.match.score} />
            <span className="small muted">{relevanceOf(item.match.score)} relevance</span>
          </div>
          <ul className="stack g3">
            {(["fuel", "oxygen", "pressure", "gravity"] as const).map((dim) => (
              <li key={dim} className="stack g1">
                <span className="self-start">
                  <MatchChip level={item.match[dim]} label={matchChipLabel(dim, item.match[dim], study.id, study.hardwareFamily)} />
                </span>
                <span className="small muted">{reasons?.[dim]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <details className="how small">
        <summary>How the match is worked out</summary>
        <p className="muted" style={{ marginTop: 8 }}>
          Oxygen counts for {WEIGHTS.oxygen} points, pressure {WEIGHTS.pressure}, gravity {WEIGHTS.gravity} and fuel type{" "}
          {WEIGHTS.fuel}. A yes earns all of a condition&apos;s points, partial earns half and no earns none. The score comes
          from the PSI data tables, not from AI. When a table doesn&apos;t list oxygen or pressure, the score assumes cabin
          air (21% oxygen, about 1 atm) and says so. High is 70 or more, Medium 40 to 69, Low under 40.
        </p>
      </details>
    </aside>
  );
}
