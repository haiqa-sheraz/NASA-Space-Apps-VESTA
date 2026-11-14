"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/lib/hooks/useDismiss";
import { useFocusTrap, useHydrated } from "@/lib/hooks/useClient";

/**
 * Drawer that slides in from the right (the column guide). Escape, the close button or a click on
 * the dimmed page closes it; focus stays inside while it is open and returns to the opener after.
 */
export function SideDrawer({
  id,
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  id?: string;
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const hydrated = useHydrated();
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
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
      <aside id={id} ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} data-open={open}>
        <header>
          <div className="stack">
            <h2 id={titleId} className="h3">
              {title}
            </h2>
            {subtitle && <span className="small muted">{subtitle}</span>}
          </div>
          <button ref={closeRef} type="button" className="btn btn-icon" style={{ border: 0 }} aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>
            <X className="ic" aria-hidden="true" />
          </button>
        </header>
        <div className="stack" style={{ flex: 1, minHeight: 0 }}>
          {children}
        </div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </>,
    document.body,
  );
}
