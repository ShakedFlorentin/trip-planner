-- The ten new cities (2026-11-13): Hakone, Nikko, Kobe, Hiroshima, Kanazawa, Takayama, Fukuoka, Nagoya, Sapporo, Okinawa.
-- Their 1,338 library cards were loaded on 9-11 Nov, switched off. This file:
--   1. adds the cities, so the Where-we-sleep sheet and the planner know them;
--   2. teaches hotel_base the new cities (a hotel booking there becomes a stay there);
--   3. sync_library gives a trip a new city's cards only when the trip goes there (a stay in that city, or a member
--      picked it in the questionnaire). The first six (tokyo, yokohama, kyoto, osaka, nara, daytrip) go to every
--      trip as before, so a trip that goes to none of the new cities sees no change;
--   4. switches the new cities' cards on.
-- Safe to run twice.

-- 1. cities
insert into public.cities (id, country, name_en, name_he, lat, lng, tz) values
  ('hakone',    'JP', 'Hakone',    'הקונה',     35.233, 139.105, 'Asia/Tokyo'),
  ('nikko',     'JP', 'Nikko',     'ניקו',      36.750, 139.600, 'Asia/Tokyo'),
  ('kobe',      'JP', 'Kobe',      'קובה',      34.690, 135.196, 'Asia/Tokyo'),
  ('hiroshima', 'JP', 'Hiroshima', 'הירושימה',  34.397, 132.475, 'Asia/Tokyo'),
  ('kanazawa',  'JP', 'Kanazawa',  'קנאזאווה',  36.578, 136.648, 'Asia/Tokyo'),
  ('takayama',  'JP', 'Takayama',  'טקאיאמה',   36.141, 137.252, 'Asia/Tokyo'),
  ('fukuoka',   'JP', 'Fukuoka',   'פוקואוקה',  33.590, 130.421, 'Asia/Tokyo'),
  ('nagoya',    'JP', 'Nagoya',    'נגויה',     35.171, 136.882, 'Asia/Tokyo'),
  ('sapporo',   'JP', 'Sapporo',   'סאפורו',    43.069, 141.351, 'Asia/Tokyo'),
  ('okinawa',   'JP', 'Okinawa',   'אוקינאווה', 26.212, 127.681, 'Asia/Tokyo')
on conflict (id) do nothing;

-- 2. the city a hotel is in (same rules as hotelBase in plan-trip/index.ts)
create or replace function public.hotel_base(t text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when t ~* 'osaka' then 'osaka'
    when t ~* 'kyoto' then 'kyoto'
    when t ~* 'yokohama|kanagawa' then 'yokohama'
    when t ~* '\mnara\M' then 'nara'
    when t ~* 'hakone' then 'hakone'
    when t ~* 'nikko' then 'nikko'
    when t ~* 'kobe|himeji' then 'kobe'
    when t ~* 'hiroshima|miyajima|hatsukaichi' then 'hiroshima'
    when t ~* 'kanazawa|ishikawa' then 'kanazawa'
    when t ~* 'takayama|shirakawa' then 'takayama'
    when t ~* 'fukuoka|hakata|tenjin' then 'fukuoka'
    when t ~* 'nagoya|aichi' then 'nagoya'
    when t ~* 'sapporo|hokkaido' then 'sapporo'
    when t ~* 'okinawa|naha' then 'okinawa'
    when t ~* 'tokyo|shinjuku|minato|shibuya|chiyoda|taito|shimbashi|ginza|ikebukuro|asakusa|ueno' then 'tokyo'
  end
$function$;

-- 3. sync_library: the live function (read 2026-11-13) with one new condition on which cards a trip gets
create or replace function public.sync_library(tid uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare n int;
begin
  if not public.is_trip_member(tid) then raise exception 'not a member'; end if;
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
  where l.active
    -- the first cities go to every trip; any other city only to a trip that goes there
    and (l.city is null
         or l.city in ('tokyo', 'yokohama', 'kyoto', 'osaka', 'nara', 'daytrip')
         or exists (select 1 from public.trip_stays s where s.trip_id = tid and s.city = l.city)
         or exists (select 1 from public.members m join public.profiles pr on pr.user_id = m.user_id
                     where m.trip_id = tid and coalesce(pr.answers->'cities', '[]'::jsonb) ? l.city))
    and not exists (select 1 from public.candidates c
                     where c.trip_id = tid and (c.library_id = l.id or public.same_place_name(c.name, l.name)))
  on conflict do nothing;
  get diagnostics n = row_count;

  -- links/photos are collected after places reach the deck, so refresh them on every sync
  update public.candidates c
     set maps_url = l.maps_url, website_url = l.website_url, instagram_url = l.instagram_url,
         tiktok_url = l.tiktok_url, photos = l.photos,
         lat = coalesce(l.lat, c.lat), lng = coalesce(l.lng, c.lng), coord_precision = l.coord_precision,
         address = coalesce(l.address, c.address)
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id
     and (c.maps_url, c.instagram_url, c.tiktok_url, c.photos, c.lat, c.lng, c.address)
         is distinct from (l.maps_url, l.instagram_url, l.tiktok_url, l.photos, l.lat, l.lng, coalesce(l.address, c.address));
  -- the English text, once the library card has it
  update public.candidates c set en = l.en
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and l.en is not null and c.en is distinct from l.en;
  -- the search words, once the library card has them
  update public.candidates c set tags = l.tags
    from public.place_library l
   where c.trip_id = tid and c.library_id = l.id and cardinality(l.tags) > 0 and c.tags is distinct from l.tags;
  -- planning facts checked later than the trip's copy
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

-- 4. switch the new cities' cards on (all were loaded 9-11 Nov by us; none is a traveller's private card)
update public.place_library set active = true
 where city in ('hakone', 'nikko', 'kobe', 'hiroshima', 'kanazawa', 'takayama', 'fukuoka', 'nagoya', 'sapporo', 'okinawa')
   and not active
   and created_at >= '2026-11-09' and created_at < '2026-11-12'
   and not exists (select 1 from public.candidates c where c.library_id = place_library.id);
