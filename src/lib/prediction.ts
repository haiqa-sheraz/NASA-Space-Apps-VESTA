import type { FlexOutcome } from "@/lib/explainer-types";

/**
 * Data page prediction tool: a nearest-neighbor lookup over FLEX's fuel-drop tests (PSI-69).
 * It finds the tests most like the chosen conditions (same fuel and added gas) and reports how
 * they most often ended. A model, not a measurement: it repeats past results, it doesn't simulate.
 */

export type GasId = "none" | "co2" | "he";

export interface PredTest {
  test: string;
  /** Row number in the PSI-69 table. */
  row: number;
  fuel: string;
  gas: GasId;
  /** Share of the added gas, % (0 when none). */
  gasPct: number;
  oxygen: number;
  pressure: number;
  drop: number;
  outcome: FlexOutcome;
}

export interface PredInput {
  fuel: string;
  gas: GasId;
  gasPct: number;
  oxygen: number;
  pressure: number;
  drop: number;
}

/** How far apart values count as "far": the span of each measured value across all FLEX tests. */
export interface PredScales {
  oxygen: number;
  pressure: number;
  drop: number;
  gasPct: number;
}

export type Confidence = "high" | "medium" | "low";

export interface Prediction {
  outcome: FlexOutcome;
  votes: number;
  neighbors: { test: PredTest; distance: number }[];
  confidence: Confidence;
  /** Inputs outside the range FLEX tested for this fuel and gas, with that range. */
  outOfRange: { name: string; range: [number, number] }[];
  /** Tested range of each input for this fuel and gas. */
  ranges: Record<"oxygen" | "pressure" | "drop" | "gasPct", [number, number]>;
}

/** How each FLEX test ended (the PSI-69 outcome column; meanings from the FLEX results report). */
export const OUTCOME_LABEL: Record<FlexOutcome, string> = {
  extinction: "The flame went out before the drop burned away",
  disruption: "The drop broke apart",
  completion: "The drop burned away completely",
};

export const K = 7;
const OUTCOMES: FlexOutcome[] = ["extinction", "disruption", "completion"];

const span = (values: number[]): [number, number] => [Math.min(...values), Math.max(...values)];

export function predict(tests: PredTest[], input: PredInput, scales: PredScales): Prediction | null {
  const pool = tests.filter((t) => t.fuel === input.fuel && t.gas === input.gas);
  if (!pool.length) return null;

  const distance = (t: PredTest) =>
    Math.hypot(
      (t.oxygen - input.oxygen) / scales.oxygen,
      (t.pressure - input.pressure) / scales.pressure,
      (t.drop - input.drop) / scales.drop,
      input.gas === "none" ? 0 : (t.gasPct - input.gasPct) / scales.gasPct,
    );
  const neighbors = pool
    .map((test) => ({ test, distance: distance(test) }))
    .sort((a, b) => a.distance - b.distance || a.test.row - b.test.row)
    .slice(0, K);

  // Most common outcome; a tie goes to the outcome whose tests are closer.
  const tally = OUTCOMES.map((outcome) => {
    const hits = neighbors.filter((n) => n.test.outcome === outcome);
    return { outcome, votes: hits.length, near: hits.reduce((sum, n) => sum + n.distance, 0) };
  });
  const best = tally.reduce((a, b) => (b.votes > a.votes || (b.votes === a.votes && b.votes > 0 && b.near < a.near) ? b : a));

  const ranges = {
    oxygen: span(pool.map((t) => t.oxygen)),
    pressure: span(pool.map((t) => t.pressure)),
    drop: span(pool.map((t) => t.drop)),
    gasPct: span(pool.map((t) => t.gasPct)),
  };
  const checks: { name: string; value: number; range: [number, number] }[] = [
    { name: "oxygen", value: input.oxygen, range: ranges.oxygen },
    { name: "pressure", value: input.pressure, range: ranges.pressure },
    { name: "drop size", value: input.drop, range: ranges.drop },
    ...(input.gas === "none" ? [] : [{ name: "gas share", value: input.gasPct, range: ranges.gasPct }]),
  ];
  const outOfRange = checks.filter((c) => c.value < c.range[0] - 1e-9 || c.value > c.range[1] + 1e-9).map(({ name, range }) => ({ name, range }));

  const share = best.votes / neighbors.length;
  const mean = neighbors.reduce((sum, n) => sum + n.distance, 0) / neighbors.length;
  const confidence: Confidence = outOfRange.length
    ? "low"
    : share >= 0.8 && mean <= 0.15
      ? "high"
      : share >= 0.6 && mean <= 0.3
        ? "medium"
        : "low";

  return { outcome: best.outcome, votes: best.votes, neighbors, confidence, outOfRange, ranges };
}
