---
title: SQL files, live or not
chapter: data
explains: []
---
SQL lives in `supabase/sql/`, dated. File headers go stale, so this page uses `docs/HANDOFF.md` and the headers together. "Unknown" means neither says; ask the owner before relying on it. Nobody but the owner applies SQL (via the SQL editor or the run-sql workflow).

**Live (applied)**
- `2026-10-28-trip-planner`, `2026-10-28-match-by-who-is-there`
- `2026-11-02`: live-baseline (snapshot only), trip-stays, discovery, reviews-sharing, credits, credits-fixes, privacy (HANDOFF "applied")
- `2026-11-09-security-fixes` (ai_take shared ceiling, invites rules), `2026-11-09-new-city-cards`
- `2026-11-13`: app-settings, events, events-cleanup (run 13 Nov), city-route
- `2026-11-14`: create-trip-guard, revoke-secret-getters, live-v2, sync-library-speed, replan-while-running, look-time, push, trip-pass

**Not applied (written, waiting)**
- `2026-11-14-places-insert-via-match` (rule 3: no direct place insert; apply only after phones run the new app)
- `2026-11-14-leave-trip` (needs `former_members` from delete-account, which is in the other checkout)
- `2026-11-16-library-poisoning` (approval of member cards, see cards book)
- `2026-11-16-open-signup` (only on branch local-signup-android)
- All of these wait until after the trip (31 Dec 2026), toogo-rules 6.

**Unknown, check first**
`2026-11-01-docs-bucket-types`, `2026-11-02-food`, `2026-11-02-baby`, `2026-11-02-solo-couple-both-like`, `2026-11-05-photo-submissions`, `2026-11-12-recheck-hours`, `2026-11-13-google-signin`, `2026-11-13-new-cities`, `2026-11-11-ptitim-yapanit-cards`, `2026-11-08-design-review`.

Stale header example: create-trip-guard says the other 2026-11-14 files wait, but HANDOFF records live-v2, push and trip-pass as applied. Trust HANDOFF, then ask.

Rules for a new file: dated name, idempotent ("safe to run twice"), header with what it does, what breaks if applied in the wrong order, and rollback. No DELETE/DROP words in migrations (the MCP approval prompt times out; keep deletes in edge functions). `rollback-create_trip-before-2026-11-14-guard.sql` is the pattern for a rollback file.
Related: deploys, supabase-map.
