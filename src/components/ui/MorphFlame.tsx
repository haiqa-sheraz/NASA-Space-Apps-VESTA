"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DUR, prefersReducedMotion, tween } from "@/lib/motion";
import { EarthFlameInner, FLAME_PATH, FLAME_WICK, FlameDefs, WICK_TIP } from "./FlameSvg";

type Mode = "earth" | "space";

/* The two outlines share one 4-curve structure, so every number can move from one to the other. */
const tokens = (d: string) => d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
const EARTH = tokens(FLAME_PATH.earth);
const SPACE = tokens(FLAME_PATH.space);
const isNum = (tok: string) => !Number.isNaN(Number(tok));
if (EARTH.length !== SPACE.length || EARTH.some((tok, i) => isNum(tok) !== isNum(SPACE[i]) || (!isNum(tok) && tok !== SPACE[i]))) {
  throw new Error("The Earth and space flame paths must share one structure to morph.");
}

/** The flame outline part of the way from the Earth flame (0) to the space sphere (1). */
export function flamePath(t: number): string {
  return EARTH.map((tok, i) => (isNum(tok) ? String(Math.round((Number(tok) + (Number(SPACE[i]) - Number(tok)) * t) * 100) / 100) : tok)).join(" ");
}

/**
 * The fills and glows crossfade (design board 14): the amber holds for the first 30% of the
 * change, then fades as the blue rises.
 */
const spaceShare = (t: number) => Math.min(1, Math.max(0, (t - 0.3) / 0.7));

/** Directions (degrees) the oxygen comes in from; none from straight below, where the wick is. */
const O2_ANGLES = [-90, -45, 0, 45, 135, 180, -135];

/**
 * Oxygen drifting in from all sides of the space flame: arrows around the sphere, pointing in,
 * that drift toward it and fade (a 2.6 s loop, staggered). Still with reduced motion.
 */
function OxygenArrows() {
  return (
    <>
      <g fill="none" stroke="#A9C4FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {O2_ANGLES.map((angle, i) => {
          const r = (angle * Math.PI) / 180;
          const x = 100 + 88 * Math.cos(r);
          const y = 160 + 88 * Math.sin(r);
          return (
            <g key={angle} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle + 180})`}>
              <g className="o2-arrow" style={{ animationDelay: `${(-i * 0.37).toFixed(2)}s` }}>
                <path d="M-9 0 H7 M2.5 -4 L7.5 0 L2.5 4" />
              </g>
            </g>
          );
        })}
      </g>
      <text x="60" y="68" textAnchor="middle" fontSize="11" fontWeight="700" fill="#A9C4FF">
        O₂
      </text>
      <text x="140" y="68" textAnchor="middle" fontSize="11" fontWeight="700" fill="#A9C4FF">
        O₂
      </text>
    </>
  );
}

/**
 * The signature flame that moves (Home hero and the Learn gravity switch). Flipping the switch
 * morphs it in 900 ms and calls `onMidpoint` halfway, so the readouts and caption can change then.
 * The Earth flame flickers gently while it shows; in space, arrows show oxygen drifting in from all
 * sides. With reduced motion, changes are instant and nothing flickers or drifts.
 */
export function MorphFlame({
  mode,
  idPrefix,
  label,
  onMidpoint,
}: {
  mode: Mode;
  idPrefix: string;
  label: string;
  onMidpoint?: (mode: Mode) => void;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const target = mode === "space" ? 1 : 0;
  // The values React renders; after that, the shape is drawn directly (React never re-renders them).
  const [first] = useState(target);
  const value = useRef(first);
  const heading = useRef(target);
  const stop = useRef<() => void>(() => {});
  const midpoint = useRef(onMidpoint);
  useEffect(() => {
    midpoint.current = onMidpoint;
  });
  const earthFill = useRef<SVGPathElement>(null);
  const spaceFill = useRef<SVGPathElement>(null);
  const earthGlow = useRef<SVGEllipseElement>(null);
  const spaceGlow = useRef<SVGCircleElement>(null);
  const earthInner = useRef<SVGGElement>(null);
  const wickTip = useRef<SVGCircleElement>(null);
  const oxygen = useRef<SVGGElement>(null);

  const draw = useCallback((t: number) => {
    value.current = t;
    const d = flamePath(t);
    const s = String(Math.round(spaceShare(t) * 1000) / 1000);
    const e = String(Math.round((1 - spaceShare(t)) * 1000) / 1000);
    earthFill.current?.setAttribute("d", d);
    spaceFill.current?.setAttribute("d", d);
    earthFill.current?.setAttribute("opacity", e);
    spaceFill.current?.setAttribute("opacity", s);
    earthGlow.current?.setAttribute("opacity", e);
    spaceGlow.current?.setAttribute("opacity", s);
    earthInner.current?.setAttribute("opacity", e);
    wickTip.current?.setAttribute("opacity", e);
    oxygen.current?.setAttribute("opacity", s);
  }, []);

  // The switch: morph to the new shape; the text changes halfway.
  useEffect(() => {
    if (heading.current === target) return;
    heading.current = target;
    stop.current();
    const from = value.current;
    if (prefersReducedMotion() || from === target) {
      draw(target);
      midpoint.current?.(mode);
      return;
    }
    let told = false;
    const tell = () => {
      if (told) return;
      told = true;
      midpoint.current?.(mode);
    };
    stop.current = tween({
      from,
      to: target,
      duration: Math.max(DUR.fade, DUR.flame * Math.abs(target - from)),
      onUpdate: (v, progress) => {
        draw(v);
        if (progress >= 0.5) tell();
      },
      onDone: tell,
    });
  }, [target, mode, draw]);

  useEffect(() => () => stop.current(), []);

  const firstD = flamePath(first);
  const firstSpace = spaceShare(first);
  return (
    <svg className="flame-svg" viewBox="0 0 200 250" role="img" aria-label={label}>
      <FlameDefs id={id} />
      <ellipse ref={earthGlow} cx="100" cy="140" rx="80" ry="110" fill={`url(#${id("ge")})`} opacity={1 - firstSpace} />
      <circle ref={spaceGlow} cx="100" cy="160" r="98" fill={`url(#${id("gs")})`} opacity={firstSpace} />
      {/* The Earth flame flickers only while it is the one showing. */}
      <g className={mode === "earth" ? "flame-flicker" : undefined}>
        <path ref={earthFill} d={firstD} fill={`url(#${id("e")})`} filter={`url(#${id("soft")})`} opacity={1 - firstSpace} />
        <g ref={earthInner} opacity={1 - firstSpace}>
          <EarthFlameInner id={id} />
        </g>
      </g>
      <path ref={spaceFill} d={firstD} fill={`url(#${id("s")})`} opacity={firstSpace} />
      {/* In space, oxygen drifts in from all sides (the arrows move only while space is showing). */}
      <g ref={oxygen} className={mode === "space" ? "o2-flow o2-on" : "o2-flow"} opacity={firstSpace}>
        <OxygenArrows />
      </g>
      <path d={FLAME_WICK} stroke="#6B5A50" strokeWidth="3" strokeLinecap="round" />
      <circle ref={wickTip} {...WICK_TIP} opacity={1 - firstSpace} />
    </svg>
  );
}
