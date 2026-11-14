import { conditionsFromRanking, rankingMission } from "@/lib/data/rankings";
import { fmtNum, fmtRange, joinAnd } from "@/lib/format";
import { MISSIONS, type CustomConditions, type MissionId } from "@/lib/missions";
import {
  atmToPsi,
  fuelKindOf,
  psiToAtm,
  type MatchResult,
  type MissionConditions,
  type ScoringStudy,
} from "@/lib/scoring";
import { EXPLORATION_ATMOSPHERE, PROBLEM_STATEMENT, type SourceRef } from "@/lib/sources";

/** A sentence made of text and source links, so citations inside it can be links. */
export type NotePart = string | SourceRef;

export interface MissionView {
  id: MissionId;
  label: string;
  inSentence: string;
  /** Used inside explanations: "Moon base: 30% or more." */
  shortName: string;
  conditions: MissionConditions;
  oxygenText: string;
  pressureText: string;
  gravityText: string;
  chips: { kind: "oxygen" | "pressure" | "gravity"; text: string }[];
  note: NotePart[];
}

const psiText = (atm: number) => fmtNum(atmToPsi(atm), 1);

/** Everything the pages show about a mission, derived from rankings.json (or the Custom sliders). */
export function missionView(id: MissionId, custom: CustomConditions): MissionView {
  const info = MISSIONS[id];

  if (id === "custom" || !info.rankingKey) {
    const conditions: MissionConditions = {
      o2Min: custom.oxygenPct,
      o2Max: custom.oxygenPct,
      pMinAtm: psiToAtm(custom.pressurePsi),
      pMaxAtm: psiToAtm(custom.pressurePsi),
      g: custom.gravityG,
    };
    const oxygenText = `${fmtNum(custom.oxygenPct, 1)}%`;
    const pressureText = `${fmtNum(custom.pressurePsi, 1)} psi`;
    const gravityText = `${fmtNum(custom.gravityG, 2)} g`;
    return {
      id,
      label: info.label,
      inSentence: info.inSentence,
      shortName: "Your setting",
      conditions,
      oxygenText,
      pressureText,
      gravityText,
      chips: [
        { kind: "oxygen", text: `${oxygenText} oxygen` },
        { kind: "pressure", text: pressureText },
        { kind: "gravity", text: gravityText },
      ],
      note: ["Your custom conditions. Scores use the same rules as the preset missions."],
    };
  }

  const def = rankingMission(info.rankingKey).mission;
  const conditions = conditionsFromRanking(def);

  // "30% or more" inside explanations; "30% oxygen or more" on chips and in the note.
  const openEnded = def.o2_min !== def.o2_max && def.o2_max >= 100;
  const oxygenText =
    def.o2_min === def.o2_max
      ? `${fmtNum(def.o2_min)}%`
      : openEnded
        ? `${fmtNum(def.o2_min)}% or more`
        : `${fmtRange([def.o2_min, def.o2_max])}%`;
  const oxygenChip = openEnded ? `${fmtNum(def.o2_min)}% oxygen or more` : `${oxygenText} oxygen`;

  const pressureText =
    def.p_min === def.p_max
      ? `${psiText(def.p_max)} psi`
      : def.p_min === 0
        ? `${psiText(def.p_max)} psi or less`
        : `${fmtRange([atmToPsi(def.p_min), atmToPsi(def.p_max)])} psi`;

  const onTheMoon = Math.abs(def.g - 1 / 6) < 0.005;
  const gravityText = def.g === 0 ? "about 0 g" : onTheMoon ? "1/6 g" : `about ${fmtNum(def.g, 2)} g`;

  let note: NotePart[];
  switch (id) {
    case "moon":
      note = [PROBLEM_STATEMENT, `: ${oxygenChip}, ${pressureText}, ${gravityText}.`];
      break;
    case "mars":
    case "rover":
      note = [
        `NASA's recommended exploration atmosphere: ${pressureText}, ${oxygenChip} (`,
        EXPLORATION_ATMOSPHERE,
        id === "mars" ? `), at ${gravityText}.` : `), on the Moon at ${gravityText}.`,
      ];
      break;
    default:
      note = [`ISS air: ${oxygenChip}, ${pressureText}, ${gravityText}.`];
  }

  return {
    id,
    label: info.label,
    inSentence: info.inSentence,
    shortName: info.label,
    conditions,
    oxygenText,
    pressureText,
    gravityText,
    chips: [
      { kind: "oxygen", text: oxygenChip },
      { kind: "pressure", text: pressureText },
      { kind: "gravity", text: gravityText },
    ],
    note,
  };
}

/** Labels for the match chips, e.g. "Solid fuel: imitated" for a burner that imitates solids. */
export function matchChipLabel(dimension: "oxygen" | "pressure" | "gravity" | "fuel", level: string, studyId?: string, family?: string) {
  if (dimension === "fuel") {
    const imitated = studyId && family && fuelKindOf(studyId, family) === "gas emulating solids" && level === "partial";
    return `Solid fuel: ${imitated ? "imitated" : level}`;
  }
  const name = { oxygen: "Oxygen", pressure: "Pressure", gravity: "Gravity" }[dimension];
  return `${name}: ${level}`;
}

/** One plain sentence per condition, explaining a study's match to the mission. Computed, not AI. */
export function explainMatch(study: ScoringStudy, match: MatchResult, mission: MissionView) {
  const kind = fuelKindOf(study.id, study.hardwareFamily);
  const fuel = {
    solid: "Burns solid materials, like those in a cabin.",
    "gas emulating solids": "A gas burner that imitates burning solids.",
    gas: "Gas flames, not solid materials.",
    liquid: "Liquid fuel drops, not solid materials.",
    sensor: "Smoke and dust measurements, not burning solids.",
    analysis: "Analysis on the ground.",
  }[kind];

  const oxygen = study.oxygenRange
    ? `Tested ${fmtRange(study.oxygenRange)}%. ${mission.shortName}: ${mission.oxygenText}.`
    : `Not in the table, so scored as 21% cabin air. ${mission.shortName}: ${mission.oxygenText}.`;

  const pressure = study.pressureRange
    ? `Tested ${fmtRange([atmToPsi(study.pressureRange[0]), atmToPsi(study.pressureRange[1])])} psi. ${mission.shortName}: ${mission.pressureText}.`
    : `Not in the table, so scored as about 1 atm (${psiText(1)} psi). ${mission.shortName}: ${mission.pressureText}.`;

  const tested = study.environment === "space" ? "About 0 g" : "1 g, on the ground";
  const gravity =
    match.gravity === "partial"
      ? `${tested}. ${mission.shortName}: ${mission.gravityText}. PSI has data only near 0 g and at 1 g, which bound it.`
      : `${tested}. ${mission.shortName}: ${mission.gravityText}.`;

  return { fuel, oxygen, pressure, gravity };
}

/** A computed one-line reason for Custom, where there is no AI-written reason. */
export function customReason(match: MatchResult): string {
  const names = { oxygen: "oxygen", pressure: "pressure", gravity: "gravity", fuel: "solid fuel" } as const;
  const dims = ["oxygen", "pressure", "gravity", "fuel"] as const;
  const by = (level: string) => dims.filter((d) => match[d] === level).map((d) => names[d]);
  const parts: string[] = [];
  const yes = by("yes");
  const partial = by("partial");
  const no = by("no");
  if (yes.length) parts.push(`Matches ${joinAnd(yes)}.`);
  if (partial.length) parts.push(`${yes.length ? "Partly matches" : "Only partly matches"} ${joinAnd(partial)}.`);
  if (no.length) parts.push(`Doesn't match ${joinAnd(no)}.`);
  return parts.join(" ");
}
