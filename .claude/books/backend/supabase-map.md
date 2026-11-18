---
title: Supabase map
chapter: data
explains:
  - settingInt
  - featureOn
---
Project ref lives in the workflows (`PROJECT_REF`). All app tables are in `public`; ids are uuid. The baseline snapshot `supabase/sql/2026-11-02-live-baseline.sql` has the first 17 tables; later files add the rest (`create table` lines in each dated file).

**Trip data (members only, RLS `is_trip_member`)**
`trips`, `members`, `day_info`, `bookings`, `itinerary_items`, `places`, `candidates` (the swipe cards of a trip), `swipes`, `checklist_items`, `essentials`, `expenses`, `trip_stays`, `place_ratings`, `reports`, `plan_state` (planner lease and `dirty` flag), `shared_plans` (share links, readable through `get_shared_plan`).

**Shared library (any signed-in user reads active rows)**
`place_library` (the card library, see the cards book), `place_facts`, `geo_cache`, `cities` (route, ideal nights, season), `library_interest` and `library_interest_base` (how cards do on other trips), `photo_submissions` and `app_admins`.

**Accounts**
`profiles` (questionnaire answers), `invites`, `push_subscriptions`, `notifications_sent`.

**AI and money (server only)**
`ai_usage` (call counter per user and function), `ai_calls` (token and cost log), `place_lookups`, `credit_ledger`, `credit_prices`, `credit_unlimited_trips`, `app_flags`, `trip_passes`, `trip_place_uses`.

**Ops**
`app_settings` (numbers and feature switches read at run time, 60 s cache in `settingInt` / `featureOn`), `events` (usage counting, admins read, kept 12 months).

Storage buckets: `card-photos` (public), `photo-submissions` (private), the booking-documents bucket (trip-member policies; its policies are not in the repo, see qa report). Realtime: private Broadcast topic `live:<trip id>`.

Gotcha: tables over 1,000 rows are cut silently by the API read limit (QA, "Scale"). The real trip is under it.
Related: sql-files-status, rls-and-membership.
