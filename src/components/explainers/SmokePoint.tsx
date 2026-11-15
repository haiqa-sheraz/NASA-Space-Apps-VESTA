"use client";

import { Cloud, Flame } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/Controls";
import { SourceLine } from "@/components/ui/SourceChip";
import type { SourceRef } from "@/lib/sources";
import { useSvgId } from "./shared";
import { RisingSmoke, SmokeDefs } from "./Smoke";

/** The marked size where soot starts to escape (an illustration, not a measured value). */
const SMOKE_POINT = 60;

/* With reduced motion: three still frames instead of the slider (design board 14). */
const STILLS = [
  { flow: 20, title: "Low flow", text: "No smoke. All the soot burns up inside the flame." },
  { flow: SMOKE_POINT, title: "At the smoke point", text: "The flame tip reaches the marked size." },
  { flow: 85, title: "Past it", text: "Soot escapes from the tip as smoke." },
] as const;

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The gas-jet flame outline for a fuel flow of 0 to 100 (the approved design's shape). With
 * `width` and `height` below 1, the bright core inside it.
 */
function jetFlame(flow: number, width = 1, height = 1) {
  const full = 40 + 1.5 * flow;
  const h = full * height;
  const tip = 240 - h;
  const w1 = (9.6 + 0.0336 * full) * width;
  const w2 = w1 + 2;
  const w3 = 0.6 * w1;
  const w4 = 0.343 * w1;
  const y2 = 240 - 0.45 * h;
  const y3 = 240 - 0.7 * h;
  const y4 = 240 - 0.9 * h;
  const L = (w: number) => r1(100 - w);
  const R = (w: number) => r1(100 + w);
  const path = `M100 240 C${L(w1)} 236 ${L(w2)} ${r1(y2)} ${L(w3)} ${r1(y3)} C${L(w4)} ${r1(y4)} 99 ${r1(tip)} 100 ${r1(tip)} C101 ${r1(tip)} ${R(w4)} ${r1(y4)} ${R(w3)} ${r1(y3)} C${R(w2)} ${r1(y2)} ${R(w1)} 236 100 240 Z`;
  return { path, tip, h };
}

export function flowText(flow: number): string {
  if (flow < 35) return "Low";
  if (flow < SMOKE_POINT) return "Rising";
  if (flow === SMOKE_POINT) return "At the smoke point";
  return "Past the smoke point";
}

/** The bright core of the gas flame. */
const coreFlame = (flow: number) => jetFlame(flow, 0.5, 0.72).path;

/** Smoke past the smoke point: thicker the further past the mark the flow goes. */
const smokeDensity = (sooty: number) => Math.round((0.45 + 0.55 * sooty) * 100) / 100;

/**
 * The chamber with the burner, the flame and (past the mark) smoke escaping from the tip. Live,
 * the smoke rises from the tip; back below the mark, no new smoke starts and the rest fades out.
 * `still` draws a fixed frame (the reduced-motion version).
 */
function SootChamber({ flow, still = false }: { flow: number; still?: boolean }) {
  const id = useSvgId("sp");
  const { path, tip, h } = jetFlame(flow);
  const past = flow > SMOKE_POINT;
  const sooty = Math.min(1, Math.max(0, (flow - SMOKE_POINT) / 25));
  // Soot already in the air fades out for 300 ms after the flow drops below the mark.
  const [fading, setFading] = useState(false);
  const wasPast = useRef(past);
  useEffect(() => {
    if (wasPast.current && !past && !still) {
      setFading(true);
      const timer = window.setTimeout(() => setFading(false), 300);
      wasPast.current = past;
      return () => window.clearTimeout(timer);
    }
    wasPast.current = past;
    if (past) setFading(false);
  }, [past, still]);
  return (
    <div className="chamber xp-soot" data-theme="dark">
      {past && (
        <span className="smoke-flag">
          <Cloud className="ic sm" aria-hidden="true" />
          Smoke point reached.
        </span>
      )}
      <div style={{ width: 240, maxWidth: "100%", margin: "0 auto" }}>
        <svg viewBox="0 0 200 280" style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={`Gas-jet flame on a burner: ${flowText(flow).toLowerCase()}.`}>
          <defs>
            <linearGradient id={`${id}-c`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#4A78E6" />
              <stop offset="0.12" stopColor="#5B8DFF" stopOpacity="0.9" />
              <stop offset="0.26" stopColor="#FF9A52" />
              <stop offset="0.7" stopColor="#FFB86E" />
              <stop offset="1" stopColor="#FFE2B0" />
            </linearGradient>
            <linearGradient id={`${id}-s`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#4A78E6" />
              <stop offset="0.12" stopColor="#5B8DFF" stopOpacity="0.9" />
              <stop offset="0.26" stopColor="#FF9A52" />
              <stop offset="0.66" stopColor="#FFB86E" />
              <stop offset="0.86" stopColor="#C4743A" />
              <stop offset="1" stopColor="#6B4A3A" />
            </linearGradient>
            <radialGradient id={`${id}-g`}>
              <stop offset="0" stopColor="#FF9A52" stopOpacity="0.22" />
              <stop offset="1" stopColor="#FF9A52" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${id}-k`} cx="50%" cy="70%" r="60%">
              <stop offset="0" stopColor="#FFFDF2" />
              <stop offset="0.45" stopColor="#FFF0C2" stopOpacity="0.85" />
              <stop offset="1" stopColor="#FFC266" stopOpacity="0" />
            </radialGradient>
            <filter id={`${id}-b`} x="-40%" y="-10%" width="180%" height="120%">
              <feGaussianBlur stdDeviation="1.8" />
            </filter>
            <SmokeDefs id={`${id}-sm`} area={[-20, -80, 240, 340]} />
          </defs>
          <ellipse className="sp-glow" cx="100" cy={r1(240 - h / 2)} rx="40" ry={r1(h / 2 + 22)} fill={`url(#${id}-g)`} />
          <line x1="22" x2="178" y1="110" y2="110" stroke="#B5A59C" strokeWidth="1" strokeDasharray="4 4" />
          <text x="178" y="104" textAnchor="end" fontSize="11" fill="#B5A59C">
            Smoke point
          </text>
          <g className={still ? undefined : "jet-flicker"}>
            <path className="sp-flame" d={path} fill={`url(#${id}-c)`} filter={`url(#${id}-b)`} />
            {sooty > 0 && <path className="sp-flame" d={path} fill={`url(#${id}-s)`} opacity={r1(sooty)} filter={`url(#${id}-b)`} />}
            <path className="sp-flame" d={coreFlame(flow)} fill={`url(#${id}-k)`} filter={`url(#${id}-b)`} opacity="0.85" />
          </g>
          {(past || (fading && !still)) && (
            <g className={past ? "smoking" : "smoking soot-going"}>
              <RisingSmoke id={`${id}-sm`} x={100} y={r1(tip - 2)} rise={80} size={8} drift={14} density={smokeDensity(sooty)} still={still} />
            </g>
          )}
          <rect x="93" y="240" width="14" height="24" rx="1" fill="#2A1A14" stroke="#7D695E" strokeWidth="1.5" />
          <rect x="66" y="264" width="68" height="8" rx="2" fill="#2A1A14" stroke="#7D695E" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

/** The reduced-motion version: three still frames, low flow, at the smoke point and past it. */
function SootStills() {
  return (
    <div className="soot-stills stack g3">
      <div className="soot-stills-grid">
        {STILLS.map((frame) => (
          <figure key={frame.flow} className="soot-still">
            <SootChamber flow={frame.flow} still />
            <figcaption>
              <b>{frame.title}</b>
              <span>{frame.text}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="small muted">An illustration, not to scale. The marked point is where soot starts to escape.</p>
    </div>
  );
}

/** A still, decorative flame past its smoke point, for the Learn card. */
export function SmokePointPreview() {
  const id = useSvgId("spp");
  const flow = 80;
  const { path, tip } = jetFlame(flow);
  return (
    <svg viewBox="0 0 200 280" style={{ display: "block", width: 90, height: "auto", overflow: "visible" }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#4A78E6" />
          <stop offset="0.12" stopColor="#5B8DFF" stopOpacity="0.9" />
          <stop offset="0.26" stopColor="#FF9A52" />
          <stop offset="0.66" stopColor="#FFB86E" />
          <stop offset="0.86" stopColor="#C4743A" />
          <stop offset="1" stopColor="#6B4A3A" />
        </linearGradient>
        <radialGradient id={`${id}-k`} cx="50%" cy="70%" r="60%">
          <stop offset="0" stopColor="#FFFDF2" />
          <stop offset="0.45" stopColor="#FFF0C2" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFC266" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-b`} x="-40%" y="-10%" width="180%" height="120%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <SmokeDefs id={`${id}-sm`} area={[-20, -80, 240, 340]} />
      </defs>
      <path d={path} fill={`url(#${id}-s)`} filter={`url(#${id}-b)`} />
      <path d={coreFlame(flow)} fill={`url(#${id}-k)`} filter={`url(#${id}-b)`} opacity="0.85" />
      <RisingSmoke id={`${id}-sm`} x={100} y={r1(tip - 2)} rise={80} size={8} drift={14} density={smokeDensity((flow - SMOKE_POINT) / 25)} still />
      <rect x="93" y="240" width="14" height="24" rx="1" fill="#2A1A14" stroke="#7D695E" strokeWidth="1.5" />
      <rect x="66" y="264" width="68" height="8" rx="2" fill="#2A1A14" stroke="#7D695E" strokeWidth="1.5" />
    </svg>
  );
}

function FlowSlider({ flow, onChange }: { flow: number; onChange: (v: number) => void }) {
  return (
    <Slider
      label="Fuel flow"
      strongLabel
      value={flow}
      min={0}
      max={100}
      step={1}
      format={flowText}
      markers={[{ value: SMOKE_POINT, color: "var(--text-2)" }]}
      axis={[
        { value: 0, label: "Low" },
        { value: SMOKE_POINT, label: "Smoke point" },
        { value: 100, label: "High" },
      ]}
      hint="An illustration, not to scale. The marked point is where soot starts to escape."
      onChange={onChange}
    />
  );
}

/** Soot and the smoke point: the flame and the fuel-flow slider (Learn dialog). */
export function SmokePointWidget() {
  const [flow, setFlow] = useState(40);
  return (
    <div className="stack g4">
      <div className="soot-live stack g4">
        <SootChamber flow={flow} />
        <FlowSlider flow={flow} onChange={setFlow} />
      </div>
      <SootStills />
    </div>
  );
}

/** The inline explainer on the SPICE and SLICE study pages, under the summary. */
export function SmokePointInline({ text, sources }: { text: string; sources: SourceRef[] }) {
  const [flow, setFlow] = useState(40);
  return (
    <section className="panel xp-inline has-stills" aria-labelledby="smoke-point-title">
      <div className="soot-live">
        <SootChamber flow={flow} />
      </div>
      <div className="stack g3" style={{ minWidth: 0 }}>
        <div className="row between g3 wrapx">
          <span className="row g2 small strong muted">
            <Flame className="ic sm" aria-hidden="true" />
            Try it
          </span>
          <Link className="btn btn-ghost btn-sm" href="/learn?explainer=smoke-point">
            Open in Learn
          </Link>
        </div>
        <h3 id="smoke-point-title" className="h4">
          Soot and the smoke point
        </h3>
        <p className="body">{text}</p>
        <div className="soot-live">
          <FlowSlider flow={flow} onChange={setFlow} />
        </div>
        <SootStills />
        <SourceLine sources={sources} />
      </div>
    </section>
  );
}
