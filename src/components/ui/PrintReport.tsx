"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { NotePart } from "@/lib/mission-view";

/** The date and site address printed on a report, set in the browser (not on the server). */
export interface PrintStamp {
  date: string;
  site: string;
}

const makeStamp = (): PrintStamp => ({
  date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  site: window.location.origin,
});

/**
 * "Save as PDF": `print()` refreshes the date, lets the report render, then opens the browser's
 * print dialog, where Save as PDF is one of the choices. Printing with the browser's own menu
 * gives the same report.
 */
export function usePrintReport() {
  const [stamp, setStamp] = useState<PrintStamp | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => setStamp(makeStamp()), []);
  useEffect(() => {
    if (!pending) return;
    const frame = requestAnimationFrame(() => {
      setPending(false);
      window.print();
    });
    return () => cancelAnimationFrame(frame);
  }, [pending]);
  const print = useCallback(() => {
    setStamp(makeStamp());
    setPending(true);
  }, []);
  return { stamp, print };
}

/** A web address printed in full, so it can be read on paper (and still clicked in a PDF). */
export function PrintLink({ url }: { url: string }) {
  return <a href={url}>{url}</a>;
}

/** A sentence with citations, each citation followed by its full web address. */
export function PrintNote({ parts }: { parts: NotePart[] }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <span key={i}>
            {part.label}
            {part.url && (
              <>
                {" ("}
                <PrintLink url={part.url} />
                {")"}
              </>
            )}
          </span>
        ),
      )}
    </>
  );
}

/**
 * The printed version of a page (Planner ranking, Compare): hidden on screen; in print it is the
 * only thing on the page, light with dark text whatever the theme, with no top bar, footer,
 * controls, Ask panel or motion. It must be a direct child of <main> (see the print styles).
 */
export function PrintReport({ title, stamp, footer, children }: { title: string; stamp: PrintStamp | null; footer: string; children: ReactNode }) {
  return (
    <article className="print-report">
      <header className="prt-head">
        <h1 className="prt-title">{title}</h1>
        {stamp && <p className="prt-meta">{stamp.date}</p>}
      </header>
      {children}
      <footer className="prt-foot">
        {footer}
        {stamp && (
          <>
            {" "}
            <PrintLink url={stamp.site} />
          </>
        )}
      </footer>
    </article>
  );
}
