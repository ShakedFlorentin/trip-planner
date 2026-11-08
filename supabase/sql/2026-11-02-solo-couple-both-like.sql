-- Not applied yet: run by hand in the SQL Editor (after 2026-11-02-discovery.sql, which is already live).
-- A place that is for ONE couple only (Yokohama while the other couple is elsewhere: only שקד ומאור sleep there)
-- is a match only when BOTH partners liked it. Until now one partner liking was enough for the couple, so with just two
-- people there one like was already a match. A place that is for several couples keeps the old rule (one partner is
-- enough for the couple, unless the other said no).
--
-- Both partners = every member of the couple in the trip (members.couple). A partner who has not joined the trip yet
-- is not counted, so a couple with one member still matches on that member's like.
-- A "not now" (skipped) is still no vote: the match waits for that partner.

-- couple_both: the strict vote of one couple. 'yes' when every member liked and nobody said no, 'no' when anyone said no,
-- null while someone has not voted.
create or replace function public.couple_both(cid uuid, tid uuid, cpl text) returns text
language sql stable set search_path = '' as $$
  with m as (select user_id from public.members where trip_id = tid and couple = cpl),
  v as (select s.user_id, s.liked from public.swipes s join m on m.user_id = s.user_id
         where s.candidate_id = cid and not s.skipped)
  select case when exists (select 1 from v where not liked) then 'no'
              when (select count(distinct user_id) from v where liked) >= greatest((select count(*) from m), 1)
                   and exists (select 1 from v) then 'yes' end
$$;

-- match_place: for a place with a single eligible couple the couple's vote is couple_both. Patched from the live text
-- (it carries the baby line and other changes that are not in the files), and stops if a piece it expects is missing.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.match_place(uuid)'::regprocedure);
  n := d;
  n := replace(n, E'waiting int := 0;', E'waiting int := 0;\n  solo boolean := false;');
  n := replace(n, E'eligible := public.place_couples(tid, cid);', E'eligible := public.place_couples(tid, cid);\n    solo := cardinality(eligible) = 1;');
  n := replace(n, E'where public.couple_vote(cid, tid, x) = ''yes''',
    E'where (case when solo then public.couple_both(cid, tid, x) else public.couple_vote(cid, tid, x) end) = ''yes''');
  n := replace(n, E'where public.couple_vote(cid, tid, x) is null',
    E'where (case when solo then public.couple_both(cid, tid, x) else public.couple_vote(cid, tid, x) end) is null');
  if n = d or position('solo boolean' in n) = 0 or position('solo := cardinality' in n) = 0
     or position('then public.couple_both(cid, tid, x) else public.couple_vote(cid, tid, x) end) = ''yes''' in n) = 0
     or position('end) is null' in n) = 0 then
    raise exception 'match_place text is not what the patch expects; nothing changed';
  end if;
  execute n;
end $$;

-- plan_place_couples (the planner): a place for one couple counts that couple as voted once both voted (or one said no),
-- and as yes only when both liked.
CREATE OR REPLACE FUNCTION public.plan_place_couples(tid uuid)
 RETURNS TABLE(candidate_id uuid, couples text[], voted text[], yes text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with nights as (select * from public.trip_nights(tid)),
  everyone as (select array_agg(distinct m.couple order by m.couple) as cs from public.members m where m.trip_id = tid and m.couple is not null),
  size as (select m.couple, count(*) as n from public.members m where m.trip_id = tid and m.couple is not null group by m.couple),
  bp as (select b.base, p.lat, p.lng from (select distinct base from nights) b cross join lateral public.base_point(b.base) p),
  cand as (select c.id, c.lat, c.lng, c.city from public.candidates c where c.trip_id = tid),
  near as (
    select distinct on (c.id) c.id, bp.base,
           case when c.lat is null then null else public.km(c.lat, c.lng, bp.lat, bp.lng) end as km
      from cand c join bp on c.lat is not null or bp.base = c.city
     order by c.id, case when c.lat is null then null else public.km(c.lat, c.lng, bp.lat, bp.lng) end nulls last),
  elig as (
    select c.id, coalesce(
      case
        when n.base is null then null
        when n.km is null or n.km <= 25 then
          (select array_agg(distinct x.couple order by x.couple) from nights x where x.base = n.base)
        else
          (select array_agg(distinct x.couple order by x.couple) from nights x join bp on bp.base = x.base
            where public.km(c.lat, c.lng, bp.lat, bp.lng) <= 150)
      end, (select cs from everyone)) as couples
      from cand c left join near n on n.id = c.id),
  votes as (
    select s.candidate_id, m.couple, bool_or(s.liked) and not bool_or(not s.liked) as yes,
           count(distinct s.user_id) filter (where s.liked) as n_liked, count(distinct s.user_id) as n_voted,
           bool_or(not s.liked) as any_no
      from public.swipes s join public.members m on m.user_id = s.user_id and m.trip_id = s.trip_id
     where s.trip_id = tid and m.couple is not null and not s.skipped
     group by s.candidate_id, m.couple)
  select e.id, e.couples,
         array(select v.couple from votes v join size z on z.couple = v.couple
                where v.candidate_id = e.id and v.couple = any(e.couples)
                  and (cardinality(e.couples) > 1 or v.any_no or v.n_voted >= z.n) order by v.couple),
         array(select v.couple from votes v join size z on z.couple = v.couple
                where v.candidate_id = e.id and v.yes and v.couple = any(e.couples)
                  and (cardinality(e.couples) > 1 or v.n_liked >= z.n) order by v.couple)
    from elig e
$function$;

-- plan_place_couples is SECURITY DEFINER with no membership check, so only the planner (service role) may call it.
-- Live already has it that way; this keeps it so.
revoke all on function public.plan_place_couples(uuid) from public, anon, authenticated;

-- trip_place_couples (the swipe deck and the match announcement): liked_by lists a couple only when it said yes by the same rule.
CREATE OR REPLACE FUNCTION public.trip_place_couples(tid uuid)
 RETURNS TABLE(candidate_id uuid, couples text[], liked_by text[])
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with nights as (select * from public.trip_nights(tid)),
  everyone as (select array_agg(distinct m.couple order by m.couple) as cs from public.members m where m.trip_id = tid and m.couple is not null),
  size as (select m.couple, count(*) as n from public.members m where m.trip_id = tid and m.couple is not null group by m.couple),
  bp as (select b.base, p.lat, p.lng from (select distinct base from nights) b cross join lateral public.base_point(b.base) p),
  cand as (select c.id, c.lat, c.lng, c.city from public.candidates c where c.trip_id = tid and public.is_trip_member(tid)),
  near as (
    select distinct on (c.id) c.id, bp.base,
           case when c.lat is null then null else public.km(c.lat, c.lng, bp.lat, bp.lng) end as km
      from cand c join bp on c.lat is not null or bp.base = c.city
     order by c.id, case when c.lat is null then null else public.km(c.lat, c.lng, bp.lat, bp.lng) end nulls last),
  elig as (
    select c.id, coalesce(
      case
        when n.base is null then null
        when n.km is null or n.km <= 25 then
          (select array_agg(distinct x.couple order by x.couple) from nights x where x.base = n.base)
        else
          (select array_agg(distinct x.couple order by x.couple) from nights x join bp on bp.base = x.base
            where public.km(c.lat, c.lng, bp.lat, bp.lng) <= 150)
      end, (select cs from everyone)) as couples
      from cand c left join near n on n.id = c.id),
  votes as (
    select s.candidate_id, m.couple, count(distinct s.user_id) filter (where s.liked) as n_liked
      from public.swipes s join public.members m on m.user_id = s.user_id and m.trip_id = s.trip_id
     where s.trip_id = tid and m.couple is not null and not s.skipped
     group by s.candidate_id, m.couple
    having bool_or(s.liked) and not bool_or(not s.liked))
  select e.id, e.couples,
         array(select v.couple from votes v join size z on z.couple = v.couple
                where v.candidate_id = e.id and v.couple = any(e.couples)
                  and (cardinality(e.couples) > 1 or v.n_liked >= z.n) order by v.couple)
    from elig e
$function$;

-- Re-run the matching for every card with votes so the plan follows the new rule (a place that matched on one like
-- is taken off the list and the plan until the other partner likes it too).
do $$
declare r record;
begin
  for r in select distinct s.candidate_id from public.swipes s loop
    perform public.match_place(r.candidate_id);
  end loop;
end $$;
