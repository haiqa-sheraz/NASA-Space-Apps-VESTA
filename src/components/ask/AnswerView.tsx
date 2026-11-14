"use client";

import { CircleQuestionMark, ExternalLink, RotateCcw, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SourceChip } from "@/components/ui/SourceChip";
import { AiLabel } from "@/components/ui/Tags";
import { citedSources, splitAnswer } from "@/lib/ask/client";
import { modelName, type AskErrorCode, type AskSource } from "@/lib/ask/types";

/** An AI answer: paragraphs, each with chips for the sources it cites (approved Ask panel design). */
export function AnswerBody({ text, sources, streaming }: { text: string; sources: AskSource[]; streaming: boolean }) {
  const paragraphs = splitAnswer(text, sources.length, streaming);
  return (
    <div className="ans stack g4" aria-live="polite" aria-busy={streaming}>
      {paragraphs.map((p, i) => (
        <div key={i} className="stack g2">
          <p>
            {p.text}
            {streaming && i === paragraphs.length - 1 && <span className="cursor" aria-hidden="true" />}
          </p>
          {p.cites.length > 0 && (
            <div className="row g2 wrapx">
              {p.cites.map((n) => (
                <SourceChip key={n} source={sources[n - 1]} showPage />
              ))}
            </div>
          )}
        </div>
      ))}
      {streaming && paragraphs.length === 0 && (
        <p>
          <span className="cursor" aria-hidden="true" />
        </p>
      )}
    </div>
  );
}

/** Under a finished answer: the AI label, who wrote it, and the full list of sources it cites. */
export function AnswerFooter({ text, sources, model, saved, note }: { text: string; sources: AskSource[]; model: string | null; saved: boolean; note?: ReactNode }) {
  const list = citedSources(splitAnswer(text, sources.length), sources);
  return (
    <div className="stack g3 ans-foot">
      <div className="row g2 wrapx">
        <AiLabel />
        <span className="small muted">
          {saved ? `Saved answer${model ? `, written by ${modelName(model)}` : ""}` : model ? `Answered by ${modelName(model)}` : ""}
        </span>
        {note}
      </div>
      {list.length > 0 && (
        <div className="stack g2">
          <span className="small strong muted">Sources</span>
          <ol className="stack g2 ans-sources">
            {list.map((s) => (
              <li key={s.n} className="small">
                {s.url.startsWith("/") ? (
                  // Our own Data page (the PSI test tables): same tab, like the source chips.
                  <Link href={s.url}>{s.label}</Link>
                ) : (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                    {s.page ? `, p. ${s.page}` : ""}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                <span className="muted">: {s.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** "Not in our sources": no AI was asked, or the AI found no answer in the passages. */
export function NotInSources({ question }: { question: string }) {
  return (
    <div className="stack g4 notfound" role="status">
      <div className="row g3">
        <TriangleAlert className="ic" aria-hidden="true" style={{ color: "var(--caution)" }} />
        <p className="h4">Not in our sources</p>
      </div>
      <p className="body">That isn&apos;t in our NASA sources, so Vesta won&apos;t guess.</p>
      <div className="stack g2">
        <p className="h5">Where to look instead</p>
        <ul className="stack g2 small">
          <li className="row g2" style={{ alignItems: "flex-start" }}>
            <Search className="ic sm" aria-hidden="true" style={{ marginTop: 3 }} />
            <span>
              Search NASA&apos;s Technical Reports Server for newer reports:{" "}
              <a href={`https://ntrs.nasa.gov/search?q=${encodeURIComponent(question)}`} target="_blank" rel="noopener noreferrer">
                search NTRS
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </span>
          </li>
          <li className="row g2" style={{ alignItems: "flex-start" }}>
            <ExternalLink className="ic sm" aria-hidden="true" style={{ marginTop: 3 }} />
            <span>
              Browse experiment data at{" "}
              <a href="https://psi.nasa.gov/" target="_blank" rel="noopener noreferrer">
                NASA Physical Sciences Informatics
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </span>
          </li>
          <li className="row g2" style={{ alignItems: "flex-start" }}>
            <CircleQuestionMark className="ic sm" aria-hidden="true" style={{ marginTop: 3 }} />
            <span>See what we know and don&apos;t know in Gaps and gravity.</span>
          </li>
        </ul>
      </div>
      <Link className="btn btn-secondary btn-sm self-start" href="/insights?tab=gaps">
        See gaps and gravity
      </Link>
    </div>
  );
}

/** What went wrong and what to do next; `saved` says whether saved answers are offered below. */
function errorText(code: AskErrorCode, saved: boolean): string {
  switch (code) {
    case "limit":
      return `Vesta's AI has used all of today's free questions. ${saved ? "Saved answers still work, so try one below, or ask again tomorrow." : "Try again tomorrow."}`;
    case "busy":
      return `The AI didn't answer in time. Try again in a minute${saved ? ", or pick a saved answer below" : ""}.`;
    case "rate":
      return "That's a lot of questions in one minute. Wait a moment, then try again.";
    case "config":
      return `Ask AI isn't set up on this server yet.${saved ? " Saved answers still work below." : ""}`;
    case "bad_request":
      return "That question couldn't be sent. Keep it under 500 characters and try again.";
  }
}

/** An error, said plainly, with what to do next. */
export function AskError({ code, partial, saved = false, onRetry, children }: { code: AskErrorCode; partial: boolean; saved?: boolean; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div className="stack g3 notice-block" role="status">
      <p className="row g2 small" style={{ alignItems: "flex-start" }}>
        <TriangleAlert className="ic sm" aria-hidden="true" style={{ marginTop: 3, color: "var(--caution)", flex: "none" }} />
        <span>{partial && code === "busy" ? "The answer stopped before it finished. Try again in a minute." : errorText(code, saved)}</span>
      </p>
      {onRetry && code !== "limit" && code !== "bad_request" && (
        <button type="button" className="btn btn-secondary btn-sm self-start" onClick={onRetry}>
          <RotateCcw className="ic sm" aria-hidden="true" />
          Try again
        </button>
      )}
      {children}
    </div>
  );
}
