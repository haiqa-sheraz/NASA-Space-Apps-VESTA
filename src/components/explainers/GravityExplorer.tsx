"use client";

import { CircleQuestionMark, FlaskConical, Orbit } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/Controls";
import type { GravityData } from "@/lib/explainer-types";
import { fmtNum, plural } from "@/lib/format";
import { XpStatus } from "./shared";

const NEAR = 0.02;

/** What our sources hold at a given gravity level (the same facts as the Insights gravity scale). */
function readout(g: number, d: GravityData): { kind: "measured" | "simulated" | "none"; title: string; detail: string } {
  if (g <= NEAR) {
    return {
      kind: "measured",
      title: "About 0 g, in orbit",
      detail: `Measured: ${plural(d.space, "PSI study", "PSI studies")} ran in space. ${d.eFieldName} used an electric field as a stand-in for some gravity effects, in tests at about 0 g.`,
    };
  }
  if (Math.abs(g - d.moonG) <= NEAR) {
    return { kind: "simulated", title: `The Moon, ${fmtNum(d.moonG, 2)} g`, detail: "No PSI tests. LUCI simulated Moon gravity on a spinning rocket, and FM2 is planned." };
  }
  if (Math.abs(g - d.marsG) <= NEAR) {
    return { kind: "none", title: `Mars, about ${fmtNum(d.marsG, 2)} g`, detail: "No fire data in our sources." };
  }
  if (g >= 1 - NEAR) {
    return { kind: "measured", title: "1 g, on Earth", detail: `${plural(d.ground, "PSI ground study", "PSI ground studies")} worked at 1 g, where Earth's fire tests also run.` };
  }
  return { kind: "none", title: `${fmtNum(g, 2)} g`, detail: "No fire data in our sources between 0 g and 1 g, apart from LUCI's simulated Moon gravity." };
}

/** Journey chapter 9: slide from 0 g to 1 g and see where fire data exists. */
export function GravityExplorer({ data }: { data: GravityData }) {
  const [g, setG] = useState(0);
  const r = readout(g, data);
  const Icon = r.kind === "measured" ? Orbit : r.kind === "simulated" ? FlaskConical : CircleQuestionMark;
  return (
    <div className="chamber xp" data-theme="dark">
      <Slider
        label="Gravity"
        strongLabel
        value={g}
        min={0}
        max={1}
        step={0.01}
        format={(v) => `${fmtNum(v, 2)} g`}
        markers={[
          { value: data.moonG, color: "var(--text-2)" },
          { value: data.marsG, color: "var(--text-2)" },
        ]}
        axis={[
          { value: 0, label: "0 g" },
          { value: data.moonG, label: "Moon" },
          { value: data.marsG, label: "Mars" },
          { value: 1, label: "1 g" },
        ]}
        onChange={setG}
      />
      <div className="xp-readout" data-kind={r.kind}>
        <span className="xp-readout-ic">
          <Icon className="ic" aria-hidden="true" />
        </span>
        <span className="small strong">{r.kind === "measured" ? "Fire data exists" : r.kind === "simulated" ? "Simulated, not measured in PSI" : "No data"}</span>
      </div>
      <XpStatus title={r.title}>{r.detail}</XpStatus>
    </div>
  );
}
