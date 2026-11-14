import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { TopBar } from "./TopBar";

/** Top bar, main content and footer: the frame for every page except the Journey. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="btn btn-primary skip">
        Skip to main content
      </a>
      <TopBar />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
