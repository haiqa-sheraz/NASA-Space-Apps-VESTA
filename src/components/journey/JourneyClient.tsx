"use client";

import {
  ChevronLeft,
  CircleQuestionMark,
  Cloud,
  Compass,
  FireExtinguisher,
  Flame,
  Gauge,
  Moon,
  Ruler,
  Thermometer,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
import { AirflowExplainer } from "@/components/explainers/AirflowExplainer";
import { GasChoice } from "@/components/explainers/GasChoice";
import { GravityExplorer } from "@/components/explainers/GravityExplorer";
import { GravityPair } from "@/components/explainers/GravityPair";
import { HiddenFlame } from "@/components/explainers/HiddenFlame";
import { MissionAir } from "@/components/explainers/MissionAir";
import { OxygenExplainer } from "@/components/explainers/OxygenExplainer";
import { SaffireSizes } from "@/components/explainers/SaffireSizes";
import { SmokeRace } from "@/components/explainers/SmokeRace";
import { PageReveal } from "@/components/ui/PageReveal";
import { SourceLine } from "@/components/ui/SourceChip";
import type { Chapter, ChapterIcon, ChapterInteractive } from "@/lib/data/journey";
import { DUR, prefersReducedMotion } from "@/lib/motion";
import { useAsk } from "@/lib/state/ask";
import { replaceQuery } from "@/lib/url";
import { JourneyPaths } from "./JourneyPaths";

const ICONS: Record<ChapterIcon, LucideIcon> = {
  flame: Flame,
  wind: Wind,
  gauge: Gauge,
  ruler: Ruler,
  cloud: Cloud,
  extinguisher: FireExtinguisher,
  thermometer: Thermometer,
  moon: Moon,
  question: CircleQuestionMark,
  compass: Compass,
};

function Interactive({ item }: { item: ChapterInteractive }) {
  switch (item.kind) {
    case "gravity":
      return <GravityPair />;
    case "airflow":
      return <AirflowExplainer data={item.data} />;
    case "oxygen":
      return <OxygenExplainer data={item.data} />;
    case "saffire":
      return <SaffireSizes flights={item.flights} />;
    case "smoke-race":
      return <SmokeRace />;
    case "gases":
      return <GasChoice data={item.data} />;
    case "hidden-flame":
      return <HiddenFlame />;
    case "missions":
      return <MissionAir data={item.data} />;
    case "gravity-scale":
      return <GravityExplorer data={item.data} />;
    case "paths":
      return <JourneyPaths studyCount={item.studyCount} />;
  }
}

/** Controls that use the arrow keys themselves, so arrows there don't change the chapter. */
const ARROW_TARGETS = "input, textarea, select, [contenteditable='true'], [role='slider'], [role='radio'], [role='tab'], [role='listbox'], [role='combobox'], [role='menu']";

const XFADE_EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";

/**
 * The Journey: one chapter per screen (?c=1 to 10). Back and Next chapter, the progress ticks,
 * the Left and Right arrow keys and a swipe all change chapter; Escape exits. Focus moves to the
 * new chapter's title. Opening the Journey and every chapter change play the blue flame bloom
 * (PageReveal). Under it, chapters crossfade in 300 ms (design board 14): a still copy of the old
 * chapter fades out while the new one fades in, and the background crossfades at the same time.
 * With reduced motion the change is instant.
 */
export function JourneyClient({ chapters }: { chapters: Chapter[] }) {
  const router = useRouter();
  const { open: askOpen } = useAsk();
  const [index, setIndex] = useState(0);
  const [urlLoaded, setUrlLoaded] = useState(false);
  /** The background under the new one while it fades in. */
  const [previousBg, setPreviousBg] = useState<number | null>(null);
  /** Counts chapter changes; each one remounts the bloom so it plays again. */
  const [blooms, setBlooms] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  /** The old chapter, copied just before the change, to fade out on top of the new one. */
  const leaving = useRef<HTMLElement | null>(null);
  const userMoved = useRef(false);
  const touch = useRef<{ x: number; y: number; ignore: boolean } | null>(null);
  const last = chapters.length - 1;
  const chapter = chapters[index];
  const Icon = ICONS[chapter.icon];

  // Read ?c= before the first paint, so a deep link doesn't flash chapter 1.
  useLayoutEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("c"));
    if (Number.isInteger(n) && n >= 1 && n <= chapters.length) setIndex(n - 1);
    setUrlLoaded(true);
  }, [chapters.length]);

  useEffect(() => {
    if (!urlLoaded) return;
    const params = new URLSearchParams(window.location.search);
    if (index > 0) params.set("c", String(index + 1));
    else params.delete("c");
    replaceQuery(params);
  }, [index, urlLoaded]);

  // After a chapter change, start at the top and move focus to the new title.
  useEffect(() => {
    if (!userMoved.current) return;
    userMoved.current = false;
    window.scrollTo({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, [index]);

  // The crossfade: the copy of the old chapter sits exactly where it was and fades out; the new
  // chapter fades in under it. The copy is inert and hidden from screen readers.
  useLayoutEffect(() => {
    const copy = leaving.current;
    leaving.current = null;
    const frame = frameRef.current;
    const main = mainRef.current;
    if (!copy || !frame || !main) return;
    frame.appendChild(copy);
    const fadeOut = copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DUR.fade, easing: XFADE_EASE, fill: "forwards" });
    const drop = () => copy.remove();
    fadeOut.finished.then(drop, drop);
    main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DUR.fade, easing: XFADE_EASE });
  }, [index]);

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i > last || i === index) return;
      userMoved.current = true;
      const main = mainRef.current;
      if (main && !prefersReducedMotion()) {
        const copy = main.cloneNode(true) as HTMLElement;
        copy.removeAttribute("id");
        copy.classList.add("journey-leaving");
        copy.setAttribute("aria-hidden", "true");
        copy.inert = true;
        Object.assign(copy.style, { top: `${main.offsetTop}px`, left: `${main.offsetLeft}px`, width: `${main.offsetWidth}px`, height: `${main.offsetHeight}px` });
        leaving.current = copy;
        setPreviousBg(chapters[index].n);
        setBlooms((n) => n + 1);
      }
      setIndex(i);
    },
    [last, index, chapters],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (askOpen || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key === "Escape") {
        router.push("/learn");
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest(ARROW_TARGETS)) return;
      event.preventDefault();
      go(event.key === "ArrowRight" ? index + 1 : index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [askOpen, router, go, index]);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const t = event.touches[0];
    const target = event.target instanceof Element ? event.target : null;
    touch.current = { x: t.clientX, y: t.clientY, ignore: Boolean(target?.closest("input, .slider")) };
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touch.current;
    touch.current = null;
    if (!start || start.ignore || event.changedTouches.length === 0) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(dx < 0 ? index + 1 : index - 1);
  }

  return (
    <div className="journey" data-theme="dark">
      <PageReveal key={blooms} variant="journey" again={blooms > 0} />
      {previousBg !== null && <div className="journey-bg" data-bg={previousBg} aria-hidden="true" />}
      <div key={chapter.n} className={`journey-bg${previousBg !== null ? " journey-bg-next" : ""}`} data-bg={chapter.n} aria-hidden="true" />
      <div ref={frameRef} className="journey-frame" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="row between">
          <Link className="btn btn-ghost journey-exit" href="/learn">
            <X className="ic" aria-hidden="true" />
            Exit journey
          </Link>
          <span className="small journey-count">
            Chapter {chapter.n} of {chapters.length}
          </span>
        </div>

        <main ref={mainRef} id="main" className="journey-main">
          <span className="journey-icon">
            <Icon className="ic lg" aria-hidden="true" />
          </span>
          <span className="small strong muted">Chapter {chapter.n}</span>
          <h1 ref={titleRef} tabIndex={-1} className="h1 journey-title">
            {chapter.title}
          </h1>
          <p className="journey-text">{chapter.text}</p>
          <div className="journey-interactive" key={chapter.n}>
            <Interactive item={chapter.interactive} />
          </div>
          <div className="row g2 wrapx journey-chips">
            {chapter.chips.map((c) => (
              <Link key={c.label} className="chip" href={c.href}>
                {c.label}
              </Link>
            ))}
          </div>
          {chapter.sources.length > 0 && (
            <div className="journey-sources">
              <SourceLine sources={chapter.sources} />
            </div>
          )}
        </main>

        <div className="row between journey-nav">
          <button type="button" className="btn btn-secondary" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeft className="ic sm" aria-hidden="true" />
            Back
          </button>
          {index < last ? (
            <button type="button" className="btn btn-primary" onClick={() => go(index + 1)}>
              Next chapter
            </button>
          ) : (
            <Link className="btn btn-primary" href="/learn">
              Finish journey
            </Link>
          )}
        </div>

        <nav className="progress journey-progress" aria-label="Journey progress">
          <span className="rule" />
          {chapters.map((c, i) => (
            <button
              key={c.n}
              type="button"
              className={`step${i < index ? " done" : ""}${i === index ? " now" : ""}`}
              aria-label={`Chapter ${c.n}: ${c.title}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => go(i)}
            >
              {i === index && <span className="tinyflame" />}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
