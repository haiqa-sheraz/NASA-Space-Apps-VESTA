"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDismissOnOutsideClick } from "@/lib/hooks/useDismiss";
import { MISSION_LIST, MISSIONS } from "@/lib/missions";
import { usePrefs } from "@/lib/state/prefs";

/**
 * Mission picker: a compact button ("Mission  Moon base") that opens a listbox. It sits on the
 * pages whose content depends on the mission (Home spotlight, Explore, study relevance); the
 * choice is saved and shared by those pages and the Planner. `presetsOnly` leaves out Custom
 * (Home, where there are no condition sliders); if Custom was chosen on the Planner, the button
 * still says so until another mission is picked.
 */
export function MissionPicker({ presetsOnly = false }: { presetsOnly?: boolean }) {
  const { mission, setMission } = usePrefs();
  const list = presetsOnly ? MISSION_LIST.filter((m) => m.id !== "custom") : MISSION_LIST;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = MISSIONS[mission];
  const selectedIndex = Math.max(0, list.findIndex((m) => m.id === mission));

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
    setMission(list[index].id);
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
    const last = list.length - 1;
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
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="input select"
        style={{ width: "auto", gap: 10, background: "var(--surface)" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Mission: ${current.label}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
      >
        <span className="muted" style={{ fontSize: 14, flex: "none" }}>
          Mission
        </span>
        <span className="strong" style={{ fontSize: 15 }}>
          {current.label}
        </span>
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
          style={{ left: 0, width: 260, maxWidth: "calc(100vw - 32px)" }}
          onKeyDown={onListKeyDown}
        >
          {list.map((m, index) => (
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
