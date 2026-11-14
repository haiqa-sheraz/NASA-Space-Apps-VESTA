/**
 * Missions for the global mission picker. Labels follow the approved design.
 * Conditions (oxygen, pressure, gravity) come from data/ai/rankings.json via `rankingKey`,
 * so no condition numbers are typed in here.
 */
export const MISSION_IDS = ["iss", "moon", "mars", "rover", "custom"] as const;
export type MissionId = (typeof MISSION_IDS)[number];

export interface MissionInfo {
  id: MissionId;
  /** Label in the picker, e.g. "Moon base". */
  label: string;
  /** How the mission reads inside a sentence, e.g. "What does BASS-II mean for a Moon base?" */
  inSentence: string;
  /** Key in data/ai/rankings.json `missions`, or null for Custom (scored from the sliders). */
  rankingKey: string | null;
}

export const MISSIONS: Record<MissionId, MissionInfo> = {
  iss: { id: "iss", label: "Spacecraft / ISS", inSentence: "a spacecraft or the ISS", rankingKey: "spacecraft-iss" },
  moon: { id: "moon", label: "Moon base", inSentence: "a Moon base", rankingKey: "moon-base" },
  mars: { id: "mars", label: "Mars base", inSentence: "a Mars base", rankingKey: "mars-base" },
  rover: { id: "rover", label: "Rover", inSentence: "a pressurized rover", rankingKey: "rover" },
  custom: { id: "custom", label: "Custom", inSentence: "your custom conditions", rankingKey: null },
};

export const MISSION_LIST: MissionInfo[] = MISSION_IDS.map((id) => MISSIONS[id]);

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === "string" && (MISSION_IDS as readonly string[]).includes(value);
}

/** Custom conditions set with the Planner sliders. */
export interface CustomConditions {
  oxygenPct: number;
  pressurePsi: number;
  gravityG: number;
}

/**
 * Starting values for Custom: NASA's suggested exploration air (8.2 psi, 34% oxygen)
 * at Moon gravity (0.17 g), as in the approved Planner "Custom" mockup and READ_ME_FIRST section 6.
 */
export const DEFAULT_CUSTOM: CustomConditions = { oxygenPct: 34, pressurePsi: 8.2, gravityG: 0.17 };

/** Outer bounds used only to reject corrupted saved values. */
export const CUSTOM_BOUNDS = {
  oxygenPct: { min: 0, max: 100 },
  pressurePsi: { min: 0, max: 15 },
  gravityG: { min: 0, max: 1 },
} as const;
