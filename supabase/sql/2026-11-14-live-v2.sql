-- Design for thousands of users (stress test 2026-11-14, docs/stress-test-2026-11-14.md). Additive: the old app
-- keeps working (the tables stay in the supabase_realtime publication), the new app uses these once
-- app_settings features.live is on.
--
-- 1. Live changes by Broadcast, one private topic per trip ("live:<trip id>").
--    Before: every phone subscribed to Postgres Changes on ~12 tables. Supabase checks every change against every
--    subscriber's access, on one thread, and deletes can't be filtered, so each one went to every open phone.
--    Now: a statement trigger sends what changed (the rows themselves, up to 20) to the trip's topic. Who may
--    listen is checked once, when the phone joins (the policy on realtime.messages). The app puts the rows in
--    place without reading the table again; a bigger change comes as a count and the app reads the table once.
-- 2. candidates.rev: goes up by one on every change of a card. The app reads ids and revs (about 35 KB), and only
--    the cards it doesn't hold at that rev; the 1.3 MB deck is read once per phone, not on every open.
-- 3. card_interest read every swipe of every other trip on each Discover open. The per-card numbers are now kept
--    in library_interest, worked out again at most every 6 hours.

-- ── 1. live changes ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.live_topic_member(topic text)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case when topic ~ '^live:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.is_trip_member(substr(topic, 6)::uuid) else false end
$function$;

do $do$
begin
  if not exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = 'trip members hear their trip') then
    create policy "trip members hear their trip" on realtime.messages
      for select to authenticated using (public.live_topic_member(realtime.topic()));
  end if;
end $do$;

-- one message per statement and trip: {t: table, op, n: rows changed, rows: the rows (null when more than 20 or
-- too big)}. A failure here must never fail the write itself.
create or replace function public.live_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  col text := case when tg_table_name = 'trips' then 'id' else 'trip_id' end;
begin
  begin
    for r in execute format(
      'select %1$I::text as tid, count(*) as n, case when count(*) <= 20 then jsonb_agg(to_jsonb(x)) end as rows
         from live_rows x where %1$I is not null group by %1$I', col)
    loop
      if r.rows is not null and pg_column_size(r.rows) > 100000 then r.rows := null; end if;
      perform realtime.send(
        jsonb_build_object('t', tg_table_name, 'op', tg_op, 'n', r.n, 'rows', r.rows),
        'change', 'live:' || r.tid, true);
    end loop;
  exception when others then
    raise warning 'live_change % %: %', tg_table_name, tg_op, sqlerrm;
  end;
  return null;
end $function$;
revoke all on function public.live_change() from public, anon, authenticated;

do $do$
declare t text;
begin
  foreach t in array array['bookings', 'candidates', 'checklist_items', 'day_info', 'essentials', 'expenses',
                           'itinerary_items', 'members', 'places', 'swipes', 'trip_stays', 'trips', 'plan_state', 'reports']
  loop
    execute format('create or replace trigger live_ins after insert on public.%I referencing new table as live_rows for each statement execute function public.live_change()', t);
    execute format('create or replace trigger live_upd after update on public.%I referencing new table as live_rows for each statement execute function public.live_change()', t);
    execute format('create or replace trigger live_del after delete on public.%I referencing old table as live_rows for each statement execute function public.live_change()', t);
  end loop;
end $do$;

-- ── 2. a card's revision ───────────────────────────────────────────────────────────────────────────────────────
-- a constant default: no row is rewritten, so no change event goes out for the cards that exist
alter table public.candidates add column if not exists rev integer not null default 0;

create or replace function public.bump_rev()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$ begin new.rev := old.rev + 1; return new; end $function$;

create or replace trigger candidates_rev before update on public.candidates for each row execute function public.bump_rev();

-- ── 3. how a card did on all trips, kept ───────────────────────────────────────────────────────────────────────
-- no policies: only the functions below (security definer) touch these
create table if not exists public.library_interest (
  library_id uuid primary key,
  n integer not null,       -- votes, "not now" included
  views integer not null,   -- votes without "not now"
  likes integer not null,
  looks integer not null,   -- votes with a look time
  look_ms double precision, -- median look time
  at timestamptz not null   -- the refresh that wrote this row; rows of an older refresh are not read
);
create table if not exists public.library_interest_base (
  one boolean primary key default true check (one),
  views bigint not null,    -- all votes without "not now", and how many of them were likes
  likes bigint not null,
  look_ms double precision, -- median look time over all votes
  at timestamptz not null
);
alter table public.library_interest enable row level security;
alter table public.library_interest_base enable row level security;

create or replace function public.refresh_library_interest()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  -- one at a time; whoever doesn't get the lock uses what is there
  if not pg_try_advisory_xact_lock(hashtext('library_interest')) then return; end if;
  insert into public.library_interest(library_id, n, views, likes, looks, look_ms, at)
  select c.library_id, count(*),
         count(*) filter (where not coalesce(s.skipped, false)),
         count(*) filter (where s.liked and not coalesce(s.skipped, false)),
         count(s.look_ms),
         percentile_cont(0.5) within group (order by s.look_ms),
         now()
    from public.swipes s join public.candidates c on c.id = s.candidate_id
   where c.library_id is not null
   group by c.library_id
  on conflict (library_id) do update
    set n = excluded.n, views = excluded.views, likes = excluded.likes, looks = excluded.looks,
        look_ms = excluded.look_ms, at = excluded.at;
  insert into public.library_interest_base(one, views, likes, look_ms, at)
  select true,
         count(*) filter (where not coalesce(s.skipped, false)),
         count(*) filter (where s.liked and not coalesce(s.skipped, false)),
         percentile_cont(0.5) within group (order by s.look_ms),
         now()
    from public.swipes s join public.candidates c on c.id = s.candidate_id
   where c.library_id is not null
  on conflict (one) do update set views = excluded.views, likes = excluded.likes, look_ms = excluded.look_ms, at = excluded.at;
end $function$;
revoke all on function public.refresh_library_interest() from public, anon, authenticated;

-- The same answer shape as before. A card's numbers are all trips' minus this trip's own votes (so a trip never
-- ranks by its own likes), and so is the overall like rate; the median look times are all trips' (a median
-- can't be taken apart), a card's given only when another trip timed it.
create or replace function public.card_interest(tid uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  out jsonb;
  b public.library_interest_base;
begin
  if not public.is_trip_member(tid) then return null; end if;
  select * into b from public.library_interest_base;
  if not found or b.at < now() - interval '6 hours' then
    perform public.refresh_library_interest();
    select * into b from public.library_interest_base;
  end if;
  with own as materialized (
    select c.id, c.library_id,
           count(s.candidate_id) as n,
           count(s.candidate_id) filter (where not coalesce(s.skipped, false)) as views,
           count(s.candidate_id) filter (where s.liked and not coalesce(s.skipped, false)) as likes,
           count(s.look_ms) as looks
      from public.candidates c left join public.swipes s on s.candidate_id = c.id
     where c.trip_id = tid and c.library_id is not null
     group by c.id, c.library_id
  ),
  mine as (select coalesce(sum(views), 0) as views, coalesce(sum(likes), 0) as likes from own)
  select jsonb_build_object(
           'base', jsonb_build_object(
             'rate', case when b.views - mine.views > 0 then greatest(b.likes - mine.likes, 0)::double precision / (b.views - mine.views) else 0.5 end,
             'look_ms', b.look_ms),
           'cards', coalesce((
             select jsonb_object_agg(o.id, jsonb_build_object(
                      'views', greatest(li.views - o.views, 0),
                      'likes', greatest(li.likes - o.likes, 0),
                      'looks', greatest(li.looks - o.looks, 0),
                      'look_ms', case when li.looks - o.looks > 0 then li.look_ms end))
                    filter (where li.n - o.n > 0)
               from own o join public.library_interest li on li.library_id = o.library_id and li.at = b.at), '{}'::jsonb))
    into out
    from mine;
  return out;
end $function$;
