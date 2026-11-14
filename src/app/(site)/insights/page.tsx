import type { Metadata } from "next";
import { EquipmentPanel, GapsPanel, JobPanel, OxygenLimitChart } from "@/components/insights/InsightPanels";
import { InsightsClient, type InsightTab } from "@/components/insights/InsightsClient";
import { ReadingLevelSwitch } from "@/components/shell/ReadingLevelSwitch";
import { PageHero } from "@/components/ui/PageHero";
import { getGaps } from "@/lib/data/gaps";
import { getCoverage, getEquipmentInsights, getGravityBounds, getJobInsights, getOxygenLimitChart } from "@/lib/data/insights";
import { LUCI, PROBLEM_STATEMENT, PSI_TABLES } from "@/lib/sources";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  const panels: Record<InsightTab, ReactNode> = {
    prevent: (
      <JobPanel
        data={getJobInsights("prevent")}
        intro="Stop fires from starting and spreading, by understanding oxygen, airflow and materials."
        chart={<OxygenLimitChart data={getOxygenLimitChart()} />}
      />
    ),
    detect: <JobPanel data={getJobInsights("detect")} intro="Find smoke early, by understanding what sensors see in space." />,
    "put-out": <JobPanel data={getJobInsights("put_out")} intro="Put fires out, by understanding mist, gases and extinguishing limits." />,
    equipment: <EquipmentPanel data={getEquipmentInsights()} />,
    gaps: <GapsPanel coverage={getCoverage()} gravity={getGravityBounds()} gaps={getGaps()} sources={[LUCI, PSI_TABLES, PROBLEM_STATEMENT]} />,
  };

  return (
    <>
      <PageHero
        badge="Insights"
        title="Fire-safety insights"
        lead="What NASA's tests mean for preventing, detecting and putting out fires, and what's still unknown."
        actions={
          <div className="row g3 wrapx">
            <span className="small muted strong">Wording</span>
            <ReadingLevelSwitch label="Insights reading level" />
          </div>
        }
      />
      <InsightsClient panels={panels} />
    </>
  );
}
