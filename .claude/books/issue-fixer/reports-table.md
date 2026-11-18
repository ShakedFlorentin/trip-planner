---
title: The reports table
chapter: data
explains:
  - reportStatus
  - reportKey
---
Defined in `supabase/sql/2026-11-02-live-baseline.sql` (line ~1114).

Columns: `id` uuid, `trip_id` (FK to trips, cascade), `user_id` (default `auth.uid()`, FK to auth.users, cascade), `reporter` (display name), `body` (1 to 2000 chars after trim), `screen` (up to 100), `app_version` (up to 40, the build id), `device` (up to 300, the phone's user agent), `status` (`open` default, `fixed`, `wontfix`), `reply` (Hebrew text shown to the reporter), `created_at`, `resolved_at`. Index `(trip_id, created_at desc)`.

Policies: `reports_insert` (the row's `user_id` is the caller and the caller is a member of `trip_id`), `reports_select` (any member of the trip). There is no update or delete policy for app users: only the owner or the service role sets `status`, `reply`, `resolved_at`.

Things to know
- All members of a trip see all of that trip's reports (the screen copy does not say so; QA medium).
- The full user agent is stored (QA: more than needed). Reports are kept forever though the privacy page says 2 years (no code does it).
- Reading all trips' reports needs the service role or the SQL editor: `select * from public.reports where status = 'open'` has no trip filter on purpose, so the owner sees every trip, including trips other people made without the owner. Show each with its trip's name.
- Statuses in the client: `STATUS` map in `Report.tsx` has `open`, `fixed`, `wontfix`. A row still in the phone's outbox has no `status` and no `id`; `reportStatus` treats it as open and `reportKey` falls back to `created_at`. (QA found `STATUS[undefined]` crashing the app when a queued report was tapped "handled"; the helpers were added for it.)
Related: report-flow, rules.
