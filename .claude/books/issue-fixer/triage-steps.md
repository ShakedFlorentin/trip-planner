---
title: Triage steps
chapter: rules
explains: []
---
Do these in order. The owner runs anything on the live database; you work from files and a query result the owner pastes, or the owner's approval.

1. **Read the open reports** (owner runs `select r.*, t.name as trip from public.reports r join public.trips t on t.id = r.trip_id where r.status = 'open' order by r.created_at`). Note reporter, screen, `app_version`, device, date.
2. **Sort by who.** Owner's own: go on. Someone else's: list and wait for approval (rules page).
3. **Classify.** Wrong data on the screen? A crash? A missing string? Is it one of the known QA items (`docs/qa-2026-11-16.md`)? Does it ask for something on the never-on-a-report-alone list? Then `wontfix` with a reply.
4. **Restate it as what the user sees** when it is fixed. Check that the named screen and the real signal are the same thing.
5. **Reproduce on fixtures**, not on the real trip: write the failing case first (`scripts/plan-fixtures/` or a `scripts/*-test.mjs`), see it fail.
6. **Fix small**, one logical change, files named in the report. Hebrew and English together.
7. **Run the ship check** (`npx tsc --noEmit -p .`, `npm run build`, `node scripts/i18n-check.mjs`, plus the matching test). For UI: Playwright with Supabase mocked, Hebrew and English screenshots.
8. **Hand to the owner**: files changed, test output, a draft Hebrew `reply`, and the SQL the owner would run to set `status`, `reply`, `resolved_at` (the owner runs it). Say what was not checked.
9. **After the owner publishes**, the owner sets `status = 'fixed'` or `'wontfix'`.
Related: rules, where-logs.
