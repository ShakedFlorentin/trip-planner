-- The planner on matches only (scale test 2026-11-14, docs/stress-test-2026-11-14.md).
-- Every swipe asked plan-trip to plan the trip again (trigger swipes_replan). The planner never reads swipes: it
-- plans the trip's places (the matches), and a place added or changed already asks for a plan (places_replan_new,
-- places_replan_who). So a swipe that changes no match changed nothing in the plan, but each one could start a
-- planner run of ~30 requests: with 40 people swiping in 40 trips, the planner made 9 requests for every one of
-- theirs and took the database's connections (1,164 of 1,299 requests in a minute).
-- Now: no plan per swipe; a match still makes one (match_place adds or changes the place), and an undone match
-- does too (match_place deletes the place: the new places_replan_gone).

create or replace function public.request_plan()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare tok text; tid uuid;
begin
  if tg_op = 'DELETE' then tid := old.trip_id; else tid := new.trip_id; end if;
  if tid is null then return null; end if;
  -- a planner is running for this trip: it reads the flag when it finishes and runs once more
  update public.plan_state set dirty = true where trip_id = tid and lease_until > now();
  if found then return null; end if;
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'planner_token' limit 1;
  if tok is not null then
    perform net.http_post(
      url := 'https://wbofjfwbdewgnwjmcpnv.supabase.co/functions/v1/plan-trip',
      body := jsonb_build_object('trip_id', tid),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-plan-token', tok),
      timeout_milliseconds := 5000);
  end if;
  return null;
end
$function$;

drop trigger if exists swipes_replan on public.swipes;
create or replace trigger places_replan_gone after delete on public.places for each row execute function public.request_plan();
