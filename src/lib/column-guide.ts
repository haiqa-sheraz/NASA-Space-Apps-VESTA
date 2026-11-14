/**
 * What each column of the cleaned test table (data/tests.csv, data/tests.json) means, with its unit.
 * Written from the cleaning code (prep_step1_clean.py). Shown on study pages and the Data page,
 * included in the JSON download, and downloadable on its own as a CSV.
 */
export interface ColumnInfo {
  column: string;
  label: string;
  /** Measurement unit, or null when the column has none. */
  unit: string | null;
  /** Kind of value, shown when there is no unit. */
  type: "text" | "number" | "true or false" | "list" | "JSON";
  description: string;
}

export const COLUMN_GUIDE: ColumnInfo[] = [
  { column: "study_id", label: "Study", unit: null, type: "text", description: "Vesta's short name for the study, for example bass-ii." },
  { column: "psi_id", label: "PSI number", unit: null, type: "text", description: "The study's number in NASA's Physical Sciences Informatics (PSI) repository." },
  { column: "source_table", label: "Source table", unit: null, type: "text", description: "The PSI table file the row came from." },
  { column: "source_row", label: "Source row", unit: null, type: "number", description: "The row's position in that PSI table." },
  { column: "test_id", label: "Test", unit: null, type: "text", description: "The test's label as written in the PSI table." },
  { column: "date", label: "Date", unit: null, type: "text", description: "The test date as written in the table." },
  { column: "year", label: "Year", unit: null, type: "number", description: "The test year, when the table gives one." },
  { column: "fuel", label: "Fuel", unit: null, type: "text", description: "Gas or liquid fuel, with spellings made consistent." },
  { column: "material", label: "Material", unit: null, type: "text", description: "Solid sample material." },
  { column: "sample_shape", label: "Sample shape", unit: null, type: "text", description: "Shape of the solid sample, such as rod, slab, film or fabric." },
  { column: "sample_size", label: "Sample size", unit: null, type: "text", description: "Sample dimensions, with the units given in the table." },
  { column: "oxygen_pct_min", label: "Oxygen, lowest", unit: "%", type: "number", description: "Oxygen in the gas around the flame. Equal to the highest value unless the test or test day had several levels." },
  { column: "oxygen_pct_max", label: "Oxygen, highest", unit: "%", type: "number", description: "Highest oxygen level for the row." },
  { column: "oxygen_final_pct", label: "Final oxygen", unit: "%", type: "number", description: "Oxygen measured after the test, where the table records it." },
  { column: "pressure_atm_min", label: "Pressure, lowest", unit: "atm", type: "number", description: "Chamber pressure. 1 atm is about 14.7 psi." },
  { column: "pressure_atm_max", label: "Pressure, highest", unit: "atm", type: "number", description: "Highest chamber pressure for the row." },
  { column: "airflow_cm_s_min", label: "Airflow, lowest", unit: "cm/s", type: "number", description: "Air speed past the sample or flame." },
  { column: "airflow_cm_s_max", label: "Airflow, highest", unit: "cm/s", type: "number", description: "Highest air speed for the row." },
  { column: "diluent", label: "Diluent", unit: null, type: "text", description: "Gas mixed with the oxygen, such as nitrogen, helium or carbon dioxide." },
  { column: "droplet_diameter_mm", label: "Drop diameter", unit: "mm", type: "number", description: "Starting diameter of a fuel drop." },
  { column: "burn_time_s", label: "Burn time", unit: "s", type: "number", description: "How long the flame burned." },
  { column: "outcome", label: "Outcome", unit: null, type: "text", description: "How the test ended, as the table reports it." },
  { column: "is_test", label: "Is a test", unit: null, type: "true or false", description: "True for real tests. False for duplicate, planned, blank and flow-visualization rows." },
  { column: "duplicate_of", label: "Duplicate of", unit: null, type: "number", description: "For an exact copy of an earlier row, that row's number. Copies aren't counted as tests." },
  { column: "flags", label: "Quality flags", unit: null, type: "list", description: "Data quality notes, such as approximate values or fixes made during cleaning. In the CSV they are separated by semicolons." },
  { column: "extra", label: "Other columns", unit: null, type: "JSON", description: "Other columns from the original PSI table, kept as written." },
];

export const COLUMN_BY_NAME = new Map(COLUMN_GUIDE.map((c) => [c.column, c]));

/** The column guide as CSV text (column, label, unit, type, description). */
export function columnGuideCsv(): string {
  const cell = (value: string | null) => {
    const text = value ?? "";
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [["column", "label", "unit", "type", "description"].join(",")];
  for (const c of COLUMN_GUIDE) lines.push([c.column, c.label, c.unit, c.type, c.description].map(cell).join(","));
  return `${lines.join("\n")}\n`;
}
