---
title: Web build and Pages deploy
chapter: web
explains:
  - outboxFetch
  - startOutbox
---
**Build** (`package.json`): `npm run build` = `tsc -b && vite build && node scripts/pages/build-pages.mjs`. Dev: `npm run dev`. Node 22 in CI.
- `vite.config.ts`: plugin `precache-list` fills `public/sw.js` in `dist` with the build's hashed file list and a version (hash of the list and some photo bytes), and defines `import.meta.env.VITE_BUILD` (shown in problem reports as `app_version`).
- `scripts/pages/build-pages.mjs`: plain HTML search pages per city, Hebrew `/japan/<city>/` and English `/en/japan/<city>/`, sitemap, robots, privacy page; made from `data/pages/cards.json` and `_shared/areas.ts`, no AI. A city needs at least 8 cards (`MIN_CARDS`). Refresh the data with `npm run pages:data` (reads the library).

**Deploy** (`.github/workflows/deploy.yml`): every push to `main` and manual runs: checkout, Node 22, `npm ci`, `npm run build`, upload `dist`, `actions/deploy-pages`. Concurrency group `pages` cancels older runs. Live URL is in HANDOFF. There is no test step in CI: tests are run before the owner pushes (see release-checklist).
Consequence: pushing to main is a production release for the phones that run the web version (they run web, memory note), and QA flagged "every push to main auto-deploys". Never push risky work to main before the trip ends.

**Service worker** (`public/sw.js`): precaches the shell under cache name `shell-<VERSION>`; every deploy changes the version, so a new build swaps the cache. Pages are network-first with a 4 s timeout (`NAV_TIMEOUT`) then the cached page; photos and map tiles are kept (`MAX_PHOTOS` 400, `MAX_TILES` 600); Supabase is never cached (the app keeps its own copy). `skipWaiting` on install.
- QA (live, high, cfdb3cc says fixed): on a slow connection (over 4 s) the phone kept the old build; `addAll` is all-or-nothing; 1.2 MB re-download per deploy; update check only after 60 s hidden; a captive portal can poison the cache.
- Test: `node scripts/sw-test.mjs`.

**Offline queue**: writes go through `outboxFetch` / `startOutbox` in `src/outbox.ts`; see the frontend/data pages. Known: no fetch timeout was the freeze in weak signal (fixed on main per cfdb3cc).
Related: ios, release-checklist, backend book (deploys).
