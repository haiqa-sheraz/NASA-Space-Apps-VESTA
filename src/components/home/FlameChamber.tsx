"use client";

import { Globe, Orbit } from "lucide-react";
import { useState } from "react";
import { FlameSvg } from "@/components/ui/FlameSvg";

const STATES = {
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

/**
 * Home hero: the signature flame with its Earth / Space switch. The chamber stays dark in both
 * themes. The shape swaps instantly here; the morph and first-load motion arrive in step 6.
 */
export function FlameChamber() {
  const [mode, setMode] = useState<"earth" | "space">("space");
  const state = STATES[mode];
  return (
    <figure data-theme="dark" className="chamber stack g3" style={{ padding: "24px 28px 20px" }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="readout">
          <span>Gravity</span>
          <b>{state.gravity}</b>
        </div>
        <div className="readout">
          <span>Hot air</span>
          <b>{state.air}</b>
        </div>
        <div className="readout" style={{ textAlign: "right" }}>
          <span>Flame shape</span>
          <b>{state.shape}</b>
        </div>
      </div>
      <div className="ticks-rule" style={{ opacity: 0.8 }} />
      <div className="mx-auto w-[200px] max-w-full tablet:w-[360px]">
        <FlameSvg mode={mode} idPrefix="hero-flame" label={state.label} />
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <div className="seg lg" role="group" aria-label="Gravity">
          <button type="button" className="earth" aria-pressed={mode === "earth"} onClick={() => setMode("earth")}>
            <Globe className="ic sm" aria-hidden="true" />
            Earth
          </button>
          <button type="button" className="space" aria-pressed={mode === "space"} onClick={() => setMode("space")}>
            <Orbit className="ic sm" aria-hidden="true" />
            Space
          </button>
        </div>
      </div>
      <figcaption
        className="center"
        aria-live="polite"
        style={{ color: "#DCCFC7", fontSize: 16, lineHeight: 1.5, minHeight: 48, maxWidth: "40ch", margin: "0 auto" }}
      >
        {state.caption}
      </figcaption>
    </figure>
  );
}
