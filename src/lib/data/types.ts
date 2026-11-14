/** Types for the files in data/ (written by the Python prep scripts). */

export interface StudyTable {
  file: string;
  encoding: string;
  rows: number;
  records: number;
}

export interface Study {
  id: string;
  short_name: string;
  psi_id: string;
  full_name: string;
  hardware_family: string;
  hardware_family_name: string;
  environment: "space" | "ground";
  gravity: string;
  doi: string | null;
  psi_url: string;
  authors: string[];
  citation_year: string | null;
  tables: StudyTable[];
  table_rows: number;
  tests: number;
  years: number[];
  oxygen_pct_range: [number, number] | null;
  pressure_atm_range: [number, number] | null;
  airflow_cm_s_range: [number, number] | null;
  fuels: string[];
  materials: string[];
  outcomes: Record<string, number>;
  flames_ignited: number | null;
  thin_table: string | null;
  known_mismatches: unknown[];
  notes: string[];
}

export interface Facts {
  generated: string;
  key_numbers: {
    studies: number;
    studies_in_space: number;
    studies_on_ground: number;
    hardware_families: number;
    fire_safety_jobs: number;
    tests_in_tables: number;
    table_rows: number;
    studies_with_tables: number;
    [key: string]: number;
  };
  tests_per_study: Record<string, number>;
  [key: string]: unknown;
}

export interface TestRow {
  study_id: string;
  psi_id: string;
  is_test: boolean;
  duplicate_of: string | null;
  [key: string]: unknown;
}

export interface ProfileSource {
  label: string;
  title: string;
  url: string | null;
  file?: string;
}

export interface StudyProfileFile {
  study_id: string;
  model: string;
  generated: string;
  sources: ProfileSource[];
  profile: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SiteStats {
  studies: number;
  tests: number;
  nasaReports: number;
  fireSafetyJobs: number;
  /** Date part (YYYY-MM-DD) of the newest "generated" stamp in the data files. */
  dataUpdated: string;
}
