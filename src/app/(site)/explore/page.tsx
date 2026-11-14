import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { getStudies } from "@/lib/data/server";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  const count = getStudies().length;
  return (
    <PageHero
      badge="Explore"
      title="Explore the studies"
      lead={`All ${count} NASA fire studies. Filter by job, fuel, hardware and conditions, then open a study.`}
    />
  );
}
