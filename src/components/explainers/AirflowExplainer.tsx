"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/Controls";
import type { AirflowData } from "@/lib/explainer-types";
import { fmtNum } from "@/lib/format";
import { XpLegend, XpStatus, useSvgId } from "./shared";

const MAX = 50;
/** Flame on both faces of a thin sheet, its front at x = 146, trailing downstream (to the right). */
const FLAME_TOP = "M146 104 C146 90 160 80 182 80 C210 80 236 92 250 104 Z";
const FLAME_BOTTOM = "M146 107 C146 121 160 131 182 131 C210 131 236 119 250 107 Z";

/**
 * Fan slider (BASS-II, thin plastic sheets): too little airflow and the flame dies out, too much and
 * it blows out. The limits come from finding f2. An illustration. While it burns, the flame grows
 * with the airflow (more air brings more oxygen), following the slider in 150 ms.
 */
export function AirflowExplainer({ data }: { data: AirflowData }) {
  const [speed, setSpeed] = useState(10);
  const id = useSvgId("af");
  const state = speed < data.quench ? "starved" : speed >= data.blowoff ? "blown" : "burning";
  const q = fmtNum(data.quench);
  const b = fmtNum(data.blowoff);
  const status = {
    starved: { title: "Flame out: too little air", detail: `BASS-II flames died out below about ${q} cm/s.` },
    burning: { title: "Flame burning", detail: `Between about ${q} and ${b} cm/s, the flame kept burning.` },
    blown: { title: "Flame out: blown out", detail: `BASS-II flames blew out near ${b} cm/s.` },
  }[state];
  const arrow = speed === 0 ? 0 : 14 + (speed / MAX) * 86;
  const shift = state === "blown" ? 46 : 0;
  // From 0.75 just above the quench limit to 1.1 near blowoff, scaled about the flame front.
  const grow = 0.75 + 0.35 * Math.min(1, Math.max(0, (speed - data.quench) / (data.blowoff - data.quench)));

  return (
    <div className="chamber xp" data-theme="dark">
      <svg viewBox="0 0 320 160" className="xp-svg" style={{ maxWidth: 420, margin: "0 auto" }} role="img" aria-label={`A thin plastic sheet in ${fmtNum(speed)} cm/s of airflow. ${status.title}.`}>
        <defs>
          <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#A9C4FF" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#5B8DFF" stopOpacity="0.85" />
            <stop offset="1" stopColor="#2A54C9" stopOpacity="0.25" />
          </linearGradient>
          <marker id={`${id}-a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill="#B5A59C" />
          </marker>
        </defs>
        {/* Airflow, from the left */}
        {arrow > 0 &&
          [62, 84, 128, 150].map((y) => <line key={y} x1="20" y1={y} x2={20 + arrow} y2={y} stroke="#B5A59C" strokeWidth="1.5" markerEnd={`url(#${id}-a)`} />)}
        {/* Sheet: unburned ahead of the flame, charred behind it */}
        <rect x="20" y="104" width="126" height="3" fill="#B5A59C" />
        <rect x="146" y="104" width="154" height="3" fill="#4A3A33" />
        {/* The flame and its dashed outline are both drawn and crossfade (150 ms); blown out slides downstream. */}
        <g className="xp-fade" style={{ opacity: state === "burning" ? 1 : 0, transform: `scale(${grow.toFixed(3)})`, transformOrigin: "146px 105.5px" }}>
          <path d={FLAME_TOP} fill={`url(#${id}-f)`} />
          <path d={FLAME_BOTTOM} fill={`url(#${id}-f)`} />
        </g>
        <g className="xp-fade" style={{ opacity: state === "burning" ? 0 : state === "blown" ? 0.7 : 1, transform: `translateX(${shift}px)` }}>
          <path d={FLAME_TOP} fill="none" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="4 5" />
          <path d={FLAME_BOTTOM} fill="none" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="4 5" />
        </g>
        <text x="20" y="40" fontSize="12" fill="#B5A59C">
          {speed === 0 ? "No airflow" : "Airflow"}
        </text>
      </svg>
      <Slider
        label="Airflow"
        strongLabel
        value={speed}
        min={0}
        max={MAX}
        step={1}
        format={(v) => `${fmtNum(v)} cm/s`}
        markers={[
          { value: data.quench, color: "var(--text-2)" },
          { value: data.blowoff, color: "var(--text-2)" },
        ]}
        axis={[
          { value: 0, label: "0 cm/s" },
          { value: MAX, label: `${MAX} cm/s` },
        ]}
        hint="An illustration, not to scale. The limits are from BASS-II tests on thin plastic sheets."
        onChange={setSpeed}
      />
      <XpLegend
        items={[
          { color: "var(--text-2)", label: `Dies out below about ${q} cm/s` },
          { color: "var(--text-2)", label: `Blows out near ${b} cm/s` },
        ]}
      />
      <XpStatus title={status.title}>{status.detail}</XpStatus>
    </div>
  );
}
