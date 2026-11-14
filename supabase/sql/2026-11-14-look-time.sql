-- Card look time (roadmap step 11, 14 Nov 2026). Each vote in the swipe deck keeps how long the card was on screen
-- before it (look_ms, at most a minute is sent), how many of its photos were seen and whether its details were opened
-- (src/look.ts). Not sent when the person turned "Help improve Toogo" off.
-- card_interest() sums up how each card of a trip did on the other trips (votes, likes, median look time), without
-- names; src/rank.ts gives cards people like and linger on elsewhere a small lift, smoothed so a few votes barely count.
-- Safe to run twice. No deletes.

alter table public.swipes add column if not exists look_ms integer;
alter table public.swipes add column if not exists photos_seen smallint;
alter table public.swipes add column if not exists opened boolean;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'swipes_look_sane') then
    alter table public.swipes add constraint swipes_look_sane
      check ((look_ms is null or look_ms between 0 and 600000) and (photos_seen is null or photos_seen between 0 and 50));
  end if;
end $$;

-- For a member of the trip: { base: {rate, look_ms}, cards: { <candidate id>: {views, likes, looks, look_ms} } }.
-- Only other trips' votes, matched through the shared library card; "not now" is not a view for the like rate but its
-- look time counts. Null for anyone not on the trip.
create or replace function public.card_interest(tid uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  out jsonb;
begin
  if not public.is_trip_member(tid) then return null; end if;
  with votes as (
    select c2.library_id, s.liked, coalesce(s.skipped, false) as skipped, s.look_ms
      from public.swipes s
      join public.candidates c2 on c2.id = s.candidate_id
     where c2.library_id is not null and s.trip_id <> tid
  ),
  base as (
    select coalesce(avg(case when liked then 1.0 else 0 end) filter (where not skipped), 0.5) as rate,
           percentile_cont(0.5) within group (order by look_ms) filter (where look_ms is not null) as look
      from votes
  ),
  per as (
    select c.id as candidate_id,
           count(*) filter (where not v.skipped) as views,
           count(*) filter (where v.liked and not v.skipped) as likes,
           count(v.look_ms) as looks,
           percentile_cont(0.5) within group (order by v.look_ms) as look
      from public.candidates c
      join votes v on v.library_id = c.library_id
     where c.trip_id = tid
     group by c.id
  )
  select jsonb_build_object(
           'base', jsonb_build_object('rate', b.rate, 'look_ms', b.look),
           'cards', coalesce((select jsonb_object_agg(p.candidate_id, jsonb_build_object('views', p.views, 'likes', p.likes, 'looks', p.looks, 'look_ms', p.look)) from per p), '{}'::jsonb))
    into out
    from base b;
  return out;
end $function$;
revoke all on function public.card_interest(uuid) from public, anon;
grant execute on function public.card_interest(uuid) to authenticated;
