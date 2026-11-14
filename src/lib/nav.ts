import { BookOpen, Compass, Globe, Info, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  /** True when this item is the current page (drives the active pill and aria-current). */
  isActive: (pathname: string) => boolean;
}

export interface MoreNavItem extends NavItem {
  icon: LucideIcon;
}

const startsWith = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Main menu: Planner, Explore, Compare, Insights, Data. */
export const MAIN_NAV: NavItem[] = [
  { label: "Planner", href: "/planner", isActive: startsWith("/planner") },
  // Study pages are opened from Explore, so Explore stays active there.
  { label: "Explore", href: "/explore", isActive: (p) => startsWith("/explore")(p) || startsWith("/study")(p) },
  { label: "Compare", href: "/compare", isActive: startsWith("/compare") },
  { label: "Insights", href: "/insights", isActive: startsWith("/insights") },
  { label: "Data", href: "/data", isActive: startsWith("/data") },
];

/** More menu: Journey, Learn, Earth benefits, About. */
export const MORE_NAV: MoreNavItem[] = [
  { label: "Journey", href: "/learn/journey", icon: Compass, isActive: startsWith("/learn/journey") },
  { label: "Learn", href: "/learn", icon: BookOpen, isActive: (p) => p === "/learn" },
  { label: "Earth benefits", href: "/earth-benefits", icon: Globe, isActive: startsWith("/earth-benefits") },
  { label: "About", href: "/about", icon: Info, isActive: startsWith("/about") },
];
