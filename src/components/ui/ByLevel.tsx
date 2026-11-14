"use client";

import type { ReactNode } from "react";
import { usePrefs } from "@/lib/state/prefs";

/** Shows the simple or the expert version, following the global Simple / Expert switch. */
export function ByLevel({ simple, expert }: { simple: ReactNode; expert: ReactNode }) {
  const { readingLevel } = usePrefs();
  return <>{readingLevel === "expert" ? expert : simple}</>;
}

/** Shows its children only in Expert mode. */
export function ExpertOnly({ children }: { children: ReactNode }) {
  const { readingLevel } = usePrefs();
  return readingLevel === "expert" ? <>{children}</> : null;
}
