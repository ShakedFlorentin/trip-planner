---
title: Backend book, table of contents
chapter: start
explains: []
---
Read this first. The backend is Supabase (Postgres + RLS + edge functions in Deno). The owner applies SQL and deploys; agents write files and steps (toogo-rules 6, 9). Skills to read with this book: `toogo-rules`, `toogo-supabase-prelaunch`, `toogo-backend-craft` (link, not copied).

| Page | What it answers |
|---|---|
| supabase-map | Which tables exist, grouped |
| sql-files-status | Which `supabase/sql/` files are live and which are not applied |
| rls-and-membership | RLS model, `is_trip_member`, grants |
| triggers | block_new_users, swipes_match, check_same_trip, live_change and the rest |
| functions-overview | Every edge function in one table: auth, limits, who calls it |
| functions-ai | suggest-place, parse-booking, translate |
| functions-cards | card-photos, card-facts, review-photo |
| functions-other | plan-trip, notify, sign-up |
| guard-shared | `_shared/guard.ts` and the other shared files |
| ai-cost-controls | ai_take, ai_usage, ai_calls, credits (off), trip pass |
| deploys | deploy-function.yml, run-sql.yml and the ask-first rule |
| planner-brief | plan-trip in brief: what it reads and writes |

Source of truth: `supabase/sql/2026-11-02-live-baseline.sql` (snapshot, reference only), `docs/HANDOFF.md`, `docs/qa-2026-11-16.md`. If a page and the code disagree, the code wins; fix the page.
Related books: security (threats, guards), cards (library model), build (release).
