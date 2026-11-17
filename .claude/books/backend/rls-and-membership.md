---
title: RLS model and is_trip_member
chapter: data
explains: []
---
Every `public` table has row-level security on. Trip tables use one pattern: policy `<table>_all` for role `authenticated`, `using (is_trip_member(trip_id)) with check (is_trip_member(trip_id))` (baseline lines ~1178+).

`public.is_trip_member(tid uuid)` is SQL, STABLE, SECURITY DEFINER, `search_path ''`: true when `members` has a row with this trip and `auth.uid()`. It is also used in policies on storage (`photo-submissions` upload folder = trip id), by `live_topic_member(topic)` for Realtime, and by edge functions (`plan-trip` calls it with the caller's JWT).

**Facts verified live on 16 Nov (QA)**
- Members have UPDATE only on `display_name`, so nobody can move into another trip.
- The booking-documents bucket policies are scoped to the trip's members.
- Backup copies of real bookings/expenses cannot be read by app users.

**Known open**
- `places_all` still allows a direct insert (rule 3); fix file `2026-11-14-places-insert-via-match.sql` is not applied.
- Join code is about 40 bits, 10 attempts an hour per user: brute-forceable once sign-up opens.
- `events` can be flooded by anyone through anon `track`.
- Some functions still have anon EXECUTE; any member can edit or delete any booking or expense (maybe by design).
- `shared_plans` slug and snapshot are chosen by the client.

**Secret-bearing functions**: `get_anthropic_key()` and `get_planner_token()` read the Vault and are SECURITY DEFINER. Since `2026-11-14-revoke-secret-getters.sql` (applied) only `service_role` may execute them. New SECURITY DEFINER functions need an explicit `revoke ... from public, anon` (Postgres grants EXECUTE to PUBLIC by default), and `set search_path to ''`.

**How to test a policy**: as a normal user, not the service role. A policy only read is "read review only" (toogo-supabase-prelaunch).
Related: triggers, security book (storage-and-push).
