-- A place can enter `places` only through swipe-and-match (owner's rule 3). No client insert any more.
-- DO NOT APPLY BEFORE THE TRIP ENDS (31 Dec 2026): the owner applies it.
-- APPLY ONLY AFTER the app version without "ישר לרשימה" (AddPlace.tsx) and the PlaceForm create path (Places.tsx) is what the
-- phones run: from the moment this is applied, those two calls get a 403 (see OPEN QUESTIONS).
--
-- WHAT I FOUND (repo, read 14 Nov)
--   Today policy "places_all" (baseline ~line 1196) is FOR ALL to authenticated, using/with check is_trip_member(trip_id), so any
--   member can insert straight into places through the API.
--   The match path does NOT go through the client: swipes -> trigger swipes_match -> on_swipe() -> match_place(cid), all
--   SECURITY DEFINER with search_path '' (baseline 288 / 438; later versions in 2026-11-02-discovery.sql, baby.sql,
--   solo-couple-both-like.sql and design-review.sql patch the same function). match_place inserts the row with added_by
--   'מאצ׳' (and updates/deletes places it created). Edge functions (plan-trip, card-photos, review-photo) only update places,
--   through the service role. No other SQL function inserts into places (grep "insert into public.places": only match_place).
--   Client inserts into places (HEAD): AddPlace.tsx:428 ("ישר לרשימה") and Places.tsx:611 (PlaceForm without an id). The
--   board decided to remove both; a typed place becomes a Discover candidate (candidates insert, then a swipe) instead.
--   So no new RPC is needed: the match path already runs as the table owner, which is not subject to RLS. The fix is to drop
--   INSERT from the member policy: split FOR ALL into select / update / delete, and also revoke the INSERT privilege.
--
-- WHAT IT CHANGES ON THE LIVE DATABASE
--   1. Refuses to run (raises, changes nothing) if another permissive policy on places could still allow an insert.
--   2. Drops policy places_all; creates places_select, places_update, places_delete with the same member condition.
--   3. revoke insert on public.places from authenticated, anon (service_role and the owner keep it).
--   No row is touched. Reads, updates, deletes by members work exactly as before.
--
-- PRECHECK (read-only, run all four first)
--   a) policies on places (expect exactly places_all):
--      select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'places';
--   b) the match path runs as the table owner and RLS is not forced (expect prosecdef true for all three; owner = relowner;
--      relforcerowsecurity false):
--      select p.proname, p.prosecdef, pg_get_userbyid(p.proowner) as fn_owner
--        from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('match_place', 'on_swipe');
--      select pg_get_userbyid(relowner) as table_owner, relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.places'::regclass;
--   c) every function that writes places (expect only match_place):
--      select proname, prosecdef from pg_proc where pronamespace = 'public'::regnamespace and prosrc ~* 'insert\s+into\s+(public\.)?places';
--   d) the trigger that fires on swipes (expect swipes_match -> on_swipe):
--      select tgname, pg_get_triggerdef(oid) from pg_trigger where tgrelid = 'public.swipes'::regclass and not tgisinternal;
--
-- OPEN QUESTIONS (could not confirm from the repo)
--   1. Live bodies of match_place / on_swipe may differ from the repo (they were patched with DO blocks reading the live text).
--      Precheck b) and c) answer it. If match_place is not SECURITY DEFINER live, do NOT apply: matching would stop creating places.
--   2. Stale clients: the iOS bundle is frozen in the binary; a phone that still has the old build gets a 403 on "ישר לרשימה"
--      and PlaceForm-create. src/outbox.ts replays an offline places POST and drops it on a 4xx (the QA "dropped row" finding), so
--      a place queued offline before this is applied is lost silently. Apply when no one has queued writes.
--   3. UPDATE is left as is (members edit notes, who, visited, ...). A member of two trips could still move a place with
--      trip_id/candidate_id edits; places_same_trip only checks the candidate's trip. Not closed here, not a new gap.
--   4. A user in a solo trip (or match_threshold 1) who adds a candidate and likes it gets a place at once: that is swipe and
--      match as the rule allows, not a bypass.
--
-- ROLLBACK (puts the old FOR ALL policy and the insert privilege back)
--   drop policy if exists "places_select" on public.places;
--   drop policy if exists "places_update" on public.places;
--   drop policy if exists "places_delete" on public.places;
--   create policy "places_all" on public.places as permissive for all to authenticated
--     using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
--   grant insert on public.places to authenticated;
--
-- Idempotent: the guard ignores places_all and our own three; drops are `if exists`; creates are skipped when present.

do $do$
declare other text;
begin
  select string_agg(policyname || ' (' || cmd || ')', ', ') into other
    from pg_policies
   where schemaname = 'public' and tablename = 'places' and permissive = 'PERMISSIVE'
     and cmd in ('INSERT', 'ALL')
     and policyname not in ('places_all');
  if other is not null then
    raise exception 'another policy on places may allow insert: %. Read it and decide; nothing changed.', other;
  end if;

  drop policy if exists "places_all" on public.places;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'places' and policyname = 'places_select') then
    create policy "places_select" on public.places as permissive for select to authenticated
      using (public.is_trip_member(trip_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'places' and policyname = 'places_update') then
    create policy "places_update" on public.places as permissive for update to authenticated
      using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'places' and policyname = 'places_delete') then
    create policy "places_delete" on public.places as permissive for delete to authenticated
      using (public.is_trip_member(trip_id));
  end if;
end
$do$;

revoke insert on public.places from authenticated, anon;

-- VERIFY AFTER (read-only): policies are places_select / places_update / places_delete and none has cmd INSERT or ALL
--   select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'places' order by 1;
--   select has_table_privilege('authenticated', 'public.places', 'insert');   -- false
-- Then, on the rehearsal copy only: as an authenticated member, `insert into places ...` must fail; a swipe that makes a match
-- must still create the place.
