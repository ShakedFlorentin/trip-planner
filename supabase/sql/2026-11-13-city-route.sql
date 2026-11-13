-- What the night-split suggester knows about each city (2026-11-13): where it sits on the route, how many nights it is
-- worth, and in which months. The values here are the same starting values as supabase/functions/plan-trip/route-data.ts;
-- from now on the table is the one to change (the planner reads it on every "suggest a split", no deploy needed), e.g.
--   update public.cities set ideal_nights = 3 where id = 'hiroshima';
--   update public.cities set season = '{0,0,1,2,2,2,2,2,2,2,1,0}' where id = 'takayama';   -- January..December
-- region: kanto, chubu, kansai, chugoku, kyushu (the main line, in that order) or an island (hokkaido, okinawa).
-- air: reached by a flight only. hub: has an airport with flights inside Japan. classic: the first-trip line.
-- min_nights / ideal_nights: the least that makes sense as a base (0: a day trip) and the ideal; *_first: the same for a
-- group on its first visit, when it differs. season: 12 numbers, 0 not in season, 1 fine, 2 good; null: good all year.
-- A null in any column means "use the built-in value". Safe to run twice (it fills only what is still empty).

alter table public.cities
  add column if not exists region text,
  add column if not exists air boolean,
  add column if not exists hub boolean,
  add column if not exists classic boolean,
  add column if not exists min_nights smallint,
  add column if not exists ideal_nights smallint,
  add column if not exists min_nights_first smallint,
  add column if not exists ideal_nights_first smallint,
  add column if not exists season smallint[];

update public.cities c set
  region = coalesce(c.region, v.region),
  air = coalesce(c.air, v.air),
  hub = coalesce(c.hub, v.hub),
  classic = coalesce(c.classic, v.classic),
  min_nights = coalesce(c.min_nights, v.min_nights),
  ideal_nights = coalesce(c.ideal_nights, v.ideal_nights),
  min_nights_first = coalesce(c.min_nights_first, v.min_nights_first),
  ideal_nights_first = coalesce(c.ideal_nights_first, v.ideal_nights_first),
  season = coalesce(c.season, v.season::smallint[])
from (values
  ('tokyo', 'kanto', false, true, true, 2, 4, 4, 6, null),
  ('yokohama', 'kanto', false, false, false, 0, 1, null, null, null),
  ('hakone', 'kanto', false, false, false, 1, 1, null, null, null),
  ('nikko', 'kanto', false, false, false, 0, 1, null, null, '{1,1,2,2,2,2,2,2,2,2,2,1}'),
  ('nagoya', 'chubu', false, true, false, 0, 1, null, null, null),
  ('takayama', 'chubu', false, false, false, 1, 2, null, null, '{0,0,0,2,2,2,2,2,2,2,2,0}'),
  ('kanazawa', 'chubu', false, false, false, 1, 2, null, null, '{1,1,2,2,2,2,2,2,2,2,2,1}'),
  ('kyoto', 'kansai', false, false, true, 2, 4, 3, null, null),
  ('osaka', 'kansai', false, true, true, 1, 3, null, null, null),
  ('nara', 'kansai', false, false, false, 0, 1, null, null, null),
  ('kobe', 'kansai', false, false, false, 0, 1, null, null, null),
  ('hiroshima', 'chugoku', false, false, false, 1, 2, null, null, null),
  ('fukuoka', 'kyushu', false, true, false, 1, 2, null, null, null),
  ('sapporo', 'hokkaido', true, true, false, 2, 3, null, null, '{0,0,0,1,1,2,2,2,2,1,0,0}'),
  ('okinawa', 'okinawa', true, true, false, 3, 4, null, null, '{0,0,0,1,2,2,2,2,2,2,1,0}')
) as v(id, region, air, hub, classic, min_nights, ideal_nights, min_nights_first, ideal_nights_first, season)
where c.id = v.id;
