import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <PageHero
      badge="Compare"
      title="Compare studies"
      lead="Put up to 3 studies side by side. Cells that differ are highlighted, and every value links to its source."
    />
  );
}
