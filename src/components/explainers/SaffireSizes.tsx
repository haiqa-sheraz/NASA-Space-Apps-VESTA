"use client";

import { useState } from "react";
import { SourceChip } from "@/components/ui/SourceChip";
import type { SaffireFlight } from "@/lib/explainer-types";
import { fmtNum, joinAnd } from "@/lib/format";
import { XpChoice, XpStatus } from "./shared";

const W = 400;
const PAD = 20;

/** Journey chapter 4: each Saffire flight's largest sample, from its PSI table, drawn to scale. */
export function SaffireSizes({ flights }: { flights: SaffireFlight[] }) {
  const [current, setCurrent] = useState(flights[0].id);
  const flight = flights.find((f) => f.id === current) ?? flights[0];

  // One scale for every flight, so sizes compare directly: a 10 cm grid that fits the largest sample.
  const gridLength = Math.ceil(Math.max(...flights.map((f) => f.sample.length)) / 10) * 10;
  const gridWidth = Math.ceil(Math.max(...flights.map((f) => f.sample.width)) / 10) * 10;
  const scale = (W - PAD * 2) / gridLength;
  const height = gridWidth * scale + PAD * 2 + 28;
  const size = (f: SaffireFlight) => `${fmtNum(f.sample.length)} cm × ${fmtNum(f.sample.width)} cm`;
  const distinct = flights.filter((f, i) => flights.findIndex((g) => g.sample.length === f.sample.length && g.sample.width === f.sample.width) === i);

  return (
    <div className="chamber xp" data-theme="dark">
      <div className="row" style={{ justifyContent: "center" }}>
        <XpChoice label="Saffire flight" value={current} options={flights.map((f) => ({ id: f.id, label: f.shortName }))} onChange={setCurrent} />
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} className="xp-svg" style={{ maxWidth: 520, margin: "0 auto" }} role="img" aria-label={`${flight.shortName}: largest sample ${size(flight)}, drawn to scale on a 10 cm grid.`}>
        {/* 10 cm grid */}
        {Array.from({ length: gridLength / 10 + 1 }, (_, i) => (
          <line key={`v${i}`} x1={PAD + i * 10 * scale} y1={PAD} x2={PAD + i * 10 * scale} y2={PAD + gridWidth * scale} stroke="#3E2B23" />
        ))}
        {Array.from({ length: gridWidth / 10 + 1 }, (_, i) => (
          <line key={`h${i}`} x1={PAD} y1={PAD + i * 10 * scale} x2={PAD + gridLength * scale} y2={PAD + i * 10 * scale} stroke="#3E2B23" />
        ))}
        {/* Other flights' samples, for comparison */}
        {distinct
          .filter((f) => f.sample.length !== flight.sample.length || f.sample.width !== flight.sample.width)
          .map((f) => (
            <rect key={f.id} x={PAD} y={PAD} width={f.sample.length * scale} height={f.sample.width * scale} fill="none" stroke="#7D695E" strokeDasharray="4 5" />
          ))}
        <rect x={PAD} y={PAD} width={flight.sample.length * scale} height={flight.sample.width * scale} fill="rgba(91, 141, 255, 0.22)" stroke="#5B8DFF" strokeWidth="2" />
        {/* Scale bar */}
        <line x1={PAD} y1={height - 14} x2={PAD + 10 * scale} y2={height - 14} stroke="#B5A59C" strokeWidth="2" />
        <text x={PAD + 10 * scale + 8} y={height - 10} fontSize="12" fill="#B5A59C">
          10 cm
        </text>
      </svg>
      <dl className="xp-facts">
        <div>
          <dt>Largest sample</dt>
          <dd className="num">{size(flight)}</dd>
        </div>
        <div>
          <dt>Materials in the table</dt>
          <dd>{joinAnd(flight.materials)}</dd>
        </div>
      </dl>
      <div className="row g2 wrapx small" style={{ color: "#DCCFC7" }}>
        <span>Sizes from the test table:</span>
        <SourceChip source={flight.psi} />
      </div>
      <XpStatus title={flight.shortName}>
        Largest sample {size(flight)}. Dashed outlines show the other flights' samples at the same scale.
      </XpStatus>
    </div>
  );
}
