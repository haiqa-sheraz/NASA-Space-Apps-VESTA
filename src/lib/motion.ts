/**
 * Motion helpers (design board 14, "Motion notes"): the timing tokens, the two easing curves, a
 * frame-by-frame tween for SVG shapes that CSS can't animate in every browser (path morphs), and
 * the reduced-motion check. With reduced motion, every change is instant.
 */

/** Timing tokens, in ms (the same values as --dur-* in tokens.css). */
export const DUR = { fast: 150, panel: 200, sort: 250, fade: 300, flame: 900 } as const;

/** A CSS cubic-bezier() timing function as a JavaScript function of progress (0 to 1). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const curveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const curveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton's method first, then bisection if the slope is too flat.
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = curveX(t) - x;
      if (Math.abs(err) < 1e-6) return curveY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= err / slope;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 40; i++) {
      const v = curveX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return curveY(t);
  };
}

/** --ease-std: cubic-bezier(.4,0,.2,1). */
export const EASE_STD = cubicBezier(0.4, 0, 0.2, 1);
/** --ease-out: cubic-bezier(.2,.7,.2,1). */
export const EASE_OUT = cubicBezier(0.2, 0.7, 0.2, 1);

/** True when the visitor asked for reduced motion (always false on the server). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs `onUpdate(value, progress)` once per frame from `from` to `to`, then `onDone`.
 * Returns a function that stops it.
 */
export function tween(options: {
  from: number;
  to: number;
  duration: number;
  delay?: number;
  ease?: (x: number) => number;
  onUpdate: (value: number, progress: number) => void;
  onDone?: () => void;
}): () => void {
  const { from, to, duration, delay = 0, ease = EASE_STD, onUpdate, onDone } = options;
  const start = performance.now() + delay;
  let frame = requestAnimationFrame(function step(now: number) {
    if (now < start) {
      frame = requestAnimationFrame(step);
      return;
    }
    const progress = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
    onUpdate(from + (to - from) * ease(progress), progress);
    if (progress < 1) frame = requestAnimationFrame(step);
    else onDone?.();
  });
  return () => cancelAnimationFrame(frame);
}
