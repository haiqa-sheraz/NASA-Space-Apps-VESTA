"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDismissOnOutsideClick } from "@/lib/hooks/useDismiss";
import { MORE_NAV } from "@/lib/nav";

/** "More" menu in the top bar: Journey, Learn, Earth benefits, About. */
export function MoreMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuId = useId();
  const isMorePage = MORE_NAV.some((item) => item.isActive(pathname));

  const close = useCallback(() => setOpen(false), []);
  useDismissOnOutsideClick(rootRef, open, close);

  // Close after navigating.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (open) itemRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  function openAt(index: number) {
    setFocusIndex(index);
    setOpen(true);
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(MORE_NAV.length - 1);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = MORE_NAV.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusIndex((i) => (i === last ? 0 : i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusIndex((i) => (i === 0 ? last : i - 1));
        break;
      case "Home":
        event.preventDefault();
        setFocusIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusIndex(last);
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
        className={`navbtn${isMorePage ? " active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openAt(0))}
        onKeyDown={onButtonKeyDown}
      >
        More
        <ChevronDown className="ic sm" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="More"
          className="menu popover"
          style={{ left: 0, width: 240 }}
          onKeyDown={onMenuKeyDown}
        >
          {MORE_NAV.map((item, index) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                className={active ? "on" : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon className="ic" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
