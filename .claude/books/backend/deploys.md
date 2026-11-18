---
title: How deploys work
chapter: ops
explains: []
---
**Rule: ask the owner first.** Agents do not deploy functions, apply SQL, commit, push or branch (toogo-rules 6, 9). Until the Japan trip ends (Dec 2026) no risky deploys: planner, where-to-stay, anything that touches bookings or expenses. Write the file and the exact steps; the owner runs them.

**Web app** (`.github/workflows/deploy.yml`): every push to `main` (and manual run) builds with Node 22 (`npm ci`, `npm run build`) and publishes `dist` to GitHub Pages. So merging to main IS a production release for phones running the web version. See the build book.

**Edge function** (`deploy-function.yml`): manual only (`workflow_dispatch`), from `main` only, input is a choice of five: plan-trip, suggest-place, card-photos, card-facts, parse-booking. Needs repo secret `SUPABASE_ACCESS_TOKEN`. It runs `supabase functions deploy <name> --use-api --yes` with CLI 3.1.0. The JWT flag is per function: plan-trip, card-photos, card-facts get `--no-verify-jwt` (they check the planner token or the user themselves); parse-booking and suggest-place get no flag.
- Discrepancy to check: the comment in the file says suggest-place has the gateway check off, but the `case` gives it no flag. Look at the live `verify_jwt` before the first deploy (the comment says so too). The app's browser preflight carries no JWT.
- translate, notify, review-photo, sign-up are not in the list: the owner deploys them by hand. Deploys must include `_shared/` files and the folder's `ai-log.ts`.
- After a deploy, the owner compares live source with git (HANDOFF records "live code checked equal to git").

**SQL** (`run-sql.yml`): manual only, from `main`, input is a path that must match `supabase/sql/<name>.sql`; prints the file's sha256, then posts it to the Management API `database/query`. Files run in one request: keep them idempotent. The SQL editor is the other route.

**Before any deploy**: read open reports (`select * from public.reports where status = 'open'`), see issue-fixer book.
**Order for risky change**: prechecks, rehearsal on a copy, SQL, function, client behind a flag (`app_settings.features.*`), rehearsal with a new account. Delete-account order is in qa-2026-11-16.md.
Switches without a deploy: `app_settings.features` (live, push, trip_pass, google_signin, counting).
Related: sql-files-status, build book (release-checklist).
