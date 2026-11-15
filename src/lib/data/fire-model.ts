import "server-only";
import raw from "../../../data/fire_model.json";
import type { FlexOutcome } from "@/lib/explainer-types";
import { FEATURES, distance, testVector, type FireModel, type FireModelData, type FlexTest, type Fuel } from "@/lib/fire-model";
import { ntrsRef } from "@/lib/sources";
import { psiSource } from "./explainers";
import { getStudy, getStudyTests } from "./server";

const OUTCOMES: FlexOutcome[] = ["extinction", "disruption", "completion"];

function checkModel(model: FireModel): FireModel {
  const same = model.features.length === FEATURES.length && model.features.every((f, i) => f === FEATURES[i]);
  if (!same) throw new Error(`data/fire_model.json lists features ${model.features.join(", ")}; the tool expects ${FEATURES.join(", ")}.`);
  for (const key of ["mean", "scale", "weights"] as const) {
    if (model[key].length !== FEATURES.length || model[key].some((v) => !Number.isFinite(v))) throw new Error(`data/fire_model.json: "${key}" needs ${FEATURES.length} numbers.`);
  }
  if (model.scale.some((s) => s <= 0)) throw new Error("data/fire_model.json: every scale must be above 0.");
  for (const f of FEATURES) {
    const r = model.ranges[f];
    if (!r || !(r[0] < r[1])) throw new Error(`data/fire_model.json: no usable range for ${f}.`);
  }
  return model;
}

/** The FLEX flame-out model, the real FLEX tests and the tool's sources. */
export function getFireModelData(): FireModelData {
  const model = checkModel(raw as FireModel);
  const flex = getStudy("flex");
  if (!flex) throw new Error("FLEX is missing from studies.json; review the flame-out tool.");

  const gas = (diluent: string | null, name: string) => {
    const m = diluent?.match(new RegExp(`${name} (\\d+(?:\\.\\d+)?)%`));
    return m ? Number(m[1]) : 0;
  };
  const tests: FlexTest[] = [];
  for (const r of getStudyTests("flex")) {
    if (!r.is_test || !r.outcome || r.oxygen_pct_min === null || r.droplet_diameter_mm === null) continue;
    if (!OUTCOMES.includes(r.outcome as FlexOutcome)) throw new Error(`Unexpected FLEX outcome "${r.outcome}".`);
    if (r.fuel !== "Methanol" && r.fuel !== "Heptane") throw new Error(`Unexpected FLEX fuel "${r.fuel}"; review the flame-out tool.`);
    if (r.diluent && !/^(CO2|He) \d+(\.\d+)?%$/.test(r.diluent)) throw new Error(`Unexpected FLEX diluent "${r.diluent}"; review the flame-out tool.`);
    tests.push({
      id: r.test_id ?? `row ${r.source_row}`,
      row: r.source_row,
      fuel: r.fuel as Fuel,
      oxygen: r.oxygen_pct_min,
      pressure: r.pressure_atm_min,
      co2: gas(r.diluent, "CO2"),
      he: gas(r.diluent, "He"),
      drop: r.droplet_diameter_mm,
      outcome: r.outcome as FlexOutcome,
    });
  }

  // The tests the model was trained on are the ones with every input; there must be as many.
  const complete = tests.map(testVector).filter((v): v is number[] => v !== null);
  if (complete.length !== model.tests) {
    throw new Error(`FLEX has ${complete.length} complete tests, but the model says it was trained on ${model.tests}; retrain the model or review the data.`);
  }
  const nearest = complete.map((v, i) => Math.min(...complete.map((w, j) => (i === j ? Infinity : distance(model, v, w)))));
  nearest.sort((a, b) => a - b);
  const farDistance = nearest[Math.floor(0.95 * (nearest.length - 1))];

  return {
    model,
    tests,
    farDistance,
    sources: [
      psiSource(flex, `${flex.short_name} (${flex.psi_id})`),
      ntrsRef("20150023456", "Detailed Results From the Flame Extinguishment Experiment (FLEX) March 2009 to December 2011 (NASA/TP-2015-216046)"),
    ],
  };
}
