"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useScrollLock } from "@/lib/hooks/useDismiss";
import { MAIN_NAV, MORE_NAV } from "@/lib/nav";
import { AskButton } from "./AskButton";
import { Logo } from "./Logo";
import { MoreMenu } from "./MoreMenu";
import { ThemeSegmented, ThemeToggle } from "./ThemeSwitch";

/**
 * Top bar on every page: logo, main menu (active page as a pill), More menu, theme switch and Ask.
 * The mission picker and Simple / Expert switch sit on the pages they affect, not here.
 * Under 1024 px (phones and tablets, where the six menu items don't fit on one line) it collapses
 * to the logo, Ask and a menu button.
 */
export function TopBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useScrollLock(menuOpen);

  // Close the phone menu after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Close the phone menu if the window grows to desktop width, or on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => desktop.matches && setMenuOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    desktop.addEventListener("change", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      desktop.removeEventListener("change", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const phoneLinks = [...MAIN_NAV, ...MORE_NAV];

  return (
    <header className="topbar">
      <div className="wrap">
        <Logo idPrefix="logo-top" />

        <nav className="nav max-[1024px]:hidden" aria-label="Main">
          {MAIN_NAV.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <MoreMenu />
        </nav>

        <div className="tools max-[1024px]:hidden">
          <ThemeToggle />
          <AskButton />
        </div>

        <div className="tools min-[1024px]:hidden" style={{ gap: 8, flexWrap: "nowrap" }}>
          <AskButton iconOnly />
          <button
            type="button"
            className="btn btn-icon"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="phone-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="ic" aria-hidden="true" /> : <Menu className="ic" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="phone-menu" className="mobilemenu min-[1024px]:hidden">
          <nav className="stack" style={{ padding: "8px 16px" }} aria-label="Main">
            {phoneLinks.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="navlink"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                  <ChevronRight className="ic sm" aria-hidden="true" />
                </Link>
              );
            })}
          </nav>
          <div className="stack g3" style={{ padding: 16 }}>
            <div className="stack g2">
              <span className="small muted strong">Theme</span>
              <div style={{ alignSelf: "flex-start" }}>
                <ThemeSegmented />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
