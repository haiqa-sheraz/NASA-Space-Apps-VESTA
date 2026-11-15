import { EarthFlame, FLAME_PATH, FLAME_WICK, FlameDefs, WICK_TIP } from "@/components/ui/FlameSvg";
import type { FlexOutcome } from "@/lib/explainer-types";

/**
 * The signature flame, following the tool. Its size and color follow the model's chance of going
 * out: as it rises the flame shrinks, dims and turns bluer; as it falls it grows and brightens.
 * Its behavior acts out the most likely ending:
 *  - extinction (goes out): a weak flame that keeps fading down and back, as if dying;
 *  - completion (burns to the end): a steady, bright flame with the gentle flicker;
 *  - disruption (the drop breaks apart): an unsteady flame that shakes and stretches unevenly.
 * Size and color ease over half a second. With reduced motion nothing moves: a "breaks apart"
 * flame is drawn tilted instead. Decorative: the text beside it says the same things in words.
 */
export function LivingFlame({ chance, ending, idPrefix }: { chance: number; ending: FlexOutcome; idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const p = Math.min(1, Math.max(0, chance));
  const ease = "0.5s cubic-bezier(0.4, 0, 0.2, 1)";
  const scale = 1.08 - 0.5 * p;
  return (
    <svg className="flame-svg living-flame" viewBox="0 0 200 250" aria-hidden="true" data-ending={ending}>
      <FlameDefs id={id} />
      <defs>
        <linearGradient id={id("blue")} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2A54C9" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#4A78E6" stopOpacity="0.85" />
          <stop offset="0.8" stopColor="#8FB0FF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#A9C4FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="140" rx="80" ry="110" fill={`url(#${id("ge")})`} style={{ opacity: 1 - 0.85 * p, transition: `opacity ${ease}` }} />
      {/* How the flame behaves: the most likely ending (lf-extinction, lf-completion, lf-disruption). */}
      <g className={`lf-ending lf-${ending}`}>
        <g style={{ transformBox: "view-box", transformOrigin: "100px 214px", transform: `scale(${scale.toFixed(3)})`, transition: `transform ${ease}` }}>
          <g style={{ opacity: 1 - 0.8 * p, transition: `opacity ${ease}` }}>
            <EarthFlame id={id} flicker />
          </g>
          <path d={FLAME_PATH.earth} fill={`url(#${id("blue")})`} filter={`url(#${id("soft")})`} style={{ opacity: 0.95 * p, transition: `opacity ${ease}` }} />
        </g>
      </g>
      <path d={FLAME_WICK} stroke="#6B5A50" strokeWidth="3" strokeLinecap="round" />
      <circle {...WICK_TIP} style={{ opacity: 0.9 * (1 - p), transition: `opacity ${ease}` }} />
    </svg>
  );
}
