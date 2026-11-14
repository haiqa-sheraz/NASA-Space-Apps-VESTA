import { Cloud, Droplet, Flame, Shield, type LucideIcon } from "lucide-react";

/** The three fire-safety jobs. Ids match data/ai (put_out); tabs use "put-out" in URLs. */
export const JOB_IDS = ["prevent", "detect", "put_out"] as const;
export type JobId = (typeof JOB_IDS)[number];

export interface JobInfo {
  id: JobId;
  label: string;
  /** CSS modifier for the job color: .job.prevent, .job.detect, .job.putout */
  cls: "prevent" | "detect" | "putout";
  /** Insights tab id in the URL */
  tab: "prevent" | "detect" | "put-out";
  icon: LucideIcon;
  blurb: string;
}

export const JOBS: Record<JobId, JobInfo> = {
  prevent: {
    id: "prevent",
    label: "Prevent",
    cls: "prevent",
    tab: "prevent",
    icon: Shield,
    blurb: "Stop fires from starting and spreading: oxygen, airflow and materials.",
  },
  detect: {
    id: "detect",
    label: "Detect",
    cls: "detect",
    tab: "detect",
    icon: Cloud,
    blurb: "Find smoke early: what sensors see in space.",
  },
  put_out: {
    id: "put_out",
    label: "Put out",
    cls: "putout",
    tab: "put-out",
    icon: Droplet,
    blurb: "Put fires out: mist, gases and extinguishing limits.",
  },
};

export function isJobId(value: unknown): value is JobId {
  return typeof value === "string" && (JOB_IDS as readonly string[]).includes(value);
}

/** URL form ("put-out") to id ("put_out"). */
export function jobFromParam(value: string): JobId | null {
  const id = value.replace("-", "_");
  return isJobId(id) ? id : null;
}

/**
 * Neutral tag for profiled studies with no fire-safety job (CFI, SLICE): basic flame science.
 * Not a fourth job, so it never uses a job color.
 */
export const FLAME_SCIENCE = {
  id: "flame_science",
  label: "Flame science",
  param: "flame-science",
  icon: Flame,
  blurb: "Flame science: studies of how flames burn, with no single fire-safety job.",
} as const;

/** A filter tag: one of the three jobs, or Flame science. */
export type TagId = JobId | typeof FLAME_SCIENCE.id;
export const TAG_IDS: TagId[] = [...JOB_IDS, FLAME_SCIENCE.id];

export const tagLabel = (tag: TagId) => (tag === FLAME_SCIENCE.id ? FLAME_SCIENCE.label : JOBS[tag].label);
export const tagParam = (tag: TagId) => (tag === FLAME_SCIENCE.id ? FLAME_SCIENCE.param : JOBS[tag].tab);

export function tagFromParam(value: string): TagId | null {
  return value === FLAME_SCIENCE.param ? FLAME_SCIENCE.id : jobFromParam(value);
}

/** Whether a study has any of the selected tags. */
export function hasAnyTag(study: { jobs: JobId[]; flameScience: boolean }, tags: TagId[]): boolean {
  return tags.some((tag) => (tag === FLAME_SCIENCE.id ? study.flameScience : study.jobs.includes(tag)));
}
