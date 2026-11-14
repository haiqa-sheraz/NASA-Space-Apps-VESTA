"use client";

import { Search, SearchX } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { AiLabel } from "@/components/ui/Tags";
import type { GlossaryTerm, StudyGlossaryTerm } from "@/lib/data/glossary";

function matches(t: GlossaryTerm, q: string) {
  return `${t.term} ${t.definition}`.toLowerCase().includes(q);
}

/** Learn glossary: the core terms, then terms from the study reports, with one search box for both. */
export function Glossary({ core, fromStudies }: { core: GlossaryTerm[]; fromStudies: StudyGlossaryTerm[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shownCore = useMemo(() => (q ? core.filter((t) => matches(t, q)) : core), [core, q]);
  const shownStudy = useMemo(
    () => (q ? fromStudies.filter((t) => matches(t, q) || t.studies.some((s) => s.shortName.toLowerCase().includes(q))) : fromStudies),
    [fromStudies, q],
  );
  const total = shownCore.length + shownStudy.length;

  return (
    <div className="stack g6">
      <div className="row between wrapx g3">
        <div className="stack g1">
          <span className="label">Glossary</span>
          <h2 className="h2">Words you&apos;ll meet</h2>
        </div>
        <label className="input glossary-search">
          <Search className="ic" aria-hidden="true" />
          <input type="search" placeholder="Search the glossary" aria-label="Search the glossary" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      <p className="sr-only" aria-live="polite">
        {q ? `${total} ${total === 1 ? "term matches" : "terms match"}.` : ""}
      </p>

      {total === 0 ? (
        <div className="empty">
          <span className="gap-ic" style={{ color: "var(--text-2)", borderColor: "var(--rule-input)" }}>
            <SearchX className="ic" aria-hidden="true" />
          </span>
          <p className="body">No terms match “{query.trim()}”. Try a shorter word.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setQuery("")}>
            Clear search
          </button>
        </div>
      ) : (
        <>
          {shownCore.length > 0 && (
            <dl className="glossary">
              {shownCore.map((t) => (
                <div key={t.term}>
                  <dt className="h5">{t.term}</dt>
                  <dd className="body muted">{t.definition}</dd>
                </div>
              ))}
            </dl>
          )}
          {shownStudy.length > 0 && (
            <section className="stack g3" aria-labelledby="glossary-studies">
              <div className="stack g2">
                <h3 id="glossary-studies" className="h4">
                  More terms from the study reports
                </h3>
                <p className="row g2 wrapx small muted">
                  <AiLabel />
                  <span>Written by AI from each study&apos;s reports. Each term links to the studies that use it.</span>
                </p>
              </div>
              <dl className="glossary">
                {shownStudy.map((t) => (
                  <div key={t.term}>
                    <dt className="h5">{t.term}</dt>
                    <dd className="stack g1">
                      <span className="body muted">{t.definition}</span>
                      <span className="small muted">
                        From{" "}
                        {t.studies.map((s, i) => (
                          <Fragment key={s.id}>
                            {i > 0 && (i === t.studies.length - 1 ? " and " : ", ")}
                            <Link href={`/study/${s.id}`}>{s.shortName}</Link>
                          </Fragment>
                        ))}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </>
      )}
    </div>
  );
}
