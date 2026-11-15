"use client";

import { RotateCcw, Wind } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { EarthFlame, FlameDefs } from "@/components/ui/FlameSvg";
import { XpStatus, useSvgId } from "./shared";
import { SmokeDefs, smokeFill, smokeFilter } from "./Smoke";

/* Smoke: soft billowing puffs that merge into one cloud, rising straight up on Earth and drifting
   with the cabin air in orbit (fixed positions). Released, each puff travels there from the fire:
   quickly on Earth, slowly in orbit, then keeps billowing; each detector lights once the smoke
   arrives (SAME: it takes longer in space). Reduced motion: the smoke is simply there. */
const EARTH_FIRE = [110, 128] as const;
const SPACE_FIRE = [86, 104] as const;
const EARTH_TIMING = { each: 900, stagger: 140, detector: 1400 };
const SPACE_TIMING = { each: 1600, stagger: 260, detector: 3600 };
const puffStyle = (fire: readonly [number, number], x: number, y: number, i: number, t: { each: number; stagger: number }) =>
  ({
    "--fx": `${fire[0] - x}px`,
    "--fy": `${fire[1] - y}px`,
    "--puff-ms": `${t.each}ms`,
    "--puff-delay": `${i * t.stagger}ms`,
    "--billow-delay": `${t.each + i * t.stagger}ms`,
    "--bx": `${[3, -3, 2, -2, 4, -4][i % 6]}px`,
    "--by": `${[-2, -3, 2, -1, 3, -2][i % 6]}px`,
  }) as CSSProperties;
const detectorStyle = (released: boolean, delay: number): CSSProperties => ({ fill: released ? "#B9B6CF" : "#7D695E", transitionDelay: released ? `${delay}ms` : "0ms" });
/* [x, y, radius]: a column from the fire up to the ceiling, spreading along it to the detector. */
const EARTH_PUFFS = [
  [110, 116, 8],
  [109, 103, 10],
  [111, 90, 11],
  [108, 77, 12],
  [111, 64, 13],
  [109, 51, 14],
  [110, 39, 15],
  [98, 30, 14],
  [122, 30, 14],
  [86, 27, 12],
  [134, 27, 12],
  [76, 26, 10],
  [144, 26, 10],
] as const;
/* [x, y, radius]: a wide, drifting cloud carried by the cabin air toward the return vent. */
const SPACE_PUFFS = [
  [92, 100, 10],
  [102, 94, 12],
  [114, 90, 13],
  [72, 96, 10],
  [127, 86, 14],
  [106, 110, 11],
  [140, 85, 14],
  [62, 108, 9],
  [122, 106, 13],
  [153, 86, 14],
  [84, 118, 10],
  [140, 100, 13],
  [165, 85, 13],
  [158, 98, 12],
  [176, 86, 12],
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
        <SmokeDefs id={`${id}-sm`} area={[0, 0, 220, 170]} />
      </defs>
      <FlameDefs id={(name) => `${id}-f-${name}`} />
      <rect x="10" y="10" width="200" height="150" rx="4" fill="#1F130F" stroke="#3E2B23" />
      {earth ? (
        <>
          {/* Ceiling detector */}
          <rect className="sr-detector" x="96" y="10" width="28" height="9" rx="2" style={detectorStyle(released, EARTH_TIMING.detector)} />
          <text x="132" y="24" fontSize="11" fill="#B5A59C">
            Detector
          </text>
          {/* Fire on the floor: the Earth flame, small */}
          <g transform="translate(94 123.8) scale(0.16)">
            <EarthFlame id={(name) => `${id}-f-${name}`} flicker />
          </g>
          {!released && (
            <>
              <line x1="90" y1="140" x2="90" y2="100" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="3 4" markerEnd={`url(#${id}-a)`} />
              <line x1="130" y1="140" x2="130" y2="100" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="3 4" markerEnd={`url(#${id}-a)`} />
              <text x="16" y="124" fontSize="11" fill="#B5A59C">
                Hot air rises
              </text>
            </>
          )}
          {released && (
            <g filter={smokeFilter(`${id}-sm`)}>
              {EARTH_PUFFS.map(([x, y, r], i) => (
                <circle key={i} className="sr-puff" cx={x} cy={y} r={Math.round(r * 13) / 10} fill={smokeFill(`${id}-sm`)} style={puffStyle(EARTH_FIRE, x, y, i, EARTH_TIMING)} />
              ))}
            </g>
          )}
        </>
      ) : (
        <>
          {/* Air return vent on the right wall, with the detector inside it */}
          <rect x="196" y="60" width="10" height="50" fill="#2A1A14" stroke="#7D695E" />
          {[68, 76, 84, 92, 100].map((y) => (
            <line key={y} x1="197" y1={y} x2="205" y2={y} stroke="#7D695E" />
          ))}
          <rect className="sr-detector" x="184" y="76" width="9" height="18" rx="2" style={detectorStyle(released, SPACE_TIMING.detector)} />
          <text x="204" y="153" fontSize="11" fill="#B5A59C" textAnchor="end">
            Air return vent
          </text>
          {/* Cabin airflow toward the vent */}
          <path d="M20 40 C70 24 120 34 150 52 C170 64 176 76 182 82" fill="none" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="3 4" markerEnd={`url(#${id}-a)`} />
          <path d="M24 140 C70 150 130 132 182 100" fill="none" stroke="#7D695E" strokeWidth="1.5" strokeDasharray="3 4" markerEnd={`url(#${id}-a)`} />
          {/* Round flame in the middle of the cabin */}
          <circle cx="86" cy="104" r="12" fill={`url(#${id}-s)`} />
          {released && (
            <g filter={smokeFilter(`${id}-sm`)}>
              {SPACE_PUFFS.map(([x, y, r], i) => (
                <circle key={i} className="sr-puff" cx={x} cy={y} r={Math.round(r * 13) / 10} fill={smokeFill(`${id}-sm`)} style={puffStyle(SPACE_FIRE, x, y, i, SPACE_TIMING)} />
              ))}
            </g>
          )}
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
