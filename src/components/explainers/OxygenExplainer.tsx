"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/Controls";
import { FlameSvg } from "@/components/ui/FlameSvg";
import type { OxygenData } from "@/lib/explainer-types";
import { fmtNum } from "@/lib/format";
import { XpLegend, XpStatus, useSvgId } from "./shared";

const WICK = "M100 186 L100 240";
const WISP = "M100 178 C94 160 110 148 102 126 C96 110 108 100 104 86";
const SPHERE = "M100 100 C133 100 160 127 160 160 C160 193 133 220 100 220 C67 220 40 193 40 160 C40 127 67 100 100 100 Z";

/**
 * Oxygen slider (BASS-II plastic rod, finding f1): on Earth the flame stopped at the Earth limit,
 * in space it kept burning down to the space limit. Below the lowest tested level there is no
 * data, so the space flame shows "no data" instead of a guess. States change instantly.
 */
export function OxygenExplainer({ data }: { data: OxygenData }) {
  const min = Math.min(10, Math.floor(data.space - 2));
  const max = Math.max(25, Math.ceil(data.iss + 3));
  const [oxygen, setOxygen] = useState(15);
  const id = useSvgId("ox");
  const earthOn = oxygen > data.earth;
  const spaceState = oxygen >= data.space ? "burning" : "untested";
  const pct = (v: number) => `${fmtNum(v, 1)}%`;

  const earthText = earthOn ? { title: "Earth: burning", detail: `Burns above ${pct(data.earth)}` } : { title: "Earth: out", detail: `Stopped at ${pct(data.earth)} on Earth` };
  const spaceText =
    spaceState === "burning"
      ? { title: "Space: burning", detail: `Kept burning down to ${pct(data.space)}` }
      : { title: "Space: no data", detail: `Not tested below ${pct(data.space)}` };

  return (
    <div className="chamber xp xp-oxygen" data-theme="dark">
      <div className="xp-pair" style={{ alignItems: "end" }}>
        <figure className="xp-flame" data-on="true">
          <div className="xp-flame-box" style={{ width: 100 }}>
            {earthOn ? (
              <FlameSvg mode="earth" idPrefix={`${id}-e`} label={`Earth flame burning at ${pct(oxygen)} oxygen`} />
            ) : (
              <svg viewBox="0 0 200 250" className="flame-svg" role="img" aria-label={`Earth flame is out at ${pct(oxygen)} oxygen`}>
                <path d={WICK} stroke="#6B5A50" strokeWidth="3" strokeLinecap="round" />
                <path d={WISP} stroke="#7D695E" strokeWidth="2" fill="none" strokeDasharray="3 5" />
              </svg>
            )}
          </div>
          <figcaption>
            <b>{earthText.title}</b>
            <span>{earthText.detail}</span>
          </figcaption>
        </figure>
        <figure className="xp-flame" data-on="true">
          <div className="xp-flame-box" style={{ width: 100 }}>
            {spaceState === "burning" ? (
              <FlameSvg mode="space" idPrefix={`${id}-s`} label={`Space flame burning at ${pct(oxygen)} oxygen`} />
            ) : (
              <svg viewBox="0 0 200 250" className="flame-svg" role="img" aria-label={`No space test data at ${pct(oxygen)} oxygen`}>
                <path d={SPHERE} fill="none" stroke="#7D695E" strokeWidth="2" strokeDasharray="4 6" />
                <path d={WICK} stroke="#6B5A50" strokeWidth="3" strokeLinecap="round" />
                <text x="100" y="168" textAnchor="middle" fontSize="40" fill="#B5A59C">
                  ?
                </text>
              </svg>
            )}
          </div>
          <figcaption>
            <b>{spaceText.title}</b>
            <span>{spaceText.detail}</span>
          </figcaption>
        </figure>
      </div>
      <div className="stack g2">
        <Slider
          label="Oxygen in the air"
          strongLabel
          value={oxygen}
          min={min}
          max={max}
          step={0.1}
          format={pct}
          markers={[
            { value: data.space, color: "var(--blue)" },
            { value: data.earth, color: "var(--ember)" },
          ]}
          axis={[
            { value: min, label: pct(min) },
            { value: data.iss, label: `ISS air ${pct(data.iss)}` },
            { value: max, label: pct(max) },
          ]}
          onChange={setOxygen}
        />
        <XpLegend
          items={[
            { color: "var(--blue)", label: `Space limit ${pct(data.space)}` },
            { color: "var(--ember)", label: `Earth limit ${pct(data.earth)}` },
          ]}
        />
        <XpStatus title={`At ${pct(oxygen)} oxygen`}>
          {earthText.title}. {spaceText.title}.
        </XpStatus>
      </div>
    </div>
  );
}
