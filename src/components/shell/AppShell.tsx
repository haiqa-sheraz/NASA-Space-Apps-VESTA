"use client";

import { MessageCircleQuestionMark } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { AskProvider, useAsk } from "@/lib/state/ask";
import { ToastProvider } from "@/lib/state/toast";
import { AskPanel } from "./AskPanel";

/**
 * Client wrapper around every page: holds the Ask panel and the floating Ask button.
 * While the panel is open, the page behind it is inert (not focusable, hidden from screen readers).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AskProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </AskProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { open, openAsk } = useAsk();

  // Deep link: any page with ?ask=open starts with the panel open.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("ask") === "open") openAsk();
  }, [openAsk]);

  return (
    <>
      <div id="page-root" inert={open}>
        {children}
      </div>
      <AskPanel />
      {/* Hidden, not removed, while the panel is open, so focus can return to it on close. */}
      <button type="button" className="fab" aria-label="Ask about fire in space" hidden={open} onClick={() => openAsk()}>
        <MessageCircleQuestionMark className="ic lg" aria-hidden="true" />
      </button>
    </>
  );
}
