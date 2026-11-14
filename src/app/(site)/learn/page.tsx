import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <PageHero
      badge="Learn"
      title="Learn the basics"
      lead="Short, hands-on explainers about how fire behaves without gravity. No background needed."
      actions={
        <Link className="btn btn-primary" href="/learn/journey">
          Start the journey
        </Link>
      }
    />
  );
}
