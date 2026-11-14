"use client";

import { FlaskConical, GraduationCap, MessageCircleQuestionMark, Rocket, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useAsk } from "@/lib/state/ask";
import { usePrefs } from "@/lib/state/prefs";

interface Step {
  label: string;
  href?: string;
  action?: "ask";
}

interface Path {
  title: string;
  note: string;
  icon: LucideIcon;
  /** What choosing this path sets: the engineer path sets Moon base, the student path simple mode. */
  sets?: "moon" | "simple";
  steps: Step[];
}

/** Home "Pick your path": four cards whose steps are links. */
export function PathCards({ topStudyId, compareIds }: { topStudyId: string; compareIds: string[] }) {
  const { setMission, setReadingLevel } = usePrefs();
  const { openAsk } = useAsk();

  const paths: Path[] = [
    {
      title: "Planning a Moon base?",
      note: "For engineers. Sets the mission to Moon base.",
      icon: Rocket,
      sets: "moon",
      steps: [
        { label: "Open the Planner", href: "/planner?mission=moon" },
        { label: "Pick Moon base", href: "/planner?mission=moon" },
        { label: "Open the top study", href: `/study/${topStudyId}` },
        { label: "Compare", href: `/compare?ids=${compareIds.join(",")}` },
        { label: "Export a PDF", href: "/planner?mission=moon#export" },
      ],
    },
    {
      title: "New to fire in space?",
      note: "For students. Turns on simple mode.",
      icon: GraduationCap,
      sets: "simple",
      steps: [
        { label: "Learn the basics", href: "/learn" },
        { label: "Explore the studies", href: "/explore" },
        { label: "Read a study in simple mode", href: "/study/bass-ii" },
      ],
    },
    {
      title: "Need the numbers?",
      note: "For researchers.",
      icon: FlaskConical,
      steps: [
        { label: "Open Data", href: "/data" },
        { label: "Filter the tests", href: "/data#filters" },
        { label: "Download CSV", href: "/data#download" },
      ],
    },
    {
      title: "Have a question?",
      note: "For anyone. Answers cite NASA sources.",
      icon: MessageCircleQuestionMark,
      steps: [
        { label: "Ask about fire in space", action: "ask" },
        { label: "Check the sources", href: "/about#sources" },
      ],
    },
  ];

  function choose(path: Path) {
    if (path.sets === "moon") setMission("moon");
    if (path.sets === "simple") setReadingLevel("simple");
  }

  return (
    <section className="sec">
      <div className="wrap stack g5">
        <div className="stack g1">
          <span className="label">Pick your path</span>
          <h2 className="h2">Where do you want to start?</h2>
        </div>
        <div className="cols-4">
          {paths.map((path) => {
            const Icon = path.icon;
            return (
              <div key={path.title} className="card pathcard">
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 44, height: 44, border: "1px solid var(--rule-input)", color: "var(--blue)" }}
                >
                  <Icon className="ic" aria-hidden="true" />
                </span>
                <div className="stack g1">
                  <h3 className="h4">{path.title}</h3>
                  <p className="small muted">{path.note}</p>
                </div>
                <ol className="steps">
                  {path.steps.map((step) => (
                    <li key={step.label}>
                      {step.action === "ask" ? (
                        <button type="button" onClick={() => openAsk()}>
                          {step.label}
                        </button>
                      ) : (
                        <Link href={step.href ?? "/"} onClick={() => choose(path)}>
                          {step.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
