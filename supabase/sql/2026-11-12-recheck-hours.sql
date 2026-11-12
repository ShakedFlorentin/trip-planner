-- Re-check a card's opening hours when its place is matched into a trip and the card's facts are older than six
-- months. Idempotent. NOT APPLIED by this commit: it needs the card-facts function that knows the re-check
-- (supabase/functions/card-facts, the version with `refresh`) deployed first; with the older function the call is
-- answered "has facts" and nothing happens.
--
-- Why at the match: a saved lookup answer and a library card never expire, so a card can be months old when a trip
-- gets it. Only its opening hours age (or the place closes). A trip gets every library card at once, so re-checking
-- on insert would pay for cards nobody picks; a matched place is one the trip will really visit.
--
-- background: trigger place_recheck_facts → pg_net → edge function card-facts (planner token) → one Claude call
-- (its own Tabelog page read for no fee, or one web search; ai_calls fn card-facts, step recheck-page /
-- recheck-search) → opens, closes, closed_weekdays and facts_at on the card and its library card → plan-trip.
-- A place that closed for good gets closed_weekdays = {0..6} on the trip's own card only, not on the library card: the
-- planner then gives it no day, and one search result does not close a place for every trip.
-- 180 days is also STALE_DAYS in card-facts/index.ts: keep the two the same.
create or replace function public.request_card_recheck()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare tok text;
begin
  if not exists (
    select 1 from public.candidates c
     where c.id = new.candidate_id and c.facts_at is not null and c.facts_at <= current_date - 180
  ) then
    return null;
  end if;
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'planner_token' limit 1;
  if tok is not null then
    perform net.http_post(
      url := 'https://wbofjfwbdewgnwjmcpnv.supabase.co/functions/v1/card-facts',
      body := jsonb_build_object('candidate_id', new.candidate_id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-plan-token', tok),
      timeout_milliseconds := 5000);
  end if;
  return null;
end
$$;
revoke execute on function public.request_card_recheck() from public, anon, authenticated;

drop trigger if exists place_recheck_facts on public.places;
create trigger place_recheck_facts after insert on public.places
  for each row when (new.candidate_id is not null) execute function public.request_card_recheck();
