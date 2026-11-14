/** Types for the files in data/ (written by the Python prep scripts). */
import type { JobId } from "@/lib/jobs";
import type { FuelKind, ScoringStudy } from "@/lib/scoring";
import type { SourceRef } from "@/lib/sources";

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
  years: [number, number] | null;
  oxygen_pct_range: [number, number] | null;
  pressure_atm_range: [number, number] | null;
  airflow_cm_s_range: [number, number] | null;
  fuels: string[];
  materials: string[];
  outcomes: Record<string, number>;
  flames_ignited: number | null;
  thin_table: string | null;
  known_mismatches: string[];
  notes: string[];
}

export interface OxygenCoverage {
  study_id: string;
  short_name: string;
  tests_with_oxygen: number;
  highest_oxygen_pct: number;
  tests_at_30pct_or_more: number;
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
  oxygen_coverage: OxygenCoverage[];
  highest_oxygen_solid_materials_pct: number;
  highest_oxygen_bre_pct: number;
  studies_by_gravity: Record<string, number>;
  gaps: string[];
}

export interface TestRow {
  study_id: string;
  psi_id: string;
  source_table: string;
  source_row: number;
  test_id: string | null;
  date: string | null;
  year: number | null;
  fuel: string | null;
  material: string | null;
  sample_shape: string | null;
  sample_size: string | null;
  oxygen_pct_min: number | null;
  oxygen_pct_max: number | null;
  oxygen_final_pct: number | null;
  pressure_atm_min: number | null;
  pressure_atm_max: number | null;
  airflow_cm_s_min: number | null;
  airflow_cm_s_max: number | null;
  diluent: string | null;
  droplet_diameter_mm: number | null;
  burn_time_s: number | null;
  outcome: string | null;
  is_test: boolean;
  duplicate_of: string | number | null;
  flags: string[];
  extra: Record<string, unknown>;
}

export interface ProfileSource {
  label: string;
  title: string;
  url: string | null;
  file?: string;
}

export interface ProfileResult {
  job: string;
  result_simple: string;
  result_expert: string;
  safety_meaning: string;
  source: string;
  source_detail: { title: string; url: string | null; page: number | null } | null;
}

export interface ProfileKeyFacts {
  airflow: string | null;
  fuels: string[];
  gravity: string | null;
  number_of_tests: string | null;
  oxygen: string | null;
  pressure: string | null;
  sample_shapes: string[];
  sensors: string[];
  what_changed: string[];
}

export interface Profile {
  summary_simple: string;
  summary_expert: string;
  experiment_goal: string | null;
  key_facts: ProfileKeyFacts;
  results: ProfileResult[];
  jobs: string[];
  jobs_source: string;
  equipment: { area: string; note: string }[];
  glossary: { term: string; definition: string }[];
  open_questions: string[];
  earth_uses: string[];
}

export interface StudyProfileFile {
  study_id: string;
  model: string;
  generated: string;
  sources: ProfileSource[];
  numbers_not_in_sources: string[];
  profile: Profile;
}

/** data/ai/earth_benefits.json: three AI-written stories and the documents they cite (E1, E2, ...). */
export interface EarthBenefitsFile {
  stories: { topic: string; in_space: string; on_earth: string; key_facts: string[]; sources: string[] }[];
  sources: { label: string; title: string; url: string | null; file?: string }[];
  numbers_not_in_sources: string[];
}

export interface Finding {
  id: string;
  simple: string;
  expert: string | null;
  job: string;
  study_id: string | null;
  sources: string[];
  numbers_not_in_sources: string[];
}

export interface SiteStats {
  studies: number;
  tests: number;
  nasaReports: number;
  fireSafetyJobs: number;
  /** Date part (YYYY-MM-DD) of the newest "generated" stamp in the data files. */
  dataUpdated: string;
}

/** A value for Compare: its text, and whether it is AI-written (from the profile) or from the PSI table. */
export interface CompareValue {
  text: string | null;
  ai: boolean;
}

/** A measured range from the PSI table, with the AI profile's wording as a fallback when the table lacks it. */
export interface CompareRange {
  range: [number, number] | null;
  fallback: CompareValue;
}

export interface CompareStudy {
  id: string;
  shortName: string;
  fullName: string;
  psiId: string;
  psiUrl: string;
  familyName: string;
  environment: "space" | "ground";
  jobs: JobId[];
  flameScience: boolean;
  goal: CompareValue;
  fuels: CompareValue;
  sensors: CompareValue;
  tests: string;
  oxygen: CompareRange;
  airflow: CompareRange;
  pressureAtm: CompareRange;
  sources: SourceRef[];
  searchText: string;
}

/** Compact, browser-safe facts about one study, for cards, filters and scoring. */
export interface StudyIndexEntry extends ScoringStudy {
  shortName: string;
  fullName: string;
  psiId: string;
  familyName: string;
  jobs: JobId[];
  /** True for profiled studies with no fire-safety job: shown with a neutral "Flame science" tag. */
  flameScience: boolean;
  tableRows: number;
  years: [number, number] | null;
  fuelKind: FuelKind;
  /** ranked: has a mission score; planned: planned tests only; ground: ground study, not scored */
  status: "ranked" | "planned" | "ground";
  searchText: string;
}
