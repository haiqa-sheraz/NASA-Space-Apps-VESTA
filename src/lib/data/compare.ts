import "server-only";
import { formatCount } from "@/lib/format";
import { dedupeSources, resolveSource, type SourceRef } from "@/lib/sources";
import { getStudies, getStudyIndex, getStudyProfile } from "./server";
import type { CompareStudy, CompareValue } from "./types";

const ai = (text: string | null | undefined): CompareValue => (text && text.trim() ? { text: text.trim(), ai: true } : { text: null, ai: false });

function testsText(s: { environment: string; tests: number; table_rows: number }): string {
  if (s.environment === "ground") return "No test table";
  if (s.tests === 0) return `${formatCount(s.table_rows)} planned, no results yet`;
  if (s.tests === s.table_rows) return formatCount(s.tests);
  return `${formatCount(s.tests)} (${formatCount(s.table_rows)} table rows)`;
}

/**
 * One record per study for Compare. Ranges, test counts and fuels come from the PSI tables
 * (studies.json); goal, sensors and any range the table lacks come from the AI profile and are
 * marked as AI-written.
 */
export function getCompareStudies(): CompareStudy[] {
  const index = new Map(getStudyIndex().map((s) => [s.id, s]));
  return getStudies().map((s) => {
    const file = getStudyProfile(s.id);
    const kf = file?.profile.key_facts;
    const entry = index.get(s.id)!;
    const tableFuels = [...s.fuels, ...s.materials];
    const psiRecord: SourceRef = {
      label: s.psi_id,
      title: `NASA PSI record and data files${s.doi ? `, DOI ${s.doi}` : ""}`,
      url: s.psi_url,
    };
    return {
      id: s.id,
      shortName: s.short_name,
      fullName: s.full_name,
      psiId: s.psi_id,
      psiUrl: s.psi_url,
      familyName: s.hardware_family_name,
      environment: s.environment,
      jobs: entry.jobs,
      flameScience: entry.flameScience,
      goal: ai(file?.profile.experiment_goal),
      fuels: tableFuels.length ? { text: tableFuels.join(", "), ai: false } : ai(kf?.fuels.join(", ")),
      sensors: ai(kf?.sensors.join("; ")),
      tests: testsText(s),
      oxygen: { range: s.oxygen_pct_range, fallback: ai(kf?.oxygen) },
      airflow: { range: s.airflow_cm_s_range, fallback: ai(kf?.airflow) },
      pressureAtm: { range: s.pressure_atm_range, fallback: ai(kf?.pressure) },
      sources: dedupeSources([...(file?.sources.map((src) => resolveSource(src.title, src.url)) ?? []), psiRecord]),
      searchText: `${s.short_name} ${s.full_name} ${s.psi_id}`.toLowerCase(),
    };
  });
}
