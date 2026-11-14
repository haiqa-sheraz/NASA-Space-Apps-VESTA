import type { ReactNode } from "react";
import { SiteChrome } from "@/components/shell/SiteChrome";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
