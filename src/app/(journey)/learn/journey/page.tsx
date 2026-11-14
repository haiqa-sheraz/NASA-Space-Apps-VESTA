import type { Metadata } from "next";
import { JourneyClient } from "@/components/journey/JourneyClient";
import { getJourney } from "@/lib/data/journey";

export const metadata: Metadata = { title: "Journey" };

/**
 * Journey: a guided story in 10 chapters, one per screen, in its own full-screen frame
 * (no top bar or footer, as in the approved design). It stays dark in light mode.
 */
export default function JourneyPage() {
  return <JourneyClient chapters={getJourney()} />;
}
