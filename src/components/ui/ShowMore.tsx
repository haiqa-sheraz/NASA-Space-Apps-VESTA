"use client";

import { useState, type ReactNode } from "react";

/** A list that shows its first items, with a button to show the rest. Items are <li> elements. */
export function ShowMore({
  items,
  initial,
  moreLabel,
  className,
}: {
  items: ReactNode[];
  initial: number;
  /** Button text, for example "Show all 35 results". */
  moreLabel: string;
  className?: string;
}) {
  const [all, setAll] = useState(false);
  const visible = all ? items : items.slice(0, initial);
  return (
    <>
      <ul className={className}>{visible}</ul>
      {!all && items.length > initial && (
        <button type="button" className="btn btn-secondary self-start" onClick={() => setAll(true)}>
          {moreLabel}
        </button>
      )}
    </>
  );
}
