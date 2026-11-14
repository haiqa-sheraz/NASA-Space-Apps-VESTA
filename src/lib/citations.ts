import { SITE } from "@/lib/site";
import { ntrsUrl } from "@/lib/sources";

/**
 * The full source list for About ("Sources and credits"), from the project's citation list
 * (citations_updated.docx, checked November 14, 2026). The 24 PSI data sets are listed from
 * data/studies.json on the page itself.
 */

export interface Citation {
  title: string;
  /** Authors, publisher or venue, shown as one line. */
  detail?: string;
  year?: string;
  url: string;
  /** Short label, such as "NTRS 20160000593". */
  label?: string;
}

const ntrs = (id: string, title: string, detail: string, year?: string): Citation => ({
  title,
  detail,
  year,
  url: ntrsUrl(id),
  label: `NTRS ${id}`,
});

/** NASA Technical Reports Server records. */
export const NTRS_CITATIONS: Citation[] = [
  ntrs("20020090888", "Space Technology for the Fire Department", "Spinoff 1986, NASA", "1986"),
  ntrs("20030099676", "Smoke Mask", "Spinoff 2003, NASA", "2003"),
  ntrs("20040142397", "FLEX: Flammability and Extinction Investigations", "Michael C. Hicks. Conference and Workshop on Strategic Research to Enable NASA's Exploration Missions, NASA/CP-2004-213205/VOL1", "2004"),
  ntrs("20090014827", "Smoke Point In Co-flow Experiment (SPICE)", "David L. Urban, Peter B. Sunderland, Zeng-guang Yuan. Experiment description, NASA Glenn Research Center", "2009"),
  ntrs("20120015928", "FLEX: A Decisive Step Forward in NASA's Combustion Research Program", "J. Mark Hickman, Daniel L. Dietrich, Michael C. Hicks and others. 1st Annual International Space Station Research and Development Conference", "2012"),
  ntrs("20130000422", "Particle Morphology and Size Results from the Smoke Aerosol Measurement Experiment-2", "David L. Urban, Gary A. Ruff, Paul S. Greenberg and others. 42nd International Conference on Environmental Systems, AIAA 2012-3536", "2012"),
  ntrs("20130011664", "Development of the ISS Fine Water Mist Portable Fire Extinguisher", "NASA"),
  ntrs("20130014061", "Methanol Droplet Combustion in Oxygen-Inert Environments in Microgravity", "Vedha Nayagam, Daniel L. Dietrich, Michael C. Hicks, Forman A. Williams. 8th U.S. National Combustion Meeting", "2013"),
  ntrs("20140006750", "Cool-Flame Extinction during n-Alkane Droplet Combustion in Microgravity", "Vedha Nayagam, Daniel L. Dietrich, Michael C. Hicks, Forman A. Williams. Spring Technical Meeting of the Central States Section of the Combustion Institute", "2014"),
  ntrs("20140011099", "Thickness and Fuel Preheating Effects on Material Flammability in Microgravity from the BASS Experiment", "Paul V. Ferkul, Sandra L. Olson, Fumiaki Takahashi and others. American Society for Gravitational and Space Research 2013 Annual Meeting", "2013"),
  ntrs("20150003025", "Saffire Offgas Testing Strategy", "Vanessa Buchanan, Emily Henry, Susana Harper. 2015 NASA-JAXA Materials and Processes Technical Interchange Meeting", "2015"),
  ntrs("20150019858", "Results from On-Board CSA-CP and CDM Sensor Readings during the Burning and Suppression of Solids - II (BASS-II) Experiment in the Microgravity Science Glovebox (MSG)", "Sandra L. Olson, Paul V. Ferkul, Subrata Bhattacharjee and others. 45th International Conference on Environmental Systems, ICES-2015-196", "2015"),
  ntrs("20150021491", "Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere", "Jason R. Norcross, Johnny Conkin, James H. Wessel III and others. NASA Johnson Space Center, Human Research Program", "2015"),
  ntrs("20150023456", "Detailed Results From the Flame Extinguishment Experiment (FLEX) March 2009 to December 2011", "Daniel L. Dietrich, Paul V. Ferkul, Victoria M. Bryg and others. NASA/TP-2015-216046", "2015"),
  ntrs("20160000593", "Combustion of Solids in Microgravity: Results from the BASS-II Experiment", "Paul V. Ferkul, Subrata Bhattacharjee, Carlos Fernandez-Pello and others. 30th Annual American Society for Gravitational and Space Research Conference", "2014"),
  ntrs("20170001636", "The Spacecraft Fire Experiment (Saffire): Objectives, Development and Status", "William Schoren, Gary A. Ruff, David L. Urban. International Association for the Advancement of Space Safety Conference 2016", "2016"),
  ntrs("20180005168", "Saffire: A Novel Approach to Study of Spacecraft Fire Safety Using Un-manned Spacecraft", "David L. Urban, Paul Ferkul, Sandra Olson and others. 33rd Annual Meeting of the American Society for Gravitational and Space Research", "2017"),
  ntrs("20210011385", "Burning and Suppression of Solids-II (BASS-II) Summary Report", "Sandra L. Olson, Paul V. Ferkul, Subrata Bhattacharjee and others. NASA/TM-20210011385", "2021"),
  ntrs("20210015913", "Advanced Combustion via Microgravity Experiments (ACME) on the International Space Station (ISS)", "Dennis P. Stocker. Poster PS-03403, NASA Glenn Research Center", "2021"),
  ntrs("20210022143", "NASA fire detection white paper", "NASA", "2021"),
  ntrs("20220015583", "ACME: Advanced Combustion via Microgravity Experiments", "Dennis P. Stocker. 13th U.S. National Combustion Meeting, poster PS-03790", "2023"),
  ntrs("20250010653", "Lunar Combustion Investigation: Flammability Results from a Rotating Sounding Rocket", "Paul V. Ferkul, Michael C. Johnston, Nathan Kralik, Ya-Ting Liao. 2025 Annual Meeting of the American Society for Gravitational and Space Research", "2025"),
];

/** NASA Spinoff and technology pages behind the Earth benefits. */
export const SPINOFF_CITATIONS: Citation[] = [
  { title: "Fireman's Air Tanks", detail: "NASA Spinoff", year: "1976", url: "https://spinoff.nasa.gov/node/9582" },
  { title: "Fire Detector", detail: "NASA Spinoff", year: "1978", url: "https://spinoff.nasa.gov/node/9407" },
  { title: "New Technology for the Fire Attire", detail: "NASA Spinoff", year: "1982", url: "https://spinoff.nasa.gov/node/9918" },
  { title: "NASA Technologies and Emergency First Responders", detail: "Daniel Lockney, Douglas A. Comstock. AIAA SPACE 2009 Conference, AIAA 2009-6536 (NASA Spinoff)", year: "2009", url: "https://spinoff.nasa.gov/pdf/PV2009_6536.pdf" },
  { title: "Zero-Leak Valve Holds Tight in Demanding Environments", detail: "NASA Spinoff", year: "2020", url: "https://spinoff.nasa.gov/node/11065" },
  { title: "Spaceship Storage Tanks Take Off on Earth", detail: "NASA Spinoff", url: "https://www.nasa.gov/technology/tech-transfer-spinoffs/spaceship-storage-tanks-take-off-on-earth/" },
  { title: "Multi-Parameter Aerosol Scattering Sensor (MPASS), LEW-TOPS-19", detail: "NASA Technology Transfer portal", url: "https://technology.nasa.gov/patent/LEW-TOPS-19" },
  { title: "Studying Combustion and Fire Safety", detail: "NASA", url: "https://www.nasa.gov/missions/station/iss-research/studying-combustion-and-fire-safety/" },
];

/** The challenge's official resources and other NASA web pages. */
export const NASA_WEB_CITATIONS: Citation[] = [
  ...(SITE.challengeUrl ? [{ title: `${SITE.challengeName} (problem statement)`, detail: "NASA Space Apps Challenge", year: "2026", url: SITE.challengeUrl }] : []),
  { title: "A Researcher's Guide to Combustion Science", detail: "NASA (web page)", url: "https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/" },
  {
    title: "A Researcher's Guide to International Space Station Combustion Science",
    detail: "NASA (PDF)",
    year: "2015",
    url: "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
  },
  { title: "Combustion Science", detail: "NASA Glenn Research Center", url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/" },
  {
    title: "Flammability of Materials on the Moon (FM2)",
    detail: "NASA Glenn Research Center",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/",
  },
  {
    title: "Solid Fuel Ignition and Extinction (SoFIE)",
    detail: "NASA Glenn Research Center",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/solid-fuel-ignition-and-extinction-sofie/",
  },
  {
    title: "Flammability Limits at Reduced-g Experiment (FLARE)",
    detail: "NASA Glenn Research Center",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-limits-at-reduced-g-experiment-flare/",
  },
  {
    title: "Fluids and Combustion Facility",
    detail: "NASA Glenn Research Center",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/science-facilities-on-the-iss/fluids-combustion-facility/",
  },
  { title: "NASA ScienceCasts: The Power of Studying Combustion on the ISS", detail: "NASA (video)", url: "https://www.youtube.com/watch?v=W1oXykoz9zg" },
  { title: "Apollo 1", detail: "NASA Safety Center", url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1" },
  { title: "Apollo 13", detail: "NASA Safety Center", url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13" },
  { title: "25 Years Ago: Fire Aboard Space Station Mir", detail: "NASA", year: "2022", url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/" },
];

/** Articles that aren't NASA's: used as background only, and linked rather than stored. */
export const OTHER_CITATIONS: Citation[] = [
  { title: "NASA Experiment Measures Smoke in Space", detail: "Tech Briefs", url: "https://www.techbriefs.com/component/content/article/12913-nasa-experiment-measures-smoke-in-space" },
  {
    title: "Studying flames in microgravity is helping make combustion on Earth cleaner, and space safer",
    detail: "EurekAlert!",
    url: "https://www.eurekalert.org/news-releases/575615",
  },
];

/** Code libraries, fonts and icons, with their licenses (versions as installed). */
export const SOFTWARE_CREDITS: Citation[] = [
  { title: "Next.js", detail: "Vercel, MIT license", url: "https://nextjs.org/" },
  { title: "React", detail: "Meta, MIT license", url: "https://react.dev/" },
  { title: "TypeScript", detail: "Microsoft, Apache License 2.0", url: "https://www.typescriptlang.org/" },
  { title: "Tailwind CSS", detail: "Tailwind Labs, MIT license", url: "https://tailwindcss.com/" },
  { title: "Lucide icons (lucide-react)", detail: "ISC license", url: "https://lucide.dev/" },
  { title: "Bun", detail: "Package manager and runtime, MIT license", url: "https://bun.sh/" },
  { title: "Archivo", detail: "Font by Omnibus-Type, SIL Open Font License, from Google Fonts", url: "https://fonts.google.com/specimen/Archivo" },
  { title: "Atkinson Hyperlegible", detail: "Font by the Braille Institute, SIL Open Font License, from Google Fonts", url: "https://fonts.google.com/specimen/Atkinson+Hyperlegible" },
  { title: "Python", detail: "Data prep scripts, Python Software Foundation License", url: "https://www.python.org/" },
  { title: "Requests", detail: "Python library for the AI calls in data prep, Apache License 2.0", url: "https://requests.readthedocs.io/" },
  { title: "PyMuPDF", detail: "Python library for reading the PDF reports in data prep, GNU AGPL 3.0", url: "https://pymupdf.readthedocs.io/" },
];

/** AI tools and models. */
export const AI_CREDITS: Citation[] = [
  { title: "Claude Code", detail: "Anthropic, with the Claude Opus 5.5 model: assisted in code generation and development", url: "https://code.claude.com/docs" },
  { title: "ERNIE 5.5 Flash", detail: "Baidu, baidu/ernie-5.5-flash-preview:free on OpenRouter: wrote the saved summaries, results, findings, stories and ranking reasons", url: "https://openrouter.ai/" },
  { title: "Nemotron 3.5 Super VL", detail: "NVIDIA, nvidia/nemotron-3.5-super-vl:free on OpenRouter: read scanned pages and wrote study profiles when ERNIE failed", url: "https://openrouter.ai/" },
  { title: "OpenRouter", detail: "The service the AI models were called through", url: "https://openrouter.ai/" },
];
