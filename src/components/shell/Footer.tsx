import Link from "next/link";
import { getSiteStats } from "@/lib/data/server";
import { formatCount, formatIsoDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { GithubIcon } from "../ui/GithubIcon";
import { Logo } from "./Logo";

const linkClass = "text-text-2 no-underline inline-flex min-h-8 items-center hover:text-text";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "Planner", href: "/planner" },
      { label: "Explore", href: "/explore" },
      { label: "Compare", href: "/compare" },
      { label: "Insights", href: "/insights" },
      { label: "Data", href: "/data" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Journey", href: "/learn/journey" },
      { label: "Learn", href: "/learn" },
      { label: "Earth benefits", href: "/earth-benefits" },
      { label: "Glossary", href: "/learn#glossary" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About me", href: "/about#about-me" },
      { label: "How it works", href: "/about#how-it-works" },
      { label: "Sources and credits", href: "/about#sources" },
      { label: "How AI was used", href: "/about#ai" },
    ],
  },
];

/** Footer: stats strip (counted from data/), brand, link columns and the bottom bar. */
export function Footer() {
  const stats = getSiteStats();
  const statItems = [
    { value: stats.studies, label: "NASA studies" },
    { value: stats.tests, label: "tests, counted from our data" },
    { value: stats.nasaReports, label: "NASA reports, counted from our data" },
    { value: stats.fireSafetyJobs, label: "fire-safety jobs" },
  ];

  return (
    <footer className="border-t border-rule">
      <div className="wrap pt-12">
        <div className="statstrip">
          {statItems.map((item) => (
            <div key={item.label}>
              <span className="bignum">{formatCount(item.value)}</span>
              <span className="muted small">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-8 py-12" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))" }}>
          <div className="stack g3 min-w-0 tablet:col-span-2">
            <Logo />
            <p className="muted small" style={{ maxWidth: "36ch" }}>
              {SITE.description}
            </p>
            <div className="row g2 wrapx">
              <span className="badge">Built for NASA Space Apps Challenge 2026</span>
              <span className="badge">Data from NASA PSI and NTRS</span>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} className="stack g2" aria-label={`Footer: ${column.title}`}>
              <p className="h5">{column.title}</p>
              <ul className="stack g1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav className="stack g2" aria-label="Footer: Contact">
            <p className="h5">Contact</p>
            <a href={SITE.githubUrl} className={`${linkClass} gap-2`}>
              <GithubIcon className="ic sm" />
              GitHub
            </a>
          </nav>
        </div>

        <div className="row between wrapx g3 small muted border-t border-rule pt-5 pb-7">
          <span>© 2026{SITE.creatorName ? ` ${SITE.creatorName}` : ""}</span>
          {SITE.codeLicense && <span>Code: {SITE.codeLicense}</span>}
          <span>Data: NASA PSI and NTRS</span>
          <span>Data updated {formatIsoDate(stats.dataUpdated)}</span>
        </div>
      </div>
    </footer>
  );
}
