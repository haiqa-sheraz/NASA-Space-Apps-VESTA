"use client";

import { FlaskConical, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Slider } from "@/components/ui/Controls";
import { SourceLine } from "@/components/ui/SourceChip";
import {
  chanceOut,
  nearestTests,
  OUTCOME_SHORT,
  testConditions,
  testHref,
  type FireModelData,
  type FlameInput,
  type FlexTest,
  type Fuel,
} from "@/lib/fire-model";
import type { FlexOutcome } from "@/lib/explainer-types";
import { fmtNum } from "@/lib/format";
import { FlameOutMap, OutcomeKey } from "./FlameOutMap";
import { LivingFlame } from "./LivingFlame";

/** Slider steps; every value stays inside the model file's ranges. */
const STEP = { oxygen: 0.5, pressure: 0.01, co2: 1, he: 1, drop: 0.01 } as const;

function snap(value: number, [min, max]: [number, number], step: number) {
  const v = min + Math.round((Math.min(max, Math.max(min, value)) - min) / step) * step;
  return Math.round(Math.min(max, v) * 10000) / 10000;
}

const pct = (share: number) => `${Math.round(share * 100)}%`;

/** How many of the most similar real tests the "burned to the end or broke apart" split uses. */
const SIMILAR_FOR_ENDINGS = 7;

/** How a chosen real test ended, in words. */
const REAL_TEXT: Record<FlexOutcome, string> = {
  extinction: "the flame went out on its own",
  completion: "the drop burned to the end",
  disruption: "the drop broke apart",
};

/** The flame's look for a real test's ending: dim and blue, bright, or bright and shaking. */
const REAL_LOOK: Record<FlexOutcome, number> = { extinction: 0.85, completion: 0.05, disruption: 0.3 };

/** The ending the flame acts out, in words. */
const ENDING_TEXT: Record<FlexOutcome, string> = {
  extinction: "the flame goes out on its own",
  completion: "the drop burns to the end",
  disruption: "the drop breaks apart",
};

/** Data page: "Will the flame go out?", a machine-learning model trained on NASA FLEX fuel-drop tests. */
export function FlameOutTool({ data }: { data: FireModelData }) {
  const { model, tests, farDistance, sources } = data;
  const r = model.ranges;
  // Start at typical FLEX conditions: methanol (the most-tested fuel), the tests' median oxygen,
  // about 1 atm, no added gas and a 3 mm drop.
  const [input, setInput] = useState<FlameInput>(() => ({
    fuel: "Methanol",
    oxygen: snap(20, r.oxygen_pct, STEP.oxygen),
    pressure: snap(1, r.pressure_atm, STEP.pressure),
    co2: snap(0, r.co2_pct, STEP.co2),
    he: snap(0, r.he_pct, STEP.he),
    drop: snap(3, r.drop_mm, STEP.drop),
  }));
  // A real test chosen on the map: the flame then shows how that test really ended, until any
  // input changes or an empty spot on the map is chosen.
  const [picked, setPicked] = useState<FlexTest | null>(null);
  const set = (patch: Partial<FlameInput>) => {
    setPicked(null);
    setInput((prev) => ({ ...prev, ...patch }));
  };
  const selectTest = useCallback(
    (test: FlexTest) => {
      setPicked(test);
      setInput((prev) => ({
        fuel: test.fuel,
        oxygen: snap(test.oxygen, r.oxygen_pct, STEP.oxygen),
        pressure: test.pressure === null ? prev.pressure : snap(test.pressure, r.pressure_atm, STEP.pressure),
        co2: snap(test.co2, r.co2_pct, STEP.co2),
        he: snap(test.he, r.he_pct, STEP.he),
        drop: snap(test.drop, r.drop_mm, STEP.drop),
      }));
    },
    [r.oxygen_pct, r.pressure_atm, r.co2_pct, r.he_pct, r.drop_mm],
  );
  const chance = chanceOut(model, input);
  const similar = useMemo(() => nearestTests(model, tests, input, 3), [model, tests, input]);
  // How the 7 most similar real tests ended, and the most likely ending, which the flame acts out.
  // The model only answers "goes out or not": its chance of going out stands as it is, and the rest
  // is split between "burns to the end" and "breaks apart" as the similar tests ended (or as all
  // FLEX tests ended, if none of the similar ones did either).
  const allEnded = useMemo(() => ({ completion: tests.filter((t) => t.outcome === "completion").length, disruption: tests.filter((t) => t.outcome === "disruption").length }), [tests]);
  const endings = useMemo(() => {
    const near = nearestTests(model, tests, input, SIMILAR_FOR_ENDINGS);
    const count = (o: FlexOutcome) => near.filter((n) => n.test.outcome === o).length;
    const counts = { extinction: count("extinction"), completion: count("completion"), disruption: count("disruption") };
    const split = counts.completion + counts.disruption > 0 ? counts : allEnded;
    const notOut = 1 - chance;
    const shares: Record<FlexOutcome, number> = {
      extinction: chance,
      completion: (notOut * split.completion) / (split.completion + split.disruption),
      disruption: (notOut * split.disruption) / (split.completion + split.disruption),
    };
    const likely = (Object.keys(shares) as FlexOutcome[]).reduce((best, o) => (shares[o] > shares[best] ? o : best), "extinction" as FlexOutcome);
    return { total: near.length, ...counts, likely };
  }, [model, tests, input, chance, allEnded]);
  const far = (similar[0]?.distance ?? Infinity) > farDistance;

  const onPick = useCallback(
    (oxygen: number, drop: number) => {
      setPicked(null);
      setInput((prev) => ({ ...prev, oxygen: snap(oxygen, r.oxygen_pct, STEP.oxygen), drop: snap(drop, r.drop_mm, STEP.drop) }));
    },
    [r.oxygen_pct, r.drop_mm],
  );

  // Show a test in the table below: set its filters and scroll there (the link also works on its own).
  const openTest = useCallback((test: FlexTest) => {
    window.dispatchEvent(new CustomEvent("vesta:show-tests", { detail: { study: "flex", q: test.id } }));
  }, []);
  const onTestLink = (event: MouseEvent<HTMLAnchorElement>, test: FlexTest) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    openTest(test);
  };

  // Screen readers hear the new chance once a change settles, not on every slider step.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const likely = picked ? ` Real test ${picked.id}: ${REAL_TEXT[picked.outcome]}.` : ` Most likely, ${ENDING_TEXT[endings.likely]}.`;
    const timer = window.setTimeout(() => setAnnounced(`Chance the flame goes out on its own: ${pct(chance)}.${likely}${far ? " Far from tested conditions." : ""}`), 700);
    return () => window.clearTimeout(timer);
  }, [chance, far, endings, picked]);

  return (
    <section id="flame-model" className="sec flame-model" aria-labelledby="fm-title">
      <div className="wrap stack g6">
        <div className="stack g3" style={{ maxWidth: 820 }}>
          <span className="label">Machine-learning model</span>
          <h2 id="fm-title" className="h2">
            Will the flame go out?
          </h2>
          <p className="lead">
            Set the conditions for a burning fuel drop like the ones in NASA&apos;s FLEX tests on the space station, and see the chance that its flame goes
            out on its own before the drop burns away.
          </p>
          <span className="badge caution self-start fm-badge">
            <FlaskConical className="ic sm" aria-hidden="true" />
            Experimental machine-learning model, not a measurement.
          </span>
        </div>

        <div className="fm-top">
          <div className="panel pad stack g5">
            <div className="stack g2">
              <span className="h5" style={{ fontWeight: 400 }}>
                Fuel
              </span>
              <div className="seg self-start" role="group" aria-label="Fuel">
                {(["Methanol", "Heptane"] as Fuel[]).map((f) => (
                  <button key={f} type="button" aria-pressed={input.fuel === f} onClick={() => set({ fuel: f })}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Oxygen in the air" value={input.oxygen} min={r.oxygen_pct[0]} max={r.oxygen_pct[1]} step={STEP.oxygen} format={(v) => `${fmtNum(v, 1)}%`} onChange={(v) => set({ oxygen: snap(v, r.oxygen_pct, STEP.oxygen) })} />
            <Slider label="Pressure" value={input.pressure} min={r.pressure_atm[0]} max={r.pressure_atm[1]} step={STEP.pressure} format={(v) => `${fmtNum(v, 2)} atm`} onChange={(v) => set({ pressure: snap(v, r.pressure_atm, STEP.pressure) })} />
            <Slider label="Carbon dioxide (CO₂) added" value={input.co2} min={r.co2_pct[0]} max={r.co2_pct[1]} step={STEP.co2} format={(v) => `${fmtNum(v)}%`} onChange={(v) => set({ co2: snap(v, r.co2_pct, STEP.co2) })} />
            <Slider label="Helium added" value={input.he} min={r.he_pct[0]} max={r.he_pct[1]} step={STEP.he} format={(v) => `${fmtNum(v)}%`} onChange={(v) => set({ he: snap(v, r.he_pct, STEP.he) })} />
            <Slider label="Drop size" value={input.drop} min={r.drop_mm[0]} max={r.drop_mm[1]} step={STEP.drop} format={(v) => `${fmtNum(v, 2)} mm`} onChange={(v) => set({ drop: snap(v, r.drop_mm, STEP.drop) })} />
          </div>

          <div className="panel pad fm-result">
            <div className="fm-flame">
              <LivingFlame chance={picked ? REAL_LOOK[picked.outcome] : chance} ending={picked ? picked.outcome : endings.likely} idPrefix="fm-flame" />
            </div>
            <div className="stack g3" style={{ minWidth: 0 }}>
              <p className="h4" style={{ margin: 0 }}>
                Chance the flame goes out on its own: <span className="fm-pct">{pct(chance)}</span>
              </p>
              <p className="sr-only" aria-live="polite">
                {announced}
              </p>
              <div className="stack g1">
                <span className="small strong">The {endings.total} most similar real tests</span>
                <span className="row g4 wrapx small" aria-hidden="true">
                  <span className="row g1">
                    <OutcomeKey outcome="extinction" /> {endings.extinction} went out
                  </span>
                  <span className="row g1">
                    <OutcomeKey outcome="completion" /> {endings.completion} burned to the end
                  </span>
                  <span className="row g1">
                    <OutcomeKey outcome="disruption" /> {endings.disruption} broke apart
                  </span>
                </span>
                <span className="sr-only">
                  Of the {endings.total} most similar real tests, {endings.extinction} went out, {endings.completion} burned to the end and {endings.disruption}{" "}
                  broke apart.
                </span>
                {picked ? (
                  <>
                    <span className="small">
                      The flame shows how real test {picked.id} ended: <strong className="fm-likely">{REAL_TEXT[picked.outcome]}</strong>.
                    </span>
                    <button type="button" className="linklike small self-start" onClick={() => setPicked(null)}>
                      Show the most likely ending instead
                    </button>
                  </>
                ) : (
                  <>
                    <span className="small">
                      The flame acts out the most likely ending: <strong className="fm-likely">{ENDING_TEXT[endings.likely]}</strong>.
                    </span>
                    <span className="small muted">
                      Going out comes from the model; burning to the end or breaking apart comes from how the similar real tests ended. Select a dot on the map
                      to see how that real test ended.
                    </span>
                  </>
                )}
              </div>
              {far && (
                <p className="row g2 small strong" style={{ color: "var(--caution)", alignItems: "flex-start" }}>
                  <TriangleAlert className="ic sm" aria-hidden="true" style={{ marginTop: 2 }} />
                  Far from tested conditions: treat with caution.
                </p>
              )}
              <p className="small muted">
                Right {pct(model.accuracy)} of the time in testing (balanced accuracy {pct(model.balanced_accuracy)}). Always guessing &ldquo;goes out&rdquo; is right{" "}
                {pct(model.baseline)} of the time. Trained on {model.tests} NASA FLEX tests.
              </p>
              <SourceLine sources={sources} />
            </div>
          </div>
        </div>

        <div className="panel pad stack g4">
          <div className="stack g1">
            <h3 className="h4">The model and the real tests</h3>
            <p className="small muted">
              Shading shows the model&apos;s chance at each oxygen level and drop size, for the fuel, pressure and gases above. Click or drag on the map to set
              oxygen and drop size, or select a dot to load that real test and see how it ended.
            </p>
          </div>
          <FlameOutMap model={model} tests={tests} input={input} chance={chance} picked={picked} onPick={onPick} onSelectTest={selectTest} onOpenTest={openTest} />
        </div>

        <div className="stack g3">
          <h3 className="h4">The 3 most similar real tests</h3>
          <ol className="fm-similar">
            {similar.map(({ test }) => (
              <li key={`${test.id}-${test.row}`} className="panel pad-s stack g1">
                <span className="row g2 strong small">
                  <OutcomeKey outcome={test.outcome} />
                  {OUTCOME_SHORT[test.outcome]}
                </span>
                <span className="small">
                  Test {test.id}: {testConditions(test)}.
                </span>
                <a className="small self-start" href={testHref(test)} onClick={(event) => onTestLink(event, test)}>
                  Show it in the data table
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
