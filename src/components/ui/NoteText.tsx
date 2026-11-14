import type { NotePart } from "@/lib/mission-view";

/** Renders a sentence whose citations are links (or plain text when a source has no link). */
export function NoteText({ parts }: { parts: NotePart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === "string") return <span key={i}>{part}</span>;
        if (!part.url) return <span key={i}>{part.label}</span>;
        return (
          <a key={i} href={part.url} title={part.title ?? undefined} target="_blank" rel="noopener noreferrer">
            {part.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        );
      })}
    </>
  );
}
