-- A member with no couple, in a trip that has couples, counts in the planner's votes (2026-11-27).
-- NOT APPLIED: the owner runs it in the SQL editor. One function is changed (plan_place_couples, which only the
-- planner calls). No table, row, trigger or policy is changed, and running it twice gives the same end.
--
-- The rule. A member with no couple in a trip that has couples is one more voice, and goes with the whole group:
--   their like counts as a yes for the place (like a couple's yes);
--   their no, or no vote at all, takes nothing off and holds nothing up;
--   they have no days or stays of their own.
-- Until now plan_place_couples read only the swipes of members who have a couple, so such a member's swipes were
-- not counted at all.
--
-- What it changes. plan_place_couples(tid) answers as before, and for each place adds, after the couples:
--   voted: '~' || user_id for each member with no couple who swiped it (a "not now" is no vote, as for couples);
--   yes:   '~' || user_id for each of them who liked it.
-- Only in a trip that has at least one couple. A trip where every member has a couple, and a trip where nobody
-- has one, get the same answer as before, to the letter. plan-trip knows the '~' names (parties.ts: LONE) and
-- never writes them to a row or sends them to the app. A couple's name must not begin with '~'.
--
-- What it does NOT change: which places join a trip. match_place, couple_vote, couple_both and trip_place_couples
-- still count couples only, so a place that only a member with no couple liked is still not added to the trip.
--
-- How. The live text of the function is patched in place (the way 2026-11-02-solo-couple-both-like.sql patches
-- match_place), because the files hold two versions of it (2026-11-02-discovery.sql, and
-- 2026-11-02-solo-couple-both-like.sql) and this works on either. If the text is not what the patch expects it
-- stops with an error and nothing is changed. If the patch is already in, it does nothing.
--
-- How to undo: run again the plan_place_couples part (the function and its revoke line) of whichever of the two
-- files above was live before. Or, by hand: take the two "lone" parts and the two "|| array(select l.voice ..."
-- pieces out of the function's text.

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.plan_place_couples(uuid)'::regprocedure);
  if position('lone_votes' in d) > 0 then
    raise notice 'plan_place_couples already counts members with no couple; nothing changed';
    return;
  end if;
  n := d;
  -- 1. the members with no couple (only when the trip has couples), and their votes
  n := replace(n, E'  votes as (\n',
    E'  lone as (select m.user_id from public.members m\n'
    || E'            where m.trip_id = tid and m.couple is null and (select cs from everyone) is not null),\n'
    || E'  lone_votes as (\n'
    || E'    select s.candidate_id, ''~'' || s.user_id::text as voice, bool_or(s.liked) and not bool_or(not s.liked) as yes\n'
    || E'      from public.swipes s join lone l on l.user_id = s.user_id\n'
    || E'     where s.trip_id = tid and not s.skipped\n'
    || E'     group by s.candidate_id, s.user_id),\n'
    || E'  votes as (\n');
  -- 2. voted: the couples as before, then the members with no couple who voted
  n := replace(n, E'order by v.couple),\n',
    E'order by v.couple)\n'
    || E'           || array(select l.voice from lone_votes l where l.candidate_id = e.id order by l.voice),\n');
  -- 3. yes: the couples as before, then the members with no couple who liked it
  n := replace(n, E'order by v.couple)\n    from elig e',
    E'order by v.couple)\n'
    || E'           || array(select l.voice from lone_votes l where l.candidate_id = e.id and l.yes order by l.voice)\n'
    || E'    from elig e');
  if (length(n) - length(replace(n, 'lone_votes', ''))) / length('lone_votes') <> 3
     or position('lone as (select m.user_id' in n) = 0
     or position(E'order by l.voice),\n' in n) = 0
     or position(E'and l.yes order by l.voice)\n    from elig e' in n) = 0 then
    raise exception 'plan_place_couples text is not what the patch expects; nothing changed';
  end if;
  execute n;
end $$;

-- plan_place_couples is SECURITY DEFINER with no membership check, so only the planner (service role) may call
-- it. Live already has it that way; this keeps it so.
revoke all on function public.plan_place_couples(uuid) from public, anon, authenticated;
grant execute on function public.plan_place_couples(uuid) to service_role;
