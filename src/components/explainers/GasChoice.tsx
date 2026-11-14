"use client";

import { useState } from "react";
import type { FlexOutcome, GasResult, GasesData } from "@/lib/explainer-types";
import { fmtRange, formatCount, joinAnd } from "@/lib/format";
import { OUTCOME_LABEL } from "@/lib/prediction";
import { XpChoice, XpStatus } from "./shared";

/**
 * How each FLEX test ended, as the PSI-69 table records it (meanings from the FLEX results report).
 * Job colors are kept for job content, so the outcomes use blue, a hatch and an outline, with labels.
 */
const OUTCOMES: { id: FlexOutcome; label: string }[] = (["extinction", "disruption", "completion"] as const).map((id) => ({ id, label: OUTCOME_LABEL[id] }));

function summary(g: GasResult): string {
  const oxygen = `${fmtRange(g.oxygenPct)}% oxygen`;
  if (g.id === "none" || !g.gasPct) return `${formatCount(g.tests)} FLEX tests had no added CO₂ or helium, at ${oxygen}.`;
  const gas = g.id === "co2" ? "CO₂" : "helium";
  return `In ${formatCount(g.tests)} FLEX tests, ${gas} made up ${fmtRange(g.gasPct)}% of the gas around the drop, at ${oxygen}.`;
}

/** Journey chapter 6: choose a gas and see how FLEX's drop tests with it ended (counts from the table). */
export function GasChoice({ data }: { data: GasesData }) {
  const [current, setCurrent] = useState<GasResult["id"]>("co2");
  const g = data.gases.find((x) => x.id === current) ?? data.gases[0];
  const top = OUTCOMES.reduce((a, b) => (g.outcomes[b.id] > g.outcomes[a.id] ? b : a));
  const share = (n: number) => Math.round((n / g.tests) * 100);

  return (
    <div className="chamber xp" data-theme="dark">
      <div className="row" style={{ justifyContent: "center" }}>
        <XpChoice label="Gas added to the air" value={current} options={data.gases.map((x) => ({ id: x.id, label: x.label }))} onChange={setCurrent} />
      </div>
      <p className="xp-lead">{summary(g)}</p>
      <figure className="stack g3" style={{ margin: 0 }}>
        <div className="xp-stack" role="img" aria-label={OUTCOMES.map((o) => `${o.label}: ${g.outcomes[o.id]} of ${g.tests}`).join(". ")}>
          {OUTCOMES.filter((o) => g.outcomes[o.id] > 0).map((o) => (
            <i key={o.id} data-outcome={o.id} style={{ width: `${(g.outcomes[o.id] / g.tests) * 100}%` }} />
          ))}
        </div>
        <ul className="stack g2 xp-outcomes">
          {OUTCOMES.map((o) => (
            <li key={o.id} className="row g3">
              <span aria-hidden="true" className="xp-swatch" data-outcome={o.id} />
              <span style={{ flex: 1, minWidth: 0 }}>{o.label}</span>
              <span className="num strong">{formatCount(g.outcomes[o.id])}</span>
              <span className="num xp-pct">{share(g.outcomes[o.id])}%</span>
            </li>
          ))}
        </ul>
        <figcaption className="small" style={{ color: "#DCCFC7" }}>
          Fuels: {joinAnd(data.fuels)}. These tests also differ in oxygen, pressure and drop size, so the counts show what FLEX tested, not the effect of the gas alone.
        </figcaption>
      </figure>
      <XpStatus title={g.label}>
        Most often: {top.label.toLowerCase()} ({formatCount(g.outcomes[top.id])} of {formatCount(g.tests)} tests).
      </XpStatus>
    </div>
  );
}
