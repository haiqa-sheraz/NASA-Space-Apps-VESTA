"use client";

import { useRef, type ReactNode } from "react";
import { useFitZoom } from "@/lib/hooks/useFitZoom";

/**
 * The Home hero: exactly one screen under the top bar. The flame sizes itself to the screen's
 * height (CSS), and if the hero is still too tall (short or small screens), it shrinks to fit, so
 * the whole hero shows without scrolling.
 */
export function HeroFit({ children }: { children: ReactNode }) {
  const box = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useFitZoom(box, content, 0.62);
  return (
    <section ref={box} className="wrap hero">
      <div ref={content} className="hero-grid">
        {children}
      </div>
    </section>
  );
}
