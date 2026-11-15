"use client";

import { CircleQuestionMark, Download, Filter, Gauge, Orbit, Ruler, SlidersVertical } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { RadioRow, Slider, TagFilterChips } from "@/components/ui/Controls";
import { NoteText } from "@/components/ui/NoteText";
import { PrintLink, PrintNote, PrintReport, usePrintReport, type PrintStamp } from "@/components/ui/PrintReport";
import { SourceLine } from "@/components/ui/SourceChip";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { AiLabel, MatchBar, MatchChip } from "@/components/ui/Tags";
import { rankingMission } from "@/lib/data/rankings";
import type { StudyIndexEntry } from "@/lib/data/types";
import { fmtNum, joinAnd, plural } from "@/lib/format";
import { hasAnyTag, tagLabel, type TagId } from "@/lib/jobs";
import { useFlip, useSettled } from "@/lib/hooks/useFlip";
import { explainMatch, matchChipLabel, missionView } from "@/lib/mission-view";
import { MISSION_LIST, isMissionId, type CustomConditions } from "@/lib/missions";
import { rankedFor, type RankedItem } from "@/lib/ranked";
import { atmToPsi, type MatchLevel } from "@/lib/scoring";
import type { SourceRef } from "@/lib/sources";
import { usePrefs } from "@/lib/state/prefs";
import { replaceQuery } from "@/lib/url";

const PREVIEW = 5;
const SLIDERS = {
  oxygenPct: { min: 0, max: 100, step: 1 },
  pressurePsi: { min: 0, max: 15, step: 0.1 },
  gravityG: { min: 0, max: 1, step: 0.01 },
} as const;

/** Reference values for the slider hints and markers, read from rankings.json. */
function references() {
  const iss = rankingMission("spacecraft-iss").mission;
  const moon = rankingMission("moon-base").mission;
  const mars = rankingMission("mars-base").mission;
  return {
    issO2: iss.o2_min,
    issPsi: Number(fmtNum(atmToPsi(iss.p_max), 1)),
    exploreO2: mars.o2_min,
    moonPsi: fmtNum(atmToPsi(moon.p_max), 1),
    moonG: moon.g,
    marsG: mars.g,
  };
}

function snap(value: number, { min, max, step }: { min: number; max: number; step: number }) {
  const clamped = Math.min(max, Math.max(min, value));
  return Number((Math.round(clamped / step) * step).toFixed(2));
}

/** Custom values present and valid in the URL, snapped to the sliders. Missing ones keep the saved values. */
function customFromParams(params: URLSearchParams): Partial<CustomConditions> {
  const read = (key: string, limits: { min: number; max: number; step: number }) => {
    const raw = params.get(key);
    const value = raw === null || raw.trim() === "" ? NaN : Number(raw);
    return Number.isFinite(value) ? snap(value, limits) : undefined;
  };
  const values: Partial<CustomConditions> = {};
  const o2 = read("o2", SLIDERS.oxygenPct);
  const psi = read("psi", SLIDERS.pressurePsi);
  const g = read("g", SLIDERS.gravityG);
  if (o2 !== undefined) values.oxygenPct = o2;
  if (psi !== undefined) values.pressurePsi = psi;
  if (g !== undefined) values.gravityG = g;
  return values;
}

type Tab = "ranked" | "best" | "gaps";

/** Mission planner: rank the studies by how well they match a mission's air, pressure and gravity. */
export function PlannerClient({
  index,
  gaps,
}: {
  index: StudyIndexEntry[];
  gaps: { items: string[]; sources: SourceRef[] };
}) {
  const { mission, custom, setMission, setCustom } = usePrefs();
  const [tags, setTags] = useState<TagId[]>([]);
  const [tab, setTab] = useState<Tab>("ranked");
  const [showAll, setShowAll] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [urlLoaded, setUrlLoaded] = useState(false);

  // ?mission=moon (Custom adds &o2=&psi=&g=) sets the mission, then the URL follows the choice.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("mission");
    if (isMissionId(fromUrl)) {
      setMission(fromUrl);
      if (fromUrl === "custom") setCustom(customFromParams(params));
    }
    setUrlLoaded(true);
  }, [setMission, setCustom]);

  useEffect(() => {
    if (!urlLoaded) return;
    const params = new URLSearchParams(window.location.search);
    params.set("mission", mission);
    if (mission === "custom") {
      params.set("o2", String(custom.oxygenPct));
      params.set("psi", String(custom.pressurePsi));
      params.set("g", String(custom.gravityG));
    } else {
      params.delete("o2");
      params.delete("psi");
      params.delete("g");
    }
    replaceQuery(params);
  }, [urlLoaded, mission, custom]);

  useEffect(() => setShowAll(false), [mission, tags]);

  // "Save as PDF": the browser's print dialog, with the printed ranking below (PlannerPrint).
  const { stamp, print } = usePrintReport();

  const view = missionView(mission, custom);
  const refs = useMemo(references, []);
  const ranked = useMemo(() => rankedFor(mission, custom, index), [mission, custom, index]);
  const list = tags.length ? ranked.filter((r) => hasAnyTag(r.study, tags)) : ranked;
  const visible = showAll ? list : list.slice(0, PREVIEW);
  const best = list[0];
  const tiedWithBest = best ? list.filter((r) => r !== best && r.match.score === best.match.score) : [];
  const anyAi = list.some((r) => r.whyIsAi);
  const unranked = index.filter((s) => s.status !== "ranked");
  const planned = unranked.filter((s) => s.status === "planned");
  const ground = unranked.filter((s) => s.status === "ground");
  const shownTab: Tab = tab;
  const toggleTag = (tag: TagId) => setTags((ts) => (ts.includes(tag) ? ts.filter((t) => t !== tag) : [...ts, tag]));

  // Re-sorting (design board 14): rows slide to their new place, and moved rows say where they
  // were ("Up from 2") for 4 seconds. Not for the saved mission or URL applied while loading.
  const settled = useSettled();
  const order = list.map((r) => r.study.id).join(",");
  const listRef = useFlip<HTMLOListElement>(visible.map((r) => r.study.id).join(","), settled);
  const [moves, setMoves] = useState<Record<string, string>>({});
  const lastOrder = useRef<string[] | null>(null);
  useEffect(() => {
    const ids = order ? order.split(",") : [];
    const before = lastOrder.current;
    lastOrder.current = ids;
    if (!before || !settled.current) return;
    const next: Record<string, string> = {};
    ids.forEach((id, i) => {
      const was = before.indexOf(id);
      if (was >= 0 && was !== i) next[id] = was > i ? `Up from ${was + 1}` : `Down from ${was + 1}`;
    });
    setMoves(next);
    const timer = window.setTimeout(() => setMoves({}), 4000);
    return () => window.clearTimeout(timer);
  }, [order, settled]);

  const controls = (place: "rail" | "sheet") => (
    <>
      <fieldset className="plain">
        <legend className="h5" style={{ marginBottom: 8 }}>
          Mission
        </legend>
        <div className="radiolist stack">
          {MISSION_LIST.map((m) => (
            <RadioRow key={m.id} name={`${place}-mission`} checked={mission === m.id} onChange={() => setMission(m.id)}>
              {m.label}
            </RadioRow>
          ))}
        </div>
      </fieldset>
      <div className="divider" />
      {mission === "custom" ? (
        <fieldset className="plain stack g5">
          <legend className="h5" style={{ marginBottom: 12 }}>
            Custom conditions
          </legend>
          <Slider
            label="Oxygen"
            value={custom.oxygenPct}
            {...SLIDERS.oxygenPct}
            format={(v) => `${fmtNum(v)}%`}
            marker={refs.issO2}
            hint={`ISS air: ${refs.issO2}%. NASA's recommended exploration atmosphere: ${refs.exploreO2}%.`}
            onChange={(oxygenPct) => setCustom({ oxygenPct })}
          />
          <Slider
            label="Pressure"
            value={custom.pressurePsi}
            {...SLIDERS.pressurePsi}
            format={(v) => `${fmtNum(v, 1)} psi`}
            marker={refs.issPsi}
            hint={`ISS air: ${refs.issPsi} psi. Moon base: ${refs.moonPsi} psi or less.`}
            onChange={(pressurePsi) => setCustom({ pressurePsi })}
          />
          <Slider
            label="Gravity"
            value={custom.gravityG}
            {...SLIDERS.gravityG}
            format={(v) => `${fmtNum(v, 2)} g`}
            marker={refs.marsG}
            hint={`Moon: ${fmtNum(refs.moonG, 2)} g. Mars: about ${fmtNum(refs.marsG, 2)} g. Earth: 1 g.`}
            onChange={(gravityG) => setCustom({ gravityG })}
          />
        </fieldset>
      ) : (
        <p className="small muted row g2" style={{ alignItems: "flex-start" }}>
          <SlidersVertical className="ic sm" aria-hidden="true" style={{ marginTop: 3 }} />
          <span>Oxygen, pressure and gravity sliders appear when you choose Custom.</span>
        </p>
      )}
      <div className="divider" />
      <fieldset className="plain">
        <legend className="h5" style={{ marginBottom: 12 }}>
          Fire-safety job
        </legend>
        <TagFilterChips tags={tags} onToggle={toggleTag} />
      </fieldset>
    </>
  );

  const chipIcon = { oxygen: Gauge, pressure: Ruler, gravity: Orbit } as const;

  return (
    <>
    <PlannerPrint view={view} list={list} tags={tags} stamp={stamp} />
    <section id="export" className="wrap pb-16 no-print">

      <div className="dash">
        <aside className="rail panel pad stack g5 max-tablet:hidden" aria-label="Planner controls">
          {controls("rail")}
          <div className="divider" />
          <button type="button" className="btn btn-secondary" style={{ width: "100%" }} onClick={print}>
            <Download className="ic" aria-hidden="true" />
            Save as PDF
          </button>
        </aside>

        <div className="results stack g5">
          <div className="row g2 tablet:hidden no-print">
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheetOpen(true)}>
              <Filter className="ic" aria-hidden="true" />
              {tags.length ? `Filters (${tags.length})` : "Filters"}
            </button>
            <button type="button" className="btn btn-secondary" aria-label="Save as PDF" onClick={print}>
              <Download className="ic" aria-hidden="true" />
              PDF
            </button>
          </div>

          <div className="stack g2">
            <div className="row g3 wrapx">
              <h2 className="h3">{view.label}</h2>
              {view.chips.map((chip) => {
                const Icon = chipIcon[chip.kind];
                return (
                  <span key={chip.kind} className="chip">
                    <Icon className="ic sm" aria-hidden="true" />
                    {chip.text}
                  </span>
                );
              })}
            </div>
            <p className="small muted">
              <NoteText parts={view.note} />
            </p>
          </div>

          <div className="statstrip">
            <div>
              <span className="small muted">Studies ranked</span>
              <span className="bignum" style={{ fontSize: 33 }}>
                {list.length}
              </span>
            </div>
            <div>
              <span className="small muted">Best match</span>
              {best ? (
                <>
                  <Link href={`/study/${best.study.id}`} className="h3 name-link">
                    {best.study.shortName}
                  </Link>
                  <span className="small muted">
                    {best.match.score}% match{tiedWithBest.length ? `, tied with ${tiedWithBest.length} more` : ""}
                  </span>
                </>
              ) : (
                <span className="h3">None</span>
              )}
            </div>
            <div>
              <span className="small muted">Known gaps</span>
              <span className="bignum" style={{ fontSize: 33 }}>
                {gaps.items.length}
              </span>
              <button type="button" className="linklike small self-start no-print" onClick={() => setTab("gaps")}>
                See the gaps
              </button>
            </div>
          </div>

          <div className="no-print">
            <Tabs
              idBase="planner"
              label="Planner results"
              active={shownTab}
              onChange={setTab}
              items={[
                { id: "ranked", label: "Studies ranked" },
                { id: "best", label: "Best match" },
                { id: "gaps", label: "Known gaps" },
              ]}
            />
          </div>

          <TabPanel idBase="planner" id="ranked" active={shownTab === "ranked"}>
            <div className="stack g4">
              <div className="row between wrapx g3">
                <p className="small muted">Ranked by how closely each study&apos;s oxygen, pressure, gravity and fuel match this mission.</p>
                {anyAi && <AiLabel text="AI-written reasons" />}
              </div>
              {list.length === 0 ? (
                <div className="empty">
                  <p className="h4">No ranked studies match this filter.</p>
                  <p className="body muted">Clear the filter to see more.</p>
                  <button type="button" className="btn btn-secondary" onClick={() => setTags([])}>
                    Clear filter
                  </button>
                </div>
              ) : (
                <>
                  <ol ref={listRef}>
                    {visible.map((item, i) => (
                      <RankRow key={item.study.id} item={item} rank={i + 1} move={moves[item.study.id]} />
                    ))}
                  </ol>
                  <div className="row between wrapx g3 no-print">
                    <span className="small muted">
                      Showing {visible.length} of {list.length} ranked {list.length === 1 ? "study" : "studies"}
                    </span>
                    {visible.length < list.length && (
                      <button type="button" className="btn btn-secondary" onClick={() => setShowAll(true)}>
                        Show all {list.length}
                      </button>
                    )}
                  </div>
                </>
              )}
              <p className="small muted">
                Not ranked:{" "}
                {planned.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && ", "}
                    <Link href={`/study/${s.id}`}>{s.shortName}</Link>
                  </span>
                ))}
                {planned.length > 0 && " (planned tests only)"}
                {planned.length > 0 && ground.length > 0 && " and "}
                {ground.length > 0 && `${plural(ground.length, "ground study", "ground studies")} (no test conditions to match)`}.
              </p>
            </div>
          </TabPanel>

          <TabPanel idBase="planner" id="best" active={shownTab === "best"}>
            {best ? <BestMatch item={best} tied={tiedWithBest} second={list[1]} view={view} /> : <p className="body muted">No ranked studies match this filter.</p>}
          </TabPanel>

          <TabPanel idBase="planner" id="gaps" active={shownTab === "gaps"}>
            <section className="gap" aria-label="Known gaps">
              <div className="row g4" style={{ alignItems: "flex-start" }}>
                <span className="gap-ic">
                  <CircleQuestionMark className="ic" aria-hidden="true" />
                </span>
                <div className="stack g3" style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="h4">What we don&apos;t know yet</h3>
                  <ul className="stack g2 body dot-list">
                    {gaps.items.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                  <SourceLine sources={gaps.sources} />
                  <Link className="btn btn-secondary self-start" href="/insights?tab=gaps">
                    See gaps and gravity
                  </Link>
                </div>
              </div>
            </section>
          </TabPanel>
        </div>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setSheetOpen(false)}>
            Show {plural(list.length, "study", "studies")}
          </button>
        }
      >
        <div className="stack g5">{controls("sheet")}</div>
      </BottomSheet>
    </section>
    </>
  );
}

const LEVEL_WORDS: Record<MatchLevel, string> = { yes: "matches", partial: "partly matches", no: "doesn't match" };

/** Each condition's match in words, so the printout doesn't rely on color. */
function matchInWords(item: RankedItem) {
  return (["oxygen", "pressure", "gravity", "fuel"] as const)
    .map((dim) => {
      const chip = matchChipLabel(dim, item.match[dim], item.study.id, item.study.hardwareFamily);
      const name = dim === "fuel" ? "Solid fuel" : chip.split(":")[0];
      const words = chip.endsWith("imitated") ? "imitated by a gas burner" : LEVEL_WORDS[item.match[dim]];
      return `${name}: ${words}`;
    })
    .join("; ");
}

/** The printed ranking ("Save as PDF"): every ranked study for this mission and filter. */
function PlannerPrint({ view, list, tags, stamp }: { view: ReturnType<typeof missionView>; list: RankedItem[]; tags: TagId[]; stamp: PrintStamp | null }) {
  const anyAi = list.some((r) => r.whyIsAi);
  return (
    <PrintReport title={`Vesta: ${view.label} ranking`} stamp={stamp} footer="Scores computed from NASA PSI data. Made with Vesta.">
      <section className="prt-sec">
        <h2 className="prt-h2">Mission conditions</h2>
        <p className="prt-strong">{view.chips.map((c) => c.text).join(", ")}</p>
        <p className="prt-small">
          <PrintNote parts={view.note} />
        </p>
        {tags.length > 0 && <p className="prt-small">Showing only studies for: {joinAnd(tags.map(tagLabel))}.</p>}
      </section>
      <section className="prt-sec">
        <h2 className="prt-h2">Ranked studies ({list.length})</h2>
        <p className="prt-small">
          Each score is out of 100: oxygen 35 points, pressure 25, gravity 15 and solid fuel 25. A full match earns all of a condition&apos;s points and a
          partial match half.{anyAi ? " Reasons marked AI-written were written by AI; the scores were not." : ""}
        </p>
        {list.length === 0 ? (
          <p>No ranked studies match this filter.</p>
        ) : (
          <ol className="prt-list">
            {list.map((item, i) => (
              <li key={item.study.id} className="prt-row">
                <span className="prt-rank">{i + 1}</span>
                <div className="prt-body">
                  <p>
                    <span className="prt-strong">{item.study.shortName}</span> <span className="prt-muted">{item.study.fullName}</span>
                  </p>
                  <p className="prt-strong">Match score: {item.match.score}%</p>
                  <p>{matchInWords(item)}.</p>
                  {item.match.assumed.length > 0 && <p className="prt-small">Not in the table, so scored as {joinAnd(item.match.assumed)}.</p>}
                  <p>
                    {item.why} {item.whyIsAi && <span className="prt-ai">AI-written</span>}
                  </p>
                  <p className="prt-small">
                    Source: {item.study.psiId}, <PrintLink url={item.study.psiUrl} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </PrintReport>
  );
}

function MatchChips({ item }: { item: RankedItem }) {
  return (
    <div className="row g2 wrapx">
      {(["oxygen", "pressure", "gravity", "fuel"] as const).map((dim) => (
        <MatchChip key={dim} level={item.match[dim]} label={matchChipLabel(dim, item.match[dim], item.study.id, item.study.hardwareFamily)} />
      ))}
    </div>
  );
}

function RankRow({ item, rank, move }: { item: RankedItem; rank: number; move?: string }) {
  return (
    <li className="rank-row" data-flip-key={item.study.id}>
      <span className="rr-rank">
        <span className="bignum rr-num" style={{ fontSize: 42 }} aria-hidden="true">
          {rank}
        </span>
        {move && <span className="small muted rr-move">{move}</span>}
      </span>
      <div className="stack g2" style={{ minWidth: 0 }}>
        <div className="row g3 wrapx" style={{ alignItems: "baseline" }}>
          <Link className="h4 name-link" href={`/study/${item.study.id}`}>
            {item.study.shortName}
          </Link>
          <span className="small muted">{item.study.fullName}</span>
        </div>
        <p className="body muted" style={{ fontSize: 16 }}>
          {item.why}
        </p>
        <MatchChips item={item} />
        {item.match.assumed.length > 0 && (
          <p className="small muted">Not in the table, so scored as {joinAnd(item.match.assumed)}.</p>
        )}
      </div>
      <div className="rr-bar" style={{ paddingTop: 8 }}>
        <MatchBar score={item.match.score} />
      </div>
      <div className="rr-act no-print">
        <Link className="btn btn-secondary btn-sm" style={{ minHeight: 44 }} href={`/study/${item.study.id}`}>
          Open study
        </Link>
      </div>
    </li>
  );
}

function BestMatch({ item, tied, second, view }: { item: RankedItem; tied: RankedItem[]; second?: RankedItem; view: ReturnType<typeof missionView> }) {
  const reasons = explainMatch(item.study, item.match, view);
  return (
    <div className="panel pad stack g4">
      <div className="row between wrapx g3" style={{ alignItems: "flex-start" }}>
        <div className="stack">
          <Link className="h3 name-link" href={`/study/${item.study.id}`}>
            {item.study.shortName}
          </Link>
          <span className="small muted">{item.study.fullName}</span>
        </div>
        <div style={{ width: 220, maxWidth: "100%" }}>
          <MatchBar score={item.match.score} />
        </div>
      </div>
      {tied.length > 0 && (
        <p className="small muted">
          Tied at {item.match.score}% with {joinAnd(tied.map((t) => t.study.shortName))}. Ties are listed by number of tests.
        </p>
      )}
      <p className="body">
        {item.why} {item.whyIsAi && <AiLabel />}
      </p>
      <ul className="stack g3">
        {(["fuel", "oxygen", "pressure", "gravity"] as const).map((dim) => (
          <li key={dim} className="stack g1">
            <span className="self-start">
              <MatchChip level={item.match[dim]} label={matchChipLabel(dim, item.match[dim], item.study.id, item.study.hardwareFamily)} />
            </span>
            <span className="small muted">{reasons[dim]}</span>
          </li>
        ))}
      </ul>
      <div className="row g3 wrapx">
        <Link className="btn btn-primary" href={`/study/${item.study.id}`}>
          Open study
        </Link>
        {second && (
          <Link className="btn btn-secondary" href={`/compare?ids=${item.study.id},${second.study.id}`}>
            Compare with {second.study.shortName}
          </Link>
        )}
      </div>
    </div>
  );
}
