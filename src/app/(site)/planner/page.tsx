import type { Metadata } from "next";
import { PlannerClient } from "@/components/planner/PlannerClient";
import { PageHero } from "@/components/ui/PageHero";
import { getGaps } from "@/lib/data/gaps";
import { getSiteStats, getStudyIndex } from "@/lib/data/server";

export const metadata: Metadata = { title: "Planner" };

export default function PlannerPage() {
  const index = getStudyIndex();
  return (
    <>
      <div className="no-print">
        <PageHero
          badge="Planner"
          title="Mission planner"
          lead={`Rank NASA's ${index.length} fire studies by how well they match your mission's air, pressure and gravity.`}
        />
      </div>
      <PlannerClient index={index} gaps={getGaps()} generated={getSiteStats().dataUpdated} />
    </>
  );
}
