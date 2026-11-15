import {
  ArrowLeftRight,
  BookOpen,
  Database,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  MessageCircleQuestionMark,
  ShieldCheck,
  SlidersVertical,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { LinkedinIcon } from "@/components/ui/LinkedinIcon";
import { PageReveal } from "@/components/ui/PageReveal";
import { PageHero } from "@/components/ui/PageHero";
import { SourceLine } from "@/components/ui/SourceChip";
import { VestaMark } from "@/components/ui/VestaLogo";
import { AI_CREDITS, NASA_WEB_CITATIONS, NTRS_CITATIONS, OTHER_CITATIONS, SOFTWARE_CREDITS, SPINOFF_CITATIONS, type Citation } from "@/lib/citations";
import { modelName } from "@/lib/ask/types";
import { getGallery } from "@/lib/data/gallery";
import { formatAuthor, getFacts, getSavedAnswers, getStudies, getStudyProfiles } from "@/lib/data/server";
import { formatCount, joinAnd, plural } from "@/lib/format";
import { missionView } from "@/lib/mission-view";
import { DEFAULT_CUSTOM } from "@/lib/missions";
import { SITE, TEAM } from "@/lib/site";
import { APOLLO_1, APOLLO_13, MIR_FIRE, PROBLEM_STATEMENT, PSI_TABLES } from "@/lib/sources";

export const metadata: Metadata = { title: "About and methods" };

const ERNIE = "baidu/ernie-5.5-flash-preview:free";
const NEMOTRON = "nvidia/nemotron-3.5-super-vl:free";

function SectionHead({ label, title, id }: { label: string; title: string; id: string }) {
  return (
    <div className="stack g1">
      <span className="label">{label}</span>
      <h2 id={id} className="h2">
        {title}
      </h2>
    </div>
  );
}

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function CitationList({ items }: { items: Citation[] }) {
  return (
    <ul className="stack g3 cite-list">
      {items.map((c) => (
        <li key={`${c.title}|${c.url}`} className="stack g1">
          <External href={c.url}>{c.title}</External>
          <span className="small muted">
            {[c.detail, c.year, c.label].filter(Boolean).join(". ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SourceGroup({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <details className="src-group">
      <summary>
        <span className="h4">{title}</span>
        {count !== undefined && <span className="small muted num">{formatCount(count)}</span>}
      </summary>
      <div className="src-group-body">{children}</div>
    </details>
  );
}

/** About and methods: the challenge, how Vesta works, the data, AI use, limits and every source. */
export default function AboutPage() {
  if (!SITE.codeLicense) throw new Error("About needs SITE.codeLicense.");
  const studies = getStudies();
  const facts = getFacts();
  const profiles = getStudyProfiles();
  const byErnie = profiles.filter((p) => p.model === ERNIE).length;
  const byNemotron = profiles.filter((p) => p.model === NEMOTRON).length;
  if (byErnie + byNemotron !== profiles.length) throw new Error("A study profile names a model the About page doesn't list; review the AI-use section.");
  // Saved Ask AI answers: how many, and which models wrote them (the free router names the model it picked).
  const savedAnswers = getSavedAnswers().answers.filter((a) => !a.notFound && a.model);
  const savedCount = savedAnswers.length;
  const savedModels = [...new Set(savedAnswers.map((a) => modelName(a.model)))];
  const moon = missionView("moon", DEFAULT_CUSTOM);
  const moonChip = (kind: "oxygen" | "pressure") => moon.chips.find((c) => c.kind === kind)!.text;
  const solids = Math.round(facts.highest_oxygen_solid_materials_pct);

  const features: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: FileText, title: "Summaries", text: "Every study in plain words, with an expert version one click away." },
    { icon: SlidersVertical, title: "Mission ranking", text: "Rank studies for the ISS, a Moon base, a Mars base, a rover or your own conditions." },
    { icon: ArrowLeftRight, title: "Compare", text: "Up to 3 studies side by side, with ranges on shared scales." },
    { icon: Lightbulb, title: "Insights", text: "Findings for preventing, detecting and putting out fires, plus the gaps." },
    { icon: Download, title: "Data downloads", text: "Cleaned tests as CSV and JSON, with a column guide." },
    { icon: MessageCircleQuestionMark, title: "Ask AI with sources", text: "Questions answered from NASA data, with the sources under each answer." },
  ];

  const history = [
    { year: "1967", name: "Apollo 1", text: "The crew died in a cabin fire during a pre-launch test.", source: APOLLO_1 },
    { year: "1970", name: "Apollo 13", text: "An oxygen tank exploded on the way to the Moon.", source: APOLLO_13 },
    { year: "1997", name: "Mir", text: "A fire from an oxygen generator broke out on the station.", source: MIR_FIRE },
  ];

  return (
    <>
      <PageReveal variant="about" />
      <PageHero
        badge="NASA Space Apps Challenge 2026"
        title={`About ${SITE.name}`}
        lead="An AI-powered guide that summarizes, ranks and interprets NASA's microgravity fire experiments for spacecraft, stations, Moon and Mars bases, and rovers."
        actions={
          <>
            <Link className="btn btn-primary" href="/learn/journey">
              Start the journey
            </Link>
            <Link className="btn btn-secondary" href="/planner">
              Plan a mission
            </Link>
          </>
        }
      />

      {/* The challenge */}
      <section className="sec" aria-labelledby="challenge-title">
        <div className="wrap about-split">
          <SectionHead label="The challenge" title="What NASA asked for" id="challenge-title" />
          <div className="stack g3">
            <p className="body">
              Turn NASA&apos;s microgravity combustion data into fire-safety insights. Summarize the experiments, rank them for different missions,
              and explain what they mean, using AI where it helps.
            </p>
            {SITE.challengeUrl && (
              <a className="row g2 self-start" href={SITE.challengeUrl} target="_blank" rel="noopener noreferrer">
                Read the challenge on the Space Apps site
                <ExternalLink className="ic sm" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section className="sec" aria-labelledby="why-title">
        <div className="wrap stack g6">
          <SectionHead label="Why it matters" title="Fire is one of the oldest dangers in spaceflight" id="why-title" />
          <ol className="about-history">
            {history.map((h) => (
              <li key={h.name} className="stack g2">
                <span className="num strong about-year">{h.year}</span>
                <span className="h4">{h.name}</span>
                <p className="small muted">{h.text}</p>
                <SourceLine sources={[h.source]} />
              </li>
            ))}
          </ol>
          <p className="body">
            A Moon base may run at {moonChip("oxygen")} and {moonChip("pressure")}. No solid material in PSI was tested above about {solids}% oxygen,
            and in space, flames behave in ways Earth tests don&apos;t show.
          </p>
          <SourceLine sources={[PROBLEM_STATEMENT, PSI_TABLES]} />
        </div>
      </section>

      {/* What it does */}
      <section className="sec" aria-labelledby="features-title">
        <div className="wrap stack g5">
          <SectionHead label="What it does" title="Six tools, one set of sources" id="features-title" />
          <div className="cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="stack g2">
                <span className="row g2 h4">
                  <Icon className="ic" aria-hidden="true" style={{ color: "var(--blue)" }} />
                  {title}
                </span>
                <p className="small muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="sec" id="how-it-works" aria-labelledby="how-title">
        <div className="wrap stack g5">
          <SectionHead label="How it works" title="From NASA records to answers with sources" id="how-title" />
          <ol className="about-steps">
            {[
              { title: "NASA data", text: "PSI records and NTRS reports" },
              { title: "Cleaning and extraction", text: "Python scripts pull out tests, units and quality flags" },
              { title: "Saved data", text: "Clean tables, summaries and rankings, saved as files with the site" },
              { title: "Website and AI answers", text: "Every claim and answer cites its source" },
            ].map((step, i) => (
              <li key={step.title} className="panel pad stack g3">
                <span className="about-step-n num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="h4">{step.title}</span>
                <span className="small muted">{step.text}</span>
              </li>
            ))}
          </ol>
          <p className="body muted">
            AI wrote the summaries, results, findings and ranking reasons once, ahead of time, from each study&apos;s reports. A script then looked up
            every number in those texts in its source, and match scores are computed by code from the test tables, not by AI. Only Ask AI and the
            Compare explanation run live: a keyword search finds the best-matching passages in the NASA reports, and the AI answers from those
            passages and the PSI test tables alone, with the sources under the answer. If no passage matches, Vesta says so without asking the AI.
          </p>
        </div>
      </section>

      {/* Data sources and promises */}
      <section className="sec" id="data-sources" aria-labelledby="data-title">
        <div className="wrap cols-2" style={{ gap: 48 }}>
          <div className="stack g4">
            <div className="stack g1">
              <span className="label">Data sources</span>
              <h2 id="data-title" className="h3">
                Where the data comes from
              </h2>
            </div>
            <dl className="stack g4">
              {[
                ["NASA PSI", `Physical Sciences Informatics: study records and data files for all ${studies.length} studies.`],
                ["NTRS", "NASA Technical Reports Server: the reports behind each finding."],
                ["NASA Spinoff", "How NASA technology reached products on Earth."],
                ["NASA web pages", "Mission pages and the Space Apps Challenge resources."],
              ].map(([name, text]) => (
                <div key={name} className="stack g1">
                  <dt className="h5">{name}</dt>
                  <dd className="small muted">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="stack g4">
            <div className="stack g1">
              <span className="label">What makes it different</span>
              <h2 className="h3">Four promises</h2>
            </div>
            <div className="stack g4">
              {[
                { icon: Database, title: "Grounded in NASA data", text: "Every summary and answer comes from NASA's records and reports, not from the open web." },
                { icon: BookOpen, title: "Sources on every claim", text: "Each finding links to its PSI page or NTRS record." },
                { icon: ShieldCheck, title: "Honest about gaps", text: "What we don't know has its own space, with a caution style." },
                { icon: Users, title: "Built for everyone", text: "Simple and expert modes, keyboard access, light and dark mode, and reduced motion." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="row g3" style={{ alignItems: "flex-start" }}>
                  <Icon className="ic" aria-hidden="true" style={{ color: "var(--blue)", marginTop: 2 }} />
                  <div className="stack g1">
                    <span className="h5">{title}</span>
                    <span className="small muted">{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About the team */}
      <section className="sec" id="team" aria-labelledby="team-title">
        <div className="wrap about-split">
          <div className="stack g4">
            <SectionHead label="About the team" title={TEAM.name} id="team-title" />
            <p className="body">{TEAM.intro}</p>
            <a className="btn btn-secondary btn-sm self-start" href={SITE.githubUrl} target="_blank" rel="noopener noreferrer">
              <GithubIcon className="ic sm" />
              GitHub
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <figure className="about-logo">
              <VestaMark idPrefix="logo-about" className="about-logo-mark" label={`${SITE.name} logo`} />
              <figcaption className="small muted">Logo created with AI tools.</figcaption>
            </figure>
          </div>
          <ul className="team-list">
            {TEAM.members.map((m) => (
              <li key={m.name} className="panel pad stack g3">
                <div className="stack g1">
                  <h3 className="h4">{m.name}</h3>
                  <span className="small strong muted">{m.role}</span>
                </div>
                <p className="body">{m.bio}</p>
                <a className="btn btn-secondary btn-sm self-start mt-auto" href={m.linkedin} target="_blank" rel="noopener noreferrer">
                  <LinkedinIcon className="ic sm" />
                  LinkedIn
                  <span className="sr-only">, {m.name} (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AI use, limits and tech stack */}
      <section className="sec">
        <div className="wrap cols-2" style={{ gap: 48 }}>
          <div className="stack g4" id="ai">
            <div className="stack g1">
              <span className="label">How AI was used</span>
              <h2 className="h3">AI, with sources</h2>
            </div>
            <ul className="stack g3 bullet-list">
              <li className="body">Claude Code (Anthropic, with Claude Opus 5.5) assisted in code generation and development.</li>
              <li className="body">
                ERNIE 5.5 Flash (Baidu) wrote the saved summaries, results, findings, Earth-benefit stories and ranking reasons, including{" "}
                {plural(byErnie, "study profile", "study profiles")}. Nemotron 3.5 Super VL (NVIDIA) read scanned pages and wrote the other{" "}
                {formatCount(byNemotron)}. Both ran through OpenRouter, once, before the site was built.
              </li>
              <li className="body">
                Ask AI and the Compare explanation answer live with Nemotron 3.5 Super VL (NVIDIA), with its thinking turned off. When it is busy,
                ERNIE 5.5 Flash answers, then OpenRouter&apos;s free router. They use only our NASA sources and cite them.
                {savedCount > 0 &&
                  ` ${plural(savedCount, "suggested question has a saved answer", "suggested questions have saved answers")}, written the same way by ${joinAnd(savedModels)}.`}
              </li>
              <li className="body">The {SITE.name} logo was created with AI tools.</li>
              <li className="body">Every piece of AI-written text on the site carries an &ldquo;AI-written&rdquo; label.</li>
            </ul>
          </div>
          <div className="stack g7">
            <div className="stack g4" id="limits">
              <div className="stack g1">
                <span className="label">Limits</span>
                <h2 className="h3">What this site can&apos;t do</h2>
              </div>
              <ul className="stack g3 bullet-list">
                <li className="body">PSI has no partial-gravity fire data, so Moon and Mars results are estimates.</li>
                <li className="body">AI answers can be wrong. Check the sources under each one.</li>
                <li className="body">Match scores are a guide for reading, not a safety certification.</li>
                <li className="body">Where a test table and a report disagree, Vesta shows both with a quality flag instead of choosing one.</li>
              </ul>
            </div>
            <div className="stack g4" id="stack">
              <div className="stack g1">
                <span className="label">Tech stack</span>
                <h2 className="h3">Built with</h2>
              </div>
              <div className="row g2 wrapx">
                {["Next.js", "React", "TypeScript", "Tailwind CSS", "Bun", "Netlify", "Python", "OpenRouter"].map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sources and credits */}
      <section className="sec" id="sources" aria-labelledby="sources-title">
        <div className="wrap stack g5">
          <SectionHead label="Sources and credits" title="Every source we used" id="sources-title" />
          <p className="body muted">
            Data and text on this site come from these sources. Non-NASA articles are linked only; their text isn&apos;t stored.
          </p>
          <div className="stack">
            <SourceGroup title="NASA PSI data sets" count={studies.length}>
              <ul className="stack g3 cite-list">
                {studies.map((s) => (
                  <li key={s.id} className="stack g1">
                    <External href={s.psi_url}>
                      {s.short_name} ({s.psi_id}): {s.full_name}
                    </External>
                    <span className="small muted">
                      {[s.authors.map(formatAuthor).join(", "), "NASA PSI Data Repository", s.citation_year].filter(Boolean).join(". ")}
                      {s.doi && (
                        <>
                          {". "}
                          <External href={`https://doi.org/${s.doi}`}>DOI {s.doi}</External>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </SourceGroup>
            <SourceGroup title="NASA reports (NTRS)" count={NTRS_CITATIONS.length}>
              <CitationList items={NTRS_CITATIONS} />
            </SourceGroup>
            <SourceGroup title="NASA Spinoff and technology pages" count={SPINOFF_CITATIONS.length}>
              <CitationList items={SPINOFF_CITATIONS} />
            </SourceGroup>
            <SourceGroup title="Challenge resources and NASA web pages" count={NASA_WEB_CITATIONS.length}>
              <CitationList items={NASA_WEB_CITATIONS} />
            </SourceGroup>
            <SourceGroup title="Articles that aren't NASA's, linked only" count={OTHER_CITATIONS.length}>
              <CitationList items={OTHER_CITATIONS} />
            </SourceGroup>
            <SourceGroup title="NASA images" count={getGallery().length}>
              <CitationList items={getGallery().map((g) => ({ title: g.caption, detail: `NASA, ${g.studyName}`, label: g.psiId, url: g.psiUrl }))} />
            </SourceGroup>
            <SourceGroup title="Code, fonts and icons" count={SOFTWARE_CREDITS.length}>
              <CitationList items={SOFTWARE_CREDITS} />
            </SourceGroup>
            <SourceGroup title="AI tools and models" count={AI_CREDITS.length}>
              <CitationList items={AI_CREDITS} />
            </SourceGroup>
          </div>
          <p className="small muted" style={{ maxWidth: "72ch" }}>
            License: {SITE.name}&apos;s own code and content are under the{" "}
            <External href={`${SITE.githubUrl}/blob/main/LICENSE`}>{SITE.codeLicense} license</External>. NASA data, reports and other
            third-party materials keep their own terms (see the{" "}
            <External href={`${SITE.githubUrl}/blob/main/NOTICE`}>NOTICE</External> file). {SITE.disclaimer}
          </p>
        </div>
      </section>

      <section className="wrap pb-16">
        <div className="cta">
          <div className="stack g2">
            <h2 className="h2">Start with one flame</h2>
            <p className="lead">Take the 10-chapter journey, plan a mission, or take the data with you.</p>
          </div>
          <div className="row g3 wrapx">
            <Link className="btn btn-primary" href="/learn/journey">
              Start the journey
            </Link>
            <Link className="btn btn-secondary" href="/planner">
              Plan a mission
            </Link>
            <Link className="btn btn-secondary" href="/data">
              Get the data
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
