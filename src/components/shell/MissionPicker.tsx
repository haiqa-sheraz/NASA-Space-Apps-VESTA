"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDismissOnOutsideClick } from "@/lib/hooks/useDismiss";
import { MISSION_LIST, MISSIONS } from "@/lib/missions";
import { usePrefs } from "@/lib/state/prefs";

/**
 * Global mission picker: a button that opens a listbox.
 * "topbar" shows "Mission  Moon base" inline; "block" is the full-width version in the phone menu.
 */
export function MissionPicker({ variant = "topbar" }: { variant?: "topbar" | "block" }) {
  const { mission, setMission } = usePrefs();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const labelId = useId();
  const current = MISSIONS[mission];
  const selectedIndex = MISSION_LIST.findIndex((m) => m.id === mission);

  const close = useCallback(() => setOpen(false), []);
  useDismissOnOutsideClick(rootRef, open, close);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  function openList(index = selectedIndex) {
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    setMission(MISSION_LIST[index].id);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openList();
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = MISSION_LIST.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => Math.min(i + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className={variant === "block" ? "relative stack g2" : "relative"}>
      {variant === "block" && (
        <span id={labelId} className="small muted strong">
          Mission
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="input select"
        style={variant === "topbar" ? { width: "auto", gap: 10, background: "var(--surface)" } : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={variant === "topbar" ? `Mission: ${current.label}` : undefined}
        aria-labelledby={variant === "block" ? `${labelId} ${listId}-value` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
      >
        {variant === "topbar" ? (
          <>
            <span className="muted" style={{ fontSize: 14, flex: "none" }}>
              Mission
            </span>
            <span className="strong" style={{ fontSize: 15 }}>
              {current.label}
            </span>
          </>
        ) : (
          <b id={`${listId}-value`} style={{ fontSize: 15 }}>
            {current.label}
          </b>
        )}
        <ChevronDown className="ic sm" aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label="Mission"
          aria-activedescendant={`${listId}-opt-${active}`}
          className="menu popover listbox"
          style={variant === "topbar" ? { left: 0, width: 260 } : { left: 0, right: 0, top: "calc(100% + 6px)" }}
          onKeyDown={onListKeyDown}
        >
          {MISSION_LIST.map((m, index) => (
            <li
              key={m.id}
              id={`${listId}-opt-${index}`}
              role="option"
              aria-selected={m.id === mission}
              className={index === active ? "is-active" : undefined}
              onClick={() => choose(index)}
              onPointerMove={() => setActive(index)}
            >
              {m.id === mission ? (
                <Check className="ic sm" aria-hidden="true" />
              ) : (
                <span style={{ width: 16, flex: "none" }} aria-hidden="true" />
              )}
              {m.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
