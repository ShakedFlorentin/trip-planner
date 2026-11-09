-- Fixes from the 2026-11-09 security audit (security-audit/REPORT.md), before the app opens beyond the group.
--
-- 1. AI spend: one shared daily ceiling per AI tool across everyone, on top of each person's own cap, so making more
--    accounts can't multiply what the Claude key spends. The count and the record happen in one locked step, so
--    parallel requests can't slip past either cap. The card lookups that adding a place starts are metered the same way.
-- 2. Invites: the server picks the code and the 30-day expiry, an invite must name a trip, and a person can make at
--    most 10 a week (app admins are exempt). A used invite stays used even after its account is deleted, so a removed
--    member can't sign up again with the old link.
-- 3. Place library: filling a new card from the library, and linking it to a library card, only uses cards the
--    adding trip may already see (live ones, or its own), so another trip's private card can't leak into it.

-- 1. AI spend --------------------------------------------------------------------------------------------------------

-- Takes one call from today's allowance for (uid, fn), or says why not: 'ok', 'user' (this person's cap) or 'all'
-- (everyone's shared ceiling). Server-side only.
create or replace function public.ai_take(uid uuid, fn text, per_user int, all_users int)
returns text language plpgsql security definer set search_path to '' as $function$
declare since timestamptz := now() - interval '24 hours';
begin
  perform pg_advisory_xact_lock(hashtext('ai_take:' || fn));
  if (select count(*) from public.ai_usage u where u.user_id = uid and u.fn = ai_take.fn and u.at >= since) >= per_user
    then return 'user'; end if;
  if (select count(*) from public.ai_usage u where u.fn = ai_take.fn and u.at >= since) >= all_users
    then return 'all'; end if;
  insert into public.ai_usage(user_id, fn) values (uid, ai_take.fn);
  return 'ok';
end $function$;
revoke execute on function public.ai_take(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.ai_take(uuid, text, int, int) to service_role;

create index if not exists ai_usage_fn_at on public.ai_usage (fn, at);

-- Adding a place starts a paid lookup of its hours and facts, and of its photos. A person's own inserts are metered;
-- server-side inserts (no signed-in user) are not. Over the cap the card just stays without them.
create or replace function public.request_card_facts()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare tok text; uid uuid := auth.uid();
begin
  if uid is not null and public.ai_take(uid, 'card-facts', 60, 400) <> 'ok' then return null; end if;
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'planner_token' limit 1;
  if tok is not null then
    perform net.http_post(
      url := 'https://wbofjfwbdewgnwjmcpnv.supabase.co/functions/v1/card-facts',
      body := jsonb_build_object('candidate_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-plan-token', tok),
      timeout_milliseconds := 5000);
  end if;
  return null;
end
$function$;

create or replace function public.request_card_photos()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare tok text; uid uuid := auth.uid();
begin
  if uid is not null and public.ai_take(uid, 'card-photos', 60, 400) <> 'ok' then return null; end if;
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'planner_token' limit 1;
  if tok is not null then
    perform net.http_post(
      url := 'https://wbofjfwbdewgnwjmcpnv.supabase.co/functions/v1/card-photos',
      body := jsonb_build_object('candidate_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-plan-token', tok),
      timeout_milliseconds := 5000);
  end if;
  return null;
end
$function$;

-- 2. Invites ---------------------------------------------------------------------------------------------------------

create or replace function public.invite_rules()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  -- the server picks the code and the expiry; whatever the client sent is ignored
  new.code := upper(substr(md5(gen_random_uuid()::text), 1, 10));
  new.created_at := now();
  new.expires_at := now() + interval '30 days';
  new.used_by := null;
  new.used_at := null;
  if not public.is_app_admin() then
    if new.trip_id is null then raise exception 'an invite must name a trip'; end if;
    if (select count(*) from public.invites i
         where i.created_by = new.created_by and i.created_at > now() - interval '7 days') >= 10 then
      raise exception 'invite limit reached';
    end if;
  end if;
  return new;
end $function$;
drop trigger if exists invites_rules on public.invites;
create trigger invites_rules before insert on public.invites for each row execute function public.invite_rules();

-- used_at survives the account's deletion (used_by is set back to null then), so it decides whether an invite is used
create or replace function public.block_new_users()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare c text := upper(trim(coalesce(new.raw_user_meta_data->>'invite', '')));
begin
  update public.invites set used_by = new.id, used_at = now()
   where code = c and used_at is null and used_by is null and expires_at > now();
  if not found then raise exception 'sign-ups are by invitation only'; end if;
  return new;
end $function$;

-- 3. Place library ---------------------------------------------------------------------------------------------------

create or replace function public.fill_plan_facts()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare l public.place_library;
begin
  if new.facts_at is not null then return new; end if;
  select * into l from public.place_library x
   where x.facts_at is not null
     and (x.active or x.added_from_trip = new.trip_id)
     and (x.id = new.library_id or public.same_place_name(x.name, new.name))
   order by (x.id is not distinct from new.library_id) desc limit 1;
  if found then
    new.opens := l.opens; new.closes := l.closes; new.closed_weekdays := l.closed_weekdays;
    new.closed_dates := l.closed_dates; new.open_dates := l.open_dates; new.best_time := l.best_time;
    new.visit_mins := l.visit_mins; new.booking := l.booking; new.plan_line := l.plan_line;
    new.baby_block := l.baby_block; new.facts_at := l.facts_at; new.facts_sure := l.facts_sure;
    new.address := coalesce(new.address, l.address); new.en := coalesce(new.en, l.en);
  end if;
  return new;
end
$function$;

-- a library_id sent with the card is kept only when it points at a card this trip may see; otherwise the card is
-- linked by name as usual (exact-name linking copies nothing and is how a place is promoted by two trips)
create or replace function public.card_to_library()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare lid uuid; on_now boolean;
begin
  if new.library_id is not null then
    if exists (select 1 from public.place_library l
                where l.id = new.library_id and (l.active or l.added_from_trip = new.trip_id)) then
      return new;
    end if;
    new.library_id := null;
  end if;
  select l.id, l.active into lid, on_now from public.place_library l
   where public.norm_name(l.name) = public.norm_name(new.name) limit 1;
  if lid is null then
    insert into public.place_library(name, name_ja, city, area, category, lat, lng, coord_precision, hype, reality, verdict,
                                     tabelog_score, google_score, price, tip, sources, audience, baby_notes, local_pick,
                                     maps_url, website_url, instagram_url, tiktok_url, photos, serves, dishes, todo, special,
                                     highlights, time_needed, kosher, kosher_note, opens, closes, closed_weekdays,
                                     closed_dates, open_dates, best_time, visit_mins, booking, plan_line, baby_block,
                                     facts_at, facts_sure, address, en, tags, active, added_from_trip)
    values (new.name, new.name_ja, new.city, new.area, new.category, new.lat, new.lng, new.coord_precision, new.hype,
            new.reality, new.verdict, new.tabelog_score, new.google_score, new.price, null, new.sources, new.audience,
            new.baby_notes, new.local_pick, new.maps_url, new.website_url, new.instagram_url, new.tiktok_url, new.photos,
            new.serves, new.dishes, new.todo, new.special, new.highlights, new.time_needed, new.kosher, new.kosher_note,
            new.opens, new.closes, new.closed_weekdays, new.closed_dates, new.open_dates, new.best_time, new.visit_mins,
            new.booking, new.plan_line, new.baby_block, new.facts_at, new.facts_sure, new.address, new.en,
            coalesce(new.tags, '{}'), false, new.trip_id)
    returning id into lid;
    on_now := false;
  end if;
  new.library_id := lid;
  if not on_now and (
       select count(distinct t.who) from (
         select coalesce(tr.created_by::text, tr.id::text) as who
           from public.candidates c join public.trips tr on tr.id = c.trip_id
          where c.trip_id <> new.trip_id and (c.library_id = lid or public.same_place_name(c.name, new.name))
         union all
         select coalesce(tr.created_by::text, tr.id::text) from public.trips tr where tr.id = new.trip_id) t) >= 2 then
    update public.place_library set active = true where id = lid;
  end if;
  return new;
end
$function$;
