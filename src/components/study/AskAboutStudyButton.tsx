"use client";

import { MessageCircleQuestionMark } from "lucide-react";
import { useAsk } from "@/lib/state/ask";

/** "Ask about this study": opens the Ask panel with the study as its context. */
export function AskAboutStudyButton() {
  const { openAsk } = useAsk();
  return (
    <button type="button" className="btn btn-ghost" onClick={() => openAsk()}>
      <MessageCircleQuestionMark className="ic" aria-hidden="true" />
      Ask about this study
    </button>
  );
}
