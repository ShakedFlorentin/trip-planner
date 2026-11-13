-- Trip pass (roadmap step 10, 14 Nov 2026). The first N new places of each trip are free for the whole group
-- (app_settings free_places_per_trip, 10); a pass makes new places unlimited for everyone on that trip (still inside
-- the daily abuse limits of suggest-place). A "new place" is a lookup that really researched something: a place
-- already in Toogo's library, or a link or name looked up before, stays free and is not counted. A search that finds
-- nothing is given back. Behind app_settings features.trip_pass (off): while off, nothing here is used.
--
-- How a pass is bought is not here yet: the website checkout (a payment company) and Apple's in-app purchase each add a
-- row to trip_passes from their own server function, with source 'web' or 'apple'. Until then an app admin can give
-- one (grant_trip_pass), for testers and the owner's own trip.
-- Safe to run twice. No deletes.

-- one row per trip that has a pass
create table if not exists public.trip_passes (
  trip_id uuid primary key references public.trips on delete cascade,
  source text not null check (source in ('web', 'apple', 'grant')),
  bought_by uuid references auth.users on delete set null,
  bought_at timestamptz not null default now(),
  price numeric,
  currency text,
  -- the payment's own id at the payment company or Apple, so a repeated notice never makes two passes
  external_id text unique,
  note text,
  revoked_at timestamptz
);
alter table public.trip_passes enable row level security;
revoke all on public.trip_passes from anon, authenticated;
grant select on public.trip_passes to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'trip_passes' and policyname = 'trip_passes_members_read') then
    create policy trip_passes_members_read on public.trip_passes for select to authenticated
      using (exists (select 1 from public.members m where m.trip_id = trip_passes.trip_id and m.user_id = auth.uid()));
  end if;
end $$;

-- the owner's trip had "no limit" under the old credits: it gets a pass
insert into public.trip_passes (trip_id, source, note)
select u.trip_id, 'grant', coalesce(u.note, 'unlimited under credits')
  from public.credit_unlimited_trips u
 where exists (select 1 from public.trips t where t.id = u.trip_id)
on conflict (trip_id) do nothing;

-- each new place a trip looked up: reserved before the search, settled when it found something, refunded when not
create table if not exists public.trip_place_uses (
  op_id text primary key,
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid references auth.users on delete set null,
  with_pass boolean not null default false,
  state text not null default 'reserved' check (state in ('reserved', 'settled', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trip_place_uses_trip on public.trip_place_uses (trip_id, state);
alter table public.trip_place_uses enable row level security;
revoke all on public.trip_place_uses from anon, authenticated;

create or replace function public.trip_has_pass(p_trip uuid)
 returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.trip_passes p where p.trip_id = p_trip and p.revoked_at is null)
$$;
revoke all on function public.trip_has_pass(uuid) from public, anon, authenticated;

create or replace function public.free_places_per_trip()
 returns integer language sql stable security definer set search_path to '' as $$
  select coalesce((select case when jsonb_typeof(value) = 'number' then greatest(0, (value)::text::int) end
                     from public.app_settings where key = 'free_places_per_trip'), 10)
$$;
revoke all on function public.free_places_per_trip() from public, anon, authenticated;

-- Called by suggest-place (service role) before a new search. The same op twice is one use ("repeat").
create or replace function public.reserve_place(p_op_id text, p_user uuid, p_trip uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  existing public.trip_place_uses;
  pass boolean;
  free int := public.free_places_per_trip();
  used int;
begin
  if not exists (select 1 from public.members m where m.trip_id = p_trip and m.user_id = p_user) then
    return jsonb_build_object('ok', false, 'not_member', true);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('places:' || p_trip::text, 0));
  select * into existing from public.trip_place_uses where op_id = p_op_id;
  if found then
    return jsonb_build_object('ok', true, 'repeat', true, 'state', existing.state);
  end if;
  pass := public.trip_has_pass(p_trip);
  select count(*) into used from public.trip_place_uses where trip_id = p_trip and state <> 'refunded' and not with_pass;
  if not pass and used >= free then
    return jsonb_build_object('ok', false, 'needs_pass', true, 'free', free, 'used', used);
  end if;
  insert into public.trip_place_uses (op_id, trip_id, user_id, with_pass) values (p_op_id, p_trip, p_user, pass);
  return jsonb_build_object('ok', true, 'repeat', false, 'pass', pass, 'free', free, 'used', used + case when pass then 0 else 1 end);
end $function$;

create or replace function public.settle_place(p_op_id text)
 returns void language sql security definer set search_path to '' as $$
  update public.trip_place_uses set state = 'settled', updated_at = now() where op_id = p_op_id and state = 'reserved'
$$;

create or replace function public.refund_place(p_op_id text)
 returns void language sql security definer set search_path to '' as $$
  update public.trip_place_uses set state = 'refunded', updated_at = now() where op_id = p_op_id and state = 'reserved'
$$;
revoke all on function public.reserve_place(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.settle_place(text) from public, anon, authenticated;
revoke all on function public.refund_place(text) from public, anon, authenticated;
grant execute on function public.reserve_place(text, uuid, uuid) to service_role;
grant execute on function public.settle_place(text) to service_role;
grant execute on function public.refund_place(text) to service_role;

-- What the app shows a member: whether the pass is on at all, whether this trip has one, and how many free new places
-- are left. Not a member: nothing.
create or replace function public.trip_pass_status(p_trip uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  me uuid := auth.uid();
  on_now boolean := coalesce((select (value->>'trip_pass')::boolean from public.app_settings where key = 'features'), false);
  free int := public.free_places_per_trip();
  used int;
  p public.trip_passes;
begin
  if me is null or not exists (select 1 from public.members m where m.trip_id = p_trip and m.user_id = me) then
    return jsonb_build_object('enabled', false);
  end if;
  select * into p from public.trip_passes where trip_id = p_trip and revoked_at is null;
  select count(*) into used from public.trip_place_uses where trip_id = p_trip and state <> 'refunded' and not with_pass;
  return jsonb_build_object('enabled', on_now, 'pass', p.trip_id is not null, 'source', p.source, 'since', p.bought_at,
    'free', free, 'used', least(used, free), 'left', greatest(free - used, 0));
end $function$;
revoke all on function public.trip_pass_status(uuid) from public, anon;
grant execute on function public.trip_pass_status(uuid) to authenticated;

-- An app admin gives a trip a pass (testers, the owner's trip, a refund made good by hand). Safe to repeat.
create or replace function public.grant_trip_pass(p_trip uuid, p_note text default null)
 returns boolean language plpgsql security definer set search_path to '' as $function$
begin
  if not public.is_app_admin() then raise exception 'admins only'; end if;
  if not exists (select 1 from public.trips t where t.id = p_trip) then return false; end if;
  insert into public.trip_passes (trip_id, source, bought_by, note) values (p_trip, 'grant', auth.uid(), left(p_note, 200))
  on conflict (trip_id) do update set revoked_at = null, note = coalesce(excluded.note, public.trip_passes.note);
  return true;
end $function$;
revoke all on function public.grant_trip_pass(uuid, text) from public, anon;
grant execute on function public.grant_trip_pass(uuid, text) to authenticated;

-- the switch, off
update public.app_settings set value = value || '{"trip_pass": false}'::jsonb
 where key = 'features' and not (value ? 'trip_pass');
