import "server-only";
import type { FlexOutcome } from "@/lib/explainer-types";
import type { GasId, PredScales, PredTest } from "@/lib/prediction";
import { ntrsRef, type SourceRef } from "@/lib/sources";
import { psiSource } from "./explainers";
import { getStudy, getStudyTests } from "./server";

export interface PredictionData {
  tests: PredTest[];
  scales: PredScales;
  fuels: string[];
  sources: SourceRef[];
}

/** FLEX tests with every value the prediction tool needs, from the PSI-69 table. */
export function getPredictionData(): PredictionData {
  const flex = getStudy("flex");
  if (!flex) throw new Error("FLEX is missing from studies.json; review the prediction tool.");
  const tests: PredTest[] = [];
  for (const r of getStudyTests("flex")) {
    if (!r.is_test || !r.outcome || r.oxygen_pct_min === null || r.pressure_atm_min === null || r.droplet_diameter_mm === null || !r.fuel) continue;
    if (r.oxygen_pct_max !== null && r.oxygen_pct_max !== r.oxygen_pct_min) throw new Error(`FLEX test ${r.test_id} has an oxygen range; review the prediction tool.`);
    if (!["extinction", "disruption", "completion"].includes(r.outcome)) throw new Error(`Unexpected FLEX outcome "${r.outcome}".`);
    let gas: GasId = "none";
    let gasPct = 0;
    if (r.diluent) {
      const m = r.diluent.match(/^(CO2|He) (\d+(?:\.\d+)?)%$/);
      if (!m) throw new Error(`Unexpected FLEX diluent "${r.diluent}"; review the prediction tool.`);
      gas = m[1] === "CO2" ? "co2" : "he";
      gasPct = Number(m[2]);
    }
    tests.push({
      test: r.test_id ?? String(r.source_row),
      row: r.source_row,
      fuel: r.fuel,
      gas,
      gasPct,
      oxygen: r.oxygen_pct_min,
      pressure: r.pressure_atm_min,
      drop: r.droplet_diameter_mm,
      outcome: r.outcome as FlexOutcome,
    });
  }
  if (tests.length < 100) throw new Error(`Only ${tests.length} FLEX tests are usable; review the prediction tool.`);

  const spread = (values: number[]) => Math.max(...values) - Math.min(...values) || 1;
  const gasValues = tests.filter((t) => t.gas !== "none").map((t) => t.gasPct);
  return {
    tests,
    scales: {
      oxygen: spread(tests.map((t) => t.oxygen)),
      pressure: spread(tests.map((t) => t.pressure)),
      drop: spread(tests.map((t) => t.drop)),
      gasPct: spread(gasValues),
    },
    fuels: [...new Set(tests.map((t) => t.fuel))],
    sources: [
      psiSource(flex),
      ntrsRef("20150023456", "Detailed Results From the Flame Extinguishment Experiment (FLEX) March 2009 to December 2011 (NASA/TP-2015-216046)"),
    ],
  };
}
