"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReadingLevelSwitch } from "@/components/shell/ReadingLevelSwitch";
import { SourceLine } from "@/components/ui/SourceChip";
import { AiLabel, JobTag } from "@/components/ui/Tags";
import type { JobId } from "@/lib/jobs";
import type { SourceRef } from "@/lib/sources";
import { usePrefs } from "@/lib/state/prefs";

export interface FindingItem {
  id: string;
  simple: string;
  /** AI-written expert version; null if the prep produced none. */
  expert: string | null;
  job: JobId | null;
  /** True for findings computed by us across studies ("Our analysis"). */
  ourAnalysis: boolean;
  sources: SourceRef[];
  href: string;
  actionLabel: string;
}

/** Home headline findings: simple or expert wording, a source line under each, and a link. */
export function HeadlineFindings({ items }: { items: FindingItem[] }) {
  const { readingLevel } = usePrefs();
  const expert = readingLevel === "expert";
  const [showAll, setShowAll] = useState(false);

  return (
    <section className="sec">
      <div className="wrap stack g4">
        <div className="row between wrapx g3">
          <div className="stack g1">
            <span className="label">Headline findings</span>
            <h2 className="h2">What NASA&apos;s fire tests found</h2>
          </div>
          <div className="stack g2 findings-level">
            <ReadingLevelSwitch label="Findings reading level" />
            <span className="small muted">{expert ? "Expert wording, AI-written from the sources." : "Plain language. Expert gives the technical version."}</span>
          </div>
        </div>
        <ol>
          {items.map((item, i) => {
            const useExpert = expert && item.expert;
            return (
              <li key={item.id} className={`finding finding-row${i >= 3 && !showAll ? " max-tablet:hidden" : ""}`}>
                <span className="bignum muted" style={{ fontSize: 27, paddingTop: 2 }} aria-hidden="true">
                  {i + 1}
                </span>
                <div className="stack g3">
                  <p className="claim">{useExpert ? item.expert : item.simple}</p>
                  <SourceLine sources={item.sources}>
                    {item.ourAnalysis ? (
                      <span className="badge caution">
                        <TriangleAlert className="ic sm" aria-hidden="true" />
                        Our analysis
                      </span>
                    ) : (
                      item.job && <JobTag job={item.job} />
                    )}
                    {useExpert && <AiLabel />}
                  </SourceLine>
                </div>
                <Link className="btn btn-ghost btn-sm finding-action" href={item.href}>
                  {item.actionLabel}
                </Link>
              </li>
            );
          })}
        </ol>
        {items.length > 3 && !showAll && (
          <button type="button" className="btn btn-secondary self-start tablet:hidden" onClick={() => setShowAll(true)}>
            See all {items.length} findings
          </button>
        )}
      </div>
    </section>
  );
}
