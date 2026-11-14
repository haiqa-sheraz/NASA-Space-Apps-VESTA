"use client";

import { FlaskConical, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/Controls";
import { SourceLine } from "@/components/ui/SourceChip";
import type { PredictionData } from "@/lib/data/prediction";
import { fmtNum, fmtRange } from "@/lib/format";
import { K, OUTCOME_LABEL, predict, type GasId, type PredInput } from "@/lib/prediction";

const GASES: { id: GasId; label: string; name: string }[] = [
  { id: "none", label: "None", name: "none" },
  { id: "co2", label: "CO₂", name: "CO₂" },
  { id: "he", label: "Helium", name: "helium" },
];

const CONFIDENCE = {
  high: { label: "High confidence", tone: "blue" },
  medium: { label: "Medium confidence", tone: "" },
  low: { label: "Low confidence", tone: "caution" },
} as const;

const UNITS: Record<string, (v: number) => string> = {
  oxygen: (v) => `${fmtNum(v, 1)}%`,
  pressure: (v) => `${fmtNum(v, 2)} atm`,
  "drop size": (v) => `${fmtNum(v, 2)} mm`,
  "gas share": (v) => `${fmtNum(v, 1)}%`,
};

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="stack g2">
      <span className="h5" style={{ fontWeight: 400 }}>
        {label}
      </span>
      <div className="seg self-start" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Data page: predict how a FLEX-style fuel-drop test would end, from the most similar real tests. */
export function PredictionTool({ data }: { data: PredictionData }) {
  const [input, setInput] = useState<PredInput>({
    fuel: data.fuels.includes("Heptane") ? "Heptane" : data.fuels[0],
    gas: "none",
    gasPct: 20,
    oxygen: 21,
    pressure: 1,
    drop: 3,
  });
  const set = (patch: Partial<PredInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const result = useMemo(() => predict(data.tests, input, data.scales), [data, input]);
  const gasName = GASES.find((g) => g.id === input.gas)!.name;
  const tested = (range: [number, number] | undefined, unit: (v: number) => string) =>
    range ? `FLEX tested ${range[0] === range[1] ? unit(range[0]) : `${unit(range[0])} to ${unit(range[1])}`} for this fuel and gas.` : undefined;

  return (
    <section className="sec" id="predict" aria-labelledby="predict-title">
      <div className="wrap stack g5">
        <div className="row between wrapx g3" style={{ alignItems: "flex-end" }}>
          <div className="stack g1">
            <span className="label">Prediction tool</span>
            <h2 id="predict-title" className="h2">
              Predict a fuel-drop test
            </h2>
          </div>
          <span className="badge caution">
            <FlaskConical className="ic sm" aria-hidden="true" />
            A model, not a measurement
          </span>
        </div>
        <p className="body muted">
          Choose conditions for a fuel drop burning in space. The tool finds the {K} FLEX tests most like them, with the same fuel and added gas,
          and shows how those tests most often ended. It repeats past results; it doesn&apos;t simulate a flame.
        </p>

        <div className="predict-grid">
          <div className="panel pad stack g5" role="group" aria-label="Test conditions">
            <Choice label="Fuel" value={input.fuel} options={data.fuels.map((f) => ({ id: f, label: f }))} onChange={(fuel) => set({ fuel })} />
            <Choice label="Added gas" value={input.gas} options={GASES.map(({ id, label }) => ({ id, label }))} onChange={(gas) => set({ gas })} />
            {input.gas !== "none" && (
              <Slider
                label={`${input.gas === "co2" ? "CO₂" : "Helium"} share of the gas`}
                value={input.gasPct}
                min={5}
                max={70}
                step={1}
                format={UNITS["gas share"]}
                hint={tested(result?.ranges.gasPct, UNITS["gas share"])}
                onChange={(gasPct) => set({ gasPct })}
              />
            )}
            <Slider label="Oxygen" value={input.oxygen} min={10} max={35} step={1} format={UNITS.oxygen} hint={tested(result?.ranges.oxygen, UNITS.oxygen)} onChange={(oxygen) => set({ oxygen })} />
            <Slider label="Pressure" value={input.pressure} min={0.5} max={3.1} step={0.05} format={UNITS.pressure} hint={tested(result?.ranges.pressure, UNITS.pressure)} onChange={(pressure) => set({ pressure })} />
            <Slider label="Drop size" value={input.drop} min={1} max={5} step={0.05} format={UNITS["drop size"]} hint={tested(result?.ranges.drop, UNITS["drop size"])} onChange={(drop) => set({ drop })} />
          </div>

          <div className="stack g4" style={{ minWidth: 0 }}>
            {!result ? (
              <p className="notice" aria-live="polite">
                FLEX has no tests of {input.fuel.toLowerCase()} with {gasName === "none" ? "no added gas" : `added ${gasName}`}. Choose another fuel or gas.
              </p>
            ) : (
              <>
                <div className="panel pad stack g3" aria-live="polite">
                  <span className="small muted strong">Predicted outcome</span>
                  <p className="h3">{OUTCOME_LABEL[result.outcome]}</p>
                  <div className="row g3 wrapx">
                    <span className={`badge ${CONFIDENCE[result.confidence].tone}`}>{CONFIDENCE[result.confidence].label}</span>
                    <span className="small muted">
                      {result.votes} of {result.neighbors.length} similar tests ended this way
                      {result.confidence === "high" ? ", and they are close to your settings." : result.outOfRange.length ? "." : ", but the similar tests disagree or are far from your settings."}
                    </span>
                  </div>
                  {result.outOfRange.map((o) => (
                    <p key={o.name} className="row g2 small" style={{ color: "var(--caution)", alignItems: "flex-start" }}>
                      <TriangleAlert className="ic sm" aria-hidden="true" style={{ marginTop: 2 }} />
                      <span>
                        Your {o.name} is outside what FLEX tested with this fuel and gas ({fmtRange(o.range, 2)}
                        {o.name === "pressure" ? " atm" : o.name === "drop size" ? " mm" : "%"}), so treat this as a guess.
                      </span>
                    </p>
                  ))}
                </div>

                <div className="stack g2">
                  <h3 className="h5">The {result.neighbors.length} most similar FLEX tests</h3>
                  <div className="tablebox">
                    <table className="table data-table">
                      <thead>
                        <tr>
                          <th scope="col">Test</th>
                          <th scope="col" className="n">
                            Oxygen <span className="u">(%)</span>
                          </th>
                          <th scope="col" className="n">
                            Pressure <span className="u">(atm)</span>
                          </th>
                          <th scope="col" className="n">
                            Drop <span className="u">(mm)</span>
                          </th>
                          <th scope="col">Added gas</th>
                          <th scope="col">Outcome</th>
                          <th scope="col">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.neighbors.map(({ test }) => (
                          <tr key={test.row}>
                            <td>{test.test}</td>
                            <td className="n">{fmtNum(test.oxygen, 1)}</td>
                            <td className="n">{fmtNum(test.pressure, 2)}</td>
                            <td className="n">{fmtNum(test.drop, 2)}</td>
                            <td>{test.gas === "none" ? "None" : `${test.gas === "co2" ? "CO₂" : "Helium"} ${fmtNum(test.gasPct, 1)}%`}</td>
                            <td className="wrap-cell">{OUTCOME_LABEL[test.outcome]}</td>
                            <td>PSI-69, row {test.row}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <SourceLine sources={data.sources} />
      </div>
    </section>
  );
}
