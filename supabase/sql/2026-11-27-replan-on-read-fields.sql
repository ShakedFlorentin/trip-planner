-- The planner starts only for a change it reads (2026-11-27). NOT APPLIED: the owner runs it in the SQL editor.
-- It changes triggers only. No table, row, function or policy is changed, and running it twice gives the same end.
--
-- What it changes
-- 1. bookings. Until now any change of a booking row asked plan-trip for a plan (bookings_replan, after insert or
--    update). The planner reads six fields of a booking and nothing else of it
--    (supabase/functions/plan-trip/index.ts: select 'id,kind,title,starts_at,ends_at,who,location'), so a change of
--    only the notes, the link, the confirmation number or the attached file planned the same trip again.
--    Now: bookings_replan fires on insert, as before. The new bookings_replan_fields fires on an update only when
--    kind, title, starts_at, ends_at, who, location or trip_id is not what it was.
--    A removed booking: no trigger before and none now; the app asks for the plan itself after removing one
--    (src/views/Bookings.tsx, replan()).
-- 2. trip_stays, needed for 1 to hold for hotel bookings. Every save of a hotel booking rewrites its stay row
--    (bookings_stay -> sync_booking_stay(), 2026-11-02-trip-stays.sql), also with the same values, and
--    trip_stays_replan fired on any update of a stay: so a hotel booking's notes alone still started a plan.
--    Now: trip_stays_replan fires on insert and on removal, as before. The new trip_stays_replan_changed fires on
--    an update only when the row is not what it was (any column). A stay that really changes plans as before.
--    bookings_stay and sync_booking_stay() are not touched.
-- 3. swipes. swipes_replan (after insert or update on swipes) has done nothing since 14 Nov:
--    request_plan() returns at its first line for the swipes table (2026-11-14-replan-on-places-only.sql,
--    "if tg_table_name = 'swipes' then return null"). It only costs one function call for each swipe. It is removed.
--    A swipe still reaches the planner the way it does today: swipes_match -> on_swipe() -> match_place() adds,
--    changes or removes the place -> places_replan_new / places_replan_who / places_replan_gone -> request_plan().
--    The function request_plan() stays: the places and bookings triggers use it. Its line for swipes stays too,
--    so putting the trigger back (below) gives exactly today's behaviour.
--
-- How to undo (gives back what was there before this file)
--   drop trigger if exists bookings_replan_fields on public.bookings;
--   create or replace trigger bookings_replan after insert or update on public.bookings
--     for each row execute function public.request_plan();
--   drop trigger if exists trip_stays_replan_changed on public.trip_stays;
--   create or replace trigger trip_stays_replan after insert or update or delete on public.trip_stays
--     for each row execute function public.request_plan_stay();
--   create or replace trigger swipes_replan after insert or update on public.swipes
--     for each row execute function public.request_plan();

begin;

-- the same name, now for a new booking only (replaces the insert-or-update one in place)
create or replace trigger bookings_replan
  after insert on public.bookings
  for each row execute function public.request_plan();

-- an edited booking: only when a field the planner reads is not what it was
create or replace trigger bookings_replan_fields
  after update on public.bookings
  for each row
  when (
    old.kind is distinct from new.kind
    or old.title is distinct from new.title
    or old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at
    or old.who is distinct from new.who
    or old.location is distinct from new.location
    or old.trip_id is distinct from new.trip_id
  )
  execute function public.request_plan();

-- a stay: added or removed as before; rewritten only when something in the row is not what it was
-- (skipped when the stays table is not there: 2026-11-02-trip-stays.sql not applied)
do $$ begin
  if to_regclass('public.trip_stays') is not null and to_regprocedure('public.request_plan_stay()') is not null then
    create or replace trigger trip_stays_replan
      after insert or delete on public.trip_stays
      for each row execute function public.request_plan_stay();

    create or replace trigger trip_stays_replan_changed
      after update on public.trip_stays
      for each row
      when (old.* is distinct from new.*)
      execute function public.request_plan_stay();
  end if;
end $$;

-- does nothing since 14 Nov (see above)
drop trigger if exists swipes_replan on public.swipes;

commit;

-- To look after running (read only):
--   select tgname, tgrelid::regclass, pg_get_triggerdef(oid) from pg_trigger
--   where not tgisinternal and tgname like '%replan%' order by 2, 1;
-- Expected: bookings_replan (insert), bookings_replan_fields (update, with the when), places_replan_new,
-- places_replan_who, places_replan_gone, trip_stays_replan (insert or delete), trip_stays_replan_changed (update,
-- with the when); no swipes_replan.
