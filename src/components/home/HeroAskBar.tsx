"use client";

import { MessageCircleQuestionMark } from "lucide-react";
import { useState } from "react";
import { useAsk } from "@/lib/state/ask";

/** Home Ask bar: opens the Ask panel with the typed question. */
export function HeroAskBar() {
  const { openAsk } = useAsk();
  const [question, setQuestion] = useState("");
  return (
    <form
      style={{ maxWidth: 600 }}
      onSubmit={(event) => {
        event.preventDefault();
        openAsk(question.trim() ? { question } : undefined);
        setQuestion("");
      }}
    >
      <label className="input askbar">
        <MessageCircleQuestionMark className="ic" aria-hidden="true" />
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask anything about fire in space"
          aria-label="Ask anything about fire in space"
          maxLength={500}
        />
        <button type="submit" className="btn btn-primary btn-sm" style={{ minHeight: 44 }}>
          Ask
        </button>
      </label>
    </form>
  );
}
