/** Round axis scales for small charts: about three steps of 1, 2, 2.5 or 5 times a power of ten. */
export interface Scale {
  min: number;
  max: number;
  ticks: number[];
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const f = raw / power;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * power;
}

/** A scale that starts at 0 (or below, for negative data) and covers `hi` with round ticks. */
export function niceScale(lo: number, hi: number, steps = 3): Scale {
  const from = Math.min(0, lo);
  const to = hi > from ? hi : from + 1;
  const step = niceStep((to - from) / steps);
  const min = Math.floor(from / step) * step;
  const max = Math.ceil(to / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Number(t.toFixed(6)));
  return { min, max, ticks };
}

/** Position of a value on a scale, as a percentage of its width (0 to 100). */
export function percentOf(value: number, scale: Scale): number {
  return ((value - scale.min) / (scale.max - scale.min)) * 100;
}
