"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Ask AI panel state (open or closed, what the current page is about, the conversation).
 * Kept in memory only: nothing typed into Ask is stored on the device.
 */
export interface AskContextInfo {
  kind: "study";
  id: string;
  /** Short name shown in the chip, e.g. "BASS-II". */
  label: string;
}

export interface AskTurn {
  id: number;
  question: string;
}

interface AskState {
  open: boolean;
  /** Context the current page registered, unless the visitor removed it. */
  context: AskContextInfo | null;
  turns: AskTurn[];
  openAsk: (options?: { question?: string }) => void;
  closeAsk: () => void;
  ask: (question: string) => void;
  removeContext: () => void;
  registerContext: (context: AskContextInfo | null) => void;
}

const AskStateContext = createContext<AskState | null>(null);

export function AskProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageContext, setPageContext] = useState<AskContextInfo | null>(null);
  const [contextRemoved, setContextRemoved] = useState(false);
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const nextId = useRef(1);

  const ask = useCallback((question: string) => {
    const text = question.trim();
    if (!text) return;
    setTurns((prev) => [...prev, { id: nextId.current++, question: text }]);
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
  const registerContext = useCallback((context: AskContextInfo | null) => {
    setPageContext(context);
    setContextRemoved(false);
  }, []);

  const value = useMemo<AskState>(
    () => ({
      open,
      context: contextRemoved ? null : pageContext,
      turns,
      openAsk,
      closeAsk,
      ask,
      removeContext,
      registerContext,
    }),
    [open, pageContext, contextRemoved, turns, openAsk, closeAsk, ask, removeContext, registerContext],
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
  const { kind, id, label } = context;
  useEffect(() => {
    registerContext({ kind, id, label });
    return () => registerContext(null);
  }, [registerContext, kind, id, label]);
  return null;
}
