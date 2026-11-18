-- Seasonal card notes (2026-11-18). NOT APPLIED. The owner applies it, after the Japan trip (toogo-rules 6). Safe to run twice.
-- Spec: seasons SPEC.md (owner-approved, 18 Nov 2026).
--
-- WHY
--   Some cards give weather or season advice for December only ("closed 28-31 Dec", "cold, bring a coat"). Toogo is for any
--   season. Each card gets a few season notes in one new column, and a trip shows the one that matches its dates. The general
--   text fields are rewritten to read true in any month (that is data, done by scripts/seasonal-apply.mjs, not by this file).
--
-- THE COLUMN  seasonal jsonb, nullable (null = nothing seasonal), on place_library and candidates:
--   { "winter": {"he": "...", "en": "..."}, "spring": {...}, "summer": {...}, "autumn": {...},
--     "only": ["winter"],
--     "dated": [ {"from": "2026-12-28", "to": "2026-12-31", "he": "...", "en": "..."} ] }
--   Every key is optional. The check is light on purpose (it is a read-only note, nothing in the planner reads it): an object,
--   under 8000 bytes (four seasons in Hebrew and English plus a few dated lines are about 3000).
--
-- EVERY PATH THAT COPIES A CARD NOW CARRIES `seasonal` (found by reading all of supabase/sql):
--   1. library -> trip, bulk (Discover open):   sync_library(tid)   insert of new cards AND a new update step that copies
--                                               seasonal into cards already in the trip (a note added to the library later reaches
--                                               trips that have the card). Same approved-only rule as the other updates.
--   2. library -> trip, one new card by name:   fill_plan_facts()   (trigger candidates_plan_facts, before insert on candidates)
--   3. trip -> library (a member adds a place): card_to_library()   (trigger candidates_to_library). A member-made library card
--                                               is inserted unapproved and inactive; promotion_ready_at only queues it for the
--                                               admin, approve_library_card() changes no text. So the insert is the one place
--                                               a trip card's content reaches the library, and it now carries seasonal.
--   Not changed on purpose: card_to_library's "same place in 2+ trips" vote (no content copied), refresh() in card-facts (hours only).
--   Edge functions that write cards (card-facts, suggest-place, and the client's AddPlace insert) are changed in their own files.
--   Nothing reads candidates through a view or an RPC with a column list (the app reads select('*')), so no view or RPC changes.
--
-- WHERE EACH FUNCTION'S TEXT CAME FROM (current definition = the newest SQL file that defines it)
--   sync_library     2026-11-16-library-poisoning.sql section 5 (newest). That version DROPPED the one-sync-per-trip advisory lock
--                    that 2026-11-14-sync-library-speed.sql added (looks like an oversight when it was copied: its comment says
--                    "the updates ... unchanged" and the lock is not mentioned). This file puts the lock back. If you decide the
--                    lock should stay out, delete the one `if not pg_try_advisory_xact_lock` line below.
--   card_to_library  2026-11-16-library-poisoning.sql section 4 (newest; supersedes 2026-11-09-security-fixes.sql).
--   fill_plan_facts  2026-11-09-security-fixes.sql section 3 (newest; nothing later redefines it).
--   So 2026-11-16-library-poisoning.sql must be applied FIRST (this file needs place_library.approved and candidates.source). The
--   check below stops with a clear message if it was not.
--
-- PRECHECK (read-only, on LIVE; save the result outside the repo: it is the rollback text)
--   select proname, pg_get_functiondef(oid) from pg_proc
--    where pronamespace = 'public'::regnamespace and proname in ('sync_library', 'card_to_library', 'fill_plan_facts');
--
-- VERIFY AFTER (read-only)
--   select table_name, column_name, data_type from information_schema.columns
--    where table_schema = 'public' and column_name = 'seasonal';                     -- place_library and candidates, jsonb
--   select count(*) from public.place_library where seasonal is not null;            -- 0 until scripts/seasonal-apply.mjs's file is run
--   select pg_get_functiondef('public.sync_library(uuid)'::regprocedure) like '%l.seasonal%';   -- true
--
-- ROLLBACK (commented at the end).

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'place_library' and column_name = 'approved')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidates' and column_name = 'source') then
    raise exception 'apply 2026-11-16-library-poisoning.sql first (place_library.approved and candidates.source are missing)';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------------------------------------------
alter table public.place_library add column if not exists seasonal jsonb;
alter table public.candidates add column if not exists seasonal jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'place_library_seasonal_check') then
    alter table public.place_library add constraint place_library_seasonal_check
      check (seasonal is null or (jsonb_typeof(seasonal) = 'object' and pg_column_size(seasonal) < 8000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'candidates_seasonal_check') then
    alter table public.candidates add constraint candidates_seasonal_check
      check (seasonal is null or (jsonb_typeof(seasonal) = 'object' and pg_column_size(seasonal) < 8000));
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- 2. fill_plan_facts: a new card with the name of a library card gets that card's seasonal notes with its plan facts
--    (text from 2026-11-09-security-fixes.sql; one line added: new.seasonal)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.fill_plan_facts()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare l public.place_library;
begin
  if new.facts_at is not null then return new; end if;
  select * into l from public.place_library x
   where x.facts_at is not null
     and (x.active or x.added_from_trip = new.trip_id)
     and (x.id = new.library_id or public.same_place_name(x.name, new.name))
   order by (x.id is not distinct from new.library_id) desc limit 1;
  if found then
    new.opens := l.opens; new.closes := l.closes; new.closed_weekdays := l.closed_weekdays;
    new.closed_dates := l.closed_dates; new.open_dates := l.open_dates; new.best_time := l.best_time;
    new.visit_mins := l.visit_mins; new.booking := l.booking; new.plan_line := l.plan_line;
    new.baby_block := l.baby_block; new.facts_at := l.facts_at; new.facts_sure := l.facts_sure;
    new.address := coalesce(new.address, l.address); new.en := coalesce(new.en, l.en);
    new.seasonal := coalesce(new.seasonal, l.seasonal);
  end if;
  return new;
end
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 3. card_to_library: a trip card that makes a new library card brings its seasonal notes
--    (text from 2026-11-16-library-poisoning.sql section 4; one column added to the insert: seasonal)
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
                                     facts_at, facts_sure, address, en, tags, seasonal, active, approved, added_from_trip)
    values (new.name, new.name_ja, new.city, new.area, new.category, new.lat, new.lng, new.coord_precision, new.hype,
            new.reality, new.verdict, new.tabelog_score, new.google_score, new.price, null, '{}', new.audience,
            new.baby_notes, new.local_pick, null, null, null, null, '{}', new.serves, new.dishes, new.todo, new.special,
            new.highlights, new.time_needed, new.kosher, new.kosher_note,
            new.opens, new.closes, new.closed_weekdays, new.closed_dates, new.open_dates, new.best_time, new.visit_mins,
            new.booking, new.plan_line, new.baby_block, new.facts_at, new.facts_sure, new.address, new.en,
            coalesce(new.tags, '{}'), new.seasonal, false, false, new.trip_id)
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
-- 4. sync_library: new cards come with seasonal, and a note added to the library later reaches cards already in the trip
--    (text from 2026-11-16-library-poisoning.sql section 5, plus the advisory lock from 2026-11-14-sync-library-speed.sql;
--     added: l.seasonal in the insert, and the update step marked "seasonal")
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
  -- one sync per trip at a time (2026-11-14, scale test; in sync-library-speed.sql, missing from the poisoning file's copy)
  if not pg_try_advisory_xact_lock(hashtextextended('sync_library:' || tid::text, 0)) then return 0; end if;

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
                                baby_block, facts_at, facts_sure, address, en, tags, seasonal, source)
  select tid, l.id, l.name, l.name_ja, l.city, l.area, l.category, l.lat, l.lng, l.coord_precision,
         l.hype, l.reality, l.verdict, l.tabelog_score, l.google_score, l.price, l.tip, l.sources, 'סקאוטים',
         l.audience, l.baby_notes, l.local_pick, l.maps_url, l.website_url, l.instagram_url, l.tiktok_url, l.photos,
         l.serves, l.dishes, l.todo, l.special, l.highlights, l.time_needed, l.kosher, l.kosher_note,
         l.opens, l.closes, l.closed_weekdays, l.closed_dates, l.open_dates, l.best_time, l.visit_mins, l.booking, l.plan_line,
         l.baby_block, l.facts_at, l.facts_sure, l.address, l.en, l.tags, l.seasonal, 'library'
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
  -- seasonal (new): not tied to facts_at, since it is not a planner fact; a library card with no seasonal notes leaves the trip's alone
  update public.candidates c set seasonal = l.seasonal
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and l.approved and l.seasonal is not null and c.seasonal is distinct from l.seasonal;
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
-- ROLLBACK (commented; run only if something breaks)
-- ---------------------------------------------------------------------------------------------------------------
-- 1. the three functions go back to the text saved from the PRECHECK (or re-run: sync_library and card_to_library from
--    2026-11-16-library-poisoning.sql, fill_plan_facts from 2026-11-09-security-fixes.sql).
-- 2. the column is harmless to leave. To remove it (only after step 1, the new functions read it):
--      alter table public.candidates drop constraint if exists candidates_seasonal_check;
--      alter table public.place_library drop constraint if exists place_library_seasonal_check;
--      alter table public.candidates drop column if exists seasonal;
--      alter table public.place_library drop column if exists seasonal;
