# Vesta

**Fire bends the rules in space. Know it before it knows you.**

Vesta is a website that summarizes, ranks and explains NASA's microgravity fire experiments, so engineers, researchers and students can plan fire safety for spacecraft, space stations, Moon and Mars bases, and rovers. It covers the three fire-safety jobs: preventing fires, detecting smoke and putting fires out.

Built by Team Neural Nebula for the [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/), challenge "Flame in Freefall." Not an official NASA website.

## What you can do

- **Planner:** rank the studies for a mission (ISS, Moon base, Mars base, rover or your own conditions) and save the ranking as a PDF.
- **Explore:** search and filter all 24 studies, each with its own page.
- **Compare:** put 2 or 3 studies side by side.
- **Insights:** findings for preventing, detecting and putting out fires, plus the gaps in the data.
- **Data:** browse every test and download it as CSV or JSON.
- **Learn and Journey:** interactive explainers and a 10-chapter guided story.
- **Earth benefits:** how space fire research helps on Earth.
- **Ask AI:** questions answered from NASA sources, with the sources under each answer.

## The data

- 24 NASA studies (19 flown in space, 5 on the ground) from NASA's [Physical Sciences Informatics (PSI)](https://psi.nasa.gov/) system, with 1,807 tests.
- NASA reports from the [NASA Technical Reports Server (NTRS)](https://ntrs.nasa.gov/), NASA Spinoff and NASA web pages.
- Python scripts cleaned the tables (units, typos, quality flags) and saved everything as JSON files in `data/`, which ship with the site. There is no database.

## How AI was used

- Summaries, findings and ranking reasons were written once, ahead of time, by ERNIE 5.5 Flash (Baidu) and Nemotron 3.5 Super VL (NVIDIA) through OpenRouter. A script then checked their numbers against the sources.
- Ask AI and the Compare explanation answer live, using only our NASA sources, and cite them.
- Match scores are computed from the NASA test tables by code, not by AI.
- Every AI-written text on the site is labeled "AI-written."
- The logo was created with AI tools.
- Claude Code (Anthropic) assisted with development.

## Run it locally

You need [Bun](https://bun.sh/). For Ask AI, add an [OpenRouter](https://openrouter.ai/) key to a `.env` file in the project folder: `OPENROUTER_API_KEY=your-key`.

```
bun install
bun run dev:ai
```

Then open http://localhost:3000. Without a key, everything else still works, and the suggested Ask AI questions still show their saved answers.

## Sources and credits

- **NASA data and reports:** 24 PSI data sets, 22 NTRS reports, 8 NASA Spinoff and technology pages, and 12 NASA web pages and challenge resources.
- **NASA images:** 7 photos from the PSI records of ACME E-FIELD Flames, ACME Flame Design and ACME CFI-G, credited to NASA.
- **Linked only, not stored:** 2 articles that aren't NASA's (Tech Briefs and EurekAlert!).
- **Code, fonts and icons:** Next.js, React, TypeScript, Tailwind CSS, Bun, Lucide icons, the Archivo and Atkinson Hyperlegible fonts (Google Fonts, SIL Open Font License), and Python with Requests and PyMuPDF for the data prep.
- **AI tools:** Claude Code (Anthropic), ERNIE 5.5 Flash (Baidu), Nemotron 3.5 Super VL (NVIDIA) and OpenRouter.

Every source is listed with its link on the site's About page, under "Sources and credits."

## License

Vesta's own code and content are under the [Apache License 2.0](LICENSE). NASA data, reports and other third-party materials keep their own terms (see [NOTICE](NOTICE)).
