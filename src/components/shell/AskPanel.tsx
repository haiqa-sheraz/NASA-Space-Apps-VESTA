"use client";

import { LoaderCircle, MessageCircleQuestionMark, Send, Square, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnswerBody, AnswerFooter, AskError, NotInSources } from "@/components/ask/AnswerView";
import { AiLabel } from "@/components/ui/Tags";
import { loadSavedAnswers } from "@/lib/ask/client";
import { suggestionsFor } from "@/lib/ask/suggestions";
import { questionKey } from "@/lib/ask/text";
import { useScrollLock } from "@/lib/hooks/useDismiss";
import { useAsk, type AskTurn } from "@/lib/state/ask";

/**
 * Ask AI panel: slides in from the right (420 px on desktop, full screen on phones).
 * Shows a context chip on study pages and suggested questions that fit the page. Suggested
 * questions with a saved answer show it at once; other questions stream a live answer that cites
 * our NASA sources. Every answer is labeled AI-written.
 */
export function AskPanel() {
  const { open, closeAsk, context, removeContext, turns, ask, stop } = useAsk();
  const pathname = usePathname();
  const [draft, setDraft] = useState("");
  const [savedQuestions, setSavedQuestions] = useState<string[]>([]);
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

  // Saved answers load once the panel is first opened.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void loadSavedAnswers().then((map) => alive && setSavedQuestions([...map.values()].filter((a) => !a.notFound).map((a) => a.question)));
    return () => {
      alive = false;
    };
  }, [open]);

  // Keep the newest question in view.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [turns.length]);

  const subject = context ? context.label : "fire in space";
  const suggestions = suggestionsFor({ pathname, context });
  const savedKeys = new Set(savedQuestions.map(questionKey));
  // When the AI can't answer, offer saved answers: this page's first, then others.
  const fallback = [...new Set([...suggestions.filter((q) => savedKeys.has(questionKey(q))), ...savedQuestions])].slice(0, 4);

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
      <aside className="askpanel" role="dialog" aria-modal="true" aria-label="Ask AI" data-open={open} onKeyDown={onKeyDown}>
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
                <p className="small muted">Answers use only NASA PSI and NTRS sources, with the sources under every paragraph.</p>
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
            <ol className="stack g5" aria-label="Questions and answers">
              {turns.map((turn) => (
                <li key={turn.id} className="stack g3">
                  <p className="q">{turn.question}</p>
                  <Turn turn={turn} onStop={() => stop(turn.id)} onAsk={ask} fallback={fallback.filter((q) => questionKey(q) !== questionKey(turn.question))} />
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
              <button type="submit" className="btn btn-primary btn-sm" style={{ minHeight: 40 }} aria-label="Send question">
                <Send className="ic sm" aria-hidden="true" />
                Ask
              </button>
            </label>
          </form>
          <p className="small muted">Answers come from NASA data and reports. Check the sources. Please don&apos;t type personal details.</p>
        </footer>
      </aside>
    </>
  );
}

function Turn({ turn, onStop, onAsk, fallback }: { turn: AskTurn; onStop: () => void; onAsk: (q: string) => void; fallback: string[] }) {
  const streaming = turn.status === "streaming";
  return (
    <>
      {turn.status === "loading" && (
        <p className="row g2 small muted" role="status">
          <LoaderCircle className="ic sm spin" aria-hidden="true" />
          Searching NASA sources
        </p>
      )}
      {turn.text && (turn.status === "streaming" || turn.status === "done" || turn.status === "stopped" || turn.status === "error") && (
        <AnswerBody text={turn.text} sources={turn.sources} streaming={streaming} />
      )}
      {streaming && (
        <div className="row g2 wrapx">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onStop}>
            <Square className="ic sm" aria-hidden="true" />
            Stop
          </button>
          <AiLabel />
          <span className="small muted">Writing the answer</span>
        </div>
      )}
      {turn.status === "done" && <AnswerFooter text={turn.text} sources={turn.sources} model={turn.model} saved={turn.saved} />}
      {turn.status === "stopped" && (
        <>
          {turn.text && <AnswerFooter text={turn.text} sources={turn.sources} model={null} saved={false} note={<span className="small muted">Stopped before the end.</span>} />}
          {!turn.text && <p className="small muted">Stopped.</p>}
        </>
      )}
      {turn.status === "notfound" && <NotInSources question={turn.question} />}
      {/* Text cut off by an error is still AI-written, with its sources. */}
      {turn.status === "error" && turn.text && <AnswerFooter text={turn.text} sources={turn.sources} model={null} saved={false} />}
      {turn.status === "error" && turn.error && (
        <AskError code={turn.error} partial={Boolean(turn.text)} saved={fallback.length > 0} onRetry={() => onAsk(turn.question)}>
          {fallback.length > 0 && (
            <div className="stack g2">
              <span className="small strong muted">Saved answers</span>
              {fallback.map((q) => (
                <button key={q} type="button" className="suggest" onClick={() => onAsk(q)}>
                  <MessageCircleQuestionMark className="ic sm" aria-hidden="true" />
                  {q}
                </button>
              ))}
            </div>
          )}
        </AskError>
      )}
    </>
  );
}
