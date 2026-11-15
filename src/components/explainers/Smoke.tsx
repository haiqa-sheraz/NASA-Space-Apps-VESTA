import type { CSSProperties } from "react";

/*
 * Smoke for the explainers: soft grey puffs that overlap into one cloud, with a noise filter that
 * roughens their edges into billows and wisps, like real smoke rather than separate dots. Puffs
 * that move drift through the noise, so their shapes churn as they go.
 */

type Vars = CSSProperties & Record<`--${string}`, string>;

/** Put inside <defs>. The filter covers the given area of the drawing (its viewBox, usually). */
export function SmokeDefs({ id, area, scale = 10, frequency = "0.035 0.05" }: { id: string; area: [number, number, number, number]; scale?: number; frequency?: string }) {
  const [x, y, width, height] = area;
  return (
    <>
      <radialGradient id={`${id}-puff`}>
        <stop offset="0" stopColor="#CFCBD6" stopOpacity="0.55" />
        <stop offset="0.5" stopColor="#B5B1BE" stopOpacity="0.32" />
        <stop offset="0.8" stopColor="#9C98A6" stopOpacity="0.1" />
        <stop offset="1" stopColor="#9C98A6" stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-billow`} filterUnits="userSpaceOnUse" x={x} y={y} width={width} height={height} colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves="3" seed="5" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale} xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="1.4" />
      </filter>
    </>
  );
}

/** Where the smoke fill and filter live, for puffs drawn by hand. */
export const smokeFill = (id: string) => `url(#${id}-puff)`;
export const smokeFilter = (id: string) => `url(#${id}-billow)`;

/**
 * Smoke rising from a point: puffs leave one after another, drift up `rise`, swell and thin out,
 * in a loop. `still` draws one moment of it, with no motion (reduced motion, previews).
 * `density` (0 to 1) makes the whole plume fainter or thicker.
 */
export function RisingSmoke({
  id,
  x,
  y,
  rise,
  size,
  count = 10,
  period = 3,
  drift = 10,
  density = 1,
  still = false,
  className,
}: {
  id: string;
  x: number;
  y: number;
  rise: number;
  size: number;
  count?: number;
  period?: number;
  drift?: number;
  density?: number;
  still?: boolean;
  className?: string;
}) {
  const puffs = Array.from({ length: count }, (_, i) => {
    // A fixed, uneven sway for each puff, so the plume bends a little like real smoke.
    const sway = [-0.6, 0.8, -0.2, 1, -0.9, 0.4, -0.4, 0.7, -1, 0.2][i % 10] * drift;
    return { i, sway };
  });
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const opacity = Math.round(density * 100) / 100;
  const stillPuffs = puffs.map(({ i, sway }) => {
    // Spread along the plume: low puffs small and thick, high puffs wide and thin.
    const f = (i + 0.5) / count;
    return <circle key={i} cx={r1(x + sway * f)} cy={r1(y - rise * f)} r={r1(size * (1 + 1.8 * f))} fill={smokeFill(id)} opacity={Math.round((1 - 0.75 * f) * 100) / 100} />;
  });
  if (still) {
    return (
      <g filter={smokeFilter(id)} opacity={opacity} className={className}>
        {stillPuffs}
      </g>
    );
  }
  return (
    <g opacity={opacity} className={className}>
      <g className="smoke-motion" filter={smokeFilter(id)}>
        {puffs.map(({ i, sway }) => (
          <circle
            key={i}
            className="smoke-rise"
            cx={x}
            cy={y}
            r={size}
            fill={smokeFill(id)}
            style={{ "--rise": `${-rise}px`, "--sway": `${r1(sway)}px`, "--smoke-ms": `${period}s`, animationDelay: `${Math.round((-period * i * 100) / count) / 100}s` } as Vars}
          />
        ))}
      </g>
      {/* With reduced motion, CSS shows this still plume instead. */}
      <g className="smoke-still" filter={smokeFilter(id)}>
        {stillPuffs}
      </g>
    </g>
  );
}
