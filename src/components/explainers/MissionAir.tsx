"use client";

import Link from "next/link";
import { useState } from "react";
import { NoteText } from "@/components/ui/NoteText";
import type { MissionAirData } from "@/lib/explainer-types";
import { fmtNum, sentenceCase } from "@/lib/format";
import type { MissionId } from "@/lib/missions";
import { atmToPsi } from "@/lib/scoring";
import { XpChoice } from "./shared";

/** One condition on a shared scale: the mission's band (or value) and the ISS for reference. */
function Bar({ name, lo, hi, openEnd, issValue, issLabel, max, valueText }: {
  name: string;
  lo: number;
  hi: number;
  openEnd: "high" | "low" | null;
  issValue: number;
  issLabel: string;
  max: number;
  valueText: string;
}) {
  const pos = (v: number) => `${(Math.min(Math.max(v, 0), max) / max) * 100}%`;
  const point = Math.abs(hi - lo) < 1e-9;
  return (
    <div className="xp-bar-row">
      <span className="small strong">{name}</span>
      <div className="xp-bar" aria-hidden="true">
        <span className="line" />
        {point ? (
          <b style={{ left: pos(lo) }} />
        ) : (
          <i data-open={openEnd ?? undefined} style={{ left: pos(lo), width: `calc(${pos(Math.min(hi, max))} - ${pos(lo)})` }} />
        )}
        <span className="iss" style={{ left: pos(issValue) }} />
        <span className="iss-label" data-edge={issValue / max > 0.85 ? "end" : issValue / max < 0.15 ? "start" : undefined} style={{ left: pos(issValue) }}>
          {issLabel}
        </span>
      </div>
      <span className="small num xp-bar-val">{valueText}</span>
    </div>
  );
}

/** Journey chapter 8: pick a mission and compare its planned air with the station's. */
export function MissionAir({ data }: { data: MissionAirData }) {
  const [current, setCurrent] = useState<MissionId>("moon");
  const view = data.views.find((v) => v.id === current) ?? data.views[0];
  const iss = data.views.find((v) => v.id === "iss");
  if (!iss) return null;

  const c = view.conditions;
  const oxygenMax = Math.max(40, Math.ceil((Math.max(c.o2Min, iss.conditions.o2Min) + 6) / 10) * 10);
  const pressureMax = 15;
  const psi = (atm: number) => atmToPsi(atm);

  return (
    <div className="chamber xp" data-theme="dark">
      <div className="row" style={{ justifyContent: "center" }}>
        <XpChoice label="Mission" value={current} options={data.views.map((v) => ({ id: v.id, label: v.label }))} onChange={setCurrent} />
      </div>
      <figure className="stack g4" style={{ margin: 0 }} aria-label={`${view.label}: ${view.chips.map((ch) => ch.text).join(", ")}. ISS: ${iss.chips.map((ch) => ch.text).join(", ")}.`}>
        <div className="row g2 wrapx" style={{ justifyContent: "center" }}>
          {view.chips.map((ch) => (
            <span key={ch.kind} className="chip" style={{ background: "rgba(31,19,15,.85)" }}>
              {ch.text}
            </span>
          ))}
        </div>
        <Bar
          name="Oxygen"
          lo={c.o2Min}
          hi={c.o2Max}
          openEnd={c.o2Max > oxygenMax ? "high" : null}
          issValue={iss.conditions.o2Min}
          issLabel={`ISS ${fmtNum(iss.conditions.o2Min)}%`}
          max={oxygenMax}
          valueText={view.oxygenText}
        />
        <Bar
          name="Pressure"
          lo={psi(c.pMinAtm)}
          hi={psi(c.pMaxAtm)}
          openEnd={c.pMinAtm === 0 && c.pMaxAtm > 0 ? "low" : null}
          issValue={psi(iss.conditions.pMaxAtm)}
          issLabel={`ISS ${fmtNum(psi(iss.conditions.pMaxAtm), 1)} psi`}
          max={pressureMax}
          valueText={view.pressureText}
        />
        <div className="xp-bar-row">
          <span className="small strong">Gravity</span>
          <span className="small" style={{ color: "#DCCFC7" }}>
            {view.id === "iss" ? sentenceCase(view.gravityText) : `${sentenceCase(view.gravityText)}, where the ISS is at ${iss.gravityText}`}
          </span>
        </div>
        <figcaption className="small" style={{ color: "#DCCFC7" }}>
          <NoteText parts={view.note} />
        </figcaption>
      </figure>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link className="btn btn-secondary btn-sm" href={`/planner?mission=${view.id}`}>
          Rank studies for this mission
        </Link>
      </div>
    </div>
  );
}
