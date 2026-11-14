import Link from "next/link";
import { SITE } from "@/lib/site";

/** Home. Step 1 shows the hero text only; the full Home (flame, paths, findings, gaps) is built in step 2. */
export default function HomePage() {
  return (
    <section className="wrap pt-14 pb-16">
      <div className="stack g5" style={{ maxWidth: 760 }}>
        <span className="badge blue self-start">{SITE.challengeBadge}</span>
        <h1 className="h1x">Fire behaves differently in space.</h1>
        <p className="lead">NASA&apos;s microgravity fire experiments, easy to find, compare and understand.</p>
        <div className="row g3 wrapx">
          <Link className="btn btn-primary" href="/learn/journey">
            Start the journey
          </Link>
          <Link className="btn btn-secondary" href="/planner">
            Plan a mission
          </Link>
        </div>
      </div>
    </section>
  );
}
