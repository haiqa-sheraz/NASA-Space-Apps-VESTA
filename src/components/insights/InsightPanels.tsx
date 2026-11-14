import {
  AlarmSmoke,
  CircleQuestionMark,
  Droplet,
  FireExtinguisher,
  Flame,
  Gauge,
  Globe,
  Layers,
  Orbit,
  Thermometer,
  TriangleAlert,
  Wind,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ByLevel } from "@/components/ui/ByLevel";
import { ShowMore } from "@/components/ui/ShowMore";
import { SourceLine } from "@/components/ui/SourceChip";
import { AiLabel, JobTag } from "@/components/ui/Tags";
import type {
  CardIcon,
  CoverageRow,
  EquipmentArea,
  EquipmentNote,
  InsightCard,
  JobInsights,
  getCoverage,
  getGravityBounds,
  getOxygenLimitChart,
} from "@/lib/data/insights";
import { fmtNum, fmtRange, joinAnd, plural } from "@/lib/format";
import { JOBS } from "@/lib/jobs";
import { niceScale, percentOf } from "@/lib/scale";
import type { SourceRef } from "@/lib/sources";

const CARD_ICONS: Record<CardIcon, LucideIcon> = {
  gauge: Gauge,
  wind: Wind,
  flame: Flame,
  alert: TriangleAlert,
  smoke: AlarmSmoke,
  thermometer: Thermometer,
};

const JOB_TINT = { prevent: "--ember", detect: "--smoke", put_out: "--mist" } as const;

/* ------------------------------------------------------------------ job tabs */

function Card({ card, color }: { card: InsightCard; color: string }) {
  const Icon = CARD_ICONS[card.icon];
  return (
    <article className="panel pad stack g3">
      <span className="insight-icon" style={{ background: `var(${color}-tint)`, color: `var(${color})` }}>
        <Icon className="ic" aria-hidden="true" />
      </span>
      <h3 className="h4">{card.title}</h3>
      <p className="body">
        <ByLevel simple={card.simple} expert={card.expert ?? card.simple} />
      </p>
      <div className="row between wrapx g2">
        <SourceLine sources={card.sources}>{card.expert && <ByLevel simple={null} expert={<AiLabel />} />}</SourceLine>
        {card.link && (
          <Link className="btn btn-ghost btn-sm" href={card.link.href}>
            {card.link.label}
          </Link>
        )}
      </div>
    </article>
  );
}

export function OxygenLimitChart({ data }: { data: ReturnType<typeof getOxygenLimitChart> }) {
  const scale = niceScale(0, Math.max(data.earth, data.space), 5);
  const bars = [
    { key: "earth", label: "On Earth", icon: Globe, value: data.earth, color: "var(--ember)" },
    { key: "space", label: "In space", icon: Orbit, value: data.space, color: "var(--blue)" },
  ];
  return (
    <figure className="panel pad stack g4" aria-labelledby="o2-limit-title">
      <h3 id="o2-limit-title" className="h4">
        Lowest oxygen where a plastic rod kept burning
      </h3>
      <div className="stack g3">
        {bars.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.key} className="hbar" style={{ gridTemplateColumns: "110px 1fr 64px" }}>
              <span className="row g2">
                <Icon className="ic sm" aria-hidden="true" />
                {b.label}
              </span>
              <span className="b">
                <i style={{ width: `${percentOf(b.value, scale)}%`, background: b.color }} />
              </span>
              <span className="num strong">{fmtNum(b.value)}%</span>
            </div>
          );
        })}
        <div className="hbar" style={{ gridTemplateColumns: "110px 1fr 64px" }} aria-hidden="true">
          <span />
          <div className="axis">
            {scale.ticks.map((t, i) => (
              <span key={t}>{i === scale.ticks.length - 1 ? `${fmtNum(t)}% oxygen` : `${fmtNum(t)}%`}</span>
            ))}
          </div>
          <span />
        </div>
      </div>
      <figcaption className="chart-sum">
        In space the rod kept burning down to {fmtNum(data.space)}% oxygen, while on Earth it stopped at {fmtNum(data.earth)}%.
      </figcaption>
      <SourceLine sources={data.sources} />
    </figure>
  );
}

export function JobPanel({ data, intro, chart }: { data: JobInsights; intro: string; chart?: ReactNode }) {
  const color = JOB_TINT[data.job];
  const studyCount = new Set(data.results.map((r) => r.studyId)).size;
  const cards = data.cards.map((card) => <Card key={card.id} card={card} color={color} />);
  return (
    <div className="stack g6">
      <p className="lead" style={{ color: "var(--text)" }}>
        <span className="row g2" style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 8 }}>
          <JobTag job={data.job} />
        </span>
        {intro}
      </p>

      {chart ? (
        <div className="insight-grid">
          <div className="insight-cards">{cards}</div>
          {chart}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 24 }}>{cards}</div>
      )}

      <section className="stack g4" aria-labelledby={`results-${data.job}`}>
        <div className="row between wrapx g3">
          <h2 id={`results-${data.job}`} className="h3">
            What the studies found
          </h2>
          <AiLabel />
        </div>
        <p className="small muted">
          {plural(data.results.length, "result", "results")} from {plural(studyCount, "study", "studies")}, written by AI from
          each study&apos;s reports. Each one names its source.
        </p>
        <ShowMore
          moreLabel={`Show all ${data.results.length} results`}
          initial={6}
          items={data.results.map((r, i) => (
            <li key={`${r.studyId}-${i}`} className="result-item">
              <Link href={`/study/${r.studyId}`} className="h5 name-link self-start">
                {r.studyName}
              </Link>
              <p className="body">
                <ByLevel simple={r.simple} expert={r.expert} />
              </p>
              <p className="small muted">
                <span className="strong">What it means for safety: </span>
                {r.meaning}
              </p>
              <SourceLine sources={r.source ? [r.source] : []} showPage>
                {!r.source && <span>Source not recorded. Check the study&apos;s PSI page.</span>}
              </SourceLine>
            </li>
          ))}
        />
      </section>

      <section className="stack g3" aria-labelledby={`linked-${data.job}`}>
        <h2 id={`linked-${data.job}`} className="h3">
          Linked studies
        </h2>
        <ul>
          {data.linked.map((s) => (
            <li key={s.id} className="row between wrapx g3" style={{ padding: "12px 0", borderBottom: "1px solid var(--rule)" }}>
              <div className="row wrapx g4" style={{ minWidth: 0 }}>
                <Link href={`/study/${s.id}`} className="h5 name-link" style={{ minWidth: 120 }}>
                  {s.shortName}
                </Link>
                <span className="small muted">{s.fullName}</span>
              </div>
              <div className="row g3">
                <span className="small muted">{s.familyName}</span>
                <Link className="btn btn-ghost btn-sm" href={`/study/${s.id}`}>
                  Open study
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Equipment */

const AREAS: Record<EquipmentArea, { label: string; icon: LucideIcon }> = {
  materials: { label: "Materials", icon: Layers },
  detectors: { label: "Detectors", icon: AlarmSmoke },
  extinguishers: { label: "Extinguishers", icon: FireExtinguisher },
  ventilation: { label: "Ventilation", icon: Wind },
};

export function EquipmentPanel({ data }: { data: Record<EquipmentArea, EquipmentNote[]> }) {
  return (
    <div className="stack g6">
      <p className="lead" style={{ color: "var(--text)" }}>
        What NASA&apos;s tests mean for fire-safety equipment: materials, detectors, extinguishers and ventilation.
      </p>
      <p className="row wrapx g3">
        <AiLabel />
        <span className="small muted">Each note is AI-written from one study&apos;s reports and cites that study&apos;s main report.</span>
      </p>
      <div className="cols-2">
        {(Object.keys(AREAS) as EquipmentArea[]).map((area) => {
          const { label, icon: Icon } = AREAS[area];
          const notes = data[area];
          return (
            <section key={area} className="panel pad stack g3" aria-labelledby={`equip-${area}`}>
              <div className="row g3">
                <span className="insight-icon" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
                  <Icon className="ic" aria-hidden="true" />
                </span>
                <h2 id={`equip-${area}`} className="h3" style={{ flex: 1 }}>
                  {label}
                </h2>
                <span className="num small muted">{plural(notes.length, "note", "notes")}</span>
              </div>
              <ShowMore
                moreLabel={`Show all ${notes.length} notes`}
                initial={4}
                items={notes.map((n, i) => (
                  <li key={`${n.studyId}-${i}`} className="stack g2" style={{ padding: "12px 0", borderBottom: "1px solid var(--rule)" }}>
                    <Link href={`/study/${n.studyId}`} className="h5 name-link self-start">
                      {n.studyName}
                    </Link>
                    <p className="small">{n.note}</p>
                    <SourceLine sources={n.source ? [n.source] : []} />
                  </li>
                ))}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Gaps and gravity */

const COVERAGE_ICONS: Record<CoverageRow["kind"], LucideIcon> = { solid: Layers, liquid: Droplet, gas: Flame };
const LINE_STYLE = { solid: "solid", dashed: "dashed", dotted: "dotted" } as const;

function CoverageMap({ data }: { data: ReturnType<typeof getCoverage> }) {
  const frac = (v: number) => v / data.axisMax;
  const solid = data.rows.find((r) => r.kind === "solid");
  const ticks = Array.from({ length: data.axisMax / 10 + 1 }, (_, i) => i * 10);
  const labelRows = data.references.length;
  return (
    <section className="stack g4" aria-labelledby="coverage-title">
      <div className="stack g1">
        <span className="label">Coverage map</span>
        <h2 id="coverage-title" className="h2">
          Which oxygen levels have been tested
        </h2>
      </div>
      <div className="panel pad-l">
        <figure className="stack g3" role="group" aria-label="Coverage map: oxygen tested, by fuel type">
          <div className="coverage-chart" style={{ "--label-rows": labelRows } as CSSProperties}>
            {data.rows.map((row) => {
              const Icon = COVERAGE_ICONS[row.kind];
              return (
                <div key={row.kind} className="coverage-row">
                  <span className="row g2 strong" style={{ fontSize: 15 }}>
                    <Icon className="ic sm" aria-hidden="true" />
                    {row.label}
                  </span>
                  <div className="stack g1">
                    <div className="coverage-track">
                      {row.range && (
                        <span
                          style={{
                            position: "absolute",
                            left: `${frac(row.range[0]) * 100}%`,
                            width: `max(3px, ${(frac(row.range[1]) - frac(row.range[0])) * 100}%)`,
                            top: 0,
                            height: 16,
                            background: "var(--blue)",
                            borderRadius: 2,
                          }}
                        />
                      )}
                      {row.kind === "gas" && data.bre.range && (
                        <span
                          aria-hidden="true"
                          style={{ position: "absolute", left: `${frac(data.bre.range[1]) * 100}%`, top: -4, width: 3, height: 24, marginLeft: -1.5, background: "var(--text)", borderRadius: 2 }}
                        />
                      )}
                    </div>
                    <span className="small num">
                      {row.range
                        ? `${fmtRange(row.range)}% (${joinAnd(row.studies.map((s) => s.shortName))})`
                        : "No oxygen levels in the tables"}
                    </span>
                    {row.kind === "gas" && data.bre.range && (
                      <span className="small">
                        Marked: {data.bre.shortName}, a gas burner that imitates burning solids, reached {fmtNum(data.bre.range[1])}%.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {data.references.map((ref, i) => (
              <span key={ref.key} aria-hidden="true">
                <span
                  className="coverage-ref"
                  style={{
                    left: `calc(var(--track-x) + (100% - var(--track-x)) * ${frac(ref.value)})`,
                    bottom: (labelRows - i) * 22 - 4,
                    borderLeft: `1px ${LINE_STYLE[ref.style]} ${ref.key === "iss" ? "var(--text-2)" : "var(--caution)"}`,
                  }}
                />
                <span
                  className="small coverage-ref-label"
                  style={{
                    left: `calc(var(--track-x) + (100% - var(--track-x)) * ${frac(ref.value)})`,
                    bottom: (labelRows - 1 - i) * 22,
                    color: ref.key === "iss" ? "var(--text-2)" : "var(--caution)",
                  }}
                >
                  {ref.label}
                </span>
              </span>
            ))}
          </div>
          <ul className="coverage-ref-list wrapx g4 small" aria-hidden="true">
            {data.references.map((ref) => (
              <li key={ref.key} className="row g2" style={{ color: ref.key === "iss" ? "var(--text-2)" : "var(--caution)" }}>
                <span style={{ width: 0, height: 14, borderLeft: `1px ${LINE_STYLE[ref.style]} currentColor` }} />
                {ref.label}
              </li>
            ))}
          </ul>
          <div className="coverage-row" style={{ borderBottom: 0, paddingTop: 0 }} aria-hidden="true">
            <span className="small muted">Oxygen in the air</span>
            <div className="axis">
              {ticks.map((t) => (
                <span key={t}>{t}%</span>
              ))}
            </div>
          </div>
          <div className="row g4 wrapx small muted">
            <span className="row g2">
              <span style={{ width: 24, height: 12, background: "var(--blue)", borderRadius: 2 }} />
              Tested range
            </span>
            <span className="row g2">
              <span style={{ width: 3, height: 14, background: "var(--text)", borderRadius: 2 }} />
              {data.bre.shortName}, imitating solids
            </span>
            <span className="row g2">
              <span style={{ width: 0, height: 14, borderLeft: "1px solid var(--text-2)" }} />
              Station air today
            </span>
            <span className="row g2">
              <span style={{ width: 0, height: 14, borderLeft: "1px dashed var(--caution)" }} />
              Planned habitat air
            </span>
          </div>
          <figcaption className="chart-sum">
            Solid materials in PSI were tested only up to about {solid?.range ? Math.round(solid.range[1]) : "–"}% oxygen, while a
            Moon base may use {fmtNum(data.moonO2)}% or more. {data.bre.shortName}, a gas burner that imitates burning solids,
            reached {data.bre.range ? fmtNum(data.bre.range[1]) : "–"}%.
          </figcaption>
          {data.insideOut.range && (
            <p className="small muted">
              Not shown: {plural(data.insideOut.tests, "inside-out flame test", "inside-out flame tests")} in{" "}
              {joinAnd(data.insideOut.studies)} reached {fmtNum(data.insideOut.range[1])}% oxygen. In those flames the oxygen
              flows out of the burner, so it isn&apos;t the same as {fmtNum(data.insideOut.range[1])}% oxygen in cabin air.
            </p>
          )}
          <SourceLine sources={data.sources} />
        </figure>
      </div>
    </section>
  );
}

function GravityScale({ data }: { data: ReturnType<typeof getGravityBounds> }) {
  const at = (g: number) => `${g * 100}%`;
  const marks = [
    { name: "Orbit", g: 0, label: "0 g" },
    { name: "Moon", g: data.moonG, label: `${fmtNum(data.moonG, 2)} g` },
    { name: "Mars", g: data.marsG, label: `${fmtNum(data.marsG, 2)} g` },
    { name: "Earth", g: 1, label: "1 g" },
  ];
  const summary = `PSI has fire data at about 0 g and 1 g only. Between them, LUCI simulated Moon gravity on a spinning rocket and FM2 is planned. ${data.eField.shortName} used an electric field as a stand-in for some gravity effects, in tests at about 0 g. Mars gravity has no data.`;
  return (
    <section className="stack g4" aria-labelledby="gravity-title">
      <div className="stack g1">
        <span className="label">Gravity bounds</span>
        <h2 id="gravity-title" className="h2">
          Where fire data exists between 0 g and 1 g
        </h2>
      </div>
      <div className="panel pad-l">
        <figure className="stack g4" role="group" aria-label="Gravity scale from 0 g to 1 g showing where fire data exists">
          <div className="gscale-chart" aria-hidden="true">
            <div className="gscale-line" />
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} className="gscale-tick" style={{ left: `${i * 10}%` }} />
            ))}
            {marks.map((m) => (
              <div key={m.name} className="gscale-mk" style={{ left: at(m.g), top: 0 }}>
                <span className="strong" style={{ fontSize: 15 }}>
                  {m.name}
                </span>
                <span className="num small muted">{m.label}</span>
                <span style={{ width: 1, height: 46, background: "var(--rule-input)" }} />
              </div>
            ))}
            {/* On the line: measured data at 0 g and 1 g, simulated Moon gravity (LUCI). */}
            <span className="gscale-dot" style={{ left: at(0) }} />
            <span className="gscale-dot" style={{ left: at(1) }} />
            <span className="gscale-ring" style={{ left: at(data.moonG) }} />
            {/* Above the line: planned (FM2) and the Mars gap. */}
            <span className="gscale-planned" style={{ left: at(data.moonG) }} />
            <div className="gscale-mk start" style={{ left: `calc(${at(data.moonG)} + 18px)`, top: 56 }}>
              <span className="small strong" style={{ color: "var(--caution)" }}>
                FM2, planned
              </span>
            </div>
            <div className="gscale-mk start" style={{ left: `calc(${at(data.marsG)} + 14px)`, top: 74 }}>
              <span className="small strong" style={{ color: "var(--caution)" }}>
                No data at Mars gravity
              </span>
            </div>
            {/* First row below the line. */}
            <div className="gscale-mk start" style={{ left: at(0), top: 132 }}>
              <span className="small strong">PSI tests</span>
              <span className="small muted">{plural(data.space, "space study", "space studies")}</span>
            </div>
            <div className="gscale-mk start" style={{ left: at(data.moonG), top: 132 }}>
              <span className="small strong">LUCI, simulated Moon gravity</span>
              <span className="small muted">on a spinning rocket</span>
            </div>
            {/* Second row below the line: the stand-in method, which ran at about 0 g. */}
            <span className="gscale-standin" style={{ left: at(0), top: 196 }} />
            <div className="gscale-mk start" style={{ left: "18px", top: 190 }}>
              <span className="small strong">{data.eField.shortName}, a stand-in method</span>
              <span className="small muted">An electric field mimics some gravity effects. Its tests ran at about 0 g.</span>
            </div>
            <div className="gscale-mk end" style={{ left: at(1), top: 132 }}>
              <span className="small strong">Earth tests</span>
              <span className="small muted">{plural(data.ground, "ground study", "ground studies")}</span>
            </div>
          </div>

          <ul className="gscale-list stack g4">
            <li className="row g4" style={{ alignItems: "flex-start" }}>
              <span className="num strong" style={{ width: 64, flex: "none" }}>
                0 g
              </span>
              <span className="stack g1">
                <span className="strong">Orbit</span>
                <span className="small muted">
                  Measured: PSI tests, {plural(data.space, "space study", "space studies")}. Stand-in: {data.eField.shortName} used an
                  electric field to mimic some gravity effects.
                </span>
              </span>
            </li>
            <li className="row g4" style={{ alignItems: "flex-start" }}>
              <span className="num strong" style={{ width: 64, flex: "none" }}>
                {fmtNum(data.moonG, 2)} g
              </span>
              <span className="stack g1">
                <span className="strong">Moon</span>
                <span className="small muted">Simulated: LUCI, on a spinning rocket. Planned: FM2.</span>
              </span>
            </li>
            <li className="row g4" style={{ alignItems: "flex-start" }}>
              <span className="num strong" style={{ width: 64, flex: "none" }}>
                {fmtNum(data.marsG, 2)} g
              </span>
              <span className="stack g1">
                <span className="strong">Mars</span>
                <span className="small" style={{ color: "var(--caution)" }}>
                  No data at Mars gravity.
                </span>
              </span>
            </li>
            <li className="row g4" style={{ alignItems: "flex-start" }}>
              <span className="num strong" style={{ width: 64, flex: "none" }}>
                1 g
              </span>
              <span className="stack g1">
                <span className="strong">Earth</span>
                <span className="small muted">Measured: Earth tests, {plural(data.ground, "ground study", "ground studies")}.</span>
              </span>
            </li>
          </ul>

          <div className="row g5 wrapx small muted gscale-legend">
            <span className="row g2">
              <span className="gscale-dot inline" />
              Measured data
            </span>
            <span className="row g2">
              <span className="gscale-ring inline" />
              Simulated
            </span>
            <span className="row g2">
              <span className="gscale-planned inline" />
              Planned
            </span>
            <span className="row g2">
              <span className="gscale-standin inline" />
              Stand-in method
            </span>
          </div>
          <figcaption className="chart-sum">{summary}</figcaption>
          <SourceLine sources={data.sources} />
        </figure>
      </div>
    </section>
  );
}

export function GapsPanel({
  coverage,
  gravity,
  gaps,
  sources,
}: {
  coverage: ReturnType<typeof getCoverage>;
  gravity: ReturnType<typeof getGravityBounds>;
  gaps: { items: string[]; sources: SourceRef[] };
  sources: SourceRef[];
}) {
  return (
    <div className="stack g7">
      <p className="lead" style={{ color: "var(--text)" }}>
        Where NASA&apos;s fire data stops, and why it matters for a Moon or Mars base.
      </p>
      <CoverageMap data={coverage} />
      <GravityScale data={gravity} />
      <section className="gap" aria-labelledby="insight-gaps-title">
        <div className="row g4" style={{ alignItems: "flex-start" }}>
          <span className="gap-ic">
            <CircleQuestionMark className="ic" aria-hidden="true" />
          </span>
          <div className="stack g3" style={{ flex: 1, minWidth: 0 }}>
            <h2 id="insight-gaps-title" className="h4">
              What we don&apos;t know yet
            </h2>
            <ul className="stack g2 body dot-list">
              {gaps.items.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <SourceLine sources={gaps.sources} />
          </div>
        </div>
      </section>
      <SourceLine sources={sources} />
    </div>
  );
}
