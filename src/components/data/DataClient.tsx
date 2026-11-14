"use client";

import { Clock, Columns3, Filter, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckRow, SelectBox } from "@/components/ui/Controls";
import { DownloadLink } from "@/components/ui/DownloadLink";
import { QualityFlag } from "@/components/ui/QualityFlag";
import { SideDrawer } from "@/components/ui/SideDrawer";
import { COLUMN_GUIDE } from "@/lib/column-guide";
import type { TestRow } from "@/lib/data/types";
import { formatCount } from "@/lib/format";
import type { FuelKind } from "@/lib/scoring";
import { TEST_COLUMNS, flagText, rowFlags } from "@/lib/test-rows";
import { replaceQuery } from "@/lib/url";

const PAGE_SIZE = 50;

export interface DataStudy {
  id: string;
  shortName: string;
  psiId: string;
  psiUrl: string;
  fuelKind: FuelKind;
}

type FuelFilter = "" | "solid" | "liquid" | "gas" | "smoke";
const FUEL_OPTIONS: { value: FuelFilter; label: string }[] = [
  { value: "", label: "All fuel types" },
  { value: "solid", label: "Solid" },
  { value: "liquid", label: "Liquid drops" },
  { value: "gas", label: "Gas" },
  { value: "smoke", label: "Smoke and dust samples" },
];

function fuelFilterOf(kind: FuelKind): FuelFilter {
  if (kind === "solid") return "solid";
  if (kind === "liquid") return "liquid";
  if (kind === "gas" || kind === "gas emulating solids") return "gas";
  if (kind === "sensor") return "smoke";
  return "";
}

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; rows: TestRow[] };

interface Filters {
  q: string;
  study: string;
  fuel: FuelFilter;
  flagged: boolean;
}
const NO_FILTERS: Filters = { q: "", study: "", fuel: "", flagged: false };

/** Data page: every row of the cleaned test table, with filters, paging and the column guide. */
export function DataClient({ studies }: { studies: DataStudy[] }) {
  const byId = useMemo(() => new Map(studies.map((s) => [s.id, s])), [studies]);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [urlLoaded, setUrlLoaded] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // The table loads from the same JSON file as "Download JSON".
  useEffect(() => {
    let cancelled = false;
    setLoad({ status: "loading" });
    fetch("/downloads/vesta-tests.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ rows: TestRow[] }>;
      })
      .then((d) => {
        if (!cancelled) setLoad(Array.isArray(d.rows) ? { status: "ready", rows: d.rows } : { status: "error" });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // ?study=&fuel=&q=&flagged=1&guide=open, read once, then kept in step with the filters.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const fuel = p.get("fuel");
    setFilters({
      q: (p.get("q") ?? "").slice(0, 100),
      study: byId.has(p.get("study") ?? "") ? (p.get("study") as string) : "",
      fuel: FUEL_OPTIONS.some((o) => o.value === fuel) ? (fuel as FuelFilter) : "",
      flagged: p.get("flagged") === "1",
    });
    setGuideOpen(p.get("guide") === "open");
    setUrlLoaded(true);
  }, [byId]);

  useEffect(() => {
    if (!urlLoaded) return;
    const p = new URLSearchParams(window.location.search);
    const set = (key: string, value: string) => (value ? p.set(key, value) : p.delete(key));
    set("q", filters.q.trim());
    set("study", filters.study);
    set("fuel", filters.fuel);
    set("flagged", filters.flagged ? "1" : "");
    set("guide", guideOpen ? "open" : "");
    replaceQuery(p);
  }, [urlLoaded, filters, guideOpen]);

  const filterKey = JSON.stringify(filters);
  useEffect(() => setPage(0), [filterKey]);

  const indexed = useMemo(() => {
    if (load.status !== "ready") return [];
    // `position` (the row's place in the file) is the stable key: some PSI rows were expanded into
    // several records during cleaning, so study + table + row number isn't unique.
    return load.rows.map((row, position) => {
      const flags = rowFlags(row);
      const study = byId.get(row.study_id);
      const hay = [study?.shortName, row.psi_id, row.test_id, row.date, row.fuel, row.material, row.sample_shape, row.sample_size, row.diluent, row.outcome, ...flags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return { row, position, flags, hay, fuel: study ? fuelFilterOf(study.fuelKind) : "" };
    });
  }, [load, byId]);

  const results = useMemo(() => {
    const tokens = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    return indexed.filter(
      (x) =>
        (!filters.study || x.row.study_id === filters.study) &&
        (!filters.fuel || x.fuel === filters.fuel) &&
        (!filters.flagged || x.flags.length > 0) &&
        tokens.every((t) => x.hay.includes(t)),
    );
  }, [indexed, filters]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = results.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  // Only the columns that hold data for the filtered rows.
  const columns = TEST_COLUMNS.filter((c) => results.some((x) => {
    const v = c.get(x.row);
    return v !== null && v !== "";
  }));
  const active = Boolean(filters.q.trim() || filters.study || filters.fuel || filters.flagged);
  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  const goTo = (n: number) => {
    setPage(n);
    tableRef.current?.scrollTo({ top: 0 });
  };

  return (
    <>
      <div id="filters" className="row g3 wrapx" style={{ alignItems: "flex-end", scrollMarginTop: 96 }}>
        <label className="input" style={{ flex: 1, minWidth: 240 }}>
          <Search className="ic" aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search tests"
            aria-label="Search tests"
            maxLength={100}
          />
        </label>
        <SelectBox
          label="Study"
          hideLabel
          width={200}
          value={filters.study}
          options={[{ value: "", label: "All studies" }, ...studies.map((s) => ({ value: s.id, label: s.shortName }))]}
          onChange={(study) => update({ study })}
        />
        <SelectBox label="Fuel type" hideLabel width={220} value={filters.fuel} options={FUEL_OPTIONS} onChange={(v) => update({ fuel: v as FuelFilter })} />
        <div style={{ padding: "0 4px" }}>
          <CheckRow checked={filters.flagged} onChange={(flagged) => update({ flagged })}>
            Flagged rows only
          </CheckRow>
        </div>
        <button type="button" className="btn btn-secondary" aria-expanded={guideOpen} aria-controls="column-guide" onClick={() => setGuideOpen(true)}>
          <Columns3 className="ic" aria-hidden="true" />
          Column guide
        </button>
      </div>

      {load.status === "loading" && (
        <div className="stack g3">
          <p className="small muted row g2" role="status">
            <Clock className="ic sm" aria-hidden="true" />
            Loading the test table
          </p>
          <div className="tablebox" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="row g5" style={{ padding: "14px 16px", borderBottom: "1px solid var(--rule)" }}>
                <span className="sk" style={{ width: 80, height: 14 }} />
                <span className="sk" style={{ width: 140, height: 14 }} />
                <span className="sk" style={{ width: 60, height: 14 }} />
                <span className="sk" style={{ width: 200, height: 14 }} />
                <span className="sk" style={{ width: 90, height: 14 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {load.status === "error" && (
        <div className="error" role="alert">
          <TriangleAlert className="ic lg" aria-hidden="true" />
          <div className="stack g2" style={{ flex: 1 }}>
            <p className="h5">The test table didn&apos;t load.</p>
            <p className="small">The download stopped or the connection dropped. Check your connection, then try again. You can also use Download CSV above.</p>
            <div className="row g3">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAttempt((n) => n + 1)}>
                <RefreshCw className="ic sm" aria-hidden="true" />
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {load.status === "ready" && (
        <div className="stack g3">
          <p className="strong" aria-live="polite">
            {active ? `${formatCount(results.length)} of ${formatCount(indexed.length)} rows` : `${formatCount(indexed.length)} rows`}
          </p>
          {results.length === 0 ? (
            <div className="empty">
              <span className="gap-ic" style={{ color: "var(--text-2)", borderColor: "var(--rule-input)" }}>
                <Filter className="ic" aria-hidden="true" />
              </span>
              <p className="h4">No tests match these filters.</p>
              <p className="body muted">Clear a filter to see more.</p>
              <button type="button" className="btn btn-secondary" onClick={() => setFilters(NO_FILTERS)}>
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <p className="small muted tablet:hidden">Scroll the table sideways.</p>
              <div ref={tableRef} className="tablebox" style={{ maxHeight: "70vh" }}>
                <table className="table data-table">
                  <thead>
                    <tr>
                      <th scope="col">Study</th>
                      {columns.map((c) => (
                        <th key={c.key} scope="col" className={c.numeric ? "n" : undefined}>
                          {c.label}
                          {c.unit && <span className="u"> ({c.unit})</span>}
                        </th>
                      ))}
                      <th scope="col">Flag</th>
                      <th scope="col">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(({ row, position, flags }) => {
                      const study = byId.get(row.study_id);
                      return (
                        <tr key={position}>
                          <td className="strong">{study?.shortName ?? row.study_id}</td>
                          {columns.map((c) => (
                            <td key={c.key} className={c.numeric ? "n" : c.wrap ? "wrap-cell" : undefined}>
                              {c.get(row) || <span className="muted">–</span>}
                            </td>
                          ))}
                          <td>{flags.length ? <QualityFlag text={flagText(flags)} /> : <span className="small muted">None</span>}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {study ? (
                              <a className="small" href={study.psiUrl} target="_blank" rel="noopener noreferrer">
                                {row.psi_id}, row {row.source_row}
                                <span className="sr-only"> (opens in a new tab)</span>
                              </a>
                            ) : (
                              <span className="small">
                                {row.psi_id}, row {row.source_row}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="row between wrapx g3">
                <span className="small muted">
                  Rows {formatCount(current * PAGE_SIZE + 1)}–{formatCount(current * PAGE_SIZE + pageRows.length)} of {formatCount(results.length)}
                </span>
                <div className="row g2">
                  <button type="button" className="btn btn-secondary btn-sm" disabled={current === 0} onClick={() => goTo(current - 1)}>
                    Previous
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={current >= pages - 1} onClick={() => goTo(current + 1)}>
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <ColumnGuide open={guideOpen} onClose={closeGuide} />
    </>
  );
}

function ColumnGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COLUMN_GUIDE;
    return COLUMN_GUIDE.filter((c) => `${c.column} ${c.label} ${c.unit ?? ""} ${c.description}`.toLowerCase().includes(q));
  }, [query]);
  return (
    <SideDrawer
      id="column-guide"
      open={open}
      onClose={onClose}
      title="Column guide"
      subtitle="What each column means and its unit"
      footer={
        <>
          <span className="small muted">Included in the JSON download. For the CSV, download it as its own file.</span>
          <DownloadLink href="/downloads/vesta-column-guide.csv" fileName="vesta-column-guide.csv" label="Download guide" done="Column guide downloaded" />
        </>
      }
    >
      <label className="input" style={{ margin: "16px 24px 0", width: "auto" }}>
        <Search className="ic" aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a column" aria-label="Find a column" />
      </label>
      <dl className="stack" style={{ padding: "8px 24px", overflow: "auto", flex: 1 }}>
        {shown.map((c) => (
          <div key={c.column} style={{ padding: "12px 0", borderBottom: "1px solid var(--rule)" }}>
            <dt className="row between g3">
              <span className="num strong" style={{ fontSize: 15 }}>
                {c.column}
              </span>
              <span className="badge">{c.unit ?? c.type}</span>
            </dt>
            <dd className="small muted" style={{ marginTop: 4 }}>
              <span className="strong" style={{ color: "var(--text)" }}>
                {c.label}.
              </span>{" "}
              {c.description}
            </dd>
          </div>
        ))}
        {shown.length === 0 && <p className="small muted" style={{ padding: "12px 0" }}>No columns match “{query.trim()}”.</p>}
      </dl>
    </SideDrawer>
  );
}
