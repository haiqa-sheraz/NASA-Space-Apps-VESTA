import type { StudyIndexEntry } from "@/lib/data/types";
import { TAG_IDS, hasAnyTag, tagFromParam, tagParam, type TagId } from "@/lib/jobs";
import type { FuelKind } from "@/lib/scoring";

/** Explore filters, their URL form (?q=&job=&fuel=&family=&o2=&gravity=&from=&to=), and matching. */
export type FuelFilter = "solid" | "liquid" | "gas";
export const FUEL_FILTERS: { id: FuelFilter; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "liquid", label: "Liquid drops" },
  { id: "gas", label: "Gas" },
];

export const O2_LIMITS = { min: 0, max: 50 } as const;

export interface Filters {
  q: string;
  /** Fire-safety jobs, plus "flame_science" for studies with no job. */
  tags: TagId[];
  fuels: FuelFilter[];
  families: string[];
  o2: [number, number];
  gravity: "all" | "space" | "ground";
  yearFrom: number | null;
  yearTo: number | null;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  tags: [],
  fuels: [],
  families: [],
  o2: [O2_LIMITS.min, O2_LIMITS.max],
  gravity: "all",
  yearFrom: null,
  yearTo: null,
};

/** Fuel filter for a study's fuel kind. Sensor studies and ground analyses match no fuel filter. */
export function fuelFilterOf(kind: FuelKind): FuelFilter | null {
  if (kind === "solid") return "solid";
  if (kind === "liquid") return "liquid";
  if (kind === "gas" || kind === "gas emulating solids") return "gas";
  return null;
}

export const o2Active = (f: Filters) => f.o2[0] > O2_LIMITS.min || f.o2[1] < O2_LIMITS.max;

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9%.]+/g, " ").trim();

export function matchesSearch(s: StudyIndexEntry, q: string): boolean {
  const query = q.trim();
  if (!query) return true;
  const psi = query.match(/^psi[\s-]*(\d+)$/i);
  if (psi) return s.psiId === `PSI-${psi[1]}`;
  const hay = normalize(s.searchText);
  return normalize(query)
    .split(" ")
    .filter(Boolean)
    .every((token) => hay.includes(token));
}

export function matches(s: StudyIndexEntry, f: Filters): boolean {
  if (!matchesSearch(s, f.q)) return false;
  if (f.tags.length && !hasAnyTag(s, f.tags)) return false;
  if (f.fuels.length) {
    const fuel = fuelFilterOf(s.fuelKind);
    if (!fuel || !f.fuels.includes(fuel)) return false;
  }
  if (f.families.length && !f.families.includes(s.hardwareFamily)) return false;
  if (o2Active(f)) {
    // Overlap with the chosen range; the top of the slider means "and above".
    if (!s.oxygenRange) return false;
    const [lo, hi] = f.o2;
    if (s.oxygenRange[1] < lo) return false;
    if (hi < O2_LIMITS.max && s.oxygenRange[0] > hi) return false;
  }
  if (f.gravity !== "all" && s.environment !== f.gravity) return false;
  if (f.yearFrom !== null || f.yearTo !== null) {
    if (!s.years) return false;
    if (f.yearFrom !== null && s.years[1] < f.yearFrom) return false;
    if (f.yearTo !== null && s.years[0] > f.yearTo) return false;
  }
  return true;
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.q.trim() ? 1 : 0) +
    f.tags.length +
    f.fuels.length +
    f.families.length +
    (o2Active(f) ? 1 : 0) +
    (f.gravity !== "all" ? 1 : 0) +
    (f.yearFrom !== null || f.yearTo !== null ? 1 : 0)
  );
}

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);
const int = (value: string | null) => (value && /^\d{4}$/.test(value) ? Number(value) : null);

export function filtersFromParams(params: URLSearchParams, families: string[]): Filters {
  const o2 = params.get("o2")?.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  let o2Range: [number, number] = [O2_LIMITS.min, O2_LIMITS.max];
  if (o2) {
    const lo = Math.max(O2_LIMITS.min, Math.min(O2_LIMITS.max, Number(o2[1])));
    const hi = Math.max(O2_LIMITS.min, Math.min(O2_LIMITS.max, Number(o2[2])));
    o2Range = lo <= hi ? [lo, hi] : [hi, lo];
  }
  const gravity = params.get("gravity");
  let yearFrom = int(params.get("from"));
  let yearTo = int(params.get("to"));
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    tags: TAG_IDS.filter((t) => list(params.get("job")).some((p) => tagFromParam(p) === t)),
    fuels: FUEL_FILTERS.map((x) => x.id).filter((id) => list(params.get("fuel")).includes(id)),
    families: families.filter((fam) => list(params.get("family")).includes(fam)),
    o2: o2Range,
    gravity: gravity === "space" || gravity === "ground" ? gravity : "all",
    yearFrom,
    yearTo,
  };
}

export function filtersToParams(f: Filters, params: URLSearchParams) {
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  set("q", f.q.trim() || null);
  set("job", f.tags.map(tagParam).join(",") || null);
  set("fuel", f.fuels.join(",") || null);
  set("family", f.families.join(",") || null);
  set("o2", o2Active(f) ? `${f.o2[0]}-${f.o2[1]}` : null);
  set("gravity", f.gravity === "all" ? null : f.gravity);
  set("from", f.yearFrom === null ? null : String(f.yearFrom));
  set("to", f.yearTo === null ? null : String(f.yearTo));
}
