"use client";

import { useEffect, type RefObject } from "react";

/** Closes a popover when the visitor clicks or taps outside `ref`. */
export function useDismissOnOutsideClick(ref: RefObject<HTMLElement | null>, active: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ref, active, onDismiss]);
}

let scrollLocks = 0;

/** Stops the page behind an overlay from scrolling while `active` is true. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    scrollLocks += 1;
    document.documentElement.style.overflow = "hidden";
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.documentElement.style.overflow = "";
    };
  }, [active]);
}
