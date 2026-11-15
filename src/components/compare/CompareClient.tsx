"use client";

import { ArrowLeftRight, FileText, Plus, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CompareExplain } from "@/components/compare/CompareExplain";
import { SourceChip, SourceLine } from "@/components/ui/SourceChip";
import { AiLabel, StudyTags } from "@/components/ui/Tags";
import type { CompareRange, CompareStudy, CompareValue } from "@/lib/data/types";
import { fmtNum, fmtRange } from "@/lib/format";
import { useDismissOnOutsideClick } from "@/lib/hooks/useDismiss";
import { niceScale, percentOf } from "@/lib/scale";
import { atmToPsi } from "@/lib/scoring";
import { replaceQuery } from "@/lib/url";

const MAX = 3;
const NOT_IN_SOURCES = "Not in our sources";

interface Cell {
  /** Used to decide whether a row differs between studies. */
  key: string;
  node: ReactNode;
}

const plain = (text: string): Cell => ({ key: text, node: text });

function valueCell(value: CompareValue): Cell {
  if (!value.text) return { key: "", node: <span className="muted">{NOT_IN_SOURCES}</span> };
  return {
    key: value.text,
    node: (
      <>
        {value.text}
        {value.ai && <span className="block small muted">AI-written, from the reports</span>}
      </>
    ),
  };
}

function rangeCell(r: CompareRange, show: (range: [number, number]) => string): Cell {
  if (r.range) return plain(show(r.range));
  if (r.fallback.text) return valueCell(r.fallback);
  return { key: "", node: <span className="muted">Not in the table</span> };
}

const psiRange = (atm: [number, number]): [number, number] => [atmToPsi(atm[0]), atmToPsi(atm[1])];

interface RowDef {
  label: string;
  unit?: string;
  /** Every value in this row is AI-written. */
  aiRow?: boolean;
  diff?: boolean;
  cell: (s: CompareStudy) => Cell;
}

const ROWS: RowDef[] = [
  {
    label: "PSI record",
    cell: (s) => ({
      key: s.psiId,
      node: (
        <a className="chip src" href={s.psiUrl} target="_blank" rel="noopener noreferrer">
          <FileText className="ic sm" aria-hidden="true" />
          {s.psiId}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ),
    }),
  },
  { label: "Where it ran", cell: (s) => plain(s.environment === "space" ? "In space, about 0 g" : "On the ground, 1 g") },
  { label: "Hardware family", cell: (s) => plain(s.familyName) },
  { label: "Goal", aiRow: true, cell: (s) => valueCell({ text: s.goal.text, ai: false }) },
  { label: "Fuel and samples", cell: (s) => valueCell(s.fuels) },
  { label: "Oxygen", unit: "%", cell: (s) => rangeCell(s.oxygen, (r) => `${fmtRange(r, 1)}%`) },
  { label: "Airflow", unit: "cm/s", cell: (s) => rangeCell(s.airflow, (r) => `${fmtRange(r, 2)} cm/s`) },
  {
    label: "Pressure",
    unit: "psi",
    cell: (s) => rangeCell(s.pressureAtm, (r) => `${fmtRange(psiRange(r), 1)} psi (${fmtRange(r, 2)} atm)`),
  },
  { label: "Tests", cell: (s) => plain(s.tests) },
  { label: "Sensors", aiRow: true, cell: (s) => valueCell({ text: s.sensors.text, ai: false }) },
  {
    label: "Fire-safety jobs",
    cell: (s) => ({
      key: [...s.jobs].sort().join(",") + (s.flameScience ? ",flame-science" : ""),
      node:
        s.jobs.length || s.flameScience ? (
          <div className="row g2 wrapx">
            <StudyTags jobs={s.jobs} flameScience={s.flameScience} />
          </div>
        ) : (
          <span className="muted">None</span>
        ),
    }),
  },
  {
    label: "Sources",
    diff: false,
    cell: (s) => ({
      key: "",
      node: (
        <div className="row g2 wrapx">
          {s.sources.map((src) => (
            <SourceChip key={`${src.label}-${src.url}`} source={src} />
          ))}
        </div>
      ),
    }),
  },
];

/** Compare: pick up to 3 studies, see them side by side and their ranges on shared scales. */
export function CompareClient({ studies }: { studies: CompareStudy[] }) {
  const byId = useMemo(() => new Map(studies.map((s) => [s.id, s])), [studies]);
  const [ids, setIds] = useState<string[]>([]);
  const [urlLoaded, setUrlLoaded] = useState(false);

  // ?ids=bass,bass-ii (up to 3) picks the studies; then the URL follows the picks.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("ids") ?? "";
    const wanted = raw.split(",").map((x) => x.trim()).filter((x) => byId.has(x));
    setIds([...new Set(wanted)].slice(0, MAX));
    setUrlLoaded(true);
  }, [byId]);

  useEffect(() => {
    if (!urlLoaded) return;
    const params = new URLSearchParams(window.location.search);
    if (ids.length) params.set("ids", ids.join(","));
    else params.delete("ids");
    replaceQuery(params);
  }, [urlLoaded, ids]);

  const selected = ids.map((id) => byId.get(id)).filter((s): s is CompareStudy => Boolean(s));
  const add = (id: string) => setIds((cur) => (cur.includes(id) || cur.length >= MAX ? cur : [...cur, id]));
  const remove = (id: string) => setIds((cur) => cur.filter((x) => x !== id));
  const swap = () => setIds((cur) => (cur.length === 2 ? [cur[1], cur[0]] : cur));

  return (
    <section className="wrap stack g6 pb-16">
      <div className="panel pad stack g3">
        <span className="h5">
          Studies to compare ({selected.length} of {MAX})
        </span>
        <div className="row g3 wrapx">
          {selected.map((s, i) => (
            <Fragment key={s.id}>
              <span className="chip" style={{ minHeight: 44, paddingRight: 4 }}>
                {s.shortName}
                <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 36, padding: "0 8px" }} aria-label={`Remove ${s.shortName}`} onClick={() => remove(s.id)}>
                  <X className="ic sm" aria-hidden="true" />
                </button>
              </span>
              {selected.length === 2 && i === 0 && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 44 }} aria-label="Swap the order" onClick={swap}>
                  <ArrowLeftRight className="ic sm" aria-hidden="true" />
                  Swap
                </button>
              )}
            </Fragment>
          ))}
          <StudyCombobox options={studies.filter((s) => !ids.includes(s.id))} full={ids.length >= MAX} onPick={add} />
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="empty">
          <span className="gap-ic" style={{ color: "var(--text-2)", borderColor: "var(--rule-input)" }}>
            <ArrowLeftRight className="ic" aria-hidden="true" />
          </span>
          <p className="h4">Add a study to compare.</p>
          <p className="body muted">Search above, or use Compare with on any study page.</p>
        </div>
      ) : (
        <>
          <SideBySide studies={selected} onRemove={remove} />
          <RangeCharts studies={selected} />
          <CompareExplain ids={selected.map((s) => s.id)} names={selected.map((s) => s.shortName)} />
        </>
      )}
    </section>
  );
}

function SideBySide({ studies, onRemove }: { studies: CompareStudy[]; onRemove: (id: string) => void }) {
  const several = studies.length > 1;
  return (
    <section className="stack g4" aria-labelledby="side-by-side">
      <div className="row between wrapx g3">
        <h2 id="side-by-side" className="h2">
          Side by side
        </h2>
        {several ? (
          // A color key, not a control: a flat bar in the same tint as the cells that differ.
          <span className="row g2 small muted">
            <span aria-hidden="true" style={{ width: 28, height: 12, borderRadius: 2, background: "var(--blue-tint)", flex: "none" }} />
            Shaded cells differ between studies
          </span>
        ) : (
          <span className="small muted">Add another study to see what differs.</span>
        )}
      </div>
      <div className="tablebox">
        <table className="table compare-table">
          <thead>
            <tr>
              <th scope="col" style={{ padding: 16 }}>
                Key fact
              </th>
              {studies.map((s) => (
                <th key={s.id} scope="col" style={{ width: `${80 / studies.length}%`, verticalAlign: "top", padding: 16 }}>
                  <div className="stack g2">
                    <div className="row between g2">
                      <span className="h4">{s.shortName}</span>
                      <button type="button" className="btn btn-icon btn-sm" style={{ width: 36, minHeight: 36, border: 0 }} aria-label={`Remove ${s.shortName}`} onClick={() => onRemove(s.id)}>
                        <X className="ic sm" aria-hidden="true" />
                      </button>
                    </div>
                    <span className="small muted" style={{ fontWeight: 400, whiteSpace: "normal" }}>
                      {s.fullName}
                    </span>
                    <Link className="btn btn-ghost btn-sm" href={`/study/${s.id}`} style={{ alignSelf: "flex-start", padding: 0 }}>
                      Open study
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const cells = studies.map((s) => row.cell(s));
              const differs = several && row.diff !== false && new Set(cells.map((c) => c.key)).size > 1;
              return (
                <tr key={row.label}>
                  <th scope="row">
                    {row.label}
                    {row.unit && <span className="u"> ({row.unit})</span>}
                    {row.aiRow && (
                      <span className="block" style={{ marginTop: 6 }}>
                        <AiLabel />
                      </span>
                    )}
                  </th>
                  {cells.map((c, i) => (
                    <td key={studies[i].id} className={differs ? "diff" : undefined}>
                      {c.node}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Ranges, test counts and fuels come from the PSI data tables. Goals, sensors and values marked AI-written come
        from each study&apos;s reports and were written by AI. Check the sources.
      </p>
    </section>
  );
}

const BAR_STYLES = ["", "b", "c"];

const VARIABLES: { key: "oxygen" | "airflow" | "pressureAtm"; name: string; unit: string; decimals: number; toDisplay: (r: [number, number]) => [number, number] }[] = [
  { key: "oxygen", name: "Oxygen", unit: "%", decimals: 1, toDisplay: (r) => r },
  { key: "airflow", name: "Airflow", unit: "cm/s", decimals: 2, toDisplay: (r) => r },
  { key: "pressureAtm", name: "Pressure", unit: "psi", decimals: 1, toDisplay: psiRange },
];

const withUnit = (text: string, unit: string) => (unit === "%" ? `${text}%` : `${text} ${unit}`);

function RangeCharts({ studies }: { studies: CompareStudy[] }) {
  const summary: string[] = [];
  const groups = VARIABLES.map((v) => {
    const rows = studies.map((s, i) => ({ study: s, style: BAR_STYLES[i] ?? "", range: s[v.key].range ? v.toDisplay(s[v.key].range!) : null }));
    const known = rows.filter((r) => r.range);
    const missing = rows.filter((r) => !r.range).map((r) => r.study.shortName);
    if (known.length) {
      summary.push(
        `${v.name}: ${known.map((r) => `${r.study.shortName} ${withUnit(fmtRange(r.range!, v.decimals), v.unit)}`).join(", ")}.` +
          (missing.length ? ` Not in the table for ${missing.join(" and ")}.` : ""),
      );
    } else {
      summary.push(`${v.name}: not in the tables of these studies.`);
    }
    return { v, rows, known };
  });

  return (
    <section className="stack g4" aria-labelledby="ranges-title">
      <h2 id="ranges-title" className="h2">
        Ranges on shared scales
      </h2>
      <figure className="stack g5" style={{ maxWidth: 880 }} aria-label="Range bars on shared scales">
        {groups.map(({ v, rows, known }) => {
          if (!known.length) {
            return (
              <div key={v.key} className="stack g2">
                <p className="h5">
                  {v.name} <span className="muted" style={{ fontWeight: 400 }}>({v.unit})</span>
                </p>
                <p className="small muted">None of these studies list {v.name.toLowerCase()} in their PSI tables.</p>
              </div>
            );
          }
          const scale = niceScale(Math.min(...known.map((r) => r.range![0])), Math.max(...known.map((r) => r.range![1])));
          return (
            <div key={v.key} className="stack g2">
              <p className="h5">
                {v.name} <span className="muted" style={{ fontWeight: 400 }}>({v.unit})</span>
              </p>
              {rows.map((r) => (
                <div key={r.study.id} className="range-row">
                  <span className="small strong">{r.study.shortName}</span>
                  <div className="range">
                    {r.range ? (
                      <i
                        className={r.style}
                        style={{
                          left: `${percentOf(r.range[0], scale)}%`,
                          width: `max(4px, ${percentOf(r.range[1], scale) - percentOf(r.range[0], scale)}%)`,
                        }}
                      />
                    ) : (
                      <span className="small muted" style={{ position: "absolute", left: 8, top: -2 }}>
                        Not in the table
                      </span>
                    )}
                  </div>
                  <span className="num small">{r.range ? withUnit(fmtRange(r.range, v.decimals), v.unit) : "–"}</span>
                </div>
              ))}
              <div className="range-row" aria-hidden="true">
                <span />
                <div className="axis">
                  {scale.ticks.map((t) => (
                    <span key={t}>{fmtNum(t, 2)}</span>
                  ))}
                </div>
                <span />
              </div>
            </div>
          );
        })}
        <figcaption className="chart-sum">{summary.join(" ")}</figcaption>
        <SourceLine sources={studies.map((s) => ({ label: s.psiId, title: "PSI data table", url: s.psiUrl }))} />
      </figure>
    </section>
  );
}

/** "Add a study": a search box with a list of matching studies (combobox pattern). */
function StudyCombobox({ options, full, onPick }: { options: CompareStudy[]; full: boolean; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismissOnOutsideClick(rootRef, open, close);

  const matches = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return options.filter((s) => tokens.every((t) => s.searchText.includes(t))).slice(0, 8);
  }, [options, query]);
  const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));

  function pick(s: CompareStudy) {
    onPick(s.id);
    setQuery("");
    setActive(0);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      if (open && matches[activeIndex]) {
        event.preventDefault();
        pick(matches[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && !full && matches.length > 0;
  return (
    <div ref={rootRef} className="relative" style={{ width: 320, maxWidth: "100%" }}>
      <label className="input">
        <Plus className="ic" aria-hidden="true" />
        <input
          role="combobox"
          aria-label="Add a study"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${activeIndex}` : undefined}
          placeholder={full ? "Remove a study to add another" : "Add a study"}
          disabled={full}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          maxLength={60}
        />
      </label>
      <ul id={listId} role="listbox" aria-label="Studies" className="menu popover" hidden={!showList} style={{ left: 0, right: 0, maxHeight: 320, overflowY: "auto" }}>
        {matches.map((s, i) => (
          <li
            key={s.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === activeIndex}
            className={i === activeIndex ? "is-active" : undefined}
            onPointerMove={() => setActive(i)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(s)}
          >
            <span className="stack" style={{ padding: "6px 0" }}>
              <span>{s.shortName}</span>
              <span className="small muted" style={{ fontWeight: 400 }}>
                {s.fullName}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {open && !full && query.trim() && matches.length === 0 && (
        <p className="pop small" role="status">
          No studies match “{query.trim()}”. Try a shorter word or a PSI number.
        </p>
      )}
    </div>
  );
}
