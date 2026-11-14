import "server-only";
import { sentenceCase } from "@/lib/format";
import { dedupeSources, resolveSource, type SourceRef } from "@/lib/sources";
import { getEarthBenefitsFile, getStudies, getStudyProfile } from "./server";

/** The three stories, in the approved design's order. */
const STORIES = [
  { topic: "water mist", title: "Water mist" },
  { topic: "smoke detection", title: "Smoke detection" },
  { topic: "firefighter gear", title: "Firefighter gear" },
] as const;

export interface EarthStory {
  id: string;
  n: number;
  title: string;
  inSpace: string;
  onEarth: string;
  keyFacts: string[];
  sources: SourceRef[];
}

/**
 * The Earth-benefit stories from data/ai/earth_benefits.json (AI-written), each with its cited
 * documents as linked sources. Stops the build if a story is missing or a source has no link.
 */
export function getEarthStories(): EarthStory[] {
  const file = getEarthBenefitsFile();
  const byLabel = new Map(file.sources.map((s) => [s.label, s]));
  const topics = file.stories.map((s) => s.topic);
  if (topics.length !== STORIES.length || STORIES.some((s) => !topics.includes(s.topic))) {
    throw new Error(`earth_benefits.json stories changed (${topics.join(", ")}); review the Earth benefits page.`);
  }

  return STORIES.map(({ topic, title }, i) => {
    const story = file.stories.find((s) => s.topic === topic)!;
    const sources = story.sources.map((label) => {
      const doc = byLabel.get(label);
      if (!doc) throw new Error(`Earth-benefit story "${topic}" cites ${label}, which isn't in the source list.`);
      const ref = resolveSource(doc.title, doc.url);
      if (!ref.url) throw new Error(`No link for Earth-benefit source ${label} (${doc.title}); add it to KNOWN_DOCUMENTS.`);
      return ref;
    });
    return {
      id: topic.replace(/\s+/g, "-"),
      n: i + 1,
      title,
      inSpace: story.in_space,
      onEarth: story.on_earth,
      keyFacts: story.key_facts,
      sources: dedupeSources(sources),
    };
  });
}

export interface StudyEarthUses {
  id: string;
  shortName: string;
  familyName: string;
  uses: string[];
  sources: SourceRef[];
}

/** Uses on Earth that each study's own reports name (AI-written, from the study profiles). */
export function getStudyEarthUses(): StudyEarthUses[] {
  return getStudies().flatMap((study) => {
    const file = getStudyProfile(study.id);
    const uses = (file?.profile.earth_uses ?? []).map((u) => u.trim()).filter(Boolean);
    if (!file || !uses.length) return [];
    return [
      {
        id: study.id,
        shortName: study.short_name,
        familyName: study.hardware_family_name,
        uses: uses.map((u) => sentenceCase(u).replace(/\.$/, "")),
        sources: dedupeSources(file.sources.map((s) => resolveSource(s.title, s.url))),
      },
    ];
  });
}
