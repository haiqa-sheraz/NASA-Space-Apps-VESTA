"use client";

import { Info, MessageCircleQuestionMark, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { suggestionsFor } from "@/lib/ask/suggestions";
import { useScrollLock } from "@/lib/hooks/useDismiss";
import { MISSIONS } from "@/lib/missions";
import { useAsk } from "@/lib/state/ask";
import { usePrefs } from "@/lib/state/prefs";

/**
 * Ask AI panel: slides in from the right (420 px on desktop, full screen on phones).
 * Shows a context chip on study pages, suggested questions that fit the page,
 * and the footer line about sources. Live, streamed answers are wired in build step 5.
 */
export function AskPanel() {
  const { open, closeAsk, context, removeContext, turns, ask } = useAsk();
  const { mission } = usePrefs();
  const pathname = usePathname();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useScrollLock(open);

  // Focus moves to the input when the panel opens, and back to the opener when it closes.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    const opener = returnFocusRef.current;
    returnFocusRef.current = null;
    if (opener?.isConnected) opener.focus();
  }, [open]);

  // Keep the newest question in view.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [turns.length]);

  const subject = context ? context.label : "fire in space";
  const suggestions = suggestionsFor({
    pathname,
    context,
    missionInSentence: MISSIONS[mission].inSentence,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    ask(draft);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeAsk();
    }
  }

  return (
    <>
      <div className="scrim" data-open={open} aria-hidden="true" onClick={closeAsk} />
      <aside
        className="askpanel"
        role="dialog"
        aria-modal="true"
        aria-label="Ask AI"
        data-open={open}
        onKeyDown={onKeyDown}
      >
        <header>
          <div className="row g3" style={{ minWidth: 0 }}>
            <span className="h4">Ask</span>
            {context && (
              <span className="ctx">
                Asking about: {context.label}
                <button type="button" aria-label={`Remove context: ${context.label}`} onClick={removeContext}>
                  <X className="ic sm" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
          <button type="button" className="btn btn-icon" style={{ border: 0 }} aria-label="Close Ask panel" onClick={closeAsk}>
            <X className="ic" aria-hidden="true" />
          </button>
        </header>

        <div ref={bodyRef} className="body">
          {turns.length === 0 ? (
            <>
              <div className="stack g2">
                <p className="h4">What do you want to know about {subject}?</p>
                <p className="small muted">
                  Answers use only NASA PSI and NTRS sources, with a source under every paragraph.
                </p>
              </div>
              <div className="stack g2">
                {suggestions.map((question) => (
                  <button key={question} type="button" className="suggest" onClick={() => ask(question)}>
                    <MessageCircleQuestionMark className="ic sm" aria-hidden="true" />
                    {question}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <ol className="stack g4" aria-label="Questions">
              {turns.map((turn) => (
                <li key={turn.id} className="stack g3">
                  <p className="q">{turn.question}</p>
                  {/* Build step 1 only: replaced by streamed, sourced answers in step 5. */}
                  <div className="notice" role="status">
                    <Info className="ic sm" aria-hidden="true" style={{ marginTop: 3 }} />
                    <span>Live answers are not connected yet. They are added in build step 5.</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <footer>
          <form onSubmit={onSubmit}>
            <label className="input">
              <MessageCircleQuestionMark className="ic" aria-hidden="true" />
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Ask about ${subject}`}
                aria-label="Your question"
                maxLength={500}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ minHeight: 40 }}>
                <Send className="ic sm" aria-hidden="true" />
                Ask
              </button>
            </label>
          </form>
          <p className="small muted">Answers come from NASA data and reports. Check the sources.</p>
        </footer>
      </aside>
    </>
  );
}
