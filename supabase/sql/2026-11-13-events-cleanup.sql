-- Usage counting is kept 12 months (the privacy page says so). NOT APPLIED YET: run it once in Supabase's SQL editor,
-- or from a session where the Supabase connector's approval prompt reaches the owner. Must be in place before
-- November 2027, when the first events (13 Nov 2026) turn 12 months old. Safe to run twice.
-- It adds a clean-up to public.track(): now and then, a call also removes events older than 12 months.

create or replace function public.events_cleanup()
 returns void
 language sql
 security definer
 set search_path to ''
as $$
  delete from public.events where at < now() - interval '12 months';
$$;
revoke all on function public.events_cleanup() from public, anon, authenticated;

-- then, inside public.track (supabase/sql/2026-11-13-events.sql), just before "return added;":
--   if random() < 0.005 then perform public.events_cleanup(); end if;
-- (re-run that file with the line added)
