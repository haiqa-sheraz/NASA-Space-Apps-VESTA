import { Gauge, Info, Layers, SlidersVertical, Thermometer, TriangleAlert, Wind, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ByLevel, ExpertOnly } from "@/components/ui/ByLevel";
import { QualityFlag } from "@/components/ui/QualityFlag";
import { SourceChip, SourceLine } from "@/components/ui/SourceChip";
import { AiLabel, JobTag } from "@/components/ui/Tags";
import { COLUMN_BY_NAME } from "@/lib/column-guide";
import type { PreviewColumn, PreviewRow } from "@/lib/data/study-view";
import type { Profile, Study } from "@/lib/data/types";
import { formatCount, fmtRange, joinAnd, sentenceCase } from "@/lib/format";
import { isJobId } from "@/lib/jobs";
import { resolveSource, type SourceRef } from "@/lib/sources";
import { DownloadCsvButton } from "./DownloadCsvButton";

const NOT_IN_SOURCES = "Not in our sources";

function textOrMissing(value: string | null | undefined) {
  return value && value.trim() ? sentenceCase(value.trim()) : <span className="muted">{NOT_IN_SOURCES}</span>;
}

export function testsDetail(study: Study): string {
  if (study.environment === "ground") return "No test table in PSI";
  if (study.tests === 0) return `No results yet: the table lists ${study.table_rows} planned tests`;
  if (study.tests === study.table_rows) return formatCount(study.tests);
  return `${formatCount(study.tests)} (the table has ${formatCount(study.table_rows)} rows; copies and rows that aren't tests are not counted)`;
}

const CHANGE_ICONS: [RegExp, LucideIcon][] = [
  [/flow|ventilat|velocity|speed|air rate/i, Wind],
  [/temperat|heat/i, Thermometer],
  [/oxygen|\bo2\b|pressure|concentration|dilu/i, Gauge],
  [/sample|fuel|thick|geometr|shape|material|diameter|size|nozzle/i, Layers],
];

/** Key facts grid and "What changed between tests". */
export function KeyFacts({ study, profile, authors }: { study: Study; profile: Profile | null; authors: string[] }) {
  if (!profile) {
    return (
      <section className="sec">
        <div className="wrap stack g5">
          <h2 className="h2">Key facts</h2>
          <dl className="facts">
            <div className="span2">
              <dt>Title</dt>
              <dd>{study.full_name}</dd>
            </div>
            <div>
              <dt>Where it ran</dt>
              <dd>{study.environment === "ground" ? "On the ground, 1 g" : "In space, about 0 g"}</dd>
            </div>
            <div>
              <dt>Tests</dt>
              <dd>{testsDetail(study)}</dd>
            </div>
            <div>
              <dt>Authors</dt>
              <dd>{authors.length ? joinAnd(authors) : NOT_IN_SOURCES}</dd>
            </div>
            <div>
              <dt>Dataset published</dt>
              <dd className="num">{study.citation_year ?? NOT_IN_SOURCES}</dd>
            </div>
          </dl>
        </div>
      </section>
    );
  }

  const kf = profile.key_facts;
  return (
    <section className="sec">
      <div className="wrap stack g5">
        <div className="row between wrapx g3">
          <h2 className="h2">Key facts</h2>
          <AiLabel />
        </div>
        <dl className="facts">
          <div className="span2">
            <dt>Goal</dt>
            <dd>{textOrMissing(profile.experiment_goal)}</dd>
          </div>
          <div>
            <dt>Fuel and samples</dt>
            <dd>
              {kf.fuels.length ? sentenceCase(kf.fuels.join(", ")) : <span className="muted">{NOT_IN_SOURCES}</span>}
              {kf.sample_shapes.length > 0 && <span className="block small muted" style={{ marginTop: 4 }}>Samples: {kf.sample_shapes.join("; ")}</span>}
            </dd>
          </div>
          <div>
            <dt>Oxygen</dt>
            <dd>{textOrMissing(kf.oxygen)}</dd>
          </div>
          <div>
            <dt>Airflow</dt>
            <dd>{textOrMissing(kf.airflow)}</dd>
          </div>
          <div>
            <dt>Pressure</dt>
            <dd>{textOrMissing(kf.pressure)}</dd>
          </div>
          <div>
            <dt>Tests</dt>
            <dd>{testsDetail(study)}</dd>
          </div>
          <div>
            <dt>Sensors</dt>
            <dd>{kf.sensors.length ? sentenceCase(kf.sensors.join("; ")) : <span className="muted">{NOT_IN_SOURCES}</span>}</dd>
          </div>
        </dl>
        <p className="small muted">The test count comes from the PSI data table. The other facts are AI-written from the sources listed on this page.</p>
        {kf.what_changed.length > 0 && (
          <div className="stack g3">
            <h3 className="h4">What changed between tests</h3>
            <div className="row g2 wrapx">
              {kf.what_changed.map((change) => {
                const Icon = CHANGE_ICONS.find(([re]) => re.test(change))?.[1] ?? SlidersVertical;
                return (
                  <span key={change} className="chip chip-wrap">
                    <Icon className="ic sm" aria-hidden="true" />
                    {sentenceCase(change)}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Results and what they mean for safety, each with its source. */
export function Results({ study, profile }: { study: Study; profile: Profile }) {
  if (!profile.results.length) return null;
  return (
    <section className="sec">
      <div className="wrap stack g4">
        <div className="row between wrapx g3">
          <h2 className="h2">Results and what they mean for safety</h2>
          <AiLabel />
        </div>
        {profile.results.map((r, i) => {
          const source: SourceRef | null = r.source_detail
            ? resolveSource(r.source_detail.title, r.source_detail.url, r.source_detail.page)
            : r.source?.trim() === "T"
              ? { label: study.psi_id, title: "PSI data table", url: study.psi_url }
              : null;
          return (
            <article key={i} className="finding result-row">
              <div className="stack g3">
                <span className="small muted strong">Result</span>
                <p className="claim">
                  <ByLevel simple={r.result_simple} expert={r.result_expert} />
                </p>
                <SourceLine sources={source ? [source] : []} showPage>
                  {isJobId(r.job) && <JobTag job={r.job} />}
                  {!source && (
                    <>
                      <QualityFlag text="The source of this result wasn't recorded. Check the study's PSI page." />
                      <span>Source not recorded</span>
                    </>
                  )}
                </SourceLine>
              </div>
              <div className="stack g3">
                <span className="small muted strong">What it means for safety</span>
                <p className="body">{r.safety_meaning}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Expert mode only: detailed conditions, column notes and the full source list. */
export function ExpertDetail({
  study,
  profile,
  columns,
  sources,
}: {
  study: Study;
  profile: Profile | null;
  columns: PreviewColumn[];
  sources: SourceRef[];
}) {
  const kf = profile?.key_facts;
  const conditions: { variable: string; range: string; unit: string; note: string | null }[] = [
    {
      variable: "Oxygen",
      range: study.oxygen_pct_range ? fmtRange(study.oxygen_pct_range, 1) : "Not in the table",
      unit: "%",
      note: kf?.oxygen ?? null,
    },
    {
      variable: "Pressure",
      range: study.pressure_atm_range ? fmtRange(study.pressure_atm_range, 2) : "Not in the table",
      unit: "atm",
      note: kf?.pressure ?? null,
    },
    {
      variable: "Airflow",
      range: study.airflow_cm_s_range ? fmtRange(study.airflow_cm_s_range, 2) : "Not in the table",
      unit: "cm/s",
      note: kf?.airflow ?? null,
    },
    {
      variable: "Gravity",
      range: study.environment === "space" ? "about 0" : "1",
      unit: "g",
      note: kf?.gravity ?? (study.environment === "space" ? "In space" : "On the ground"),
    },
  ];
  if (kf?.sample_shapes.length) {
    conditions.push({ variable: "Samples", range: `${kf.sample_shapes.length} kinds`, unit: "", note: kf.sample_shapes.join("; ") });
  }
  const columnNames = columns.flatMap((c) => c.sourceColumns).concat(columns.length ? ["flags"] : []);

  return (
    <ExpertOnly>
      <section className="sec">
        <div className="wrap stack g5">
          <div className="stack g1">
            <span className="label">Expert detail</span>
            <h2 className="h2">Detailed conditions</h2>
          </div>
          <div className="tablebox">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Variable</th>
                  <th scope="col" className="n">
                    Range
                  </th>
                  <th scope="col">Unit</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {conditions.map((c) => (
                  <tr key={c.variable}>
                    <td className="strong">{c.variable}</td>
                    <td className="n">{c.range}</td>
                    <td>{c.unit}</td>
                    <td>{c.note ? sentenceCase(c.note) : <span className="muted">{NOT_IN_SOURCES}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">Ranges come from the PSI data table. Notes are AI-written from the reports.</p>
          <div className="cols-2" style={{ gap: 48 }}>
            <div className="stack g3">
              <h3 className="h4">Column notes</h3>
              {columnNames.length ? (
                <dl className="stack">
                  {columnNames.map((name) => {
                    const info = COLUMN_BY_NAME.get(name);
                    if (!info) return null;
                    return (
                      <div key={name} style={{ padding: "10px 0", borderBottom: "1px solid var(--rule)" }}>
                        <dt className="row between g3">
                          <span className="strong">{info.column}</span>
                          <span className="num small muted">{info.unit ?? "text"}</span>
                        </dt>
                        <dd className="small muted">{info.description}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="small muted">This study has no test table in PSI.</p>
              )}
              {study.notes.length > 0 && (
                <div className="stack g2" style={{ marginTop: 8 }}>
                  <h4 className="h5">Cleaning notes</h4>
                  <ul className="stack g2 small muted">
                    {study.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="stack g3">
              <h3 className="h4">Full source list</h3>
              <ul className="stack g3">
                {sources.map((s) => (
                  <li key={`${s.label}-${s.url}`} className="stack g1">
                    <span className="self-start">
                      <SourceChip source={s} />
                    </span>
                    <span className="small muted">{s.title}</span>
                  </li>
                ))}
                {study.tables.map((t) => (
                  <li key={t.file} className="stack g1">
                    <span className="self-start">
                      <SourceChip source={{ label: study.psi_id, title: "PSI data table", url: study.psi_url }} />
                    </span>
                    <span className="small muted">
                      Data table {t.file} ({formatCount(t.rows)} rows)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </ExpertOnly>
  );
}

/** First rows of the study's test table, quality flags, and the CSV download. */
export function DataPreview({
  study,
  columns,
  rows,
  totalRows,
  flaggedRows,
}: {
  study: Study;
  columns: PreviewColumn[];
  rows: PreviewRow[];
  totalRows: number;
  flaggedRows: number;
}) {
  const hasRowFlags = rows.some((r) => r.flags.length > 0);
  return (
    <section className="sec">
      <div className="wrap stack g4">
        <div className="row between wrapx g3">
          <div className="stack g1">
            <h2 className="h2">Data preview</h2>
            {totalRows > 0 && (
              <p className="small muted">
                First rows of {formatCount(totalRows)} {totalRows === 1 ? "row" : "rows"} in the PSI table. Units are in the column headers.
              </p>
            )}
          </div>
          {totalRows > 0 && (
            <div className="row g3 wrapx">
              {flaggedRows > 0 && (
                <span className="badge caution">
                  <TriangleAlert className="ic sm" aria-hidden="true" />
                  {formatCount(flaggedRows)} {flaggedRows === 1 ? "row has" : "rows have"} a quality flag
                </span>
              )}
              <DownloadCsvButton href={`/downloads/${study.id}-tests.csv`} fileName={`vesta-${study.id}-tests.csv`} />
            </div>
          )}
        </div>

        {study.known_mismatches.length > 0 && (
          <ul className="stack g2">
            {study.known_mismatches.map((m) => (
              <li key={m} className="row g3" style={{ alignItems: "flex-start" }}>
                <QualityFlag text={`${m} We show the table value.`} />
                <span className="body" style={{ paddingTop: 2 }}>
                  {m} We show the table value.
                </span>
              </li>
            ))}
          </ul>
        )}

        {study.thin_table && (
          <p className="notice">
            <Info className="ic sm" aria-hidden="true" style={{ marginTop: 3 }} />
            <span>{study.thin_table}</span>
          </p>
        )}

        {totalRows === 0 ? (
          <div className="empty">
            <p className="h4">PSI has no test table for this study.</p>
            <p className="body muted">Its data files and documents are on its PSI page.</p>
            <a className="btn btn-secondary" href={study.psi_url} target="_blank" rel="noopener noreferrer">
              Open {study.psi_id}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        ) : (
          <>
            <p className="small muted tablet:hidden">Scroll the table sideways.</p>
            <div className="tablebox">
              <table className="table">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} scope="col" className={c.numeric ? "n" : undefined}>
                        {c.label}
                        {c.unit && <span className="u"> ({c.unit})</span>}
                      </th>
                    ))}
                    {hasRowFlags && <th scope="col">Flag</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={c.key} className={c.numeric ? "n" : undefined}>
                          {row.cells[c.key] || <span className="muted">–</span>}
                        </td>
                      ))}
                      {hasRowFlags && (
                        <td>
                          {row.flags.length ? (
                            <QualityFlag text={`${row.flags.map((f) => sentenceCase(f.trim().replace(/\.$/, ""))).join(". ")}.`} />
                          ) : (
                            <span className="small muted">None</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted">
              Source: {study.psi_id} data table.{" "}
              <Link href={`/data?study=${study.id}`}>Open all {formatCount(totalRows)} rows in Data</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
