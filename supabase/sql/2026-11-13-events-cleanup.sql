-- Usage counting is kept 12 months (the privacy page says so). Paste this whole file once into Supabase's SQL editor
-- and press Run. Run by the owner on 13 Nov 2026. Safe to run twice. It adds public.events_cleanup() and has public.track() call it now and then.

create or replace function public.events_cleanup()
 returns void
 language sql
 security definer
 set search_path to ''
as $$
  delete from public.events where at < now() - interval '12 months';
$$;
revoke all on function public.events_cleanup() from public, anon, authenticated;

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
  -- now and then, events older than 12 months go
  if random() < 0.005 then perform public.events_cleanup(); end if;
  return added;
end $function$;
