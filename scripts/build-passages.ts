/**
 * Builds data/passages.json, the NASA text that Ask AI searches, from prep_output/chunks.jsonl
 * (made by prep_step2_ai.py; it stays on our computer, out of GitHub), plus a short line of facts
 * for each study from data/studies.json and data/tests.json (its PSI test table).
 *
 * Run from the project root:  bun scripts/build-passages.ts
 *
 * Left out, so the file is safe to publish:
 * - articles that aren't NASA's (Tech Briefs, EurekAlert): READ_ME_FIRST says link them, don't store them;
 * - the conference papers attached to the SAME final report (its pages 35 to 67): two are
 *   copyright SAE International. The NASA report itself (pages 1 to 34) covers the same results.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PassageDoc, PassageRecord, PassagesFile } from "../src/lib/ask/types";
import { resolveSource } from "../src/lib/sources";

const ROOT = join(import.meta.dirname, "..");
const SOURCE = join(ROOT, "prep_output", "chunks.jsonl");
const OUT = join(ROOT, "data", "passages.json");

interface Chunk {
  id: string;
  doc_title: string;
  doc_file: string;
  kind: string;
  url: string | null;
  page: number;
  study_ids: string[];
  text: string;
}

const NOT_NASA = /tech briefs|eurekalert/i;
const THIRD_PARTY_PAGES = [{ file: /SAME Final Science report/i, fromPage: 35 }];
/** PDF documents have meaningful page numbers; web pages and transcripts don't. */
const PAGED_KINDS = new Set(["report", "paper", "poster", "scan"]);

if (!existsSync(SOURCE)) {
  console.error(`Missing ${SOURCE}. Run the Python prep first (prep_step2_ai.py).`);
  process.exit(1);
}

const chunks: Chunk[] = readFileSync(SOURCE, "utf-8")
  .split("\n")
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));

const docs: PassageDoc[] = [];
const docIndex = new Map<string, number>();
const passages: PassageRecord[] = [];
const unlinked = new Set<string>();
let skippedNotNasa = 0;
let skippedThirdParty = 0;

for (const c of chunks) {
  if (NOT_NASA.test(`${c.doc_file} ${c.doc_title}`)) {
    skippedNotNasa += 1;
    continue;
  }
  if (THIRD_PARTY_PAGES.some((r) => r.file.test(c.doc_file) && c.page >= r.fromPage)) {
    skippedThirdParty += 1;
    continue;
  }
  const text = c.text.replace(/\s+/g, " ").trim();
  if (text.length < 40) continue;

  let d = docIndex.get(c.doc_file);
  if (d === undefined) {
    const ref = resolveSource(c.doc_title, c.url);
    if (!ref.url) unlinked.add(c.doc_title);
    d = docs.length;
    docs.push({ title: ref.title ?? c.doc_title, label: ref.label, url: ref.url ?? "", kind: c.kind });
    docIndex.set(c.doc_file, d);
  }
  passages.push({ d, p: PAGED_KINDS.has(c.kind) ? c.page : null, s: c.study_ids, t: text });
}

if (unlinked.size) {
  console.error(`These documents have no link; add them to KNOWN_DOCUMENTS in src/lib/sources.ts:\n- ${[...unlinked].join("\n- ")}`);
  process.exit(1);
}

// ---- Each study's facts from its PSI test table (data/studies.json and data/tests.json)

interface StudyRow {
  id: string;
  short_name: string;
  psi_id: string;
  psi_url: string;
  full_name: string;
  environment: string;
  gravity: string;
  tests: number;
  years: [number, number] | null;
  oxygen_pct_range: [number, number] | null;
  pressure_atm_range: [number, number] | null;
  airflow_cm_s_range: [number, number] | null;
  fuels: string[];
  materials: string[];
  thin_table: string | null;
  known_mismatches: string[];
}
interface TestRow {
  study_id: string;
  is_test: boolean;
  fuel: string | null;
  oxygen_pct_min: number | null;
  oxygen_pct_max: number | null;
}

const studies: StudyRow[] = JSON.parse(readFileSync(join(ROOT, "data", "studies.json"), "utf-8"));
const tests: TestRow[] = JSON.parse(readFileSync(join(ROOT, "data", "tests.json"), "utf-8"));

/** The smoke studies heated their samples instead of burning them, so "Materials" alone would mislead. */
const SMOKE_ONLY = new Set(["same", "same-r"]);
const num = (n: number, decimals: number) => String(Number(n.toFixed(decimals)));
const span = ([a, b]: [number, number], decimals: number, unit: string) =>
  `${num(a, decimals) === num(b, decimals) ? num(a, decimals) : `${num(a, decimals)} to ${num(b, decimals)}`} ${unit}`;

function oxygenText(s: StudyRow): string | null {
  // Inside-out (inverse) flames get their oxygen from the burner: give those apart from the rest.
  const rows = tests.filter((t) => t.study_id === s.id && t.is_test);
  const range = (list: TestRow[]): [number, number] | null => {
    const values = list.flatMap((t) => [t.oxygen_pct_min, t.oxygen_pct_max]).filter((v): v is number => v !== null);
    return values.length ? [Math.min(...values), Math.max(...values)] : null;
  };
  const inverse = rows.filter((t) => /inverse/i.test(t.fuel ?? ""));
  if (inverse.length) {
    const normal = range(rows.filter((t) => !inverse.includes(t)));
    const inside = range(inverse);
    return [
      normal && `Oxygen in the air around normal flames: ${span(normal, 1, "%")}.`,
      inside && `Inside-out (inverse) flames: ${span(inside, 1, "%")} oxygen, flowing out of the burner, so not the surrounding air.`,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return s.oxygen_pct_range ? `Oxygen: ${span(s.oxygen_pct_range, 1, "%")}.` : null;
}

function factsText(s: StudyRow): string {
  return [
    `${s.short_name === s.psi_id ? s.short_name : `${s.short_name} (${s.psi_id})`}: ${s.full_name}.`,
    s.environment === "space" ? `Flown in space (${s.gravity}).` : "A ground-based study (1 g), not flown in space.",
    s.years ? (s.years[0] === s.years[1] ? `Tests in ${s.years[0]}.` : `Tests from ${s.years[0]} to ${s.years[1]}.`) : null,
    s.tests ? `${s.tests} tests in the PSI table.` : "No test results in a PSI table.",
    s.thin_table,
    oxygenText(s),
    s.pressure_atm_range ? `Pressure: ${span(s.pressure_atm_range, 2, "atm")}.` : null,
    s.airflow_cm_s_range ? `Airflow: ${span(s.airflow_cm_s_range, 1, "cm/s")}.` : null,
    s.fuels.length ? `Fuels: ${s.fuels.join(", ")}.` : null,
    s.materials.length
      ? SMOKE_ONLY.has(s.id)
        ? `Materials heated to make smoke, not burned (the SAME-2 paper, NTRS 20130000422, says below the ignition point): ${s.materials.join(", ")}.`
        : `Materials: ${s.materials.join(", ")}.`
      : null,
    ...s.known_mismatches.map((m) => `The test table and a NASA source disagree here. ${m}`),
  ]
    .filter(Boolean)
    .join(" ");
}

const file: PassagesFile = {
  generated: new Date().toISOString(),
  note: "NASA text passages for Ask AI search, built by scripts/build-passages.ts from the prep's chunks, plus each study's facts from its PSI test table. Non-NASA articles and third-party papers are left out.",
  docs,
  passages,
  studies: studies.map((s) => ({ id: s.id, name: s.short_name, psiId: s.psi_id, psiUrl: s.psi_url, text: factsText(s) })),
};
writeFileSync(OUT, JSON.stringify(file));
console.log(
  `Wrote ${passages.length} passages from ${docs.length} documents to data/passages.json ` +
    `(${(JSON.stringify(file).length / 1e6).toFixed(1)} MB). Left out: ${skippedNotNasa} non-NASA, ${skippedThirdParty} third-party paper chunks.`,
);
