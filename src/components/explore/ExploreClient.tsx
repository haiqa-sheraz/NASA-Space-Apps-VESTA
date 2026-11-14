"use client";

import { ChevronDown, Filter, LayoutGrid, List, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MissionPicker } from "@/components/shell/MissionPicker";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CheckRow, RadioRow, RangeSlider, SelectBox, TagFilterChips } from "@/components/ui/Controls";
import { StudyTags } from "@/components/ui/Tags";
import type { StudyIndexEntry } from "@/lib/data/types";
import { fmtNum, plural } from "@/lib/format";
import { tagLabel } from "@/lib/jobs";
import { MISSIONS } from "@/lib/missions";
import { rankedFor } from "@/lib/ranked";
import { usePrefs } from "@/lib/state/prefs";
import {
  DEFAULT_FILTERS,
  FUEL_FILTERS,
  O2_LIMITS,
  activeFilterCount,
  filtersFromParams,
  filtersToParams,
  matches,
  o2Active,
  type Filters,
} from "./explore-filters";
import { RelevanceBadge, StudyCard, oxygenText, testsText } from "./StudyCard";
import { replaceQuery } from "@/lib/url";

const PAGE = 9;
const GROUP_PREVIEW = 3;
const GROUPS_OPEN_BY_DEFAULT = 3;

/** Explore: filter rail (a sheet on phones), search, grid or list, and grouping by hardware family. */
export function ExploreClient({ index }: { index: StudyIndexEntry[] }) {
  const { mission, custom } = usePrefs();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [grouped, setGrouped] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [openGroups, setOpenGroups] = useState<Set<string> | null>(null);
  const [fullGroups, setFullGroups] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  // Becomes true in the same render that applies the URL's filters, so the URL is never
  // overwritten with the defaults first.
  const [urlLoaded, setUrlLoaded] = useState(false);

  const families = useMemo(() => {
    const order: { id: string; name: string; count: number }[] = [];
    for (const s of index) {
      const existing = order.find((f) => f.id === s.hardwareFamily);
      if (existing) existing.count += 1;
      else order.push({ id: s.hardwareFamily, name: s.familyName, count: 1 });
    }
    return order;
  }, [index]);

  const years = useMemo(() => {
    const spans = index.flatMap((s) => (s.years ? [s.years] : []));
    if (!spans.length) return [];
    const first = Math.min(...spans.map((y) => y[0]));
    const last = Math.max(...spans.map((y) => y[1]));
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }, [index]);

  // Read filters from the URL once, then keep the URL in step so a filtered view can be shared.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(filtersFromParams(params, families.map((f) => f.id)));
    setView(params.get("view") === "list" ? "list" : "grid");
    setGrouped(params.get("group") === "family");
    setUrlLoaded(true);
  }, [families]);

  useEffect(() => {
    if (!urlLoaded) return;
    const params = new URLSearchParams(window.location.search);
    filtersToParams(filters, params);
    if (view === "list") params.set("view", "list");
    else params.delete("view");
    if (grouped) params.set("group", "family");
    else params.delete("group");
    replaceQuery(params);
  }, [urlLoaded, filters, view, grouped]);

  // New filters start the list again from the top.
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setShown(PAGE);
    setOpenGroups(null);
    setFullGroups(new Set());
  }, [filterKey, grouped]);

  const scores = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of rankedFor(mission, custom, index)) map.set(item.study.id, item.match.score);
    return map;
  }, [mission, custom, index]);

  const missionName = mission === "custom" ? "custom conditions" : MISSIONS[mission].label;
  const results = useMemo(() => index.filter((s) => matches(s, filters)), [index, filters]);
  const activeCount = activeFilterCount(filters);
  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const clearAll = () => setFilters(DEFAULT_FILTERS);
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const controls = (place: "rail" | "sheet") => (
    <FilterControls place={place} filters={filters} update={update} toggle={toggle} families={families} years={years} />
  );

  return (
    <section className="wrap pb-16">
      <div className="dash">
        <aside className="rail panel pad stack g5 max-tablet:hidden" aria-label="Filters">
          <div className="row between">
            <h2 className="h4">Filters</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll} disabled={activeCount === 0}>
              Clear all
            </button>
          </div>
          {controls("rail")}
        </aside>

        <div className="results stack g5">
          <div className="row g3 wrapx">
            <label className="input" style={{ flex: 1, minWidth: 240 }}>
              <Search className="ic" aria-hidden="true" />
              <input
                type="search"
                value={filters.q}
                onChange={(event) => update({ q: event.target.value })}
                placeholder={`Search ${index.length} studies by name, fuel or PSI number`}
                aria-label="Search studies"
                maxLength={100}
              />
            </label>
            <button type="button" className="btn btn-secondary tablet:hidden" onClick={() => setSheetOpen(true)}>
              <Filter className="ic" aria-hidden="true" />
              {activeCount ? `Filters (${activeCount})` : "Filters"}
            </button>
            <div className="seg" role="group" aria-label="Layout">
              <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => setView("grid")}>
                <LayoutGrid className="ic sm" aria-hidden="true" />
                Grid
              </button>
              <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => setView("list")}>
                <List className="ic sm" aria-hidden="true" />
                List
              </button>
            </div>
            <div style={{ padding: "0 8px" }}>
              <CheckRow checked={grouped} onChange={setGrouped}>
                Group by hardware family
              </CheckRow>
            </div>
          </div>

          <ActiveFilters filters={filters} update={update} families={families} />

          <div className="row between wrapx g3">
            <p className="strong" aria-live="polite">
              {plural(results.length, "study", "studies")}
            </p>
            <div className="row g3 wrapx">
              <span className="small muted">Relevance badges for</span>
              <MissionPicker />
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyResults filters={filters} onClear={clearAll} />
          ) : grouped ? (
            families
              .map((fam) => ({ fam, studies: results.filter((s) => s.hardwareFamily === fam.id) }))
              .filter((g) => g.studies.length > 0)
              .map((g, i) => {
                const open = openGroups ? openGroups.has(g.fam.id) : i < GROUPS_OPEN_BY_DEFAULT;
                const full = fullGroups.has(g.fam.id);
                const visible = full ? g.studies : g.studies.slice(0, GROUP_PREVIEW);
                const panelId = `group-${g.fam.id}`;
                const toggleOpen = () =>
                  setOpenGroups((prev) => {
                    const base =
                      prev ??
                      new Set(
                        families
                          .filter((f) => results.some((s) => s.hardwareFamily === f.id))
                          .slice(0, GROUPS_OPEN_BY_DEFAULT)
                          .map((f) => f.id),
                      );
                    const next = new Set(base);
                    if (next.has(g.fam.id)) next.delete(g.fam.id);
                    else next.add(g.fam.id);
                    return next;
                  });
                return (
                  <section key={g.fam.id} className="stack g4" style={{ paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
                    <div className="row between g3 wrapx">
                      <div className="stack">
                        <h2 className="h3">{g.fam.name}</h2>
                        {!open && <span className="small muted">{g.studies.map((s) => s.shortName).join(", ")}</span>}
                      </div>
                      <div className="row g4">
                        <span className="num muted">{plural(g.studies.length, "study", "studies")}</span>
                        <button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} aria-controls={panelId} onClick={toggleOpen}>
                          {open ? "Hide studies" : "Show studies"}
                          <ChevronDown className="ic sm" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }} />
                        </button>
                      </div>
                    </div>
                    <div id={panelId} hidden={!open} className="stack g4">
                      {view === "grid" ? (
                        <div className="card-grid">
                          {visible.map((s) => (
                            <StudyCard key={s.id} study={s} score={scores.get(s.id)} missionName={missionName} />
                          ))}
                        </div>
                      ) : (
                        <StudyTable studies={visible} scores={scores} missionName={missionName} />
                      )}
                      {!full && g.studies.length > GROUP_PREVIEW && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm self-start"
                          onClick={() => setFullGroups((prev) => new Set(prev).add(g.fam.id))}
                        >
                          Show {g.studies.length - GROUP_PREVIEW} more in {g.fam.name}
                        </button>
                      )}
                    </div>
                  </section>
                );
              })
          ) : (
            <>
              {view === "grid" ? (
                <div className="card-grid">
                  {results.slice(0, shown).map((s) => (
                    <StudyCard key={s.id} study={s} score={scores.get(s.id)} missionName={missionName} />
                  ))}
                </div>
              ) : (
                <StudyTable studies={results.slice(0, shown)} scores={scores} missionName={missionName} />
              )}
              <div className="row between wrapx g3">
                <span className="small muted">
                  Showing {Math.min(shown, results.length)} of {results.length}
                </span>
                {shown < results.length && (
                  <button type="button" className="btn btn-secondary" onClick={() => setShown((n) => n + PAGE)}>
                    Show more studies
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <div className="row g3">
            <button type="button" className="btn btn-secondary" onClick={clearAll} disabled={activeCount === 0}>
              Clear all
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setSheetOpen(false)}>
              Show {plural(results.length, "study", "studies")}
            </button>
          </div>
        }
      >
        <div className="stack g5">{controls("sheet")}</div>
      </BottomSheet>
    </section>
  );
}

function FilterControls({
  place,
  filters,
  update,
  toggle,
  families,
  years,
}: {
  place: "rail" | "sheet";
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  toggle: <T>(list: T[], item: T) => T[];
  families: { id: string; name: string; count: number }[];
  years: number[];
}) {
  const yearOptions = [{ value: "", label: "Any year" }, ...years.map((y) => ({ value: String(y), label: String(y) }))];
  return (
    <>
      <fieldset className="plain">
        <legend className="h5" style={{ marginBottom: 12 }}>
          Fire-safety job
        </legend>
        <TagFilterChips tags={filters.tags} onToggle={(tag) => update({ tags: toggle(filters.tags, tag) })} />
      </fieldset>
      <div className="divider" />
      <fieldset className="plain">
        <legend className="h5">Fuel type</legend>
        {FUEL_FILTERS.map((fuel) => (
          <CheckRow key={fuel.id} checked={filters.fuels.includes(fuel.id)} onChange={() => update({ fuels: toggle(filters.fuels, fuel.id) })}>
            {fuel.label}
          </CheckRow>
        ))}
      </fieldset>
      <div className="divider" />
      <fieldset className="plain">
        <legend className="h5">Hardware family</legend>
        {families.map((fam) => (
          <CheckRow
            key={fam.id}
            checked={filters.families.includes(fam.id)}
            count={fam.count}
            onChange={() => update({ families: toggle(filters.families, fam.id) })}
          >
            {fam.name}
          </CheckRow>
        ))}
      </fieldset>
      <div className="divider" />
      <RangeSlider
        label="Oxygen range"
        value={filters.o2}
        min={O2_LIMITS.min}
        max={O2_LIMITS.max}
        step={1}
        format={(v) => (v >= O2_LIMITS.max ? `${v}%+` : `${v}%`)}
        hint="ISS air: 21%. Moon base: 30% or more. Studies without oxygen in their table are hidden while this is set."
        onChange={(o2) => update({ o2 })}
      />
      <div className="divider" />
      <fieldset className="plain">
        <legend className="h5" style={{ marginBottom: 4 }}>
          Gravity
        </legend>
        <div className="radiolist stack">
          <RadioRow name={`${place}-gravity`} checked={filters.gravity === "all"} onChange={() => update({ gravity: "all" })}>
            All
          </RadioRow>
          <RadioRow name={`${place}-gravity`} checked={filters.gravity === "space"} onChange={() => update({ gravity: "space" })}>
            In space, about 0 g
          </RadioRow>
          <RadioRow name={`${place}-gravity`} checked={filters.gravity === "ground"} onChange={() => update({ gravity: "ground" })}>
            On the ground, 1 g
          </RadioRow>
        </div>
      </fieldset>
      <div className="divider" />
      <fieldset className="plain">
        <legend className="h5" style={{ marginBottom: 12 }}>
          Years
        </legend>
        <div className="row g2" style={{ alignItems: "flex-start" }}>
          <SelectBox
            label="From"
            value={filters.yearFrom === null ? "" : String(filters.yearFrom)}
            options={yearOptions}
            onChange={(v) => {
              const yearFrom = v ? Number(v) : null;
              const yearTo = yearFrom !== null && filters.yearTo !== null && filters.yearTo < yearFrom ? yearFrom : filters.yearTo;
              update({ yearFrom, yearTo });
            }}
          />
          <SelectBox
            label="To"
            value={filters.yearTo === null ? "" : String(filters.yearTo)}
            options={yearOptions}
            onChange={(v) => {
              const yearTo = v ? Number(v) : null;
              const yearFrom = yearTo !== null && filters.yearFrom !== null && filters.yearFrom > yearTo ? yearTo : filters.yearFrom;
              update({ yearFrom, yearTo });
            }}
          />
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Only studies whose tables list test dates have years.
        </p>
      </fieldset>
    </>
  );
}

/** The active filters as chips; selecting one removes it. */
function ActiveFilters({
  filters,
  update,
  families,
}: {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  families: { id: string; name: string }[];
}) {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `“${filters.q.trim()}”`, remove: () => update({ q: "" }) });
  for (const tag of filters.tags)
    chips.push({ key: `tag-${tag}`, label: tagLabel(tag), remove: () => update({ tags: filters.tags.filter((t) => t !== tag) }) });
  for (const fuel of filters.fuels)
    chips.push({
      key: `fuel-${fuel}`,
      label: FUEL_FILTERS.find((f) => f.id === fuel)?.label ?? fuel,
      remove: () => update({ fuels: filters.fuels.filter((f) => f !== fuel) }),
    });
  for (const fam of filters.families)
    chips.push({
      key: `fam-${fam}`,
      label: families.find((f) => f.id === fam)?.name ?? fam,
      remove: () => update({ families: filters.families.filter((f) => f !== fam) }),
    });
  if (o2Active(filters))
    chips.push({
      key: "o2",
      label: `Oxygen ${fmtNum(filters.o2[0])}–${filters.o2[1] >= O2_LIMITS.max ? `${O2_LIMITS.max}%+` : `${fmtNum(filters.o2[1])}%`}`,
      remove: () => update({ o2: [O2_LIMITS.min, O2_LIMITS.max] }),
    });
  if (filters.gravity !== "all")
    chips.push({
      key: "gravity",
      label: filters.gravity === "space" ? "In space" : "On the ground",
      remove: () => update({ gravity: "all" }),
    });
  if (filters.yearFrom !== null || filters.yearTo !== null)
    chips.push({
      key: "years",
      label:
        filters.yearFrom !== null && filters.yearTo !== null
          ? filters.yearFrom === filters.yearTo
            ? `Year ${filters.yearFrom}`
            : `Years ${filters.yearFrom}–${filters.yearTo}`
          : filters.yearFrom !== null
            ? `From ${filters.yearFrom}`
            : `To ${filters.yearTo}`,
      remove: () => update({ yearFrom: null, yearTo: null }),
    });

  if (!chips.length) return null;
  return (
    <div className="row g2 wrapx" aria-label="Active filters" role="group">
      {chips.map((chip) => (
        <button key={chip.key} type="button" className="chip filterchip selected" onClick={chip.remove} aria-label={`Remove filter: ${chip.label}`}>
          {chip.label}
          <X className="ic sm" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function EmptyResults({ filters, onClear }: { filters: Filters; onClear: () => void }) {
  const searchOnly = filters.q.trim() && activeFilterCount(filters) === 1;
  const firstWord = filters.q.trim().split(/\s+/)[0];
  return (
    <div className="empty">
      <span className="gap-ic" style={{ color: "var(--text-2)", borderColor: "var(--rule-input)" }}>
        <Filter className="ic" aria-hidden="true" />
      </span>
      {searchOnly ? (
        <>
          <p className="h4">No studies match “{filters.q.trim()}”.</p>
          <p className="body muted">
            {firstWord !== filters.q.trim() ? `Try a shorter search, like “${firstWord}”.` : "Check the spelling, or search by PSI number."}
          </p>
        </>
      ) : (
        <>
          <p className="h4">No studies match these filters.</p>
          <p className="body muted">Clear a filter to see more.</p>
        </>
      )}
      <button type="button" className="btn btn-secondary" onClick={onClear}>
        Clear all filters
      </button>
    </div>
  );
}

function StudyTable({ studies, scores, missionName }: { studies: StudyIndexEntry[]; scores: Map<string, number>; missionName: string }) {
  return (
    <div className="tablebox">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Study</th>
            <th scope="col">Hardware family</th>
            <th scope="col">Fire-safety jobs</th>
            <th scope="col" className="n">
              Tests
            </th>
            <th scope="col" className="n">
              Oxygen <span className="u">(%)</span>
            </th>
            <th scope="col">Relevance</th>
          </tr>
        </thead>
        <tbody>
          {studies.map((s) => (
            <tr key={s.id}>
              <td>
                <Link href={`/study/${s.id}`} className="strong">
                  {s.shortName}
                </Link>
                <div className="small muted" style={{ minWidth: 220 }}>
                  {s.fullName}
                </div>
              </td>
              <td>{s.familyName}</td>
              <td>
                <div className="row g2 wrapx">
                  {s.jobs.length || s.flameScience ? (
                    <StudyTags jobs={s.jobs} flameScience={s.flameScience} />
                  ) : (
                    <span className="small muted">–</span>
                  )}
                </div>
              </td>
              <td className="n">{testsText(s)}</td>
              <td className="n">{oxygenText(s).replace("%", "")}</td>
              <td>
                <RelevanceBadge study={s} score={scores.get(s.id)} missionName={missionName} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
