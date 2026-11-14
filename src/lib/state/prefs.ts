"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  CUSTOM_BOUNDS,
  DEFAULT_CUSTOM,
  isMissionId,
  type CustomConditions,
  type MissionId,
} from "@/lib/missions";

/**
 * Global, per-visitor preferences: the chosen mission and the reading level.
 * Saved in localStorage so the choice carries across pages, visits and open tabs.
 * The server always renders the defaults; the saved choice applies right after hydration.
 */
export type ReadingLevel = "simple" | "expert";

export interface Prefs {
  mission: MissionId;
  readingLevel: ReadingLevel;
  custom: CustomConditions;
}

const STORAGE_KEY = "vesta:prefs:v1";

export const DEFAULT_PREFS: Prefs = {
  mission: "moon",
  readingLevel: "simple", // plain language by default
  custom: DEFAULT_CUSTOM,
};

let current: Prefs | null = null;
const listeners = new Set<() => void>();

function inRange(value: unknown, bounds: { min: number; max: number }): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= bounds.min && value <= bounds.max;
}

function sanitize(raw: unknown): Prefs {
  const value = (raw ?? {}) as Partial<Prefs>;
  const custom = (value.custom ?? {}) as Partial<CustomConditions>;
  return {
    mission: isMissionId(value.mission) ? value.mission : DEFAULT_PREFS.mission,
    readingLevel: value.readingLevel === "expert" || value.readingLevel === "simple" ? value.readingLevel : DEFAULT_PREFS.readingLevel,
    custom: {
      oxygenPct: inRange(custom.oxygenPct, CUSTOM_BOUNDS.oxygenPct) ? custom.oxygenPct : DEFAULT_CUSTOM.oxygenPct,
      pressurePsi: inRange(custom.pressurePsi, CUSTOM_BOUNDS.pressurePsi) ? custom.pressurePsi : DEFAULT_CUSTOM.pressurePsi,
      gravityG: inRange(custom.gravityG, CUSTOM_BOUNDS.gravityG) ? custom.gravityG : DEFAULT_CUSTOM.gravityG,
    },
  };
}

function load(): Prefs {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? sanitize(JSON.parse(stored)) : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS; // private mode or blocked storage: the defaults still work
  }
}

function getSnapshot(): Prefs {
  if (current === null) current = load();
  return current;
}

function getServerSnapshot(): Prefs {
  return DEFAULT_PREFS;
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      current = load();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(patch: Partial<Prefs>) {
  current = sanitize({ ...getSnapshot(), ...patch });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable: keep the choice for this page view only.
  }
  emit();
}

export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMission = useCallback((mission: MissionId) => update({ mission }), []);
  const setReadingLevel = useCallback((readingLevel: ReadingLevel) => update({ readingLevel }), []);
  const setCustom = useCallback(
    (custom: Partial<CustomConditions>) => update({ custom: { ...getSnapshot().custom, ...custom } }),
    [],
  );
  return { ...prefs, setMission, setReadingLevel, setCustom };
}
