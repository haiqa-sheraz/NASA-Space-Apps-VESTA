/**
 * The signature flame (our own SVG, from the approved design): a tall amber teardrop in Earth
 * gravity, a dim blue sphere in space. Both shapes share one 4-curve structure, so MorphFlame can
 * morph between them. This still version is used on cards and in explainers.
 */
export const FLAME_PATH = {
  earth: "M100 28 C122 78 146 118 146 162 C146 196 126 218 100 218 C74 218 54 196 54 162 C54 118 78 78 100 28 Z",
  space: "M100 100 C133 100 160 127 160 160 C160 193 133 220 100 220 C67 220 40 193 40 160 C40 127 67 100 100 100 Z",
} as const;

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

/** The flame's gradients: space fill (s), Earth fill (e), and their glows (gs, ge). */
export function FlameDefs({ id }: { id: (name: string) => string }) {
  return (
    <defs>
      <radialGradient id={id("s")} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#0B1736" stopOpacity="0.15" />
        <stop offset="0.58" stopColor="#2A54C9" stopOpacity="0.5" />
        <stop offset="0.84" stopColor="#5B8DFF" stopOpacity="0.95" />
        <stop offset="1" stopColor="#A9C4FF" stopOpacity="0.15" />
      </radialGradient>
      <linearGradient id={id("e")} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#4A78E6" />
        <stop offset="0.16" stopColor="#FF9A52" />
        <stop offset="0.55" stopColor="#FFB86E" />
        <stop offset="0.9" stopColor="#FFE2B0" />
        <stop offset="1" stopColor="#FFF1D6" stopOpacity="0.6" />
      </linearGradient>
      <radialGradient id={id("gs")}>
        <stop offset="0" stopColor="#5B8DFF" stopOpacity="0.35" />
        <stop offset="1" stopColor="#5B8DFF" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={id("ge")}>
        <stop offset="0" stopColor="#FF9A52" stopOpacity="0.28" />
        <stop offset="1" stopColor="#FF9A52" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export const FLAME_WICK = "M100 186 L100 240";

export function FlameSvg({ mode, idPrefix, label }: { mode: "earth" | "space"; idPrefix: string; label?: string }) {
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
        <ellipse cx="100" cy="140" rx="80" ry="110" fill={`url(#${id("ge")})`} />
      ) : (
        <circle cx="100" cy="160" r="98" fill={`url(#${id("gs")})`} />
      )}
      <path d={earth ? FLAME_PATH.earth : FLAME_PATH.space} fill={`url(#${id(earth ? "e" : "s")})`} />
      <path d={FLAME_WICK} stroke="#6B5A50" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
