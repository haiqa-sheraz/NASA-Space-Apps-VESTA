"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Fits `content` inside `box` so the visitor doesn't have to scroll (Home hero, Journey chapters).
 * When the content is taller than the box, it shrinks with CSS zoom (its layout too, so nothing
 * overlaps), but never below `min` (a number, or a function read at each fit, for limits that
 * depend on the screen), to keep text readable. The box gets data-fit="fits", "zoom" or, when
 * even `min` isn't enough, "overflow": then the content stays full size and the box's CSS lets the
 * page scroll as before.
 *
 * It fits again when the screen size changes, when the content changes size (a slider, a new
 * chapter), and when `key` changes. The box itself isn't watched for size: its height comes from the
 * screen, and its "overflow" style may change it.
 */
export function useFitZoom(box: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>, min: number | (() => number), key?: unknown) {
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = content.current;
    if (!outer || !inner) return;
    let frame = 0;

    const fit = () => {
      // Measure with the box at its screen height and the content at full size.
      outer.dataset.fit = "";
      inner.style.zoom = "";
      const style = getComputedStyle(outer);
      const room = outer.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const natural = inner.getBoundingClientRect().height;
      const floor = typeof min === "function" ? min() : min;
      let zoom = 1;
      if (natural > room + 0.5) {
        zoom = Math.max(floor, room / natural);
        // Lines wrap a little differently when zoomed, so check and correct a few times.
        for (let i = 0; i < 6; i++) {
          inner.style.zoom = String(zoom);
          const height = inner.getBoundingClientRect().height;
          if (height <= room + 0.5 || zoom <= floor) break;
          zoom = Math.max(floor, zoom * (room / height) - 0.004);
        }
      }
      // If it can't fit even at the smallest size, show it full size and let the page scroll:
      // shrinking it and still scrolling would be the worst of both.
      const over = inner.getBoundingClientRect().height > room + 1;
      if (over) inner.style.zoom = "";
      outer.dataset.fit = over ? "overflow" : zoom < 1 ? "zoom" : "fits";
    };

    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    const observer = new ResizeObserver(later);
    observer.observe(inner);
    window.addEventListener("resize", later);
    // Web fonts can change the text's height after the first fit.
    void document.fonts?.ready.then(later);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", later);
      cancelAnimationFrame(frame);
    };
  }, [box, content, min, key]);
}
