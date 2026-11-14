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

/**
 * The prep's notes on each row (tests.json `flags`) are of two kinds:
 *
 * Quality flags, shown with the caution icon: the value is approximate, assumed, ramped, in
 * other units, inconsistent, or the row isn't a measured test.
 *
 * Cleaning notes, not shown as flags: a typo or formatting fix whose result is certain, or a cell
 * that is simply blank in the source (the table already shows it as blank). They stay in the
 * downloads, where the flags column lists every note.
 *
 * Every note must match one list; validateData() stops the build on a new kind of note.
 */
const QUALITY_FLAGS: RegExp[] = [
  /approximate/,
  /^airflow given as display readings/,
  /^inside-out flame/,
  /^ramped test/,
  /^expanded from '/,
  /^fuel bottle blank in the table; assumed/,
  /^planned test matrix/,
  /^blank row in the table$/,
  /^flow visualization row/,
  /^burn time listed as '/,
  /^final O2 .* check against the report$/,
  /^marked '.*' in the table/,
  /^pressure recorded as .* treated as missing$/,
];

const CLEANING_NOTES: RegExp[] = [
  /^year not in the table/,
  /^date has no year in the table$/,
  /^material not stated in the table$/,
  /^fixed spreadsheet auto-increment typo/,
  /^notes were mixed into the date or fuel cell/,
  /^stray character removed from date/,
  /^year typo fixed/,
  /^spreadsheet error: '.*' read as /,
];

export const isQualityFlag = (note: string) => QUALITY_FLAGS.some((re) => re.test(note));
export const isCleaningNote = (note: string) => CLEANING_NOTES.some((re) => re.test(note));

/** Row notes that match neither list (the build stops on these, so each new kind gets reviewed). */
export function unclassifiedNotes(rows: TestRow[]): string[] {
  return [...new Set(rows.flatMap((r) => r.flags).filter((f) => !isQualityFlag(f) && !isCleaningNote(f)))];
}

/** A row's quality flags (not its cleaning notes), plus a note for exact copies of earlier rows. */
export function rowFlags(r: TestRow): string[] {
  const flags = r.flags.filter(isQualityFlag);
  if (r.duplicate_of !== null && r.duplicate_of !== undefined) {
    flags.push(`Exact copy of table row ${r.duplicate_of}; not counted as a separate test.`);
  }
  return flags;
}

/** All of a row's flags as one sentence-case text for a tooltip. */
export function flagText(flags: string[]): string {
  return `${flags.map((f) => f.trim().replace(/\.$/, "")).map((f) => f[0].toUpperCase() + f.slice(1)).join(". ")}.`;
}
