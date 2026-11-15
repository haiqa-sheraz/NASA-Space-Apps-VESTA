# Vesta development log

NASA Space Apps Challenge 2026, "Flame in Freefall". One line per step: the time (Jeddah, AST, UTC+3), what was built, and which AI tool helped.

The planning notes (READ_ME_FIRST.md, DESIGN_BRIEF.md, READ_ME_AFTER_IMPLEMENTATION.md) were written before the event, as research and planning. All project code was written during the event window, which started Saturday, November 14, 2026, 9:00 a.m. Jeddah time.

| Time (AST) | What was built | AI help |
|---|---|---|
| 2026-11-14 15:40 | Step 1: app shell (Next.js, Tailwind, Bun), design tokens, top bar, footer, routes | Claude Code |
| 2026-11-14 17:06 | Step 2: Home, Explore, Study pages, Planner; Apache 2.0 license | Claude Code |
| 2026-11-14 17:51 | Step 2 follow-ups: rounded numbers, "Flame science" tag, problem statement link | Claude Code |
| 2026-11-14 19:48 | Home badge and "Not an official NASA website." footer line | Claude Code |
| 2026-11-14 21:25 | Step 3: Compare, Insights, Data with CSV and JSON downloads | Claude Code |
| 2026-11-14 22:33 | Step 4: Learn, Journey (10 chapters), Earth benefits, About | Claude Code |
| 2026-11-14 23:42 | About page wording; console error fix | Claude Code |
| 2026-11-15 00:03 | Mission picker and Simple/Expert moved onto the pages they affect; quality flags reviewed; Data prediction tool | Claude Code |
| 2026-11-15 02:10 | Step 5: Ask AI and Compare explanation (keyword search over NASA passages, Netlify Functions, OpenRouter free models with fallbacks, saved answers); fixed CLD Flame and BRE fuel name typos | Claude Code |
| 2026-11-15 02:40 | Step 5 follow-ups: SPICE negative air rates marked missing and flagged; planning notes updated for no database | Claude Code |
| 2026-11-15 03:37 | Ask AI remembers the last two answers for follow-ups; Step 6: flame morph and first-load motion, journey crossfade, ranked rows re-sort, explainer motion, reduced-motion versions | Claude Code |
| 2026-11-15 11:58 | Step 7: About the team, own logo in the top bar, footer and About, favicons, first-visit page reveals on 6 pages; section links stop below the top bar | Claude Code |
| 2026-11-15 13:06 | Page reveals longer (about 2 to 2.4 s), on every visit, Journey bloom on every chapter; Earth flame redrawn as a real candle flame with flicker; smoke drawn as billowing grey gas; Home opens on the Earth flame | Claude Code |
| 2026-11-15 13:41 | Planner reveal redrawn as realistic flickering fire that fades in place; Home spotlight picker stays right, no Custom there; Earth benefits in the main menu (header collapses below 1024 px) | Claude Code |
| 2026-11-15 14:38 | Filled the last 12 saved Ask AI answers; README; Save as PDF on Planner and Compare; NASA flame gallery (Learn and study pages) with lightbox | Claude Code |
| 2026-11-15 15:24 | Data page: "Will the flame go out?" machine-learning model (logistic regression on 261 FLEX tests) with map of real tests and living flame; replaces the nearest-tests predictor; linked from FLEX; About and credits updated | Claude Code |
| 2026-11-15 15:53 | Flame-out tool: "drop broke apart" shown in the living flame (bursts of burning bits, flash and jolt) from the 7 most similar real tests, with counts | Claude Code |
| 2026-11-15 16:17 | Flame-out tool: bursts removed; the living flame acts out the most likely ending (goes out, burns to the end, breaks apart) | Claude Code |
| 2026-11-15 16:29 | Flame-out map: selecting a real test's dot loads its conditions and the flame shows how that test really ended | Claude Code |
