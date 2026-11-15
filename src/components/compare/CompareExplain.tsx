"use client";

import { LoaderCircle, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnswerBody, AnswerFooter, AskError } from "@/components/ask/AnswerView";
import { AiLabel } from "@/components/ui/Tags";
import { streamApi } from "@/lib/ask/client";
import type { AskErrorCode, AskSource } from "@/lib/ask/types";
import { joinAnd } from "@/lib/format";

type Status = "idle" | "loading" | "streaming" | "done" | "notfound" | "error" | "stopped";

interface Explanation {
  status: Status;
  text: string;
  sources: AskSource[];
  model: string | null;
  error?: AskErrorCode;
}

const IDLE: Explanation = { status: "idle", text: "", sources: [], model: null };
/** Explanations already written in this visit, so asking again doesn't use the AI quota. */
const written = new Map<string, Explanation>();

/** The finished explanation for these studies, if one was written in this visit (for the printout). */
export function writtenExplanation(ids: string[]): { text: string; sources: AskSource[] } | null {
  const done = written.get(ids.join(","));
  return done && done.status === "done" && done.text ? { text: done.text, sources: done.sources } : null;
}

/**
 * Compare: an AI explanation of what the chosen studies share, how they differ and what it means
 * for safety, citing their PSI records and reports. It runs only when asked, to save the free quota.
 */
export function CompareExplain({ ids, names }: { ids: string[]; names: string[] }) {
  const key = ids.join(",");
  const [state, setState] = useState<Explanation>(() => written.get(key) ?? IDLE);
  const controller = useRef<AbortController | null>(null);

  // A new set of studies starts fresh (or shows the explanation already written for it).
  useEffect(() => {
    controller.current?.abort();
    controller.current = null;
    setState(written.get(key) ?? IDLE);
  }, [key]);
  useEffect(() => () => controller.current?.abort(), []);

  async function explain() {
    const c = new AbortController();
    controller.current = c;
    let text = "";
    let sources: AskSource[] = [];
    setState({ ...IDLE, status: "loading" });
    try {
      await streamApi(
        "/api/compare",
        { ids },
        (event) => {
          if (c.signal.aborted) return;
          switch (event.type) {
            case "sources":
              sources = event.sources;
              setState((s) => ({ ...s, sources }));
              break;
            case "delta":
              text += event.text;
              setState((s) => ({ ...s, status: "streaming", text }));
              break;
            case "notfound":
              setState((s) => ({ ...s, status: "notfound" }));
              break;
            case "done": {
              const done: Explanation = { status: "done", text, sources, model: event.model };
              written.set(key, done);
              setState(done);
              break;
            }
            case "error":
              setState((s) => ({ ...s, status: "error", error: event.code }));
              break;
          }
        },
        c.signal,
      );
    } catch {
      setState((s) => (s.status === "loading" || s.status === "streaming" ? { ...s, status: "stopped" } : s));
    } finally {
      if (controller.current === c) controller.current = null;
    }
  }

  const ready = ids.length >= 2;
  return (
    <section className="stack g4" aria-labelledby="explain-title">
      <div className="stack g1">
        <span className="label">AI explanation</span>
        <h2 id="explain-title" className="h2">
          What the comparison means
        </h2>
      </div>
      <div className="panel pad stack g4">
        {state.status === "idle" && (
          <>
            <p className="body muted">
              {ready
                ? `What ${joinAnd(names)} have in common, how they differ, and what it means for fire safety. Written by AI from their PSI records and reports.`
                : "Add a second study to get an explanation of what they share, how they differ, and what it means for fire safety."}
            </p>
            <button type="button" className="btn btn-primary self-start" disabled={!ready} onClick={() => void explain()}>
              <Sparkles className="ic sm" aria-hidden="true" />
              Explain the differences
            </button>
          </>
        )}
        {state.status === "loading" && (
          <p className="row g2 small muted" role="status">
            <LoaderCircle className="ic sm spin" aria-hidden="true" />
            Reading the records and reports
          </p>
        )}
        {/* Not shown for "not in sources": text before that reply isn't an answer. */}
        {state.text && state.status !== "idle" && state.status !== "loading" && state.status !== "notfound" && (
          <AnswerBody text={state.text} sources={state.sources} streaming={state.status === "streaming"} />
        )}
        {state.status === "streaming" && (
          <div className="row g2 wrapx">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => controller.current?.abort()}>
              <Square className="ic sm" aria-hidden="true" />
              Stop
            </button>
            <AiLabel />
            <span className="small muted">Writing the explanation</span>
          </div>
        )}
        {state.status === "done" && <AnswerFooter text={state.text} sources={state.sources} model={state.model} saved={false} />}
        {/* Text that was stopped or cut off is still AI-written, with its sources. */}
        {(state.status === "stopped" || state.status === "error") && state.text && <AnswerFooter text={state.text} sources={state.sources} model={null} saved={false} />}
        {state.status === "stopped" && (
          <div className="row g3 wrapx">
            <span className="small muted">Stopped{state.text ? " before the end" : ""}.</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void explain()}>
              Explain again
            </button>
          </div>
        )}
        {state.status === "notfound" && (
          <p className="notice" role="status">
            <span>The sources for these studies don&apos;t support a comparison. The table above has their facts side by side.</span>
          </p>
        )}
        {state.status === "error" && state.error && (
          <AskError code={state.error} partial={Boolean(state.text)} onRetry={() => void explain()}>
            <span className="small muted">The table and charts above still show every fact side by side.</span>
          </AskError>
        )}
      </div>
    </section>
  );
}
