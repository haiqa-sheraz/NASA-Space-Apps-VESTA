"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MissionPicker } from "@/components/shell/MissionPicker";
import { AiLabel, MatchBar } from "@/components/ui/Tags";
import { useFlip, useSettled } from "@/lib/hooks/useFlip";
import type { StudyIndexEntry } from "@/lib/data/types";
import { MISSIONS } from "@/lib/missions";
import { rankedFor } from "@/lib/ranked";
import { usePrefs } from "@/lib/state/prefs";

/** Home: the top 3 studies for the chosen mission, with "See full ranking". Rows slide when the mission changes. */
export function MissionSpotlight({ index }: { index: StudyIndexEntry[] }) {
  const { mission, custom } = usePrefs();
  const top = useMemo(() => rankedFor(mission, custom, index).slice(0, 3), [mission, custom, index]);
  const anyAi = top.some((item) => item.whyIsAi);
  const settled = useSettled();
  const listRef = useFlip<HTMLOListElement>(top.map((item) => item.study.id).join(","), settled);

  return (
    <section className="stack g4" aria-labelledby="spotlight-title">
      {/* The picker stays on the right whatever the title's length. */}
      <div className="spot-head">
        <div className="stack g1">
          <span className="label">Mission spotlight</span>
          <h2 id="spotlight-title" className="h3">
            Top 3 for {MISSIONS[mission].inSentence}
          </h2>
        </div>
        <div className="spot-picker">
          <MissionPicker presetsOnly />
        </div>
      </div>
      {anyAi && (
        <span className="self-start">
          <AiLabel text="AI-written reasons" />
        </span>
      )}
      <ol ref={listRef}>
        {top.map((item, i) => (
          <li key={item.study.id} className="spot-row" data-flip-key={item.study.id}>
            <span className="bignum" style={{ fontSize: 27 }} aria-hidden="true">
              {i + 1}
            </span>
            <div className="stack">
              <Link href={`/study/${item.study.id}`} className="h5 name-link">
                {item.study.shortName}
              </Link>
              <span className="small muted">{item.why}</span>
            </div>
            <MatchBar score={item.match.score} />
          </li>
        ))}
      </ol>
      <Link className="btn btn-secondary self-start" href="/planner">
        See full ranking
      </Link>
    </section>
  );
}
