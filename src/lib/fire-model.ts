import type { FlexOutcome } from "@/lib/explainer-types";
import type { SourceRef } from "@/lib/sources";

/**
 * "Will the flame go out?" (Data page): a logistic regression trained on NASA FLEX fuel-drop tests
 * (data/fire_model.json, from fire_model.ipynb). It gives the chance that the flame goes out on
 * its own ("extinction") before the drop burns away. It runs in the browser; no API calls.
 */

/** The model's inputs, in the order the file's weights use. */
export const FEATURES = ["methanol", "oxygen_pct", "pressure_atm", "co2_pct", "he_pct", "drop_mm"] as const;
export type Feature = (typeof FEATURES)[number];

export interface FireModel {
  question: string;
  features: Feature[];
  mean: number[];
  scale: number[];
  weights: number[];
  intercept: number;
  ranges: Record<Feature, [number, number]>;
  /** Share of tests the model got right in cross-validation, 0 to 1. */
  accuracy: number;
  balanced_accuracy: number;
  /** Share right when always guessing "goes out". */
  baseline: number;
  tests: number;
}

export type Fuel = "Methanol" | "Heptane";

export interface FlameInput {
  fuel: Fuel;
  oxygen: number;
  pressure: number;
  co2: number;
  he: number;
  drop: number;
}

/** A real FLEX test (PSI-69 table), as plotted and compared. */
export interface FlexTest {
  id: string;
  row: number;
  fuel: Fuel;
  oxygen: number;
  /** Null when the table has no usable pressure (then it's plotted, but not compared). */
  pressure: number | null;
  co2: number;
  he: number;
  drop: number;
  outcome: FlexOutcome;
}

/** What the Data page's tool gets from the server (lib/data/fire-model.ts). */
export interface FireModelData {
  model: FireModel;
  /** Every FLEX test with an outcome, oxygen and drop size (the dots on the map). */
  tests: FlexTest[];
  /**
   * How far (in the model's scale) conditions can be from the nearest real test before we warn:
   * the distance that 95% of real tests are within of their own nearest neighbor.
   */
  farDistance: number;
  sources: SourceRef[];
}

export const OUTCOME_LABEL: Record<FlexOutcome, string> = {
  extinction: "The flame went out before the drop burned away",
  disruption: "The drop broke apart",
  completion: "The drop burned away completely",
};

/** Short names for the chart legend and lists. */
export const OUTCOME_SHORT: Record<FlexOutcome, string> = {
  extinction: "Went out on its own",
  completion: "Burned to the end",
  disruption: "Drop broke apart",
};

export const vector = (x: FlameInput): number[] => [x.fuel === "Methanol" ? 1 : 0, x.oxygen, x.pressure, x.co2, x.he, x.drop];

/** The model's score before the logistic step: intercept + Σ weight × (x − mean) / scale. */
export function logit(model: FireModel, x: number[]): number {
  return x.reduce((sum, value, i) => sum + model.weights[i] * ((value - model.mean[i]) / model.scale[i]), model.intercept);
}

/** Chance the flame goes out on its own, 0 to 1. */
export function chanceOut(model: FireModel, x: FlameInput): number {
  return 1 / (1 + Math.exp(-logit(model, vector(x))));
}

/** Distance between two sets of conditions, each input measured in the model's own scale. */
export function distance(model: FireModel, a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, value, i) => sum + ((value - b[i]) / model.scale[i]) ** 2, 0));
}

export const testVector = (t: FlexTest): number[] | null =>
  t.pressure === null ? null : [t.fuel === "Methanol" ? 1 : 0, t.oxygen, t.pressure, t.co2, t.he, t.drop];

/** The real tests most like these conditions, nearest first. */
export function nearestTests(model: FireModel, tests: FlexTest[], x: FlameInput, count = 3): { test: FlexTest; distance: number }[] {
  const v = vector(x);
  const scored: { test: FlexTest; distance: number }[] = [];
  for (const test of tests) {
    const tv = testVector(test);
    if (tv) scored.push({ test, distance: distance(model, v, tv) });
  }
  return scored.sort((a, b) => a.distance - b.distance).slice(0, count);
}

/**
 * For the chart: the score is a straight-line function of oxygen and drop size once the other
 * inputs are fixed, so the 50% line is straight. Returns score = a × oxygen + b × drop + c.
 */
export function oxygenDropPlane(model: FireModel, x: FlameInput): { a: number; b: number; c: number } {
  const v = vector(x);
  const o = FEATURES.indexOf("oxygen_pct");
  const d = FEATURES.indexOf("drop_mm");
  const a = model.weights[o] / model.scale[o];
  const b = model.weights[d] / model.scale[d];
  const c = logit(model, v) - a * v[o] - b * v[d];
  return { a, b, c };
}

/** Plain-text description of a test's conditions, for tooltips and lists. */
export function testConditions(t: FlexTest): string {
  const gas = t.co2 ? `${t.co2}% CO₂` : t.he ? `${t.he}% helium` : "no added gas";
  const pressure = t.pressure === null ? "pressure not recorded" : `${t.pressure.toFixed(2)} atm`;
  return `${t.fuel}, ${t.oxygen}% oxygen, ${pressure}, ${gas}, ${t.drop.toFixed(2)} mm drop`;
}

/** Where a test is in the Data page's table: the FLEX rows, searched by test number. */
export const testHref = (t: FlexTest) => `/data?study=flex&q=${encodeURIComponent(t.id)}#filters`;
