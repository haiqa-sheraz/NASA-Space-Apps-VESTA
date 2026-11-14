import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageHero
      badge="NASA Space Apps Challenge 2026"
      title={`About ${SITE.name}`}
      lead="An AI-powered guide that summarizes, ranks and interprets NASA's microgravity fire experiments for spacecraft, stations, Moon and Mars bases, and rovers."
      actions={
        <>
          <Link className="btn btn-primary" href="/learn/journey">
            Start the journey
          </Link>
          <Link className="btn btn-secondary" href="/planner">
            Plan a mission
          </Link>
        </>
      }
    />
  );
}
