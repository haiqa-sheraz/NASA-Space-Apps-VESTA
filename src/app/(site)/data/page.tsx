import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Data" };

export default function DataPage() {
  return (
    <PageHero
      badge="Data"
      title="Get the data"
      lead="Every test we extracted from NASA PSI and NTRS, cleaned, with units and quality flags."
    />
  );
}
