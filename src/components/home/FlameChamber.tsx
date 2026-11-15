"use client";

import { Globe, Orbit } from "lucide-react";
import { useState } from "react";
import { FLAME_STATES as STATES } from "@/components/ui/FlameSvg";
import { MorphFlame } from "@/components/ui/MorphFlame";

type Mode = "earth" | "space";

/**
 * The signature flame with its Earth / Space switch (Home hero, and Learn's gravity switch). The
 * chamber stays dark in both themes. The flame morphs between the two shapes (900 ms); the
 * readouts and caption change halfway, and the caption is announced. `start` is the state it opens
 * in (Home opens on Earth). In space, arrows show oxygen drifting in from all sides. Reduced motion:
 * instant changes, and the arrows hold still. The full-size flame (Home) sizes itself to the
 * screen's height (.chamber-flame), so the whole hero fits on one screen.
 */
export function FlameChamber({ compact = false, idPrefix = "hero-flame", start = "space" }: { compact?: boolean; idPrefix?: string; start?: Mode }) {
  const [mode, setMode] = useState<Mode>(start);
  const [shown, setShown] = useState<Mode>(start);
  const state = STATES[shown];
  return (
    <figure data-theme="dark" className="chamber stack g3" style={{ padding: "24px 28px 20px", margin: 0 }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="readout">
          <span>Gravity</span>
          <b>
            {state.gravity} <span className="readout-note">({state.gravityNote})</span>
          </b>
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
      <div className={compact ? "mx-auto w-[160px] max-w-full" : "chamber-flame"}>
        <MorphFlame mode={mode} idPrefix={idPrefix} label={STATES[mode].label} onMidpoint={setShown} />
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
