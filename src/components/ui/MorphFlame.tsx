"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DUR, prefersReducedMotion, tween } from "@/lib/motion";
import { FLAME_PATH, FLAME_WICK, FlameDefs } from "./FlameSvg";

type Mode = "earth" | "space";

/* The two outlines share one 4-curve structure, so every number can move from one to the other. */
const tokens = (d: string) => d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
const EARTH = tokens(FLAME_PATH.earth);
const SPACE = tokens(FLAME_PATH.space);
const isNum = (tok: string) => !Number.isNaN(Number(tok));
if (EARTH.length !== SPACE.length || EARTH.some((tok, i) => isNum(tok) !== isNum(SPACE[i]) || (!isNum(tok) && tok !== SPACE[i]))) {
  throw new Error("The Earth and space flame paths must share one structure to morph.");
}

/** The flame outline part of the way from the Earth teardrop (0) to the space sphere (1). */
export function flamePath(t: number): string {
  return EARTH.map((tok, i) => (isNum(tok) ? String(Math.round((Number(tok) + (Number(SPACE[i]) - Number(tok)) * t) * 100) / 100) : tok)).join(" ");
}

/**
 * The fills and glows crossfade (design board 14): the amber holds for the first 30% of the
 * change, then fades as the blue rises.
 */
const spaceShare = (t: number) => Math.min(1, Math.max(0, (t - 0.3) / 0.7));

/** Session key: the first-load motion plays once per session (also read by the script in layout.tsx). */
export const FLAME_SEEN_KEY = "vesta:flame-seen";
const INTRO_DELAY = 400;
const INTRO_MS = 1800;

/**
 * The signature flame that moves (Home hero and the Learn gravity switch). With `intro`, on the
 * first load of a session the Earth teardrop holds 400 ms, then relaxes into the blue sphere over
 * 1.8 s. Flipping the switch morphs it in 900 ms and calls `onMidpoint` halfway, so the readouts
 * and caption can change then. With reduced motion (or the intro already seen) the sphere is
 * still, and changes are instant; the server markup has that still sphere ready, chosen by CSS,
 * so it never flashes the teardrop.
 */
export function MorphFlame({
  mode,
  intro = false,
  idPrefix,
  label,
  onMidpoint,
}: {
  mode: Mode;
  intro?: boolean;
  idPrefix: string;
  label: string;
  onMidpoint?: (mode: Mode) => void;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const target = mode === "space" ? 1 : 0;
  // The values React renders; after that, the shape is drawn directly (React never re-renders them).
  const [first] = useState(() => (intro ? 0 : target));
  const [introPending, setIntroPending] = useState(intro);
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
  }, []);

  // First load: relax from the teardrop into the sphere, once per session.
  useEffect(() => {
    if (!intro) return;
    setIntroPending(false);
    let seen = false;
    try {
      seen = sessionStorage.getItem(FLAME_SEEN_KEY) === "1";
    } catch {
      // Storage blocked: play it.
    }
    if (seen || prefersReducedMotion()) {
      draw(heading.current);
      return;
    }
    let marked = false;
    stop.current = tween({
      from: 0,
      to: heading.current,
      duration: INTRO_MS,
      delay: INTRO_DELAY,
      onUpdate: (v) => {
        // Marked once it starts, so a quick unmount (React's dev double-run) doesn't skip it.
        if (!marked) {
          marked = true;
          // Coming back to Home in this visit then shows the still sphere from the first paint.
          document.documentElement.setAttribute("data-flame-seen", "");
          try {
            sessionStorage.setItem(FLAME_SEEN_KEY, "1");
          } catch {
            // Storage blocked: it plays again next time.
          }
        }
        draw(v);
      },
    });
    return () => stop.current();
  }, [intro, draw]);

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
    <svg className={`flame-svg${introPending ? " flame-intro" : ""}`} viewBox="0 0 200 250" role="img" aria-label={label}>
      <FlameDefs id={id} />
      <g className="fi-anim">
        <ellipse ref={earthGlow} cx="100" cy="140" rx="80" ry="110" fill={`url(#${id("ge")})`} opacity={1 - firstSpace} />
        <circle ref={spaceGlow} cx="100" cy="160" r="98" fill={`url(#${id("gs")})`} opacity={firstSpace} />
        <path ref={earthFill} d={firstD} fill={`url(#${id("e")})`} opacity={1 - firstSpace} />
        <path ref={spaceFill} d={firstD} fill={`url(#${id("s")})`} opacity={firstSpace} />
      </g>
      {introPending && (
        // The still sphere, shown by CSS instead of the teardrop when the intro won't play.
        <g className="fi-still">
          <circle cx="100" cy="160" r="98" fill={`url(#${id("gs")})`} />
          <path d={FLAME_PATH.space} fill={`url(#${id("s")})`} />
        </g>
      )}
      <path d={FLAME_WICK} stroke="#6B5A50" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
