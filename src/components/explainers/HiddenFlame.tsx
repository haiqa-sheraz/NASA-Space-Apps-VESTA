"use client";

import { useState } from "react";
import { XpChoice, XpStatus, useSvgId } from "./shared";

type Stage = "bright" | "cool" | "out";

const STAGES: { id: Stage; label: string; title: string; text: string; drop: number }[] = [
  { id: "bright", label: "Bright flame", title: "Bright flame", text: "A bright, hot flame surrounds the fuel drop.", drop: 16 },
  {
    id: "cool",
    label: "Cool flame",
    title: "Cool flame",
    text: "The bright flame has gone out, but a faint, low-temperature cool flame keeps burning around the drop.",
    drop: 12,
  },
  { id: "out", label: "Both out", title: "Both out", text: "The cool flame goes out too, while some of the drop is still left.", drop: 9 },
];

/**
 * Hidden flame (FLEX, NTRS 20140006750): large fuel drops kept burning as a faint cool flame after
 * the visible flame went out, until the cool flame went out too. Stages change instantly.
 */
export function HiddenFlame() {
  const [stage, setStage] = useState<Stage>("bright");
  const id = useSvgId("hf");
  const s = STAGES.find((x) => x.id === stage)!;
  return (
    <div className="chamber xp" data-theme="dark" style={{ maxWidth: 560 }}>
      <svg viewBox="0 0 220 200" className="xp-svg" style={{ maxWidth: 240, margin: "0 auto" }} role="img" aria-label={`A fuel drop in orbit. ${s.text}`}>
        <defs>
          <radialGradient id={`${id}-b`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#FF9A52" stopOpacity="0.05" />
            <stop offset="0.6" stopColor="#FFB86E" stopOpacity="0.55" />
            <stop offset="0.85" stopColor="#FFE2B0" stopOpacity="0.95" />
            <stop offset="1" stopColor="#FFE2B0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-d`} cx="40%" cy="38%" r="60%">
            <stop offset="0" stopColor="#F3EAE5" />
            <stop offset="1" stopColor="#8E7C71" />
          </radialGradient>
        </defs>
        {stage === "bright" && <circle cx="110" cy="96" r="66" fill={`url(#${id}-b)`} />}
        {stage === "cool" && (
          <>
            <circle cx="110" cy="96" r="38" fill="rgba(205, 185, 255, 0.07)" stroke="#CDB9FF" strokeOpacity="0.4" strokeWidth="5" />
            <text x="110" y="180" textAnchor="middle" fontSize="12" fill="#CDB9FF">
              Cool flame, very hard to see
            </text>
          </>
        )}
        {stage === "out" && (
          <text x="110" y="180" textAnchor="middle" fontSize="12" fill="#B5A59C">
            Drop still left
          </text>
        )}
        <circle cx="110" cy="96" r={s.drop} fill={`url(#${id}-d)`} />
      </svg>
      <div className="row" style={{ justifyContent: "center" }}>
        <XpChoice label="Stage" value={stage} options={STAGES.map(({ id: v, label }) => ({ id: v, label }))} onChange={setStage} />
      </div>
      <XpStatus title={s.title}>{s.text}</XpStatus>
    </div>
  );
}
