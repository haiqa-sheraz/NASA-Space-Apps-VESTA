"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/state/theme";

/** Top bar: one icon button that switches between light and dark mode. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${next} mode`;
  return (
    <button type="button" className="btn btn-icon" aria-label={label} title={label} onClick={() => setTheme(next)}>
      {theme === "dark" ? <Sun className="ic" aria-hidden="true" /> : <Moon className="ic" aria-hidden="true" />}
    </button>
  );
}

/** Phone menu: Light / Dark as a segmented control. */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="seg" role="group" aria-label="Theme">
      <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
        <Sun className="ic sm" aria-hidden="true" />
        Light
      </button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
        <Moon className="ic sm" aria-hidden="true" />
        Dark
      </button>
    </div>
  );
}
