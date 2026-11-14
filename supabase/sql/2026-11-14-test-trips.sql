-- Load-test accounts are kept for the next test (scripts/load/README.md); their trips never count in the cross-trip
-- ranking. Applied 14 Nov 2026.
create table if not exists public.test_trips (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  note text,
  added_at timestamptz not null default now()
);
alter table public.test_trips enable row level security;   -- no policies: only security definer code reads it

insert into public.test_trips(trip_id, note)
select t.id, 'load test 2026-11-14'
  from public.trips t join auth.users u on u.id = t.created_by
 where u.email like 'toogo.stress%@example.com' or u.email like 'toogo.load.%@example.com'
on conflict do nothing;

-- a trip made by a test account is a test trip from the start
create or replace function public.mark_test_trip()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if exists (select 1 from auth.users u where u.id = new.created_by
              and (u.email like 'toogo.stress%@example.com' or u.email like 'toogo.load.%@example.com')) then
    insert into public.test_trips(trip_id, note) values (new.id, 'load test') on conflict do nothing;
  end if;
  return null;
end $function$;
revoke all on function public.mark_test_trip() from public, anon, authenticated;
create or replace trigger trips_mark_test after insert on public.trips for each row execute function public.mark_test_trip();

-- refresh_library_interest (2026-11-14-live-v2.sql) leaves their swipes out:
--   ... where c.library_id is not null and not exists (select 1 from public.test_trips x where x.trip_id = s.trip_id)
-- (both queries; the live function is the one with that line)

-- the test accounts can't be signed into until a test sets a password
update auth.users
   set encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf'))
 where email like 'toogo.stress%@example.com' or email like 'toogo.load.%@example.com';
