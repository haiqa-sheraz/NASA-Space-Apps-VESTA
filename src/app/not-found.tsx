import Link from "next/link";
import { SiteChrome } from "@/components/shell/SiteChrome";

export default function NotFound() {
  return (
    <SiteChrome>
      <section className="wrap pt-12 pb-16">
        <div className="stack g4" style={{ maxWidth: 820 }}>
          <h1 className="h1">This page doesn&apos;t exist.</h1>
          <p className="lead">Check the address, or start from the home page or the list of studies.</p>
          <div className="row g3 wrapx">
            <Link className="btn btn-primary" href="/">
              Go to Home
            </Link>
            <Link className="btn btn-secondary" href="/explore">
              Explore the studies
            </Link>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
