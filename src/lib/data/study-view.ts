import "server-only";
import { TEST_COLUMNS, rowFlags } from "@/lib/test-rows";
import { getStudies, getStudyTests } from "./server";
import type { Study } from "./types";

export interface PreviewColumn {
  key: string;
  label: string;
  unit: string | null;
  numeric: boolean;
  wrap?: boolean;
  /** The tests.csv columns this preview column shows, for the column notes. */
  sourceColumns: string[];
}

export interface PreviewRow {
  cells: Record<string, string>;
  flags: string[];
}

/** The first rows of a study's test table, with only the columns that hold data for this study. */
export function buildPreview(studyId: string, limit = 10) {
  const rows = getStudyTests(studyId);
  const columns = TEST_COLUMNS.filter((c) => rows.some((r) => c.get(r) !== null && c.get(r) !== ""));
  const flaggedRows = rows.filter((r) => rowFlags(r).length > 0).length;
  return {
    columns: columns.map<PreviewColumn>(({ key, label, unit, numeric, wrap, sourceColumns }) => ({ key, label, unit, numeric, wrap, sourceColumns })),
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
