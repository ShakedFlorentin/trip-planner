-- sync_library, fast (stress test 2026-11-14, docs/stress-test-2026-11-14.md).
-- The old check "is this library card already in the trip" was
--   not exists (select 1 from candidates c where c.trip_id = tid and (c.library_id = l.id or same_place_name(c.name, l.name)))
-- which runs same_place_name (two regex word splits) for every library card × every card of the trip: about 340,000
-- calls on the Japan trip, well past the 8 s limit for signed-in users. It timed out on every Discover open, so new
-- library cards stopped reaching trips (the Japan trip was missing 66 active cards).
-- Now, with the same result:
--   1. cards already in the trip by library_id or by exact name (both indexed) are dropped first;
--   2. only the cards left (tens, not thousands) get the fuzzy name check, and each name is split into words once,
--      not once per pair (the rule is same_place_name's, written out over the word lists).
--   3. the cities the trip goes to (stays, members' questionnaire answers) are read once, not once per library card.
-- The updates after the insert are unchanged.
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
     where l.active
       and (l.city is null
            or l.city in ('tokyo', 'yokohama', 'kyoto', 'osaka', 'nara', 'daytrip')
            or l.city = any(trip_cities))
       and not exists (select 1 from public.candidates c where c.trip_id = tid and c.library_id = l.id)
       and not exists (select 1 from public.candidates c where c.trip_id = tid and public.norm_name(c.name) = public.norm_name(l.name))
  ),
  mine as materialized (
    select public.name_words(c.name) w from public.candidates c where c.trip_id = tid
  ),
  -- same_place_name's word rule: one name's words all in the other's, and a word of 4+ letters in the shorter one
  -- that isn't a common word
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
                                baby_block, facts_at, facts_sure, address, en, tags)
  select tid, l.id, l.name, l.name_ja, l.city, l.area, l.category, l.lat, l.lng, l.coord_precision,
         l.hype, l.reality, l.verdict, l.tabelog_score, l.google_score, l.price, l.tip, l.sources, 'סקאוטים',
         l.audience, l.baby_notes, l.local_pick, l.maps_url, l.website_url, l.instagram_url, l.tiktok_url, l.photos,
         l.serves, l.dishes, l.todo, l.special, l.highlights, l.time_needed, l.kosher, l.kosher_note,
         l.opens, l.closes, l.closed_weekdays, l.closed_dates, l.open_dates, l.best_time, l.visit_mins, l.booking, l.plan_line,
         l.baby_block, l.facts_at, l.facts_sure, l.address, l.en, l.tags
    from public.place_library l
   where l.id in (select id from new_ids)
  on conflict do nothing;
  get diagnostics n = row_count;

  update public.candidates c
     set maps_url = l.maps_url, website_url = l.website_url, instagram_url = l.instagram_url,
         tiktok_url = l.tiktok_url, photos = l.photos,
         lat = coalesce(l.lat, c.lat), lng = coalesce(l.lng, c.lng), coord_precision = l.coord_precision,
         address = coalesce(l.address, c.address)
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id
     and (c.maps_url, c.instagram_url, c.tiktok_url, c.photos, c.lat, c.lng, c.address)
         is distinct from (l.maps_url, l.instagram_url, l.tiktok_url, l.photos, l.lat, l.lng, coalesce(l.address, c.address));
  update public.candidates c set en = l.en
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and l.en is not null and c.en is distinct from l.en;
  update public.candidates c set tags = l.tags
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and cardinality(l.tags) > 0 and c.tags is distinct from l.tags;
  update public.candidates c
     set opens = l.opens, closes = l.closes, closed_weekdays = l.closed_weekdays, closed_dates = l.closed_dates,
         open_dates = l.open_dates, best_time = l.best_time, visit_mins = l.visit_mins, booking = l.booking,
         plan_line = l.plan_line, baby_block = l.baby_block, facts_at = l.facts_at, facts_sure = l.facts_sure
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and l.facts_at is not null
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
