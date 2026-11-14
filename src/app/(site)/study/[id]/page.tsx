import { ArrowLeftRight, ChevronLeft, Info, Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SmokePointInline } from "@/components/explainers/SmokePoint";
import { AskAboutStudyButton } from "@/components/study/AskAboutStudyButton";
import { DataPreview, ExpertDetail, KeyFacts, Results } from "@/components/study/StudySections";
import { StudyRelevance } from "@/components/study/StudyRelevance";
import { ReadingLevelSwitch } from "@/components/shell/ReadingLevelSwitch";
import { ByLevel } from "@/components/ui/ByLevel";
import { SourceChip, SourceLine } from "@/components/ui/SourceChip";
import { AiLabel, StudyTags } from "@/components/ui/Tags";
import { SMOKE_POINT_TEXT, smokePointSources } from "@/lib/data/explainers";
import { formatAuthor, getStudies, getStudy, getStudyIndex, getStudyProfile } from "@/lib/data/server";
import { buildPreview, relatedStudies } from "@/lib/data/study-view";
import { dedupeSources, resolveSource, type SourceRef } from "@/lib/sources";
import { AskContextSetter } from "@/lib/state/ask";

// One static page per study in data/studies.json; any other id is a 404.
export const dynamicParams = false;

/** Study pages that show the inline smoke-point explainer under the summary. */
const SMOKE_POINT_STUDIES = new Set(["spice", "slice"]);

export function generateStaticParams() {
  return getStudies().map((study) => ({ id: study.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const study = getStudy(id);
  return { title: study ? `${study.short_name}: ${study.full_name}` : "Study" };
}

/** Study page: one template for all 24 studies. */
export default async function StudyPage({ params }: Props) {
  const { id } = await params;
  const study = getStudy(id);
  if (!study) notFound();

  const index = getStudyIndex();
  const entry = index.find((s) => s.id === study.id)!;
  const file = getStudyProfile(study.id);
  const profile = file?.profile ?? null;
  const psiRecord: SourceRef = {
    label: study.psi_id,
    title: `NASA PSI record and data files${study.doi ? `, DOI ${study.doi}` : ""}`,
    url: study.psi_url,
  };
  const sources = dedupeSources([...(file?.sources.map((s) => resolveSource(s.title, s.url)) ?? []), psiRecord]);
  const preview = buildPreview(study.id);
  const related = relatedStudies(study);
  const authors = study.authors.map(formatAuthor);

  return (
    <>
      <AskContextSetter context={{ kind: "study", id: study.id, label: study.short_name, ground: study.environment === "ground" }} />

      {/* Header */}
      <section className="wrap pt-6 pb-10">
        <Link className="crumb" href="/explore">
          <ChevronLeft className="ic sm" aria-hidden="true" />
          Back to Explore
        </Link>
        <div className="row between wrapx g5 mt-3" style={{ alignItems: "flex-end" }}>
          <div className="stack g3" style={{ minWidth: 0 }}>
            <h1 className="h1">{study.short_name}</h1>
            <p className="lead" style={{ color: "var(--text)" }}>
              {study.full_name}
            </p>
            <div className="row g2 wrapx">
              <SourceChip source={psiRecord} />
              {study.doi && (
                <a className="chip num" style={{ fontWeight: 600, fontSize: 13 }} href={`https://doi.org/${study.doi}`} target="_blank" rel="noopener noreferrer">
                  DOI {study.doi}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              <span className="chip">
                <Layers className="ic sm" aria-hidden="true" />
                {study.hardware_family_name}
              </span>
              {study.environment === "ground" && <span className="badge">Ground study</span>}
              {entry.status === "planned" && <span className="badge">Planned tests only</span>}
              <StudyTags jobs={entry.jobs} flameScience={entry.flameScience} />
            </div>
          </div>
          <div className="row g3 wrapx">
            <Link className="btn btn-secondary" href={`/compare?ids=${study.id}`}>
              <ArrowLeftRight className="ic" aria-hidden="true" />
              Compare with
            </Link>
            <AskAboutStudyButton />
          </div>
        </div>
      </section>

      {/* Summary and relevance */}
      <section className="wrap pb-14">
        <div className="study-top">
          <div className="stack g4">
            <div className="row between wrapx g3">
              <h2 className="h3">Summary</h2>
              <ReadingLevelSwitch label="Summary reading level" />
            </div>
            {profile ? (
              <>
                <ByLevel
                  simple={<p className="body" style={{ fontSize: 19, lineHeight: 1.6 }}>{profile.summary_simple}</p>}
                  expert={<p className="body" style={{ fontSize: 19, lineHeight: 1.6 }}>{profile.summary_expert}</p>}
                />
                <SourceLine sources={sources}>
                  <AiLabel />
                </SourceLine>
              </>
            ) : (
              <p className="notice">
                <Info className="ic sm" aria-hidden="true" style={{ marginTop: 3 }} />
                <span>
                  Vesta has no summary for this {study.environment === "ground" ? "ground study" : "study"} yet. Its data
                  files and documents are on its PSI page,{" "}
                  <a href={study.psi_url} target="_blank" rel="noopener noreferrer">
                    {study.psi_id}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  .
                </span>
              </p>
            )}
            {/* SPICE measured smoke points; SLICE gets the same explainer as background on soot (approved design). */}
            {SMOKE_POINT_STUDIES.has(study.id) && <SmokePointInline text={SMOKE_POINT_TEXT} sources={smokePointSources()} />}
          </div>
          <StudyRelevance study={entry} index={index} />
        </div>
      </section>

      <KeyFacts study={study} profile={profile} authors={authors} />
      {profile && <Results study={study} profile={profile} />}
      <ExpertDetail study={study} profile={profile} columns={preview.columns} sources={sources} />
      <DataPreview study={study} columns={preview.columns} rows={preview.rows} totalRows={preview.totalRows} flaggedRows={preview.flaggedRows} />

      {/* Sources and related studies */}
      <section className="sec">
        <div className="wrap cols-2" style={{ gap: 48 }}>
          <div className="stack g3">
            <h2 className="h3">Sources</h2>
            <ul className="stack g4">
              {sources.map((s) => (
                <li key={`${s.label}-${s.url}`} className="stack g1">
                  <span className="self-start">
                    <SourceChip source={s} />
                  </span>
                  <span className="small muted">{s.title}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="stack g3">
            <h2 className="h3">Related studies</h2>
            {related.length ? (
              <ul className="stack">
                {related.map((r) => (
                  <li key={r.id} className="row between g3" style={{ padding: "12px 0", borderBottom: "1px solid var(--rule)" }}>
                    <div className="stack" style={{ minWidth: 0 }}>
                      <Link href={`/study/${r.id}`} className="h5 name-link">
                        {r.short_name}
                      </Link>
                      <span className="small muted">{r.full_name}</span>
                    </div>
                    <Link className="btn btn-ghost btn-sm" href={`/compare?ids=${study.id},${r.id}`}>
                      Compare
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">No related studies in Vesta.</p>
            )}
            <Link className="btn btn-secondary self-start" href={`/compare?ids=${study.id}`}>
              <ArrowLeftRight className="ic" aria-hidden="true" />
              Compare with
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
