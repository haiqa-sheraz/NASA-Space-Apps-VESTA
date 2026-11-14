import "server-only";
import { fmtNum } from "@/lib/format";
import { getStudies, getStudyTests } from "./server";
import type { Study, TestRow } from "./types";

export interface PreviewColumn {
  key: string;
  label: string;
  unit: string | null;
  numeric: boolean;
  /** The tests.csv columns this preview column shows, for the column notes. */
  sourceColumns: string[];
}

export interface PreviewRow {
  cells: Record<string, string>;
  flags: string[];
}

/**
 * Display rounding: % to 1 decimal, atm to 2, other measurements to 3.
 * The CSV and JSON downloads keep the full values.
 */
const num = (n: number | null, decimals = 3) => (n === null ? null : fmtNum(n, decimals));
const range = (lo: number | null, hi: number | null, decimals = 3) => {
  if (lo === null && hi === null) return null;
  const a = num(lo ?? hi, decimals);
  const b = num(hi ?? lo, decimals);
  return a === b ? a : `${a}–${b}`;
};

const COLUMNS: (PreviewColumn & { get: (r: TestRow) => string | null })[] = [
  { key: "test", label: "Test", unit: null, numeric: false, sourceColumns: ["test_id"], get: (r) => r.test_id },
  { key: "date", label: "Date", unit: null, numeric: false, sourceColumns: ["date"], get: (r) => r.date },
  { key: "fuel", label: "Fuel", unit: null, numeric: false, sourceColumns: ["fuel"], get: (r) => r.fuel },
  { key: "material", label: "Material", unit: null, numeric: false, sourceColumns: ["material"], get: (r) => r.material },
  { key: "shape", label: "Sample shape", unit: null, numeric: false, sourceColumns: ["sample_shape"], get: (r) => r.sample_shape },
  { key: "size", label: "Sample size", unit: null, numeric: false, sourceColumns: ["sample_size"], get: (r) => r.sample_size },
  { key: "oxygen", label: "Oxygen", unit: "%", numeric: true, sourceColumns: ["oxygen_pct_min", "oxygen_pct_max"], get: (r) => range(r.oxygen_pct_min, r.oxygen_pct_max, 1) },
  { key: "oxygenFinal", label: "Final oxygen", unit: "%", numeric: true, sourceColumns: ["oxygen_final_pct"], get: (r) => num(r.oxygen_final_pct, 1) },
  { key: "pressure", label: "Pressure", unit: "atm", numeric: true, sourceColumns: ["pressure_atm_min", "pressure_atm_max"], get: (r) => range(r.pressure_atm_min, r.pressure_atm_max, 2) },
  { key: "airflow", label: "Airflow", unit: "cm/s", numeric: true, sourceColumns: ["airflow_cm_s_min", "airflow_cm_s_max"], get: (r) => range(r.airflow_cm_s_min, r.airflow_cm_s_max) },
  { key: "diluent", label: "Diluent", unit: null, numeric: false, sourceColumns: ["diluent"], get: (r) => r.diluent },
  { key: "drop", label: "Drop diameter", unit: "mm", numeric: true, sourceColumns: ["droplet_diameter_mm"], get: (r) => num(r.droplet_diameter_mm) },
  { key: "burn", label: "Burn time", unit: "s", numeric: true, sourceColumns: ["burn_time_s"], get: (r) => num(r.burn_time_s) },
  { key: "outcome", label: "Outcome", unit: null, numeric: false, sourceColumns: ["outcome"], get: (r) => r.outcome },
];

function rowFlags(r: TestRow): string[] {
  const flags = [...r.flags];
  if (r.duplicate_of !== null && r.duplicate_of !== undefined) {
    flags.push(`Exact copy of table row ${r.duplicate_of}; not counted as a separate test.`);
  }
  return flags;
}

/** The first rows of a study's test table, with only the columns that hold data for this study. */
export function buildPreview(studyId: string, limit = 10) {
  const rows = getStudyTests(studyId);
  const columns = COLUMNS.filter((c) => rows.some((r) => c.get(r) !== null && c.get(r) !== ""));
  const flaggedRows = rows.filter((r) => rowFlags(r).length > 0).length;
  return {
    columns: columns.map(({ get: _get, ...c }) => c),
    rows: rows.slice(0, limit).map<PreviewRow>((r) => ({
      cells: Object.fromEntries(columns.map((c) => [c.key, c.get(r) ?? ""])),
      flags: rowFlags(r),
    })),
    totalRows: rows.length,
    flaggedRows,
  };
}

/** Studies in the same hardware family, plus studies named in a ground study's title (and the reverse). */
export function relatedStudies(study: Study): Study[] {
  const all = getStudies();
  const mentions = (title: string, short: string) => new RegExp(`\\b${short.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`).test(title);
  return all.filter((s) => {
    if (s.id === study.id) return false;
    if (s.hardware_family === study.hardware_family) return true;
    if (study.environment === "ground" && s.environment === "space" && mentions(study.full_name, s.short_name)) return true;
    if (s.environment === "ground" && study.environment === "space" && mentions(s.full_name, study.short_name)) return true;
    return false;
  });
}
