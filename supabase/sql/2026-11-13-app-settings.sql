-- Settings from the server (roadmap step 4, 2026-11-13): values the app, the edge functions and the database read at
-- run time, so changing a row changes the app with no new version. Change one with:
--   update public.app_settings set value = '25' where key = 'swipe_batch_size';
-- Everyone can read them (nothing here is secret); nobody can write them from the app. Feature on/off switches that
-- already live in app_flags (credits) stay there.
-- Safe to run twice.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'app_settings_read' and polrelid = 'public.app_settings'::regclass) then
    create policy app_settings_read on public.app_settings for select to anon, authenticated using (true);
  end if;
end $$;

create or replace function public.touch_app_setting() returns trigger language plpgsql set search_path to '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create or replace trigger app_settings_touch before update on public.app_settings for each row execute function public.touch_app_setting();

insert into public.app_settings (key, value, note) values
  ('swipe_batch_size',       '20',    'Cards in one Discover batch (app, src/rank.ts)'),
  ('free_daily_credits',     '5',     'Free credits topped up each day per person, while credits are on (grant_daily_free)'),
  ('lookup_limit_person',    '30',    'Place lookups per person per day (suggest-place)'),
  ('lookup_limit_all',       '300',   'Place lookups per day for all users together (suggest-place)'),
  ('booking_limit_person',   '30',    'Booking files read per person per day (parse-booking)'),
  ('booking_limit_all',      '150',   'Booking files read per day for all users together (parse-booking)'),
  ('translate_limit_person', '200',   'Translations per person per day (translate)'),
  ('translate_limit_all',    '2000',  'Translations per day for all users together (translate)'),
  ('features',               '{"share_extension": true, "rating_prompt": true}',
                                      'Switches for the iOS app: Toogo in the Share menu, Apple''s rating prompt'),
  ('free_places_per_trip',   '10',    'Not used yet: new places a trip adds for free before the trip pass'),
  ('trip_pass_price',        '{"usd": 7.99, "ils": 29}', 'Not used yet: price of the trip pass')
on conflict (key) do nothing;

-- one setting for SQL code, with its fallback when the row is missing or not the right type
create or replace function public.setting_int(k text, fallback int) returns int
language sql stable security definer set search_path to '' as $$
  select coalesce((select case when jsonb_typeof(value) = 'number' then (value #>> '{}')::numeric::int end
                     from public.app_settings where key = k), fallback)
$$;

-- the daily free credits come from the settings (5 when the row is missing); the rest is the live function as it was
create or replace function public.grant_daily_free(p_user uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  daily int := public.setting_int('free_daily_credits', 5);
  have int;
  op text := 'daily:' || p_user::text || ':' || to_char(now() at time zone 'utc', 'YYYY-MM-DD');
begin
  perform pg_advisory_xact_lock(hashtextextended('user:' || p_user::text, 0));
  select coalesce(sum(delta), 0) into have from public.credit_ledger where owner_kind = 'free' and owner_id = p_user;
  if have < daily then
    insert into public.credit_ledger (owner_kind, owner_id, delta, reason, op_id, state)
    values ('free', p_user, daily - have, 'daily free', op, 'grant')
    on conflict (op_id) do nothing;
  end if;
  return (select coalesce(sum(delta), 0) from public.credit_ledger where owner_kind = 'free' and owner_id = p_user)::int;
end $function$;
