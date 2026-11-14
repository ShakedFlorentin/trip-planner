-- Removes everything the stress and scale tests of 14 Nov 2026 made (docs/stress-test-2026-11-14.md): the accounts
-- toogo.stress*@example.com and toogo.load.*@example.com, their trips and everything in them, and the test invites.
-- Run the whole file at once in the SQL editor. The block stops with an error, deleting nothing, if a real user is in a
-- test trip or a test user in a real trip.
--
-- Step 1 pauses Postgres Changes for the trip tables while ~30,000 rows go, so that no phone still on an old app
-- reloads its whole deck per deleted row (the storm of 14 Nov, 11:20). Step 3 turns them back on. If step 2 fails,
-- run step 3 anyway.

-- 1. pause
alter publication supabase_realtime drop table public.bookings, public.candidates, public.checklist_items, public.day_info, public.essentials, public.expenses, public.itinerary_items, public.members, public.places, public.swipes, public.trip_stays, public.trips;

-- 2. delete
do $$
declare
  su uuid[] := array(select id from auth.users where email like 'toogo.stress%@example.com' or email like 'toogo.load.%@example.com');
  st uuid[];
  real_trip constant uuid := 'a779ec4d-a64a-4fa1-bfee-17fda9e433f6';
begin
  st := array(select id from public.trips where created_by = any(su));
  if real_trip = any(st) then raise exception 'real trip in test set'; end if;
  if exists (select 1 from public.members where trip_id = any(st) and not (user_id = any(su))) then raise exception 'a real user is in a test trip'; end if;
  if exists (select 1 from public.members where trip_id = real_trip and user_id = any(su)) then raise exception 'a test user is in the real trip'; end if;
  if cardinality(su) > 400 then raise exception 'too many users matched'; end if;
  -- planners: a run already "in progress" for every test trip, so deleted places ask for none
  insert into public.plan_state(trip_id, lease_until) select t, now() + interval '1 day' from unnest(st) t
    on conflict (trip_id) do update set lease_until = excluded.lease_until;
  delete from public.candidates where trip_id = any(st);
  delete from public.swipes where trip_id = any(st);
  delete from public.places where trip_id = any(st);
  delete from public.itinerary_items where trip_id = any(st);
  delete from public.trip_stays where trip_id = any(st);
  delete from public.expenses where trip_id = any(st);
  delete from public.checklist_items where trip_id = any(st);
  delete from public.place_library where added_from_trip = any(st);
  delete from public.shared_plans where trip_id = any(st);
  delete from public.events where user_id = any(su);
  delete from public.events where user_id is null and at between '2026-11-14T11:50:00Z' and '2026-11-14T12:15:00Z';
  delete from public.ai_calls where user_id = any(su);
  delete from public.notifications_sent where user_id = any(su);
  delete from public.trip_place_uses where trip_id = any(st) or user_id = any(su);
  delete from public.photo_submissions where trip_id = any(st) or user_id = any(su);
  delete from public.trip_passes where trip_id = any(st);
  delete from public.invites where created_by = '0611e74a-8871-4c87-80e5-8db1acea84bc' and trip_id is null and created_at >= '2026-11-14T11:50:00Z';
  delete from public.trips where id = any(st);
  delete from public.plan_state where trip_id = any(st);
  delete from auth.users where id = any(su);
  raise notice 'removed % users and % trips', cardinality(su), cardinality(st);
end $$;

-- 3. resume
alter publication supabase_realtime add table public.bookings, public.candidates, public.checklist_items, public.day_info, public.essentials, public.expenses, public.itinerary_items, public.members, public.places, public.swipes, public.trip_stays, public.trips;

-- check: 0 test users, 1 trip (yours), 12 tables live again
select (select count(*) from auth.users where email like 'toogo.stress%@example.com' or email like 'toogo.load.%@example.com') test_users_left,
       (select count(*) from public.trips) trips,
       (select count(*) from pg_publication_tables where pubname = 'supabase_realtime') live_tables;
