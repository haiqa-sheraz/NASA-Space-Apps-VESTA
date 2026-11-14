"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useDismissOnOutsideClick } from "@/lib/hooks/useDismiss";
import { PHONE_QUERY, useMediaQuery } from "@/lib/hooks/useClient";
import { SITE } from "@/lib/site";

/** "Why Vesta?" beside the name: a popover on desktop, a small sheet on phones. */
export function WhyVesta() {
  const [open, setOpen] = useState(false);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismissOnOutsideClick(rootRef, open && !isPhone, close);

  useEffect(() => {
    if (!open || isPhone) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isPhone]);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-ghost btn-sm"
        aria-expanded={open}
        aria-controls={open && !isPhone ? popId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        Why Vesta?
      </button>
      {open && !isPhone && (
        <div id={popId} className="pop stack g2">
          <p className="h5">Why Vesta?</p>
          <p className="small">{SITE.whyVesta}</p>
        </div>
      )}
      {isPhone && (
        <BottomSheet open={open} onClose={close} title="Why Vesta?">
          <p className="body">{SITE.whyVesta}</p>
        </BottomSheet>
      )}
    </span>
  );
}
