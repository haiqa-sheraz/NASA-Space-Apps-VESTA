import { FileText } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SourceRef } from "@/lib/sources";

/** A source chip: links to the PSI page, NTRS record or other source. Unlinked when we have no link. */
export function SourceChip({ source, showPage = false }: { source: SourceRef; showPage?: boolean }) {
  const content = (
    <>
      <FileText className="ic sm" aria-hidden="true" />
      <span>
        {source.label}
        {showPage && source.page ? <span className="pg">, p. {source.page}</span> : null}
      </span>
    </>
  );
  const title = source.title && source.title !== source.label ? source.title : undefined;

  if (!source.url) {
    return (
      <span className="chip src nolink" title={title}>
        {content}
      </span>
    );
  }
  if (source.url.startsWith("/")) {
    return (
      <Link className="chip src" href={source.url} title={title}>
        {content}
      </Link>
    );
  }
  return (
    <a className="chip src" href={source.url} title={title} target="_blank" rel="noopener noreferrer">
      {content}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** "Source:" followed by chips, as under every finding. */
export function SourceLine({ sources, showPage = false, children }: { sources: SourceRef[]; showPage?: boolean; children?: ReactNode }) {
  if (!sources.length && !children) return null;
  return (
    <div className="srcline">
      {children}
      {sources.length > 0 && <span>{sources.length > 1 ? "Sources:" : "Source:"}</span>}
      {sources.map((s) => (
        <SourceChip key={`${s.label}-${s.page ?? ""}`} source={s} showPage={showPage} />
      ))}
    </div>
  );
}
