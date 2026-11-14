import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Earth benefits" };

export default function EarthBenefitsPage() {
  return (
    <PageHero
      badge="Earth benefits"
      title="Space fire research on Earth"
      lead="Three ways work on fire safety in space now protects people on the ground."
    />
  );
}
