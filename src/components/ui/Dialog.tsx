"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap, useHydrated } from "@/lib/hooks/useClient";
import { useScrollLock } from "@/lib/hooks/useDismiss";

/**
 * Centered modal dialog (Learn explainers). Escape, the close button or a click on the dimmed page
 * closes it; focus stays inside while it is open and returns to the opener afterward.
 * Full screen on phones.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  heading,
  actions,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Id of the element that names the dialog. */
  labelledBy: string;
  /** Small text at the top left, e.g. "Explainer 2 of 6". */
  heading: ReactNode;
  actions?: ReactNode;
  closeLabel: string;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useScrollLock(open);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const frame = requestAnimationFrame(() => closeRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    const opener = returnFocusRef.current;
    returnFocusRef.current = null;
    if (opener?.isConnected && opener !== document.body) opener.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!hydrated) return null;
  return createPortal(
    <>
      <div className="scrim" data-open={open} aria-hidden="true" onClick={onClose} />
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy} data-open={open}>
        {/* On phones the actions move to a second row, so the close button always stays in view. */}
        <header>
          <span className="small muted strong dialog-heading">{heading}</span>
          {actions && <div className="row g2 dialog-actions">{actions}</div>}
          <button ref={closeRef} type="button" className="btn btn-icon" style={{ border: 0 }} aria-label={closeLabel} onClick={onClose}>
            <X className="ic" aria-hidden="true" />
          </button>
        </header>
        <div className="dialog-body">{open ? children : null}</div>
      </div>
    </>,
    document.body,
  );
}
