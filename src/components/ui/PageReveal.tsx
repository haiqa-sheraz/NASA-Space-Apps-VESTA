"use client";

import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** The six pages with a themed reveal. Every other page appears instantly. */
export type RevealVariant = "journey" | "planner" | "insights" | "earth" | "data" | "about";

/** The longest reveal lasts 2.4 s; the overlay is removed just after. */
const REMOVE_AFTER_MS = 2500;

type Vars = CSSProperties & Record<`--${string}`, string>;

/** A repeatable pseudo-random sequence (the same on the server and in the browser). */
function seeded(seed: number) {
  let n = seed;
  return () => {
    n = (n * 16807) % 2147483647;
    return (n - 1) / 2147483646;
  };
}

/**
 * Planner: one row of flame tongues along the bottom, in a 1200 by 240 frame. Each tongue is
 * [center x, base width, height, lean]; the heights rise and fall along the row, like a real fire.
 */
function flameRow(seed: number): [number, number, number, number][] {
  const rand = seeded(seed);
  const row: [number, number, number, number][] = [];
  for (let x = -20; x < 1240; x += 34 + rand() * 22) {
    const swell = 0.6 + 0.4 * Math.sin(x / 140 + seed);
    const height = Math.round((70 + rand() * 120) * swell + 30);
    row.push([Math.round(x), Math.round(46 + rand() * 50), height, Math.round((rand() - 0.5) * 28)]);
  }
  return row;
}

/** A flame tongue standing on the bottom edge: wide at the base, narrowing to a leaning tip. */
function tongue([x, width, height, lean]: [number, number, number, number], scale = 1): string {
  const w = (width * scale) / 2;
  const h = height * scale;
  const base = 250;
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M${r(x - w)} ${base} C${r(x - w)} ${r(base - h * 0.45)} ${r(x - w * 0.3 + lean * 0.3)} ${r(base - h * 0.75)} ${r(x + lean)} ${r(base - h)} C${r(x + w * 0.3 + lean * 0.3)} ${r(base - h * 0.75)} ${r(x + w)} ${r(base - h * 0.45)} ${r(x + w)} ${base} Z`;
}

const FIRE_SEEDS = [11, 23, 37] as const;
const FIRE_ROWS = FIRE_SEEDS.map((seed) => flameRow(seed));

/**
 * One frame of the fire: red-orange outer flames and yellow-white inner flames, with a noise
 * filter that breaks their edges into licking tongues. Three frames with different seeds
 * crossfade to make it flicker; each is drawn once, then only fades and stretches a little.
 */
function FireFrame({ id, seed, row }: { id: string; seed: number; row: [number, number, number, number][] }) {
  return (
    <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-o`} gradientUnits="userSpaceOnUse" x1="0" y1="240" x2="0" y2="30">
          <stop offset="0" stopColor="#FFC15A" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#FF8A2E" stopOpacity="0.9" />
          <stop offset="0.65" stopColor="#E0521C" stopOpacity="0.65" />
          <stop offset="1" stopColor="#A8300F" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-i`} gradientUnits="userSpaceOnUse" x1="0" y1="240" x2="0" y2="120">
          <stop offset="0" stopColor="#FFF6D8" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#FFD77A" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFB04A" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-f`} filterUnits="userSpaceOnUse" x="-60" y="-40" width="1320" height="320" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="3" seed={seed} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="38" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>
      <g filter={`url(#${id}-f)`}>
        {row.map((t) => (
          <path key={`o${t[0]}`} d={tongue(t)} fill={`url(#${id}-o)`} />
        ))}
        {row.map((t) => (
          <path key={`i${t[0]}`} d={tongue(t, 0.5)} fill={`url(#${id}-i)`} />
        ))}
      </g>
    </svg>
  );
}

/** About: embers rising from the hearth. [left %, size px, rise vh, drift px, delay ms, duration ms] */
const EMBERS: [number, number, number, number, number, number][] = [
  [8, 6, 40, 18, 0, 1700],
  [16, 5, 52, -14, 260, 1600],
  [24, 7, 36, 10, 120, 1800],
  [31, 5, 58, -20, 420, 1500],
  [38, 8, 44, 14, 60, 1900],
  [45, 5, 62, -8, 520, 1500],
  [50, 6, 66, 4, 700, 1500],
  [55, 7, 48, 16, 180, 1800],
  [61, 6, 56, -16, 340, 1700],
  [67, 8, 40, 12, 90, 1900],
  [73, 5, 60, -10, 600, 1500],
  [80, 7, 46, 20, 220, 1800],
  [87, 6, 54, -12, 460, 1600],
  [93, 5, 38, 8, 140, 1700],
];

/** Data: soft smoke clouds (center x, center y, radius) in a 400 by 250 frame, two layers. */
const SMOKE_A: [number, number, number][] = [
  [40, 170, 70], [120, 140, 80], [200, 165, 85], [280, 135, 80], [360, 165, 75],
  [80, 230, 70], [240, 235, 80], [330, 230, 70], [160, 90, 60], [300, 80, 55],
];
const SMOKE_B: [number, number, number][] = [
  [60, 90, 55], [150, 60, 50], [250, 95, 60], [350, 70, 55], [110, 200, 60], [210, 200, 55], [320, 190, 60],
];

/** A smoke layer: soft grey clouds whose edges a noise filter roughens into billows, like real smoke. */
function SmokeLayer({ id, clouds, seed }: { id: string; clouds: [number, number, number][]; seed: number }) {
  return (
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-g`}>
          <stop offset="0" style={{ stopColor: "var(--pr-smoke-c)", stopOpacity: 0.75 }} />
          <stop offset="0.55" style={{ stopColor: "var(--pr-smoke-c)", stopOpacity: 0.38 }} />
          <stop offset="1" style={{ stopColor: "var(--pr-smoke-c)", stopOpacity: 0 }} />
        </radialGradient>
        <filter id={`${id}-f`} filterUnits="userSpaceOnUse" x="-60" y="-60" width="520" height="370" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="3" seed={seed} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="60" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <g filter={`url(#${id}-f)`}>
        {clouds.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={`url(#${id}-g)`} />
        ))}
      </g>
    </svg>
  );
}

function layers(variant: RevealVariant): ReactNode {
  switch (variant) {
    // Blue flame bloom: a soft microgravity flame grows from the center, then fades away.
    case "journey":
      return <div className="pr-bloom" />;
    // Ember line: a low fire burns along the bottom, flickering in place, then slowly dies down.
    case "planner":
      return (
        <div className="pr-fire">
          <div className="pr-fire-glow" />
          {FIRE_SEEDS.map((seed, i) => (
            <div key={seed} className={`pr-flames pr-flames-${i + 1}`}>
              <FireFrame id={`pr-fire-${i + 1}`} seed={seed} row={FIRE_ROWS[i]} />
            </div>
          ))}
        </div>
      );
    // Extinguisher burst: a cone of pale gas sweeps in from the left and clears.
    case "insights":
      return (
        <>
          <div className="pr-cone" />
          <div className="pr-cloud" />
        </>
      );
    // Water-mist veil: fine droplets drift down and thin out.
    case "earth":
      return (
        <>
          <div className="pr-drops pr-drops-a" />
          <div className="pr-drops pr-drops-b" />
        </>
      );
    // Smoke clears: billowing grey smoke drifts up and thins out.
    case "data":
      return (
        <>
          <div className="pr-smoke pr-smoke-a">
            <SmokeLayer id="pr-smoke-a" clouds={SMOKE_A} seed={3} />
          </div>
          <div className="pr-smoke pr-smoke-b">
            <SmokeLayer id="pr-smoke-b" clouds={SMOKE_B} seed={8} />
          </div>
        </>
      );
    // Rising embers: warm embers float up from the hearth and fade.
    case "about":
      return (
        <>
          <div className="pr-hearth" />
          {EMBERS.map(([x, size, rise, drift, delay, duration]) => (
            <span
              key={x}
              className="pr-ember"
              style={{ "--x": `${x}%`, "--s": `${size}px`, "--rise": `${rise}vh`, "--drift": `${drift}px`, "--d": `${delay}ms`, "--t": `${duration}ms` } as Vars}
            />
          ))}
        </>
      );
  }
}

/**
 * A themed overlay (about 2 to 2.4 s) each time one of six pages opens. The page is already there
 * underneath, the overlay never takes clicks and is hidden from screen readers, and the motion is
 * pure CSS, so it starts with the first paint, before the page's scripts load. `again` is the
 * Journey's chapter change: the veil fades in over the old chapter first. Reduced motion: nothing.
 */
export function PageReveal({ variant, again = false }: { variant: RevealVariant; again?: boolean }) {
  const [show, setShow] = useState(true);

  // Before the browser paints, so with reduced motion the overlay never shows, even for one frame.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      setShow(false);
      return;
    }
    const timer = window.setTimeout(() => setShow(false), REMOVE_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      // If the page is kept and shown again later, the reveal plays again.
      setShow(true);
    };
  }, [variant]);

  if (!show) return null;
  return (
    // The Journey stays dark in light mode, so its reveal does too.
    <div className={`page-reveal pr-${variant}${again ? " pr-again" : ""}`} data-theme={variant === "journey" ? "dark" : undefined} aria-hidden="true">
      <div className="pr-veil" />
      {layers(variant)}
    </div>
  );
}
