"use client";

import { usePrefs, type ReadingLevel } from "@/lib/state/prefs";

const LEVELS: { value: ReadingLevel; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "expert", label: "Expert" },
];

/** Global Simple / Expert switch. The choice is saved and applies on every page. */
export function ReadingLevelSwitch({ label = "Reading level" }: { label?: string }) {
  const { readingLevel, setReadingLevel } = usePrefs();
  return (
    <div className="seg" role="group" aria-label={label}>
      {LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          aria-pressed={readingLevel === level.value}
          onClick={() => setReadingLevel(level.value)}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
