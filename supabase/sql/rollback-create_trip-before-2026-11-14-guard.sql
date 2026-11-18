-- ROLLBACK for 2026-11-14-create-trip-guard.sql: the live create_trip(text, text, date) exactly as it was on 14 Nov 2026,
-- read with pg_get_functiondef before the guard was applied. Run it, then drop the two constraints:
--   alter table public.members drop constraint if exists members_display_name_len;
--   alter table public.trips drop constraint if exists trips_name_len;
CREATE OR REPLACE FUNCTION public.create_trip(trip_name text, name text, start date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare tid uuid; code text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));
  insert into public.trips(name, start_date, num_days, join_code, created_by)
    values (trip_name, start, 14, code, auth.uid()) returning id into tid;
  insert into public.members(trip_id, user_id, display_name) values (tid, auth.uid(), trim(name));
  insert into public.checklist_items(trip_id, list, text) values
    (tid, 'todo', 'דרכונים בתוקף לפחות 6 חודשים'),
    (tid, 'todo', 'Visit Japan Web – למלא לפני הטיסה'),
    (tid, 'todo', 'ביטוח נסיעות'),
    (tid, 'todo', 'להחליט על JR Pass מול כרטיסים בודדים'),
    (tid, 'todo', 'eSIM / ראוטר כיס'),
    (tid, 'todo', 'להוציא ין במזומן'),
    (tid, 'packing', 'מתאם חשמל (Type A)'),
    (tid, 'packing', 'נעלי הליכה נוחות'),
    (tid, 'packing', 'סוללה ניידת'),
    (tid, 'packing', 'מנשא לתינוק + עגלה מתקפלת'),
    (tid, 'packing', 'בקבוקים ותרמוס למים חמים');
  return tid;
end $function$;
