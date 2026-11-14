"use client";

import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

interface Placement {
  left: number;
  top: number;
  below: boolean;
  arrowX: number;
}

const TIP_WIDTH = 280;

/**
 * Data quality flag: a Caution-colored icon button. Hovering, focusing or tapping it shows what
 * the flag means. The full text is also in the button's accessible name.
 */
export function QualityFlag({ text, label = "Quality flag" }: { text: string; label?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const show = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(TIP_WIDTH, window.innerWidth - 16);
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(8, Math.min(centerX - 24, window.innerWidth - width - 8));
    const below = rect.top < 140;
    setPlacement({ left, top: below ? rect.bottom + 10 : rect.top - 10, below, arrowX: centerX - left });
  }, []);
  const hide = useCallback(() => setPlacement(null), []);

  useEffect(() => {
    if (!placement) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && hide();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", onKey);
    };
  }, [placement, hide]);

  const style: CSSProperties & { "--arrow-x"?: string } = placement
    ? {
        left: placement.left,
        top: placement.top,
        maxWidth: Math.min(TIP_WIDTH, window.innerWidth - 16),
        transform: placement.below ? undefined : "translateY(-100%)",
        "--arrow-x": `${placement.arrowX}px`,
      }
    : {};

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="flag"
        aria-label={`${label}: ${text}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        <TriangleAlert className="ic" aria-hidden="true" />
      </button>
      {placement &&
        createPortal(
          <div role="tooltip" className={`tooltip floating${placement.below ? " below" : ""}`} style={style}>
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
