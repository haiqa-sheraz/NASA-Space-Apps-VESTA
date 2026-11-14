import { Layers } from "lucide-react";
import Link from "next/link";
import { FlameSvg } from "@/components/ui/FlameSvg";
import { StudyTags } from "@/components/ui/Tags";
import type { StudyIndexEntry } from "@/lib/data/types";
import { formatCount, fmtRange } from "@/lib/format";
import { relevanceOf } from "@/lib/scoring";

export function testsText(s: StudyIndexEntry): string {
  if (s.status === "ground") return "No test table";
  if (s.status === "planned") return "Planned only";
  return formatCount(s.tests);
}

export function oxygenText(s: StudyIndexEntry): string {
  if (s.oxygenRange) return `${fmtRange(s.oxygenRange)}%`;
  return s.status === "ground" ? "No test table" : "Not in the table";
}

/** Relevance to the chosen mission, from the Planner's match score. */
export function RelevanceBadge({ study, score, missionName }: { study: StudyIndexEntry; score: number | undefined; missionName: string }) {
  if (study.status === "ground") return <span className="badge">Ground study</span>;
  if (study.status === "planned" || score === undefined) return <span className="badge">Planned tests only</span>;
  const level = relevanceOf(score);
  return (
    <span className={`badge${level === "High" ? " blue" : ""}`} title={`Relevance to ${missionName}: ${score}% match`}>
      {level} for {missionName}
      <span className="sr-only">, {score}% match</span>
    </span>
  );
}

/** Explore card: our flame illustration (blue sphere for space, amber teardrop for ground studies). */
export function StudyCard({ study, score, missionName }: { study: StudyIndexEntry; score: number | undefined; missionName: string }) {
  return (
    <Link className="card" href={`/study/${study.id}`} style={{ overflow: "hidden" }}>
      <div className="media" aria-hidden="true" style={{ height: 120, border: 0, borderRadius: 0, borderBottom: "1px solid var(--rule)" }}>
        <div style={{ width: study.environment === "ground" ? 52 : 66, opacity: 0.9 }}>
          <FlameSvg mode={study.environment === "ground" ? "earth" : "space"} idPrefix={`card-${study.id}`} />
        </div>
      </div>
      <div className="stack g3" style={{ padding: "18px 20px 20px", flex: 1 }}>
        <div className="row between wrapx g2" style={{ alignItems: "flex-start" }}>
          {/* The name keeps at least 160 px; when the badge doesn't fit beside it, the badge moves below. */}
          <div className="stack" style={{ minWidth: 0, flex: "1 1 160px" }}>
            <span className="h4">{study.shortName}</span>
            <span className="small muted">{study.fullName}</span>
          </div>
          <RelevanceBadge study={study} score={score} missionName={missionName} />
        </div>
        <span className="row g2 small muted">
          <Layers className="ic sm" aria-hidden="true" />
          {study.familyName}
        </span>
        {(study.jobs.length > 0 || study.flameScience) && (
          <div className="row g2 wrapx">
            <StudyTags jobs={study.jobs} flameScience={study.flameScience} />
          </div>
        )}
        <div className="row g5 small" style={{ borderTop: "1px solid var(--rule)", paddingTop: 12, marginTop: "auto" }}>
          <span className="stack">
            <span className="muted">Tests</span>
            <span className="num strong">{testsText(study)}</span>
          </span>
          <span className="stack">
            <span className="muted">Oxygen range</span>
            <span className="num strong">{oxygenText(study)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
