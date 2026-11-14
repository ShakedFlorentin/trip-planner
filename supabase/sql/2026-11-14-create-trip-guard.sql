-- create_trip guard (name length, double tap, per-user limit) and display_name / trip name length limits.
-- DO NOT APPLY BEFORE THE TRIP ENDS (31 Dec 2026): the owner applies it.
--
-- WHAT IT DOES
--   1. create_trip(trip_name text, name text, start date) keeps its signature and its return (the new trip's uuid) and gains,
--      at the top of the body:
--        - a per-user advisory lock, so two taps at the same instant are handled one after the other;
--        - trip name and person name trimmed (leading/trailing white space) and length checked: trip name 1-80, person name 1-40,
--          else it raises 'trip_name_invalid' / 'display_name_invalid';
--        - double tap: if the same user created a trip with the same (trimmed) name in the last 10 seconds, that trip's id is
--          RETURNED and nothing new is made (so the second tap lands in the same trip, instead of an error);
--        - limit: 5 trips created by the user in the last hour, else it raises 'too_many_trips'.
--      The rest of the body (join code, the trip row, the member row, the starter checklist) is untouched.
--   2. members.display_name check 1-40 characters and trips.name check 1-80, both added NOT VALID: they are enforced on every
--      insert and update from now on, existing rows are not re-checked (so the live trip cannot be blocked by an old long name).
--      Optional last step (commented below): VALIDATE once the precheck shows no offending row.
--
-- HOW THE FUNCTION IS CHANGED
--   Not rewritten from the repo copy: the live text is read with pg_get_functiondef and patched in four places, and the file
--   raises (changes nothing) if the live text does not contain what it expects, or if it was already patched (then it skips).
--   That way live drift in the body is kept, not overwritten.
--
-- WHAT IT CHANGES ON THE LIVE DATABASE
--   create_trip's body, and two check constraints. No row is touched. A second run does nothing.
--
-- OPEN QUESTIONS
--   - The clients (TripPicker, SharedPlan, GuestImport) show the raw error message; 'trip_name_invalid', 'display_name_invalid'
--     and 'too_many_trips' need a mapped message (Hebrew and English) in the client. Until then a user sees the code.
--   - Before, an empty person name was accepted (a blank display_name). It is now refused. SharedPlan and GuestImport pass a
--     name from a field; check they cannot send an empty one.
--   - join_trip (baseline ~line 274) also inserts display_name = trim(name). It is not patched here: a name over 40 or empty
--     now fails there with a raw constraint error (members_display_name_len). Patch it the same way if wanted.
--   - The limit of 5 per hour and the 10 seconds are my numbers, not the owner's.
--   - Handing a trip over (leave_trip / delete-account) changes created_by, so a trip handed away no longer counts for the limit.
--
-- PRECHECK (read-only, run first)
--   -- the live function text (look for the four lines the patch needs)
--   select pg_get_functiondef('public.create_trip(text, text, date)'::regprocedure);
--   -- rows the new limits would reject if they were edited (expect none; the real trip must not be listed):
--   select 'member' as kind, trip_id, user_id, char_length(display_name) as len from public.members where char_length(display_name) not between 1 and 40
--   union all
--   select 'trip', id, null, char_length(name) from public.trips where char_length(name) not between 1 and 80;
--
-- VERIFY AFTER (read-only)
--   select pg_get_functiondef('public.create_trip(text, text, date)'::regprocedure) ilike '%create_trip guard%' as patched;
--   select conname, convalidated from pg_constraint where conname in ('members_display_name_len', 'trips_name_len');
--   On the rehearsal copy only: call create_trip twice in a row with the same name -> same uuid; with '   ' -> trip_name_invalid;
--   a sixth trip within an hour -> too_many_trips.
--
-- ROLLBACK
--   alter table public.members drop constraint if exists members_display_name_len;
--   alter table public.trips drop constraint if exists trips_name_len;
--   and re-run the create_trip block of 2026-11-02-live-baseline.sql (lines ~152-174) or restore the function text saved by
--   the dump step in docs/rehearsal-after-trip.md.

do $patch$
declare
  d text;
  guard text := $g$
  -- create_trip guard (2026-11-14)
  perform pg_advisory_xact_lock(hashtextextended('create_trip:' || auth.uid()::text, 0));
  v_name := regexp_replace(coalesce(trip_name, ''), '^\s+|\s+$', '', 'g');
  v_person := regexp_replace(coalesce(name, ''), '^\s+|\s+$', '', 'g');
  if char_length(v_name) not between 1 and 80 then raise exception 'trip_name_invalid'; end if;
  if char_length(v_person) not between 1 and 40 then raise exception 'display_name_invalid'; end if;
  select t.id into v_dup from public.trips t
   where t.created_by = auth.uid() and t.name = v_name and t.created_at > now() - interval '10 seconds'
   order by t.created_at desc limit 1;
  if v_dup is not null then return v_dup; end if;
  if (select count(*) from public.trips t where t.created_by = auth.uid() and t.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_trips';
  end if;
$g$;
begin
  d := replace(pg_get_functiondef('public.create_trip(text, text, date)'::regprocedure), E'\r\n', E'\n');
  if position('create_trip guard' in d) > 0 then
    raise notice 'create_trip is already patched; skipped';
    return;
  end if;
  if position('declare tid uuid; code text;' in d) = 0
     or position('if auth.uid() is null then raise exception ''not authenticated''; end if;' in d) = 0
     or position('values (trip_name, start,' in d) = 0
     or position('values (tid, auth.uid(), trim(name))' in d) = 0 then
    raise exception 'create_trip text is not what the patch expects; nothing changed (compare with the baseline copy and patch by hand)';
  end if;
  d := replace(d, 'declare tid uuid; code text;', 'declare tid uuid; code text; v_name text; v_person text; v_dup uuid;');
  d := replace(d, 'if auth.uid() is null then raise exception ''not authenticated''; end if;',
                  'if auth.uid() is null then raise exception ''not authenticated''; end if;' || guard);
  d := replace(d, 'values (trip_name, start,', 'values (v_name, start,');
  d := replace(d, 'values (tid, auth.uid(), trim(name))', 'values (tid, auth.uid(), v_person)');
  execute d;
end
$patch$;

do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_display_name_len' and conrelid = 'public.members'::regclass) then
    alter table public.members add constraint members_display_name_len check (char_length(display_name) between 1 and 40) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trips_name_len' and conrelid = 'public.trips'::regclass) then
    alter table public.trips add constraint trips_name_len check (char_length(name) between 1 and 80) not valid;
  end if;
end
$c$;

-- OPTIONAL, later, only when the precheck query returned no rows (it scans the tables; both are tiny):
--   alter table public.members validate constraint members_display_name_len;
--   alter table public.trips validate constraint trips_name_len;
