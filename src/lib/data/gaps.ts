import "server-only";
import { fmtNum } from "@/lib/format";
import { FM2, LUCI, PSI_TABLES, type SourceRef } from "@/lib/sources";
import { getFacts, getStudy } from "./server";

/**
 * "What we don't know yet": the data gaps, with numbers taken from facts.json.
 * Each item is checked against the data; if the data changes, the build stops so the
 * wording can be reviewed instead of becoming wrong.
 */
export function getGaps(): { items: string[]; sources: SourceRef[] } {
  const facts = getFacts();
  const problems: string[] = [];

  if (facts.studies_by_gravity["partial gravity"] !== 0) problems.push("facts.json now lists partial-gravity studies.");
  const flex2 = getStudy("flex-2");
  if (!flex2 || flex2.tests !== 0) problems.push("FLEX-2 now has tests in its table.");
  if (problems.length) throw new Error(`Gap wording needs review:\n- ${problems.join("\n- ")}`);

  const solids = Math.round(facts.highest_oxygen_solid_materials_pct);
  const bre = fmtNum(facts.highest_oxygen_bre_pct);

  return {
    items: [
      "No partial-gravity data in PSI. Every space test ran at about 0 g.",
      `Solid materials were tested only up to about ${solids}% oxygen. ACME BRE, which imitates burning solids, reached ${bre}%.`,
      "FLEX-2 has planned tests only.",
      "LUCI and FM2 are the first steps toward Moon gravity.",
    ],
    sources: [PSI_TABLES, LUCI, FM2],
  };
}
