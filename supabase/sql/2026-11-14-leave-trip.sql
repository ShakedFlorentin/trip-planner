-- leave_trip(p_trip): a member leaves a trip without deleting their account.
-- DO NOT APPLY BEFORE THE TRIP ENDS (31 Dec 2026): the owner applies it.
-- APPLY AFTER 2026-11-14-delete-account.sql (it needs public.former_members and the new check_expense_people; this file stops
-- with an error if former_members is missing, so a wrong order changes nothing).
--
-- WHAT IT DOES (one transaction, all or nothing)
--   caller must be signed in and a member of p_trip. The trip row is locked first, so two people leaving at the same moment
--   cannot both think the other is still there.
--   1. Only member left: the trip is removed whole (owner's rule: a trip where the leaver is the only member is deleted).
--      Its members, places, candidates, swipes, expenses, bookings, itinerary, ... go by the existing ON DELETE CASCADE keys;
--      shared_plans and credit_ledger rows of the trip have no foreign key and are removed here (same as delete-account).
--      Returns 'trip_deleted'.
--   2. Others remain:
--      a. if the leaver paid an expense or is in its split_among, a former_members row (name and couple) is written, so the
--         group can still read and settle that expense and check_expense_people still accepts it. This is the same rule as
--         delete-account (plan.ts: keepFormer = leaver is in expenses). expenses.paid_by / split_among keep the user id.
--      b. if the leaver is trips.created_by, the earliest-joined remaining member becomes created_by (same order as
--         delete-account's plan.ts: joined_at, then user_id). The app has no other per-trip admin role.
--      c. the leaver's swipes in this trip are removed (they no longer vote; on_swipe re-runs the match for each one, so a
--         match that depended on their like is recalculated). Their place_ratings, reports and uploads are NOT touched.
--      d. the members row is removed. Returns 'left'.
--   REUSED from delete-account: table former_members (not recreated), the relaxed check_expense_people, the keep-name rule and
--   the hand-over order. Not reused: the edge function's storage cleanup (SQL cannot safely remove storage files).
--
-- WHY AN RPC AND NOT A members DELETE POLICY
--   A bare "delete where user_id = auth.uid()" policy would (1) not keep the name, so every expense of the leaver would be
--   refused by check_expense_people on the next edit or settle-up; (2) not hand the trip over; (3) let the last member leave
--   and orphan the trip with nobody able to read or delete it; (4) leave the leaver's votes counting in match_place; (5) not be
--   atomic. Only a SECURITY DEFINER function can write former_members (clients have select only) and do all steps in one go.
--   No members DELETE policy is added: nobody can remove a member row through the API directly.
--
-- WHAT IT CHANGES ON THE LIVE DATABASE
--   Adds one function and its grants. Touches no existing row and no existing object. Rows change only when someone calls it.
--
-- OPEN QUESTIONS (not confirmed, from the repo only)
--   - Storage: files in the docs bucket under <trip_id>/ stay behind when a sole-member trip is deleted (orphans, not readable
--     by anyone). Cleanup query is in docs/rehearsal-after-trip.md. If this matters, the client can call an edge function instead.
--   - 2c (removing the leaver's swipes) is a decision: the alternative is to keep them, but match_place's no-couples branch
--     counts every swipe, member or not, so ghost likes would keep places matched. Remove this block if the owner prefers.
--   - Credits left on a deleted sole-member trip (credit_ledger owner_kind = 'trip') are removed with it.
--   - The live body of check_expense_people was not read; only the repo's delete-account version is assumed.
--
-- PRECHECK (read-only): the pieces this needs exist
--   select to_regclass('public.former_members') is not null as former_members,
--          pg_get_functiondef('public.check_expense_people()'::regprocedure) ilike '%former_members%' as trigger_knows_former,
--          to_regclass('public.shared_plans') is not null as shared_plans,
--          to_regclass('public.credit_ledger') is not null as credit_ledger;
--   all four must be true.
--
-- ROLLBACK
--   drop function if exists public.leave_trip(uuid);
--   (former_members rows written by it are harmless; leave them.)

do $guard$
begin
  if to_regclass('public.former_members') is null then
    raise exception 'apply 2026-11-14-delete-account.sql first (public.former_members is missing); nothing changed';
  end if;
end
$guard$;

create or replace function public.leave_trip(p_trip uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  mine public.members;
  others int;
  heir uuid;
  in_expenses boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_trip is null then raise exception 'not a member'; end if;

  -- members only; a stranger must not be able to take a lock on someone else's trip
  if not exists (select 1 from public.members m where m.trip_id = p_trip and m.user_id = uid) then
    raise exception 'not a member';
  end if;

  -- one leaver at a time per trip
  perform 1 from public.trips t where t.id = p_trip for update;

  -- read again under the lock (a repeat call after we left lands here: nothing to do)
  select * into mine from public.members m where m.trip_id = p_trip and m.user_id = uid;
  if not found then raise exception 'not a member'; end if;

  select count(*) into others from public.members m where m.trip_id = p_trip and m.user_id <> uid;

  if others = 0 then
    -- the only member: the trip goes (rows with a foreign key cascade; these two have none)
    delete from public.shared_plans where trip_id = p_trip;
    delete from public.credit_ledger where owner_kind = 'trip' and owner_id = p_trip;
    delete from public.trips where id = p_trip;
    return 'trip_deleted';
  end if;

  select exists (
    select 1 from public.expenses e
     where e.trip_id = p_trip and (e.paid_by = uid or uid = any (e.split_among))
  ) into in_expenses;
  if in_expenses then
    insert into public.former_members (trip_id, user_id, display_name, couple)
    values (p_trip, uid, mine.display_name, mine.couple)
    on conflict (trip_id, user_id) do nothing;
  end if;

  if exists (select 1 from public.trips t where t.id = p_trip and t.created_by = uid) then
    select m.user_id into heir
      from public.members m
     where m.trip_id = p_trip and m.user_id <> uid
     order by m.joined_at asc nulls last, m.user_id asc
     limit 1;
    update public.trips set created_by = heir where id = p_trip and created_by = uid;
  end if;

  delete from public.swipes where trip_id = p_trip and user_id = uid;
  delete from public.members where trip_id = p_trip and user_id = uid;
  return 'left';
end
$function$;

revoke all on function public.leave_trip(uuid) from public, anon;
grant execute on function public.leave_trip(uuid) to authenticated;
