"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { DUR, prefersReducedMotion } from "@/lib/motion";

/**
 * True once the page has settled: the saved mission and the URL are applied in the first moments
 * after load, and those changes shouldn't animate or show "Up from" notes.
 */
export function useSettled(ms = 800): RefObject<boolean> {
  const settled = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      settled.current = true;
    }, ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return settled;
}

/**
 * Ranked rows re-sort smoothly (design board 14): when `order` changes, each child with a
 * data-flip-key slides from where it was to where it is now (FLIP, translateY only, 250 ms).
 * Rows that are new to the list just appear. Off with reduced motion, or until `enabled` is true.
 */
export function useFlip<T extends HTMLElement>(order: string, enabled: RefObject<boolean>): RefObject<T | null> {
  const ref = useRef<T>(null);
  const tops = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const rows = Array.from(list.children).filter((el): el is HTMLElement => el instanceof HTMLElement && Boolean(el.dataset.flipKey));
    // A slide still running would throw the measurements off: finish it first.
    for (const row of rows) for (const animation of row.getAnimations()) animation.cancel();
    const base = list.getBoundingClientRect().top;
    const animate = enabled.current && !prefersReducedMotion();
    const next = new Map<string, number>();
    for (const row of rows) {
      const key = row.dataset.flipKey as string;
      const top = row.getBoundingClientRect().top - base;
      next.set(key, top);
      const before = tops.current.get(key);
      if (animate && before !== undefined && Math.abs(before - top) > 0.5) {
        row.animate([{ transform: `translateY(${before - top}px)` }, { transform: "translateY(0)" }], {
          duration: DUR.sort,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        });
      }
    }
    tops.current = next;
  }, [order, enabled]);
  return ref;
}
