"use client";

import { Globe, Orbit } from "lucide-react";
import { useState } from "react";
import { FLAME_STATES as STATES } from "@/components/ui/FlameSvg";
import { MorphFlame } from "@/components/ui/MorphFlame";

type Mode = "earth" | "space";

/**
 * The signature flame with its Earth / Space switch (Home hero, and Learn's gravity switch). The
 * chamber stays dark in both themes. The flame morphs between the two shapes (900 ms); the
 * readouts and caption change halfway, and the caption is announced. On Home (`intro`), the first
 * load of a session shows the teardrop relaxing into the sphere. Reduced motion: instant changes.
 */
export function FlameChamber({ compact = false, idPrefix = "hero-flame", intro = false }: { compact?: boolean; idPrefix?: string; intro?: boolean }) {
  const [mode, setMode] = useState<Mode>("space");
  const [shown, setShown] = useState<Mode>("space");
  const state = STATES[shown];
  return (
    <figure data-theme="dark" className="chamber stack g3" style={{ padding: "24px 28px 20px", margin: 0 }}>
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
      <div className={compact ? "mx-auto w-[160px] max-w-full" : "mx-auto w-[200px] max-w-full tablet:w-[360px]"}>
        <MorphFlame mode={mode} intro={intro} idPrefix={idPrefix} label={STATES[mode].label} onMidpoint={setShown} />
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
