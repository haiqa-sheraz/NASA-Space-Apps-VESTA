import type { ReactNode } from "react";

/**
 * Compact hero for inner pages (design brief 5, "Page hero pattern"):
 * a small sentence-case badge, the page title, one line of explanation, and up to 2 buttons.
 */
export function PageHero({
  badge,
  title,
  lead,
  actions,
}: {
  badge: string;
  title: string;
  lead: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="wrap pt-12 pb-8">
      <div className="stack g4" style={{ maxWidth: 820 }}>
        <span className="badge blue self-start">{badge}</span>
        <h1 className="h1">{title}</h1>
        <p className="lead">{lead}</p>
        {actions && <div className="row g3 wrapx">{actions}</div>}
      </div>
    </section>
  );
}
