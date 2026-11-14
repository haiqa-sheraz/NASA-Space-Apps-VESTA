import type { Metadata } from "next";
import Link from "next/link";
import { Glossary } from "@/components/learn/Glossary";
import { LearnExplainers } from "@/components/learn/LearnExplainers";
import { PageHero } from "@/components/ui/PageHero";
import { getAirflowData, getExplainers, getOxygenData } from "@/lib/data/explainers";
import { CORE_TERMS, getStudyGlossary } from "@/lib/data/glossary";

export const metadata: Metadata = { title: "Learn" };

/** Learn: the interactive explainers (each opens in a dialog) and the searchable glossary. */
export default function LearnPage() {
  return (
    <>
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

      <section className="sec" aria-labelledby="explainers-title">
        <div className="wrap stack g5">
          <div className="stack g1">
            <span className="label">Interactive explainers</span>
            <h2 id="explainers-title" className="h2">
              Try it yourself
            </h2>
          </div>
          <LearnExplainers explainers={getExplainers()} oxygen={getOxygenData()} airflow={getAirflowData()} />
        </div>
      </section>

      <section className="sec" id="glossary">
        <div className="wrap">
          <div style={{ maxWidth: 1000 }}>
            <Glossary core={CORE_TERMS} fromStudies={getStudyGlossary()} />
          </div>
        </div>
      </section>
    </>
  );
}
