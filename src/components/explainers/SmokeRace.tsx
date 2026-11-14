"use client";

import { RotateCcw, Wind } from "lucide-react";
import { useState } from "react";
import { XpStatus, useSvgId } from "./shared";

/* Smoke puffs: rising straight up on Earth; drifting with the cabin air in orbit (fixed positions). */
const EARTH_PUFFS = [
  [110, 128, 7],
  [107, 112, 8],
  [112, 96, 9],
  [108, 80, 10],
  [112, 64, 11],
  [109, 48, 12],
  [111, 33, 12],
] as const;
const SPACE_PUFFS = [
  [82, 104, 7],
  [70, 90, 8],
  [96, 82, 8],
  [62, 70, 9],
  [118, 78, 9],
  [140, 92, 10],
  [104, 112, 9],
  [160, 88, 10],
  [50, 112, 8],
  [178, 84, 9],
] as const;

function Cabin({ earth, released, id }: { earth: boolean; released: boolean; id: string }) {
  return (
    <svg viewBox="0 0 220 170" className="xp-svg" role="img" aria-label={earth ? (released ? "On Earth, the smoke rises straight to the detector on the ceiling." : "A cabin on Earth with a small fire on the floor and a smoke detector on the ceiling.") : released ? "In orbit, the smoke drifts around the cabin with the air flowing toward the return vent." : "A cabin in orbit with a small round flame, air flowing toward a return vent, and a detector in the vent."}>
      <defs>
        <marker id={`${id}-a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#7D695E" />
        </marker>
        <radialGradient id={`${id}-s`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#0B1736" stopOpacity="0.2" />
          <stop offset="0.7" stopColor="#5B8DFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#A9C4FF" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id={`${id}-e`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#4A78E6" />
          <stop offset="0.2" stopColor="#FF9A52" />
          <stop offset="1" stopColor="#FFE2B0" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="200" height="150" rx="4" fill="#1F130F" stroke="#3E2B23" />
      {earth ? (
        <>
          {/* Ceiling detector */}
          <rect x="96" y="10" width="28" height="9" rx="2" fill={released ? "#B9B6CF" : "#7D695E"} />
          <text x="132" y="24" fontSize="11" fill="#B5A59C">
            Detector
          </text>
          {/* Fire on the floor */}
          <path d="M110 132 C116 142 120 150 120 154 C120 159 115 161 110 161 C105 161 100 159 100 154 C100 150 104 142 110 132 Z" fill={`url(#${id}-e)`} transform="translate(0 -4)" />
          {!released && (
            <>
              <line x1="90" y1="140" x2="90" y2="100" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="3 4" markerEnd={`url(#${id}-a)`} />
              <line x1="130" y1="140" x2="130" y2="100" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="3 4" markerEnd={`url(#${id}-a)`} />
              <text x="16" y="124" fontSize="11" fill="#B5A59C">
                Hot air rises
              </text>
            </>
          )}
          {released && EARTH_PUFFS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#B9B6CF" opacity={0.3 + i * 0.08} />)}
        </>
      ) : (
        <>
          {/* Air return vent on the right wall, with the detector inside it */}
          <rect x="196" y="60" width="10" height="50" fill="#2A1A14" stroke="#7D695E" />
          {[68, 76, 84, 92, 100].map((y) => (
            <line key={y} x1="197" y1={y} x2="205" y2={y} stroke="#7D695E" />
          ))}
          <rect x="184" y="76" width="9" height="18" rx="2" fill={released ? "#B9B6CF" : "#7D695E"} />
          <text x="204" y="153" fontSize="11" fill="#B5A59C" textAnchor="end">
            Air return vent
          </text>
          {/* Cabin airflow toward the vent */}
          <path d="M20 40 C70 24 120 34 150 52 C170 64 176 76 182 82" fill="none" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="3 4" markerEnd={`url(#${id}-a)`} />
          <path d="M24 140 C70 150 130 132 182 100" fill="none" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="3 4" markerEnd={`url(#${id}-a)`} />
          {/* Round flame in the middle of the cabin */}
          <circle cx="86" cy="104" r="12" fill={`url(#${id}-s)`} />
          {released && SPACE_PUFFS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#B9B6CF" opacity={0.28 + (i % 4) * 0.08} />)}
        </>
      )}
    </svg>
  );
}

/** Smoke race (SAME, 2021 white paper): on Earth smoke rises to the ceiling; in orbit it goes where the air takes it. */
export function SmokeRace() {
  const [released, setReleased] = useState(false);
  const id = useSvgId("sr");
  return (
    <div className="chamber xp" data-theme="dark">
      <div className="xp-race">
        <figure>
          <Cabin earth released={released} id={`${id}-e`} />
          <figcaption>
            <b>Earth, 1 g</b>
            <span>{released ? "The smoke rises straight to the ceiling detector." : "Hot air carries smoke upward."}</span>
          </figcaption>
        </figure>
        <figure>
          <Cabin earth={false} released={released} id={`${id}-s`} />
          <figcaption>
            <b>Space, about 0 g</b>
            <span>{released ? "The smoke drifts wherever the air takes it, toward detectors in the air return vents." : "Nothing rises. Only the cabin air moves smoke."}</span>
          </figcaption>
        </figure>
      </div>
      <div className="row g3 wrapx" style={{ justifyContent: "center" }}>
        {released ? (
          <button type="button" className="btn btn-secondary" onClick={() => setReleased(false)}>
            <RotateCcw className="ic sm" aria-hidden="true" />
            Reset
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setReleased(true)}>
            <Wind className="ic sm" aria-hidden="true" />
            Release the smoke
          </button>
        )}
      </div>
      <XpStatus title={released ? "Smoke released" : "Ready"}>
        {released
          ? "On the station, smoke detectors sit in the cabin air return vents, because smoke doesn't rise to the ceiling. SAME found the smoke takes longer to reach a detector than on Earth."
          : "Release the smoke to see where it goes in each cabin."}
      </XpStatus>
    </div>
  );
}
