"use client";

import { useId, type ReactNode } from "react";

/** A unique, URL-safe id prefix for SVG gradients (useId output can contain characters url(#…) dislikes). */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** What the explainer shows right now, in words. Announced politely to screen readers. */
export function XpStatus({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="xp-status" aria-live="polite">
      <b>{title}</b>
      {children && <span>{children}</span>}
    </div>
  );
}

/** A colored tick and its label, for slider reference marks. */
export function XpLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="row g4 wrapx small xp-legend">
      {items.map((item) => (
        <span key={item.label} className="row g2">
          <span aria-hidden="true" style={{ width: 2, height: 14, background: item.color, flex: "none" }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** Segmented control (aria-pressed buttons), as used by the flame chamber. */
export function XpChoice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="seg xp-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
