import { ArrowRight, Globe, Info, Orbit } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { SourceLine } from "@/components/ui/SourceChip";
import { AiLabel } from "@/components/ui/Tags";
import { getEarthStories, getStudyEarthUses } from "@/lib/data/earth";
import { getStudyProfiles } from "@/lib/data/server";

export const metadata: Metadata = { title: "Earth benefits" };

/**
 * Earth benefits: three stories (In space, then On Earth) from data/ai/earth_benefits.json, and a map
 * of the uses on Earth that each PSI study's own reports name. All story text is AI-written.
 */
export default function EarthBenefitsPage() {
  const stories = getEarthStories();
  const uses = getStudyEarthUses();
  const summarized = getStudyProfiles().length;

  return (
    <>
      <PageHero
        badge="Earth benefits"
        title="Space fire research on Earth"
        lead="Three ways work on fire safety in space now protects people on the ground."
      />

      <div className="wrap stack g7 pb-16">
        {stories.map((story) => (
          <section key={story.id} className="stack g4" aria-labelledby={`story-${story.id}`}>
            <div className="row g3">
              <span className="story-n num" aria-hidden="true">
                {story.n}
              </span>
              <h2 id={`story-${story.id}`} className="h3">
                {story.title}
              </h2>
            </div>
            <div className="story">
              <div>
                <span className="row g2 small strong muted">
                  <Orbit className="ic sm" aria-hidden="true" />
                  In space
                </span>
                <p className="body">{story.inSpace}</p>
              </div>
              <div>
                <span className="row g2 small strong muted">
                  <Globe className="ic sm" aria-hidden="true" />
                  On Earth
                </span>
                <p className="body">{story.onEarth}</p>
              </div>
            </div>
            <div className="stack g2">
              <h3 className="h5">Key facts</h3>
              <ul className="bullet-list stack g2">
                {story.keyFacts.map((fact) => (
                  <li key={fact} className="body">
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
            <SourceLine sources={story.sources}>
              <AiLabel />
            </SourceLine>
          </section>
        ))}

        <section className="stack g4" aria-labelledby="earth-map-title">
          <div className="stack g1">
            <span className="label">Study-to-Earth-use map</span>
            <h2 id="earth-map-title" className="h2">
              Which studies point to uses on Earth
            </h2>
          </div>
          <p className="body muted">
            The three stories above come from NASA Spinoff, technology and report pages. Below are the uses on Earth that the PSI studies&apos; own
            reports name, study by study.
          </p>
          <figure className="panel pad-l stack g5 earth-map" style={{ margin: 0 }} aria-label="Map from PSI studies to the uses on Earth their reports name">
            <div className="row g5 wrapx small muted" aria-hidden="true">
              <span className="row g2">
                <span className="earth-node study" />
                PSI study
              </span>
              <span className="row g2">
                <span className="earth-node use" />
                Use on Earth named in its reports
              </span>
            </div>
            <ul className="stack">
              {uses.map((row) => (
                <li key={row.id} className="earth-row">
                  <div className="stack g1">
                    <span className="row g2">
                      <span className="earth-node study" aria-hidden="true" />
                      <Link className="h5 name-link" href={`/study/${row.id}`}>
                        {row.shortName}
                      </Link>
                    </span>
                    <span className="small muted">{row.familyName}</span>
                  </div>
                  <ArrowRight className="ic earth-arrow" aria-hidden="true" />
                  <div className="stack g3" style={{ minWidth: 0 }}>
                    <ul className="bullet-list hollow stack g1">
                      {row.uses.map((use) => (
                        <li key={use} className="body">
                          {use}
                        </li>
                      ))}
                    </ul>
                    <SourceLine sources={row.sources} />
                  </div>
                </li>
              ))}
            </ul>
            <figcaption className="row g2 wrapx small muted">
              <AiLabel />
              <span>
                Each use is written by AI from the study&apos;s reports. {uses.length} of the {summarized} studies Vesta summarizes name a use on Earth.
              </span>
            </figcaption>
          </figure>
        </section>

        <p className="notice">
          <Info className="ic sm" aria-hidden="true" style={{ marginTop: 3 }} />
          <span>NASA did not invent the smoke detector. The stories here are about specific NASA work and where it went next.</span>
        </p>
      </div>
    </>
  );
}
