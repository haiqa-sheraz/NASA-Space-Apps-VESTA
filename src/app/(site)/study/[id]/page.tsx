import { ChevronLeft, FileText, Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskAboutStudyButton } from "@/components/study/AskAboutStudyButton";
import { getStudies, getStudy } from "@/lib/data/server";
import { AskContextSetter } from "@/lib/state/ask";

// One static page per study in data/studies.json; any other id is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getStudies().map((study) => ({ id: study.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const study = getStudy(id);
  return { title: study ? `${study.short_name}: ${study.full_name}` : "Study" };
}

/** Study page. Step 1 shows the header from studies.json; the full template is built in step 2. */
export default async function StudyPage({ params }: Props) {
  const { id } = await params;
  const study = getStudy(id);
  if (!study) notFound();

  return (
    <section className="wrap pt-6 pb-10">
      <AskContextSetter context={{ kind: "study", id: study.id, label: study.short_name }} />
      <Link className="crumb" href="/explore">
        <ChevronLeft className="ic sm" aria-hidden="true" />
        Back to Explore
      </Link>
      <div className="row between wrapx g5 mt-3" style={{ alignItems: "flex-end" }}>
        <div className="stack g3">
          <h1 className="h1">{study.short_name}</h1>
          <p className="lead" style={{ color: "var(--text)" }}>
            {study.full_name}
          </p>
          <div className="row g2 wrapx">
            <a className="chip src" href={study.psi_url}>
              <FileText className="ic sm" aria-hidden="true" />
              {study.psi_id}
            </a>
            {study.doi && (
              <a className="chip num" style={{ fontWeight: 600, fontSize: 13 }} href={`https://doi.org/${study.doi}`}>
                DOI {study.doi}
              </a>
            )}
            <span className="chip">
              <Layers className="ic sm" aria-hidden="true" />
              {study.hardware_family_name}
            </span>
            {study.environment === "ground" && <span className="badge">Ground study</span>}
          </div>
        </div>
        <div className="row g3">
          <AskAboutStudyButton />
        </div>
      </div>
    </section>
  );
}
