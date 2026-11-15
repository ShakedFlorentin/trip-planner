-- Library poisoning fix (security audit finding 1). NOT APPLIED. The owner applies it, after the Japan trip (docs: toogo-rules 6).
--
-- THE HOLE
--   card_to_library (2026-11-09-security-fixes.sql) built the shared place_library card from the FIRST member's text, links and
--   photos, and switched it ON as soon as a second trip creator added the same name. sync_library (2026-11-14-sync-library-speed.sql)
--   then pushed that card, links and photos included, into every trip in the city on every sync. place_library_safe_links did
--   not cover `sources`. Two accounts (or one friend and one fake) were enough to put their own text and links in everyone's Discover.
--
-- WHAT THIS FILE DOES (all idempotent; no deletes of rows, nothing is dropped except the old trigger bodies it replaces)
--   1. Approval by an admin, not by a count. place_library.approved (default true, so every card that exists or is seeded by SQL
--      keeps working). card_to_library now inserts a member-made card with approved = false, active = false, and when the old
--      "2 trips by 2 people" rule is met it only stamps promotion_ready_at (a queue for the admin). Nothing member-written goes
--      live by itself. A trigger makes "active but not approved" impossible, so every reader of `active` (RLS, sync_library,
--      fill_plan_facts, suggest-place's library match) stays correct with no change. An admin approves with
--      approve_library_card(id) (app admins only), or the owner in the SQL editor: update place_library set approved = true, active = true.
--      Why this and not "rebuild from server research": it is the least disruptive. It re-uses the existing "an admin sets
--      active" path from 2026-11-02-privacy.sql, needs no new Claude call (toogo-rules 2) and no new function; a card costs
--      the admin one look.
--   2. card_to_library never copies member links, sources or photos into the library (a new card gets empty ones), and a
--      card that came from a shared plan (candidates.source = 'shared_import') neither creates a library card nor votes.
--   3. place_library_safe_links now also cleans `sources` (http/https only).
--   4. candidates get the same cleaning trigger on maps_url, website_url, instagram_url, tiktok_url, photos and sources.
--      It runs on future writes only; candidates already stored (the real trip's included) are NOT rewritten here.
--   5. candidates.source text not null default 'member' ('shared_import' = copied from a shared plan, 'library' = copied by
--      sync_library). The client already writes 'shared_import' (src/views/SharedPlan.tsx) and needs this column.
--   6. sync_library: every update step that copies library text, facts, links or photos into a trip's linked candidate now
--      requires the library card to be approved, and a library card with no photos no longer wipes the trip's own photos.
--   7. photo_submissions.source ('member' | 'server'): card-photos puts the photos it finds for a library card it did not create
--      in this queue (service role) instead of overwriting the shared card. A member cannot insert source 'server'.
--
-- PRECHECK (read-only, on LIVE; send me the output if anything surprises you)
--   select count(*) filter (where active) as active_total,
--          count(*) filter (where active and added_from_trip is not null) as active_member_made,
--          count(*) filter (where not active and added_from_trip is not null) as waiting_member_made
--     from public.place_library;
--   -- active_member_made is what step 6 below switches off until you approve it again. Look at them first:
--   select id, name, city, added_from_trip, sources, maps_url, website_url, photos from public.place_library
--    where active and added_from_trip is not null order by created_at;
--   select proname, pg_get_functiondef(oid) from pg_proc where proname in ('card_to_library', 'sync_library', 'place_library_safe_links') and pronamespace = 'public'::regnamespace;
--   -- save that last result outside the repo: it is the rollback for the three functions.
--
-- VERIFY AFTER (read-only)
--   select count(*) from public.place_library where active and not approved;                -- 0
--   select count(*) from public.place_library where not approved and (photos <> '{}' or sources <> '{}' or maps_url is not null or website_url is not null);   -- 0
--   select tgname from pg_trigger where tgrelid in ('public.candidates'::regclass, 'public.place_library'::regclass) and not tgisinternal order by 1;   -- includes candidates_safe_links, place_library_guard
--   -- candidates already stored with a link that is not http(s) (read only; this file does not touch them):
--   select count(*) from public.candidates where (maps_url is not null and public.http_url_or_null(maps_url) is null)
--      or (website_url is not null and public.http_url_or_null(website_url) is null)
--      or (instagram_url is not null and public.http_url_or_null(instagram_url) is null)
--      or (tiktok_url is not null and public.http_url_or_null(tiktok_url) is null);
--   -- the admin's queue of places two people added:
--   select id, name, city, promotion_ready_at from public.place_library where not approved and promotion_ready_at is not null order by promotion_ready_at;
--
-- ROLLBACK is at the end of the file (commented). Run it only if something breaks.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------------------------------------------
alter table public.place_library add column if not exists approved boolean not null default true;
alter table public.place_library add column if not exists promotion_ready_at timestamptz;
alter table public.candidates add column if not exists source text not null default 'member';
alter table public.photo_submissions add column if not exists source text not null default 'member';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photo_submissions_source_check') then
    alter table public.photo_submissions add constraint photo_submissions_source_check check (source in ('member', 'server')) not valid;
  end if;
end $$;

-- a member adds only their own photos; 'server' rows are written by card-photos with the service role
alter policy photo_submissions_add on public.photo_submissions
  with check (
    user_id = (select auth.uid())
    and public.is_trip_member(trip_id)
    and status = 'pending' and public_url is null and reviewed_at is null and reviewed_by is null
    and source = 'member'
    and path ~ ('^' || trip_id::text || '/' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$')
    and exists (select 1 from public.candidates c where c.trip_id = photo_submissions.trip_id and c.library_id = photo_submissions.library_id)
    and public.my_pending_photos() < 20
  );

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Links cleaned on the library and on candidates (http / https only)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.http_url_or_null(u text)
returns text
language sql
immutable
set search_path to ''
as $$ select case when u ~* '^https?://[^[:space:]]+$' then u end $$;

create or replace function public.place_library_safe_links()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.maps_url := public.http_url_or_null(new.maps_url);
  new.website_url := public.http_url_or_null(new.website_url);
  new.instagram_url := public.http_url_or_null(new.instagram_url);
  new.tiktok_url := public.http_url_or_null(new.tiktok_url);
  new.photos := coalesce((select array_agg(p) from unnest(new.photos) p where public.http_url_or_null(p) is not null), '{}');
  new.sources := coalesce((select array_agg(s) from unnest(new.sources) s where public.http_url_or_null(s) is not null), '{}');
  return new;
end $$;

create or replace function public.candidates_safe_links()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.maps_url := public.http_url_or_null(new.maps_url);
  new.website_url := public.http_url_or_null(new.website_url);
  new.instagram_url := public.http_url_or_null(new.instagram_url);
  new.tiktok_url := public.http_url_or_null(new.tiktok_url);
  if new.photos is not null then
    new.photos := coalesce((select array_agg(p) from unnest(new.photos) p where public.http_url_or_null(p) is not null), '{}');
  end if;
  if new.sources is not null then
    new.sources := coalesce((select array_agg(s) from unnest(new.sources) s where public.http_url_or_null(s) is not null), '{}');
  end if;
  return new;
end $$;

-- named so that it runs before candidates_to_library (triggers of one event fire in name order)
create or replace trigger candidates_safe_links
  before insert or update of maps_url, website_url, instagram_url, tiktok_url, photos, sources on public.candidates
  for each row execute function public.candidates_safe_links();

-- ---------------------------------------------------------------------------------------------------------------
-- 3. "Active" means "approved": a member-made card cannot be switched on without an admin
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.place_library_guard()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  -- only an admin (or the owner in the SQL editor / the service role, where there is no signed-in user) approves a card
  if new.approved and (tg_op = 'INSERT' or not old.approved) and auth.uid() is not null and not public.is_app_admin() then
    raise exception 'only an admin approves a library card';
  end if;
  if new.active and not new.approved then
    raise exception 'a library card made by a member is switched on with approve_library_card(), not by setting active';
  end if;
  return new;
end $$;

create or replace trigger place_library_guard
  before insert or update on public.place_library
  for each row execute function public.place_library_guard();

create or replace function public.approve_library_card(lid uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.is_app_admin() then raise exception 'admins only'; end if;
  update public.place_library set approved = true, active = true where id = lid;
  if not found then raise exception 'no such library card'; end if;
end $$;
revoke execute on function public.approve_library_card(uuid) from public, anon;
grant execute on function public.approve_library_card(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 4. card_to_library: no member links or photos in the library, no auto-activation, shared imports do not vote
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.card_to_library()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare lid uuid; on_now boolean;
begin
  -- a library_id sent with the card is kept only when it points at a card this trip may see
  if new.library_id is not null then
    if exists (select 1 from public.place_library l
                where l.id = new.library_id and (l.active or l.added_from_trip = new.trip_id)) then
      return new;
    end if;
    new.library_id := null;
  end if;
  select l.id, l.active into lid, on_now from public.place_library l
   where public.norm_name(l.name) = public.norm_name(new.name) limit 1;
  -- a card copied from someone's shared plan: linked to a live library card of the same name, never creates one, never votes
  if new.source = 'shared_import' then
    if on_now then new.library_id := lid; end if;
    return new;
  end if;
  if lid is null then
    -- A new shared card starts off and unapproved. It is visible only to the trip that made it, and it carries NO links,
    -- sources or photos of the member's: an admin adds those (or approves the card as it is) when reviewing.
    insert into public.place_library(name, name_ja, city, area, category, lat, lng, coord_precision, hype, reality, verdict,
                                     tabelog_score, google_score, price, tip, sources, audience, baby_notes, local_pick,
                                     maps_url, website_url, instagram_url, tiktok_url, photos, serves, dishes, todo, special,
                                     highlights, time_needed, kosher, kosher_note, opens, closes, closed_weekdays,
                                     closed_dates, open_dates, best_time, visit_mins, booking, plan_line, baby_block,
                                     facts_at, facts_sure, address, en, tags, active, approved, added_from_trip)
    values (new.name, new.name_ja, new.city, new.area, new.category, new.lat, new.lng, new.coord_precision, new.hype,
            new.reality, new.verdict, new.tabelog_score, new.google_score, new.price, null, '{}', new.audience,
            new.baby_notes, new.local_pick, null, null, null, null, '{}', new.serves, new.dishes, new.todo, new.special,
            new.highlights, new.time_needed, new.kosher, new.kosher_note,
            new.opens, new.closes, new.closed_weekdays, new.closed_dates, new.open_dates, new.best_time, new.visit_mins,
            new.booking, new.plan_line, new.baby_block, new.facts_at, new.facts_sure, new.address, new.en,
            coalesce(new.tags, '{}'), false, false, new.trip_id)
    returning id into lid;
    on_now := false;
  end if;
  new.library_id := lid;
  -- The old rule (the same place in 2+ trips made by 2+ different people) now only puts the card in the admin's queue.
  -- Cards copied from a shared plan or by sync_library are not votes.
  if not on_now and (
       select count(distinct t.who) from (
         select coalesce(tr.created_by::text, tr.id::text) as who
           from public.candidates c join public.trips tr on tr.id = c.trip_id
          where c.trip_id <> new.trip_id and c.source not in ('shared_import', 'library')
            and (c.library_id = lid or public.same_place_name(c.name, new.name))
         union all
         select coalesce(tr.created_by::text, tr.id::text) from public.trips tr where tr.id = new.trip_id) t) >= 2 then
    update public.place_library set promotion_ready_at = coalesce(promotion_ready_at, now()) where id = lid and not active;
  end if;
  return new;
end
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 5. sync_library: only approved library cards are pushed into trips
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.sync_library(tid uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare n int; trip_cities text[];
begin
  if not public.is_trip_member(tid) then raise exception 'not a member'; end if;

  trip_cities := array(
    select s.city from public.trip_stays s where s.trip_id = tid and s.city is not null
    union
    select x from public.members m join public.profiles pr on pr.user_id = m.user_id,
      jsonb_array_elements_text(case when jsonb_typeof(pr.answers->'cities') = 'array' then pr.answers->'cities' else '[]'::jsonb end) x
     where m.trip_id = tid);

  with fresh as materialized (
    select l.id, public.name_words(l.name) w
      from public.place_library l
     where l.active and l.approved
       and (l.city is null
            or l.city in ('tokyo', 'yokohama', 'kyoto', 'osaka', 'nara', 'daytrip')
            or l.city = any(trip_cities))
       and not exists (select 1 from public.candidates c where c.trip_id = tid and c.library_id = l.id)
       and not exists (select 1 from public.candidates c where c.trip_id = tid and public.norm_name(c.name) = public.norm_name(l.name))
  ),
  mine as materialized (
    select public.name_words(c.name) w from public.candidates c where c.trip_id = tid
  ),
  new_ids as (
    select f.id from fresh f
     where not exists (
       select 1 from mine m
        where cardinality(f.w) > 0 and cardinality(m.w) > 0 and (f.w <@ m.w or m.w <@ f.w)
          and exists (select 1 from unnest(case when cardinality(f.w) <= cardinality(m.w) then f.w else m.w end) x
                       where length(x) >= 4
                         and x <> all (array['aquarium', 'museum', 'temple', 'shrine', 'park', 'market', 'tower', 'station',
                                             'cafe', 'coffee', 'ramen', 'sushi', 'garden', 'street', 'shopping', 'tempura',
                                             'onsen', 'castle', 'hotel', 'tokyo', 'kyoto', 'osaka', 'nara', 'japan',
                                             'yokocho', 'depachika', 'food', 'restaurant', 'izakaya', 'kitchen'])))
  )
  insert into public.candidates(trip_id, library_id, name, name_ja, city, area, category, lat, lng, coord_precision,
                                hype, reality, verdict, tabelog_score, google_score, price, tip, sources, added_by,
                                audience, baby_notes, local_pick, maps_url, website_url, instagram_url, tiktok_url, photos,
                                serves, dishes, todo, special, highlights, time_needed, kosher, kosher_note,
                                opens, closes, closed_weekdays, closed_dates, open_dates, best_time, visit_mins, booking, plan_line,
                                baby_block, facts_at, facts_sure, address, en, tags, source)
  select tid, l.id, l.name, l.name_ja, l.city, l.area, l.category, l.lat, l.lng, l.coord_precision,
         l.hype, l.reality, l.verdict, l.tabelog_score, l.google_score, l.price, l.tip, l.sources, 'סקאוטים',
         l.audience, l.baby_notes, l.local_pick, l.maps_url, l.website_url, l.instagram_url, l.tiktok_url, l.photos,
         l.serves, l.dishes, l.todo, l.special, l.highlights, l.time_needed, l.kosher, l.kosher_note,
         l.opens, l.closes, l.closed_weekdays, l.closed_dates, l.open_dates, l.best_time, l.visit_mins, l.booking, l.plan_line,
         l.baby_block, l.facts_at, l.facts_sure, l.address, l.en, l.tags, 'library'
    from public.place_library l
   where l.id in (select id from new_ids)
  on conflict do nothing;
  get diagnostics n = row_count;

  -- The updates below copy library text, links and photos into candidates that are already in the trip. They run only
  -- from an APPROVED card: a card nobody reviewed (one a trip made, or two accounts "promoted") never overwrites a trip's copy.
  -- A library card with no photos keeps the trip's own (card-photos found them for the trip's card).
  update public.candidates c
     set maps_url = l.maps_url, website_url = l.website_url, instagram_url = l.instagram_url,
         tiktok_url = l.tiktok_url,
         photos = case when cardinality(l.photos) > 0 then l.photos else c.photos end,
         lat = coalesce(l.lat, c.lat), lng = coalesce(l.lng, c.lng), coord_precision = l.coord_precision,
         address = coalesce(l.address, c.address)
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and l.approved
     and (c.maps_url, c.website_url, c.instagram_url, c.tiktok_url, c.photos, c.lat, c.lng, c.address)
         is distinct from (l.maps_url, l.website_url, l.instagram_url, l.tiktok_url,
                           case when cardinality(l.photos) > 0 then l.photos else c.photos end,
                           l.lat, l.lng, coalesce(l.address, c.address));
  update public.candidates c set en = l.en
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and l.approved and l.en is not null and c.en is distinct from l.en;
  update public.candidates c set tags = l.tags
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and l.approved and cardinality(l.tags) > 0 and c.tags is distinct from l.tags;
  update public.candidates c
     set opens = l.opens, closes = l.closes, closed_weekdays = l.closed_weekdays, closed_dates = l.closed_dates,
         open_dates = l.open_dates, best_time = l.best_time, visit_mins = l.visit_mins, booking = l.booking,
         plan_line = l.plan_line, baby_block = l.baby_block, facts_at = l.facts_at, facts_sure = l.facts_sure
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and l.approved and l.facts_at is not null
     and (c.facts_at is null or c.facts_at < l.facts_at);
  update public.places p
     set url = coalesce(p.url, c.maps_url), instagram_url = c.instagram_url, tiktok_url = c.tiktok_url,
         photos = c.photos, lat = c.lat, lng = c.lng
    from public.candidates c
   where p.trip_id = tid and p.candidate_id = c.id
     and (p.instagram_url, p.tiktok_url, p.photos, p.lat, p.lng)
         is distinct from (c.instagram_url, c.tiktok_url, c.photos, c.lat, c.lng);
  return n;
end $function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 6. One-time cleanup of what the old rules already stored
-- ---------------------------------------------------------------------------------------------------------------
-- Cards a member made (still linked to their trip) lose approval and the switch: they wait for an admin. Cards already
-- copied into trips keep their copies. To keep one live after you have looked at it:
--   select public.approve_library_card('<id>');      -- signed in as an admin, or in the SQL editor:
--   update public.place_library set approved = true, active = true where id = '<id>';
update public.place_library set active = false, approved = false where added_from_trip is not null and (active or approved);
-- and what such a card carries of the member's own links, sources and photos goes (an admin adds the right ones)
update public.place_library
   set maps_url = null, website_url = null, instagram_url = null, tiktok_url = null, photos = '{}', sources = '{}'
 where not approved;
-- sources of every card: http/https only (place_library_safe_links does it on the write)
update public.place_library set sources = sources
 where exists (select 1 from unnest(sources) s where public.http_url_or_null(s) is null);

-- ---------------------------------------------------------------------------------------------------------------
-- ROLLBACK (commented; run only if something breaks, in this order)
-- ---------------------------------------------------------------------------------------------------------------
-- 1. the three functions go back to the text saved from the PRECHECK (or re-run the definitions in these files):
--      card_to_library          2026-11-09-security-fixes.sql  (the second create or replace function public.card_to_library, from "-- a library_id sent with the card" to its end)
--      sync_library             2026-11-14-sync-library-speed.sql
--      place_library_safe_links 2026-11-02-privacy.sql
--    Re-running the old card_to_library switches auto-activation back on, and its insert has no `approved` column, so the
--    new default (true) applies: that is the old hole again. Do it only if sync must work at once.
-- 2. the new triggers and the admin function:
--      drop trigger if exists place_library_guard on public.place_library;
--      drop trigger if exists candidates_safe_links on public.candidates;
--      drop function if exists public.place_library_guard();
--      drop function if exists public.candidates_safe_links();
--      drop function if exists public.approve_library_card(uuid);
-- 3. the policy goes back to the one in 2026-11-05-photo-submissions.sql (same text without the line "and source = 'member'"):
--      alter policy photo_submissions_add on public.photo_submissions with check ( ...that file's expression... );
-- 4. cards that were switched off by step 6 are switched back on (only if you decide the old behaviour is wanted):
--      update public.place_library set approved = true where not approved;   -- then: update public.place_library set active = true where id in (...the ids from the PRECHECK list...);
-- 5. columns. Keep candidates.source (the app writes it); the others are harmless and can stay:
--      alter table public.place_library drop column if exists promotion_ready_at;
--      alter table public.photo_submissions drop constraint if exists photo_submissions_source_check;
--      alter table public.photo_submissions drop column if exists source;
--      alter table public.place_library drop column if exists approved;   -- only after 1: the guard trigger and the new functions read it
-- Links and photos that step 6 cleared on member-made cards are not restored by a rollback (they were the member's own, not the library's).
