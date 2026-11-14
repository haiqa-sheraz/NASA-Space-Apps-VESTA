import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <PageHero
      badge="Insights"
      title="Fire-safety insights"
      lead="What NASA's tests mean for preventing, detecting and putting out fires, and what's still unknown."
    />
  );
}
