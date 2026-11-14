import type { TestRow } from "@/lib/data/types";
import { fmtNum } from "@/lib/format";

/**
 * How test-table rows are shown on the site (study data previews and the Data page).
 * Display rounding: % to 1 decimal, atm to 2, other measurements to 3. Downloads keep full values.
 */
export interface TestColumn {
  key: string;
  label: string;
  unit: string | null;
  numeric: boolean;
  /** Long text that may wrap; other columns stay on one line. */
  wrap?: boolean;
  /** The tests.csv columns this display column shows, for the column notes. */
  sourceColumns: string[];
  get: (row: TestRow) => string | null;
}

const num = (n: number | null, decimals = 3) => (n === null ? null : fmtNum(n, decimals));
const range = (lo: number | null, hi: number | null, decimals = 3) => {
  if (lo === null && hi === null) return null;
  const a = num(lo ?? hi, decimals);
  const b = num(hi ?? lo, decimals);
  return a === b ? a : `${a}–${b}`;
};

export const TEST_COLUMNS: TestColumn[] = [
  { key: "test", label: "Test", unit: null, numeric: false, sourceColumns: ["test_id"], get: (r) => r.test_id },
  { key: "date", label: "Date", unit: null, numeric: false, sourceColumns: ["date"], get: (r) => r.date },
  { key: "fuel", label: "Fuel", unit: null, numeric: false, wrap: true, sourceColumns: ["fuel"], get: (r) => r.fuel },
  { key: "material", label: "Material", unit: null, numeric: false, wrap: true, sourceColumns: ["material"], get: (r) => r.material },
  { key: "shape", label: "Sample shape", unit: null, numeric: false, sourceColumns: ["sample_shape"], get: (r) => r.sample_shape },
  { key: "size", label: "Sample size", unit: null, numeric: false, wrap: true, sourceColumns: ["sample_size"], get: (r) => r.sample_size },
  { key: "oxygen", label: "Oxygen", unit: "%", numeric: true, sourceColumns: ["oxygen_pct_min", "oxygen_pct_max"], get: (r) => range(r.oxygen_pct_min, r.oxygen_pct_max, 1) },
  { key: "oxygenFinal", label: "Final oxygen", unit: "%", numeric: true, sourceColumns: ["oxygen_final_pct"], get: (r) => num(r.oxygen_final_pct, 1) },
  { key: "pressure", label: "Pressure", unit: "atm", numeric: true, sourceColumns: ["pressure_atm_min", "pressure_atm_max"], get: (r) => range(r.pressure_atm_min, r.pressure_atm_max, 2) },
  { key: "airflow", label: "Airflow", unit: "cm/s", numeric: true, sourceColumns: ["airflow_cm_s_min", "airflow_cm_s_max"], get: (r) => range(r.airflow_cm_s_min, r.airflow_cm_s_max) },
  { key: "diluent", label: "Diluent", unit: null, numeric: false, wrap: true, sourceColumns: ["diluent"], get: (r) => r.diluent },
  { key: "drop", label: "Drop diameter", unit: "mm", numeric: true, sourceColumns: ["droplet_diameter_mm"], get: (r) => num(r.droplet_diameter_mm) },
  { key: "burn", label: "Burn time", unit: "s", numeric: true, sourceColumns: ["burn_time_s"], get: (r) => num(r.burn_time_s) },
  { key: "outcome", label: "Outcome", unit: null, numeric: false, wrap: true, sourceColumns: ["outcome"], get: (r) => r.outcome },
];

/** A row's quality flags, plus a note for exact copies of earlier rows. */
export function rowFlags(r: TestRow): string[] {
  const flags = [...r.flags];
  if (r.duplicate_of !== null && r.duplicate_of !== undefined) {
    flags.push(`Exact copy of table row ${r.duplicate_of}; not counted as a separate test.`);
  }
  return flags;
}

/** All of a row's flags as one sentence-case text for a tooltip. */
export function flagText(flags: string[]): string {
  return `${flags.map((f) => f.trim().replace(/\.$/, "")).map((f) => f[0].toUpperCase() + f.slice(1)).join(". ")}.`;
}
