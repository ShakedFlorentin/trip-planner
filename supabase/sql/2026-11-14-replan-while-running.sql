-- Re-plan requests while the planner is already running (stress test 2026-11-14, docs/stress-test-2026-11-14.md).
-- Every swipe, booking and new place calls plan-trip through pg_net (request_plan). plan-trip runs one planner per
-- trip at a time: a request that arrives while one runs only marks plan_state.dirty and the runner goes once more.
-- So in a burst of swipes almost every call starts the edge function just to set that flag (a token check, an upsert
-- and two updates), and the calls queue up in pg_net.
-- Now the trigger sets the flag itself while the trip's lease is held, and calls plan-trip only when no planner runs.
-- The result is the same as before; the calls in a burst are gone.
create or replace function public.request_plan()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare tok text;
begin
  if new.trip_id is null then return null; end if;
  -- a planner is running for this trip: it reads the flag when it finishes and runs once more
  update public.plan_state set dirty = true where trip_id = new.trip_id and lease_until > now();
  if found then return null; end if;
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'planner_token' limit 1;
  if tok is not null then
    perform net.http_post(
      url := 'https://wbofjfwbdewgnwjmcpnv.supabase.co/functions/v1/plan-trip',
      body := jsonb_build_object('trip_id', new.trip_id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-plan-token', tok),
      timeout_milliseconds := 5000);
  end if;
  return null;
end
$function$;
