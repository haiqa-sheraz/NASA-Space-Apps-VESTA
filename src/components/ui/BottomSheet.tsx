"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/lib/hooks/useDismiss";
import { useFocusTrap, useHydrated } from "@/lib/hooks/useClient";

/**
 * Bottom sheet for phones (filters, short notes). Slides up from the bottom; Escape, the close
 * button or a tap on the dimmed page closes it. Focus stays inside while open and returns after.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const hydrated = useHydrated();
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  useScrollLock(open);
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const frame = requestAnimationFrame(() => closeRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
    const opener = returnFocusRef.current;
    returnFocusRef.current = null;
    if (opener?.isConnected) opener.focus();
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
      <aside ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} data-open={open}>
        <div className="handle" aria-hidden="true" />
        <header>
          <h2 id={titleId} className="h4">
            {title}
          </h2>
          <button ref={closeRef} type="button" className="btn btn-icon" style={{ border: 0 }} aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>
            <X className="ic" aria-hidden="true" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </>,
    document.body,
  );
}
