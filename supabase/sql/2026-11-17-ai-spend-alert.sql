-- AI spend alert (2026-11-17). NOT applied; the owner applies it. Safe to run twice. No new paid service.
-- Adds two thresholds to app_settings and one admin-only function the owner's dashboard reads:
--   select * from public.ai_spend_status();
-- It sums ai_calls.cost_usd (every Claude call, written by the edge functions) for today (UTC), the last 7 days and
-- the last 30 days, and says which threshold is crossed. Reading it is the alert: the dashboard shows 'over' in red.
-- Starting numbers: the last 30 days cost about 2.4 USD in total (about 0.08 a day, dominated by old plan-trip rows
-- from before the planner stopped using Claude on 28 Oct). 2 USD a day is 25 times that average, so normal use never
-- trips it while a runaway loop or a leaked key does within hours; 20 USD a month is the same idea at month scale.
-- Change one with: update public.app_settings set value = '5' where key = 'ai_spend_alert_day_usd';

insert into public.app_settings (key, value, note) values
  ('ai_spend_alert_day_usd',   '2',  'AI spend alert: USD per UTC day (ai_calls) above which ai_spend_status() says over_day'),
  ('ai_spend_alert_month_usd', '20', 'AI spend alert: USD over the last 30 days above which ai_spend_status() says over_month')
on conflict (key) do nothing;

-- cost per day and function, for charts; reachable only through ai_spend_status() and the service role
create or replace view public.ai_spend_daily with (security_invoker = true) as
  select (at at time zone 'utc')::date as day, fn,
         count(*)::int as calls,
         count(*) filter (where error is not null)::int as failed,
         round(sum(cost_usd), 4) as cost_usd
  from public.ai_calls
  group by 1, 2;
revoke all on public.ai_spend_daily from public, anon, authenticated;
grant select on public.ai_spend_daily to service_role;

create or replace function public.ai_spend_status()
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  day_cap numeric := coalesce((select case when jsonb_typeof(value) = 'number' then (value #>> '{}')::numeric end
                                 from public.app_settings where key = 'ai_spend_alert_day_usd'), 2);
  month_cap numeric := coalesce((select case when jsonb_typeof(value) = 'number' then (value #>> '{}')::numeric end
                                   from public.app_settings where key = 'ai_spend_alert_month_usd'), 20);
  today numeric; week numeric; month numeric; by_fn jsonb;
begin
  -- the dashboard calls this as the signed-in owner; the service role (no auth.uid()) may too
  if auth.uid() is not null and not public.is_app_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  select coalesce(sum(cost_usd) filter (where at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'), 0),
         coalesce(sum(cost_usd) filter (where at >= now() - interval '7 days'), 0),
         coalesce(sum(cost_usd), 0)
    into today, week, month
    from public.ai_calls where at >= now() - interval '30 days';
  select coalesce(jsonb_object_agg(fn, jsonb_build_object('calls', calls, 'cost_usd', cost)), '{}'::jsonb) into by_fn
    from (select fn, count(*) as calls, round(sum(cost_usd), 4) as cost
            from public.ai_calls where at >= now() - interval '30 days' group by fn) f;
  return jsonb_build_object(
    'today_usd', round(today, 4), 'week_usd', round(week, 4), 'month_usd', round(month, 4),
    'day_cap_usd', day_cap, 'month_cap_usd', month_cap,
    'over_day', today > day_cap, 'over_month', month > month_cap,
    'by_fn_30d', by_fn);
end $function$;
revoke execute on function public.ai_spend_status() from public, anon;
grant execute on function public.ai_spend_status() to authenticated, service_role;
