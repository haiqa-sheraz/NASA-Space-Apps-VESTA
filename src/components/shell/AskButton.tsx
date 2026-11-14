"use client";

import { MessageCircleQuestionMark } from "lucide-react";
import { useAsk } from "@/lib/state/ask";

/** "Ask" in the top bar. On phones it becomes an icon-only button. */
export function AskButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const { openAsk } = useAsk();
  if (iconOnly) {
    return (
      <button type="button" className="btn btn-icon ask-btn" aria-label="Ask" onClick={() => openAsk()}>
        <MessageCircleQuestionMark className="ic" aria-hidden="true" />
      </button>
    );
  }
  return (
    <button type="button" className="btn btn-sm ask-btn" style={{ minHeight: 44 }} onClick={() => openAsk()}>
      <MessageCircleQuestionMark className="ic" aria-hidden="true" />
      Ask
    </button>
  );
}
