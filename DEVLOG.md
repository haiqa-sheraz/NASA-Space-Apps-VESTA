# Vesta development log

NASA Space Apps Challenge 2026, "Flame in Freefall". One line per step: the time (Jeddah, AST, UTC+3), what was built, and which AI tool helped.

The planning notes (READ_ME_FIRST.md, DESIGN_BRIEF.md, READ_ME_AFTER_IMPLEMENTATION.md) were written before the event, as research and planning. All project code was written during the event window, which started Saturday, November 14, 2026, 9:00 a.m. Jeddah time.

| Time (AST) | What was built | AI help |
|---|---|---|
| 2026-11-14 15:40 | Step 1, app shell: Next.js (App Router, TypeScript) with Tailwind v4 and Bun; design tokens as CSS variables (dark Ember black, light Ash) mapped into Tailwind; Archivo and Atkinson Hyperlegible from Google Fonts; top bar with main menu, More menu, mission picker, Simple/Expert switch and Ask; phone menu; Ask panel shell and floating Ask button; footer with stats counted from data/; routes for every page; global mission and reading-level state saved in the browser | Claude Code (Claude Opus 5.5) wrote the code from the approved Claude Design mockups and DESIGN_BRIEF.md |
