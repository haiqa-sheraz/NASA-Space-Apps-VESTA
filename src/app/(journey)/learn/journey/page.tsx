import { Flame, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Journey" };

/**
 * Journey: a guided story, one chapter per screen, with its own full-screen frame
 * (no top bar or footer, as in the approved design). It stays dark in light mode.
 * Step 1 shows the frame and chapter 1's heading; the 10 chapters are built in step 4.
 */
export default function JourneyPage() {
  return (
    <div data-theme="dark" className="relative min-h-dvh overflow-hidden" style={{ background: "#0E0604", color: "var(--text)" }}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 42%,rgba(46,84,201,.30),transparent 70%),radial-gradient(30% 30% at 50% 44%,rgba(91,141,255,.18),transparent 70%),#0E0604",
        }}
      />
      <div className="relative flex min-h-dvh flex-col px-4 pt-5 pb-4 tablet:px-8">
        <div className="row between">
          <Link className="btn btn-ghost" href="/learn" style={{ color: "#DCCFC7", padding: "0 8px" }}>
            <X className="ic" aria-hidden="true" />
            Exit journey
          </Link>
          <span className="small" style={{ color: "#DCCFC7" }}>
            Chapter 1 of 10
          </span>
        </div>
        <main
          id="main"
          className="stack g3 mx-auto flex-1 justify-center text-center"
          style={{ alignItems: "center", maxWidth: 760 }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 56, height: 56, border: "2px solid var(--blue)", color: "var(--blue)", boxShadow: "0 0 0 6px rgba(91,141,255,.10)" }}
          >
            <Flame className="ic lg" aria-hidden="true" />
          </span>
          <span className="small strong muted">Chapter 1</span>
          <h1 className="h1 text-center">Fire without “up”</h1>
          <p className="body text-center" style={{ color: "#DCCFC7", fontSize: 19 }}>
            Fire has hurt crews before: Apollo 1 in 1967 and Mir in 1997. On Earth, hot air rises and pulls fresh air in
            from below, so flames stand tall. In orbit, hot air doesn&apos;t rise. Oxygen drifts in from all sides, and the
            flame turns round, dim and blue.
          </p>
        </main>
      </div>
    </div>
  );
}
