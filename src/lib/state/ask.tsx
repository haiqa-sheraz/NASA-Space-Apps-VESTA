"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadSavedAnswers, splitAnswer, streamApi } from "@/lib/ask/client";
import { isFollowUp, questionKey } from "@/lib/ask/text";
import type { AskErrorCode, AskSource } from "@/lib/ask/types";

/**
 * Ask AI panel state: open or closed, what the current page is about, and the conversation.
 * Kept in memory only: nothing typed into Ask is stored on the device.
 */
export interface AskContextInfo {
  kind: "study";
  id: string;
  /** Short name shown in the chip, e.g. "BASS-II". */
  label: string;
  /** Ground studies have no reports in our sources. */
  ground?: boolean;
}

export type TurnStatus = "loading" | "streaming" | "done" | "notfound" | "error" | "stopped";

export interface AskTurn {
  id: number;
  question: string;
  status: TurnStatus;
  /** Answer text with [n] citations. */
  text: string;
  sources: AskSource[];
  model: string | null;
  /** True when the answer came from data/saved_answers.json (no AI call). */
  saved: boolean;
  error?: AskErrorCode;
}

interface AskState {
  open: boolean;
  /** Context the current page registered, unless the visitor removed it. */
  context: AskContextInfo | null;
  turns: AskTurn[];
  openAsk: (options?: { question?: string }) => void;
  closeAsk: () => void;
  ask: (question: string) => void;
  stop: (id: number) => void;
  /** Starts a new conversation: clears the turns, so follow-ups no longer refer to them. */
  clear: () => void;
  removeContext: () => void;
  registerContext: (context: AskContextInfo | null) => void;
}

/** Answers already given in this visit, so asking again doesn't use the AI quota. In memory only. */
const answered = new Map<string, Pick<AskTurn, "status" | "text" | "sources" | "model">>();

/** Follow-ups send the last two finished answers, as plain text, so the AI knows what "that" means. */
const HISTORY_TURNS = 2;
const HISTORY_ANSWER_CHARS = 800;
interface HistoryTurn {
  question: string;
  answer: string;
}
function historyFrom(turns: AskTurn[]): HistoryTurn[] {
  const done = turns.filter((t) => t.status === "done" && t.text);
  // A question asked twice counts once (its latest answer).
  return done
    .filter((t, i) => !done.slice(i + 1).some((later) => questionKey(later.question) === questionKey(t.question)))
    .slice(-HISTORY_TURNS)
    .map((t) => ({
      question: t.question,
      answer: splitAnswer(t.text, t.sources.length)
        .map((p) => p.text)
        .join("\n")
        .slice(0, HISTORY_ANSWER_CHARS),
    }));
}

const AskStateContext = createContext<AskState | null>(null);

export function AskProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageContext, setPageContext] = useState<AskContextInfo | null>(null);
  const [contextRemoved, setContextRemoved] = useState(false);
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const turnsRef = useRef(turns);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);
  const nextId = useRef(1);
  const controllers = useRef(new Map<number, AbortController>());
  const context = contextRemoved ? null : pageContext;
  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const update = useCallback((id: number, patch: Partial<AskTurn> | ((turn: AskTurn) => Partial<AskTurn>)) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));
  }, []);

  const run = useCallback(
    async (id: number, question: string, studyId: string | null, history: HistoryTurn[]) => {
      const key = questionKey(question);

      const saved = (await loadSavedAnswers()).get(key);
      if (saved) {
        update(id, saved.notFound ? { status: "notfound", saved: true } : { status: "done", text: saved.answer ?? "", sources: saved.sources, model: saved.model, saved: true });
        return;
      }
      // A follow-up's words mean something else after a different question, so that is part of its key.
      const before = isFollowUp(question, false) ? history.at(-1) : undefined;
      const cacheKey = `${key}|${studyId ?? ""}|${before ? questionKey(before.question) : ""}`;
      const earlier = answered.get(cacheKey);
      if (earlier) {
        update(id, earlier);
        return;
      }

      const controller = new AbortController();
      controllers.current.set(id, controller);
      let text = "";
      let sources: AskSource[] = [];
      try {
        await streamApi(
          "/api/ask",
          history.length ? { question, studyId, history } : { question, studyId },
          (event) => {
            switch (event.type) {
              case "sources":
                sources = event.sources;
                update(id, { sources });
                break;
              case "delta":
                text += event.text;
                update(id, { status: "streaming", text });
                break;
              case "notfound":
                answered.set(cacheKey, { status: "notfound", text: "", sources: [], model: null });
                update(id, { status: "notfound" });
                break;
              case "done":
                answered.set(cacheKey, { status: "done", text, sources, model: event.model });
                update(id, { status: "done", model: event.model });
                break;
              case "error":
                update(id, { status: "error", error: event.code });
                break;
            }
          },
          controller.signal,
        );
      } catch {
        // Stopped by the visitor.
        update(id, (t) => (t.status === "loading" || t.status === "streaming" ? { status: "stopped" } : {}));
      } finally {
        controllers.current.delete(id);
      }
    },
    [update],
  );

  const ask = useCallback(
    (question: string) => {
      const text = question.replace(/\s+/g, " ").trim().slice(0, 500);
      if (!text) return;
      const id = nextId.current++;
      const history = historyFrom(turnsRef.current);
      setTurns((prev) => [...prev, { id, question: text, status: "loading", text: "", sources: [], model: null, saved: false }]);
      void run(id, text, contextRef.current?.ground ? null : (contextRef.current?.id ?? null), history);
    },
    [run],
  );

  const stop = useCallback((id: number) => controllers.current.get(id)?.abort(), []);

  const clear = useCallback(() => {
    for (const controller of controllers.current.values()) controller.abort();
    controllers.current.clear();
    turnsRef.current = [];
    setTurns([]);
  }, []);

  const openAsk = useCallback(
    (options?: { question?: string }) => {
      setOpen(true);
      if (options?.question) ask(options.question);
    },
    [ask],
  );

  const closeAsk = useCallback(() => setOpen(false), []);
  const removeContext = useCallback(() => setContextRemoved(true), []);
  const registerContext = useCallback((next: AskContextInfo | null) => {
    setPageContext(next);
    setContextRemoved(false);
  }, []);

  const value = useMemo<AskState>(
    () => ({ open, context, turns, openAsk, closeAsk, ask, stop, clear, removeContext, registerContext }),
    [open, context, turns, openAsk, closeAsk, ask, stop, clear, removeContext, registerContext],
  );

  return <AskStateContext.Provider value={value}>{children}</AskStateContext.Provider>;
}

export function useAsk(): AskState {
  const value = useContext(AskStateContext);
  if (!value) throw new Error("useAsk must be used inside <AskProvider>.");
  return value;
}

/** Lets a page tell the Ask panel what it is about, e.g. the study on a study page. */
export function AskContextSetter({ context }: { context: AskContextInfo }) {
  const { registerContext } = useAsk();
  const { kind, id, label, ground } = context;
  useEffect(() => {
    registerContext({ kind, id, label, ground });
    return () => registerContext(null);
  }, [registerContext, kind, id, label, ground]);
  return null;
}
