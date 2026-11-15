"use client";

import { Globe, Orbit } from "lucide-react";
import { useState } from "react";
import { FLAME_STATES, FlameSvg } from "@/components/ui/FlameSvg";
import { useSvgId } from "./shared";

type Mode = "earth" | "space";

/**
 * Journey chapter 1: the Earth teardrop and the space sphere side by side, with the gravity
 * switch highlighting one. The highlight moves over 900 ms (motion.css); instantly with reduced motion.
 */
export function GravityPair() {
  const [mode, setMode] = useState<Mode>("space");
  const prefix = useSvgId("gp");
  return (
    <div className="chamber xp" data-theme="dark" style={{ maxWidth: 560 }}>
      <div className="xp-pair">
        {(["earth", "space"] as const).map((m) => (
          <figure key={m} className="xp-flame" data-on={mode === m}>
            <div style={{ width: m === "earth" ? 96 : 110 }}>
              <FlameSvg mode={m} idPrefix={`${prefix}-${m}`} label={FLAME_STATES[m].label} />
            </div>
            <figcaption>{m === "earth" ? "Earth, 1 g" : "Space, about 0 g"}</figcaption>
          </figure>
        ))}
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
      <p className="xp-caption" aria-live="polite">
        {FLAME_STATES[mode].caption}
      </p>
    </div>
  );
}
