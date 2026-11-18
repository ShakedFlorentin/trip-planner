---
title: Testing safely
chapter: 1
explains: [outboxFetch, TableStore, ErrorBoundary]
---
Rule 11 of `.claude/skills/toogo-rules/SKILL.md` wins over everything here: never run the app with a real account.

## Where tests may run
- The "Toogo Test" iOS simulator (or a fresh one), never one that is already signed in.
- A browser with Supabase mocked, made-up data only.
- Node scripts in `scripts/` (no network, no database).

## If you find a real session
Stop, touch nothing, report it. No real trip data in screenshots or scratch files.

## Mocked browser run
1. Build to a temp dir, `vite preview --port 4190` (see `.claude/skills/toogo-ship-check/SKILL.md`).
2. In Playwright, answer every Supabase call with `page.route('**/*supabase.co/**', ...)`: REST tables, auth, storage, functions and the realtime websocket. Anything not answered must fail loudly, not pass through.
3. Seed a made-up user and trip in local storage so the gate chain (see frontend `01-app-shell.md`) opens `TripApp`.
4. Drive the screen at 390x844, in Hebrew and English.

## Fixtures
- Planner: `scripts/plan-fixtures/*.json` (see 07).
- Script tests build their own fake fetch, fake clock and fake storage; no real data.

## Never
SQL on the live project, a planner run on the real trip, a deploy, a commit. See `docs/HANDOFF.md` "How to verify a change".

Related: 03, 09.
