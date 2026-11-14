"use client";

import { LayoutGrid, MessageCircleQuestionMark, SlidersVertical, Table } from "lucide-react";
import Link from "next/link";
import { useAsk } from "@/lib/state/ask";

/** Journey chapter 10: four ways to use the data next. */
export function JourneyPaths({ studyCount }: { studyCount: number }) {
  const { openAsk } = useAsk();
  const cards = [
    { title: "Plan a mission", note: "Rank studies for your air, pressure and gravity.", icon: SlidersVertical, href: "/planner" },
    { title: "Explore the studies", note: `All ${studyCount}, by job, fuel and hardware.`, icon: LayoutGrid, href: "/explore" },
    { title: "Get the numbers", note: "Filter the tests and download CSV.", icon: Table, href: "/data" },
  ];
  return (
    <div className="journey-paths">
      {cards.map(({ title, note, icon: Icon, href }) => (
        <Link key={title} className="card journey-path" href={href}>
          <Icon className="ic lg" aria-hidden="true" style={{ color: "var(--blue)" }} />
          <span className="h5">{title}</span>
          <span className="small muted">{note}</span>
        </Link>
      ))}
      <button type="button" className="card journey-path" onClick={() => openAsk()}>
        <MessageCircleQuestionMark className="ic lg" aria-hidden="true" style={{ color: "var(--blue)" }} />
        <span className="h5">Ask a question</span>
        <span className="small muted">Answers cite NASA sources.</span>
      </button>
    </div>
  );
}
