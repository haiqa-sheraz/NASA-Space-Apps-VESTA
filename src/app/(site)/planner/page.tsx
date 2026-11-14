import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { getStudies } from "@/lib/data/server";

export const metadata: Metadata = { title: "Planner" };

export default function PlannerPage() {
  const count = getStudies().length;
  return (
    <PageHero
      badge="Planner"
      title="Mission planner"
      lead={`Rank NASA's ${count} fire studies by how well they match your mission's air, pressure and gravity.`}
    />
  );
}
