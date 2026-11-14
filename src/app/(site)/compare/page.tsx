import type { Metadata } from "next";
import { CompareClient } from "@/components/compare/CompareClient";
import { PageHero } from "@/components/ui/PageHero";
import { getCompareStudies } from "@/lib/data/compare";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <>
      <PageHero
        badge="Compare"
        title="Compare studies"
        lead="Put up to 3 studies side by side. Cells that differ are highlighted, and every value links to its source."
      />
      <CompareClient studies={getCompareStudies()} />
    </>
  );
}
