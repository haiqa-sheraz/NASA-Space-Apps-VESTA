/**
 * The signature flame (our own SVG): a candle flame in Earth gravity, a dim blue sphere in space.
 * The Earth flame is drawn like a real one: soft edges, a bright inner core, a blue base and a
 * dark zone just above the wick, and (where it moves) a gentle flicker. Both outlines share one
 * 4-curve structure, so MorphFlame can morph between them. This still version is used on cards
 * and in explainers.
 */
export const FLAME_PATH = {
  earth: "M101 24 C106 62 132 112 132 160 C132 196 118 214 100 214 C82 214 68 196 68 160 C68 112 96 62 101 24 Z",
  space: "M100 100 C133 100 160 127 160 160 C160 193 133 220 100 220 C67 220 40 193 40 160 C40 127 67 100 100 100 Z",
} as const;

/** The bright inner core of the Earth flame. */
const EARTH_CORE = "M100.5 76 C103 102 116 132 116 163 C116 188 109 201 100 201 C91 201 84 188 84 163 C84 132 98 102 100.5 76 Z";

/** Readouts and captions for the two flame states (approved design text, Home hero and the gravity switch). */
export const FLAME_STATES = {
  space: {
    gravity: "about 0 g",
    air: "Doesn't rise",
    shape: "Sphere",
    label: "A candle flame in orbit: a dim blue sphere.",
    caption: "In orbit, hot air doesn't rise. Oxygen drifts in from all sides, so the flame turns round, dim and blue.",
  },
  earth: {
    gravity: "1 g",
    air: "Rises",
    shape: "Teardrop",
    label: "A candle flame on Earth: a tall amber teardrop.",
    caption: "On Earth, hot air rises and pulls the flame into a tall teardrop.",
  },
} as const;

type IdFn = (name: string) => string;

/**
 * The flame's gradients and filters: space fill (s) and glow (gs); Earth body (e), core (ec),
 * blue base (eb) and glow (ge); and two soft-edge blurs for the Earth flame.
 */
export function FlameDefs({ id }: { id: IdFn }) {
  return (
    <defs>
      <radialGradient id={id("s")} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#0B1736" stopOpacity="0.15" />
        <stop offset="0.58" stopColor="#2A54C9" stopOpacity="0.5" />
        <stop offset="0.84" stopColor="#5B8DFF" stopOpacity="0.95" />
        <stop offset="1" stopColor="#A9C4FF" stopOpacity="0.15" />
      </radialGradient>
      <linearGradient id={id("e")} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#4A78E6" stopOpacity="0.9" />
        <stop offset="0.09" stopColor="#E8642A" stopOpacity="0.88" />
        <stop offset="0.3" stopColor="#FF8A3A" />
        <stop offset="0.6" stopColor="#FFA647" />
        <stop offset="0.85" stopColor="#FFBE5E" stopOpacity="0.9" />
        <stop offset="1" stopColor="#FFD27A" stopOpacity="0.3" />
      </linearGradient>
      <radialGradient id={id("ec")} cx="50%" cy="62%" r="55%">
        <stop offset="0" stopColor="#FFFDF2" />
        <stop offset="0.35" stopColor="#FFF3C8" stopOpacity="0.95" />
        <stop offset="0.7" stopColor="#FFD98C" stopOpacity="0.55" />
        <stop offset="1" stopColor="#FFC266" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id("eb")}>
        <stop offset="0" stopColor="#7FA2FF" stopOpacity="0.9" />
        <stop offset="0.55" stopColor="#4A78E6" stopOpacity="0.6" />
        <stop offset="1" stopColor="#2A54C9" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id("gs")}>
        <stop offset="0" stopColor="#5B8DFF" stopOpacity="0.35" />
        <stop offset="1" stopColor="#5B8DFF" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id("ge")}>
        <stop offset="0" stopColor="#FF8A3A" stopOpacity="0.3" />
        <stop offset="1" stopColor="#FF8A3A" stopOpacity="0" />
      </radialGradient>
      <filter id={id("soft")} x="-25%" y="-12%" width="150%" height="124%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <filter id={id("softer")} x="-40%" y="-20%" width="180%" height="140%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
    </defs>
  );
}

/** Inside the Earth flame: the blue base, the bright core and the dark zone above the wick. */
export function EarthFlameInner({ id }: { id: IdFn }) {
  return (
    <>
      <ellipse cx="100" cy="204" rx="19" ry="9" fill={`url(#${id("eb")})`} />
      <path className="fl-core" d={EARTH_CORE} fill={`url(#${id("ec")})`} filter={`url(#${id("softer")})`} />
      <ellipse cx="100" cy="191" rx="7.5" ry="14" fill="#B4521C" opacity="0.32" filter={`url(#${id("soft")})`} />
    </>
  );
}

/**
 * The Earth flame without its glow and wick, in the 200 by 250 frame (needs FlameDefs with the
 * same ids in the same drawing). `flicker` adds the gentle flicker (none with reduced motion).
 */
export function EarthFlame({ id, flicker = false }: { id: IdFn; flicker?: boolean }) {
  return (
    <g className={flicker ? "flame-flicker" : undefined}>
      <path d={FLAME_PATH.earth} fill={`url(#${id("e")})`} filter={`url(#${id("soft")})`} />
      <EarthFlameInner id={id} />
    </g>
  );
}

export const FLAME_WICK = "M100 186 L100 240";
/** The glowing end of the wick inside the Earth flame. */
export const WICK_TIP = { cx: 100, cy: 187, r: 2.2, fill: "#FF6A2B" } as const;

export function FlameSvg({ mode, idPrefix, label, flicker = false }: { mode: "earth" | "space"; idPrefix: string; label?: string; flicker?: boolean }) {
  const earth = mode === "earth";
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <svg
      className="flame-svg"
      viewBox="0 0 200 250"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <FlameDefs id={id} />
      {earth ? (
        <>
          <ellipse cx="100" cy="140" rx="80" ry="110" fill={`url(#${id("ge")})`} />
          <EarthFlame id={id} flicker={flicker} />
        </>
      ) : (
        <>
          <circle cx="100" cy="160" r="98" fill={`url(#${id("gs")})`} />
          <path d={FLAME_PATH.space} fill={`url(#${id("s")})`} />
        </>
      )}
      <path d={FLAME_WICK} stroke="#6B5A50" strokeWidth="3" strokeLinecap="round" />
      {earth && <circle {...WICK_TIP} opacity="0.9" />}
    </svg>
  );
}
