import { Cpu } from "lucide-react";
import { FLAME_SCIENCE, JOBS, type JobId } from "@/lib/jobs";
import type { MatchLevel } from "@/lib/scoring";

/** Job tag in its job color, always with its icon and name. */
export function JobTag({ job }: { job: JobId }) {
  const info = JOBS[job];
  const Icon = info.icon;
  return (
    <span className={`chip job ${info.cls}`}>
      <Icon className="ic" aria-hidden="true" />
      {info.label}
    </span>
  );
}

/** Neutral tag for studies with no fire-safety job. Deliberately no job color. */
export function FlameScienceTag() {
  const Icon = FLAME_SCIENCE.icon;
  return (
    <span className="chip" title={FLAME_SCIENCE.blurb}>
      <Icon className="ic" aria-hidden="true" />
      {FLAME_SCIENCE.label}
    </span>
  );
}

/** A study's tags: its fire-safety jobs, or Flame science. Renders nothing for untagged studies. */
export function StudyTags({ jobs, flameScience }: { jobs: JobId[]; flameScience: boolean }) {
  if (!jobs.length && !flameScience) return null;
  return (
    <>
      {jobs.map((job) => (
        <JobTag key={job} job={job} />
      ))}
      {flameScience && <FlameScienceTag />}
    </>
  );
}

/** Icons for match chips, as drawn in the design (check, half-filled circle, cross). */
function MatchIcon({ level }: { level: MatchLevel }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      {level === "yes" && <path d="m8.5 12 2.5 2.5 4.5-5" />}
      {level === "partial" && <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />}
      {level === "no" && <path d="m9 9 6 6M15 9l-6 6" />}
    </svg>
  );
}

export function MatchChip({ level, label }: { level: MatchLevel; label: string }) {
  return (
    <span className={`chip match ${level}`}>
      <MatchIcon level={level} />
      {label}
    </span>
  );
}

/** Match bar: the score out of 100, with a text label (never color alone). */
export function MatchBar({ score, label = "Match" }: { score: number; label?: string }) {
  return (
    <div className="matchbar">
      <div className="lbl">
        <span>{label}</span>
        <span>
          <b>{score}%</b>
        </span>
      </div>
      <div className="bar" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}, ${score}%`}>
        <i style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/** Visible note on text written by an AI model (submission rule: label AI-written content). */
export function AiLabel({ text = "AI-written" }: { text?: string }) {
  return (
    <span className="ai-label" title="Written by an AI model from the listed sources. Check the sources.">
      <Cpu className="ic sm" aria-hidden="true" />
      {text}
    </span>
  );
}
