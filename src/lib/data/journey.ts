import "server-only";
import type { AirflowData, GasesData, GravityData, MissionAirData, OxygenData, SaffireFlight } from "@/lib/explainer-types";
import { APOLLO_1, MIR_FIRE, PROBLEM_STATEMENT, type SourceRef } from "@/lib/sources";
import {
  COOL_FLAME_SOURCE,
  HIDDEN_FLAME_TEXT,
  SAFFIRE_SOURCE,
  SMOKE_RACE_TEXT,
  airflowText,
  getAirflowData,
  getGasesData,
  getGravityData,
  getMissionAirData,
  getOxygenData,
  getSaffireFlights,
  oxygenText,
  smokeRaceSources,
} from "./explainers";
import { getStudies } from "./server";

export type ChapterIcon = "flame" | "wind" | "gauge" | "ruler" | "cloud" | "extinguisher" | "thermometer" | "moon" | "question" | "compass";

export type ChapterInteractive =
  | { kind: "gravity" }
  | { kind: "airflow"; data: AirflowData }
  | { kind: "oxygen"; data: OxygenData }
  | { kind: "saffire"; flights: SaffireFlight[] }
  | { kind: "smoke-race" }
  | { kind: "gases"; data: GasesData }
  | { kind: "hidden-flame" }
  | { kind: "missions"; data: MissionAirData }
  | { kind: "gravity-scale"; data: GravityData }
  | { kind: "paths"; studyCount: number };

export interface Chapter {
  n: number;
  title: string;
  icon: ChapterIcon;
  text: string;
  interactive: ChapterInteractive;
  chips: { label: string; href: string }[];
  sources: SourceRef[];
}

const study = (id: string, label: string) => ({ label, href: `/study/${id}` });

/**
 * The 10 Journey chapters (DESIGN_BRIEF.md 6.2 and the approved chapter text). Numbers in the
 * text come from data/; chapters stay at 60 words or fewer.
 */
export function getJourney(): Chapter[] {
  const airflow = getAirflowData();
  const oxygen = getOxygenData();
  const gases = getGasesData();
  const gravity = getGravityData();
  const missions = getMissionAirData();
  const moon = missions.views.find((v) => v.id === "moon");
  const iss = missions.views.find((v) => v.id === "iss");
  if (!moon || !iss) throw new Error("Moon base or ISS is missing from the mission list.");
  const chip = (v: typeof moon, kind: "oxygen" | "pressure") => v.chips.find((c) => c.kind === kind)!.text;

  const chapters: Chapter[] = [
    {
      n: 1,
      title: "Fire without “up”",
      icon: "flame",
      text: "Fire has endangered crews before: Apollo 1 in 1967 and Mir in 1997. On Earth, hot air rises and pulls fresh air in from below, so flames stand tall. In orbit, hot air doesn't rise. Oxygen drifts in from all sides, and the flame turns round, dim and blue.",
      interactive: { kind: "gravity" },
      chips: [study("bass-ii", "BASS-II"), study("acme-flame-design", "ACME Flame Design"), study("acme-cld-flame", "ACME CLD Flame")],
      sources: [PROBLEM_STATEMENT, APOLLO_1, MIR_FIRE],
    },
    {
      n: 2,
      title: "Airflow feeds the fire",
      icon: "wind",
      text: airflowText(airflow),
      interactive: { kind: "airflow", data: airflow },
      chips: [study("bass-ii", "BASS-II"), { label: "Airflow", href: "/insights?tab=prevent" }, { label: "Thin films", href: "/data?study=bass-ii&q=film" }],
      sources: airflow.sources,
    },
    {
      n: 3,
      title: "The oxygen bar is lower",
      icon: "gauge",
      text: oxygenText(oxygen),
      interactive: { kind: "oxygen", data: oxygen },
      chips: [study("bass-ii", "BASS-II"), { label: "Oxygen limit", href: "/insights?tab=prevent" }, { label: "Solid materials", href: "/explore?fuel=solid" }],
      sources: oxygen.sources,
    },
    {
      n: 4,
      title: "Size matters",
      icon: "ruler",
      text: "A small sample in a glovebox can't show how a big fire grows. So Saffire burned large fabric samples in an empty cargo ship, far from the crew. Step through the three flights to compare their samples, drawn to scale.",
      interactive: { kind: "saffire", flights: getSaffireFlights() },
      chips: [study("saffire-i", "Saffire-I"), study("saffire-ii", "Saffire-II"), study("saffire-iii", "Saffire-III")],
      sources: [SAFFIRE_SOURCE],
    },
    {
      n: 5,
      title: "Smoke that wanders",
      icon: "cloud",
      text: SMOKE_RACE_TEXT,
      interactive: { kind: "smoke-race" },
      chips: [study("same", "SAME"), study("same-r", "SAME-R"), study("daft", "DAFT")],
      sources: smokeRaceSources(),
    },
    {
      n: 6,
      title: "Putting fires out",
      icon: "extinguisher",
      text: "Putting out a fire in space takes more than spraying it. FLEX tested how adding gases changes whether fuel drops keep burning. Choose CO₂ or helium and see what happened to the drops.",
      interactive: { kind: "gases", data: gases },
      chips: [study("flex", "FLEX"), study("flex-2", "FLEX-2"), { label: "Put out", href: "/insights?tab=put-out" }],
      sources: gases.sources,
    },
    {
      n: 7,
      title: "The hidden flame",
      icon: "thermometer",
      text: HIDDEN_FLAME_TEXT,
      interactive: { kind: "hidden-flame" },
      chips: [study("flex", "FLEX"), study("cfi", "CFI"), study("acme-cfi-g", "ACME CFI-G")],
      sources: [COOL_FLAME_SOURCE],
    },
    {
      n: 8,
      title: "Living on the Moon",
      icon: "moon",
      text: `A Moon base may keep its air at ${chip(moon, "oxygen")} and ${chip(moon, "pressure")}. The station runs at ${chip(iss, "oxygen")} and ${chip(iss, "pressure")}. Pick a mission to see how its air compares.`,
      interactive: { kind: "missions", data: missions },
      chips: [study("bass-ii", "BASS-II"), study("acme-bre", "ACME BRE"), study("saffire-iii", "Saffire-III")],
      sources: missions.sources,
    },
    {
      n: 9,
      title: "What we don't know yet",
      icon: "question",
      text: "PSI has fire data at about 0 g and at 1 g, but nothing in between. LUCI took a first step by simulating Moon gravity on a spinning rocket. Slide from 0 g to 1 g to see where data exists.",
      interactive: { kind: "gravity-scale", data: gravity },
      chips: [study("acme-e-field", "ACME E-FIELD Flames"), study("bass-ii", "BASS-II"), { label: "Gaps and gravity", href: "/insights?tab=gaps" }],
      sources: gravity.sources,
    },
    {
      n: 10,
      title: "Your turn",
      icon: "compass",
      text: "You've seen how fire behaves without gravity, what NASA measured, and what is still unknown. Now use the data yourself.",
      interactive: { kind: "paths", studyCount: getStudies().length },
      chips: [
        { label: "Journey sources", href: "/about#sources" },
        { label: "Glossary", href: "/learn#glossary" },
        { label: "About the data", href: "/about#data-sources" },
      ],
      sources: [],
    },
  ];

  for (const c of chapters) {
    const words = c.text.split(/\s+/).filter(Boolean).length;
    if (words > 60) throw new Error(`Journey chapter ${c.n} has ${words} words; the design allows 60.`);
    for (const ch of c.chips) {
      const id = ch.href.match(/^\/study\/(.+)$/)?.[1];
      if (id && !getStudies().some((s) => s.id === id)) throw new Error(`Journey chapter ${c.n} links to a missing study: ${id}.`);
    }
  }
  return chapters;
}
