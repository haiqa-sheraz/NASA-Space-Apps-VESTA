import type { Metadata } from "next";
import { ExploreClient } from "@/components/explore/ExploreClient";
import { PageHero } from "@/components/ui/PageHero";
import { getStudyIndex } from "@/lib/data/server";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  const index = getStudyIndex();
  return (
    <>
      <PageHero
        badge="Explore"
        title="Explore the studies"
        lead={`All ${index.length} NASA fire studies. Filter by job, fuel, hardware and conditions, then open a study.`}
      />
      <ExploreClient index={index} />
    </>
  );
}
