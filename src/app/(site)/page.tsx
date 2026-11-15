import { CircleQuestionMark } from "lucide-react";
import Link from "next/link";
import { FlameChamber } from "@/components/home/FlameChamber";
import { HeroFit } from "@/components/home/HeroFit";
import { HeadlineFindings, type FindingItem } from "@/components/home/HeadlineFindings";
import { HeroAskBar } from "@/components/home/HeroAskBar";
import { MissionSpotlight } from "@/components/home/MissionSpotlight";
import { PathCards } from "@/components/home/PathCards";
import { WhyVesta } from "@/components/home/WhyVesta";
import { SourceLine } from "@/components/ui/SourceChip";
import { JobTag } from "@/components/ui/Tags";
import { getGaps } from "@/lib/data/gaps";
import { rankingMission } from "@/lib/data/rankings";
import { getFindings, getJobCounts, getKeyNumbers, getStudyIndex } from "@/lib/data/server";
import { plural } from "@/lib/format";
import { JOB_IDS, JOBS, isJobId } from "@/lib/jobs";
import { SITE } from "@/lib/site";
import { PROBLEM_STATEMENT, findingSource } from "@/lib/sources";

export default function HomePage() {
  const index = getStudyIndex();
  const keyNumbers = getKeyNumbers();
  const gaps = getGaps();
  const jobCounts = getJobCounts();
  const moonTop = rankingMission("moon-base").studies.slice(0, 2).map((row) => row.study_id);

  const findings: FindingItem[] = getFindings().map((f) => {
    const ourAnalysis = !f.study_id;
    const sources = f.sources.map(findingSource);
    // Our-analysis findings compare PSI data with the Moon-base air in the problem statement.
    if (ourAnalysis) sources.push(PROBLEM_STATEMENT);
    return {
      id: f.id,
      simple: f.simple,
      expert: f.expert,
      job: isJobId(f.job) ? f.job : null,
      ourAnalysis,
      sources,
      href: f.study_id ? `/study/${f.study_id}` : "/insights?tab=gaps",
      actionLabel: f.study_id ? "Open study" : "See gaps and gravity",
    };
  });

  return (
    <>
      {/* Hero: one screen under the top bar (it shrinks to fit short screens) */}
      <HeroFit>
        <div className="hero-intro stack g4">
          <span className="badge blue self-start" style={{ whiteSpace: "normal", lineHeight: 1.3, paddingBlock: 4 }}>
            {SITE.heroBadge}
          </span>
          <div className="row g3 wrapx" style={{ alignItems: "center" }}>
            <h1 className="h1x">{SITE.name}</h1>
            <WhyVesta />
          </div>
          <p className="tagline">{SITE.tagline}</p>
          <p className="lead">{SITE.purpose}</p>
        </div>
        <div className="hero-chamber">
          <FlameChamber start="earth" />
        </div>
        <div className="hero-ask">
          <HeroAskBar />
        </div>
        <div className="hero-actions row g3 wrapx">
          <Link className="btn btn-primary" href="/learn/journey">
            Start the journey
          </Link>
          <Link className="btn btn-secondary" href="/planner">
            Plan a mission
          </Link>
        </div>
      </HeroFit>

      <PathCards topStudyId={moonTop[0]} compareIds={moonTop} />

      {/* Key numbers, counted from data/studies.json */}
      <section className="sec">
        <div className="wrap stack g3">
          <span className="label">Key numbers, counted from our data</span>
          <p className="keystrip">
            <b>{keyNumbers.studies}</b>
            <span>NASA studies:</span>
            <b>{keyNumbers.inSpace}</b>
            <span>flown in space and</span>
            <b>{keyNumbers.onGround}</b>
            <span>on the ground, in</span>
            <b>{keyNumbers.families}</b>
            <span>hardware families, sorted into</span>
            <b>{keyNumbers.jobs}</b>
            <span>fire-safety jobs.</span>
          </p>
        </div>
      </section>

      <HeadlineFindings items={findings} />

      {/* What we don't know yet */}
      <section className="sec" style={{ paddingTop: 0, borderTop: 0 }}>
        <div className="wrap">
          <section className="gap" aria-labelledby="gaps-title">
            <div className="row g4" style={{ alignItems: "flex-start" }}>
              <span className="gap-ic">
                <CircleQuestionMark className="ic" aria-hidden="true" />
              </span>
              <div className="stack g3" style={{ flex: 1, minWidth: 0 }}>
                <h2 id="gaps-title" className="h4">
                  What we don&apos;t know yet
                </h2>
                <ul className="stack g2 body dot-list">
                  {gaps.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <SourceLine sources={gaps.sources} />
                <Link className="btn btn-secondary self-start" href="/insights?tab=gaps" style={{ marginTop: 4 }}>
                  See gaps and gravity
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Mission spotlight and fire-safety jobs */}
      <section className="sec">
        <div className="wrap home-split">
          <MissionSpotlight index={index} />
          <section className="stack g4" aria-labelledby="jobs-title">
            <div className="stack g1">
              <span className="label">Fire-safety jobs</span>
              <h2 id="jobs-title" className="h3">
                Three jobs, one tab each
              </h2>
            </div>
            <div className="stack g3">
              {JOB_IDS.map((job) => (
                <Link key={job} className="card stack g2" href={`/insights?tab=${JOBS[job].tab}`} style={{ padding: 20 }}>
                  <span className="self-start">
                    <JobTag job={job} />
                  </span>
                  <p className="small muted">{JOBS[job].blurb}</p>
                  <span className="small">{plural(jobCounts[job], "study", "studies")}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
