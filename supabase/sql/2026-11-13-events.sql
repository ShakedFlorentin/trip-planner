-- Usage counting (2026-11-13): our own record of how people move through the app, so we can see where they stop.
-- No outside tracking tool: the app (src/track.ts) sends small batches of events to public.track(), and they are kept
-- here. An event is a name ("open", "screen", "guest_swipes", "hotel_tap", "error"…) with a few plain values, a random
-- id for the device (made on the phone, not tied to a person until they sign in), the open's id, and the account when
-- someone is signed in. Nothing typed by a person is sent (no place names they wrote, no messages, no bookings).
-- Kept two years. Only app admins can read it. app_settings features.counting = false stops it on the server too.
-- Safe to run twice.

create table if not exists public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  visitor uuid not null,
  session uuid,
  user_id uuid references auth.users on update cascade on delete set null,
  name text not null check (name ~ '^[a-z][a-z0-9_]{1,39}$'),
  props jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 2000)
);
create index if not exists events_at on public.events (at);
create index if not exists events_name_at on public.events (name, at);
create index if not exists events_visitor_at on public.events (visitor, at);
create index if not exists events_user on public.events (user_id) where user_id is not null;

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;
drop policy if exists events_admin_read on public.events;
create policy events_admin_read on public.events for select to authenticated using (public.is_app_admin());

-- One call per batch: {visitor, session, events: [{name, props, at}]}, at most 30 events. A device that sends more than
-- 300 an hour is ignored for the rest of that hour. Anything malformed is skipped; the call never fails the app.
create or replace function public.track(batch jsonb)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v uuid;
  s uuid;
  e jsonb;
  p jsonb;
  t timestamptz;
  recent int;
  added int := 0;
begin
  if coalesce((select (value->>'counting')::boolean from public.app_settings where key = 'features'), true) is false then return 0; end if;
  if jsonb_typeof(batch) is distinct from 'object' or jsonb_typeof(batch->'events') is distinct from 'array' then return 0; end if;
  begin
    v := (batch->>'visitor')::uuid;
    s := nullif(batch->>'session', '')::uuid;
  exception when others then return 0;
  end;
  if v is null then return 0; end if;
  select count(*) into recent from public.events where visitor = v and at > now() - interval '1 hour';
  if recent >= 300 then return 0; end if;
  for e in select value from jsonb_array_elements(batch->'events') limit least(30, 300 - recent) loop
    p := coalesce(e->'props', '{}'::jsonb);
    continue when jsonb_typeof(e) is distinct from 'object' or coalesce(e->>'name', '') !~ '^[a-z][a-z0-9_]{1,39}$'
      or jsonb_typeof(p) is distinct from 'object' or pg_column_size(p) > 2000;
    begin
      t := (e->>'at')::timestamptz;
    exception when others then t := null;
    end;
    -- the phone's clock is trusted only within the last day (a batch kept offline arrives late)
    t := least(now(), greatest(now() - interval '1 day', coalesce(t, now())));
    insert into public.events (at, visitor, session, user_id, name, props) values (t, v, s, auth.uid(), e->>'name', p);
    added := added + 1;
  end loop;
  -- now and then, events older than two years go
  if random() < 0.005 then
    delete from public.events where at < now() - interval '2 years';
  end if;
  return added;
end $function$;
revoke all on function public.track(jsonb) from public;
grant execute on function public.track(jsonb) to anon, authenticated;

-- the switch, on by default
update public.app_settings set value = value || '{"counting": true}'::jsonb
 where key = 'features' and not (value ? 'counting');
