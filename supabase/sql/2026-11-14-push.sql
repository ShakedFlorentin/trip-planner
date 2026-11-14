-- Notifications (roadmap step 13, 14 Nov 2026). A phone that turned notifications on keeps its push address here;
-- the notify function (supabase/functions/notify) sends to it. The first kind: "it's a match", to the others who
-- liked the same place, sent when the swipe that made the match lands. Web push only for now (the website and the
-- app added to the home screen); the App Store app needs Apple's push service, which comes with the Apple licence.
-- Behind app_settings features.push (off until the function and its key are in place).
-- Safe to run twice. No deletes: a phone that turns notifications off, or that the push service says is gone,
-- is marked off_at and never used again.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  lang text not null default 'he' check (lang in ('he', 'en')),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  off_at timestamptz
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id) where off_at is null;
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- one row per message sent to a person, so a match is told once however many phones report it
create table if not exists public.notifications_sent (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  ref text not null,
  sent_by uuid references auth.users on delete set null,
  at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);
create index if not exists notifications_sent_by on public.notifications_sent (sent_by, at);
alter table public.notifications_sent enable row level security;
revoke all on public.notifications_sent from anon, authenticated;

-- this phone's push address, for the signed-in person (an address moves to whoever signs in on that phone)
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_lang text default 'he')
 returns boolean language plpgsql security definer set search_path to '' as $function$
begin
  if auth.uid() is null then return false; end if;
  if p_endpoint !~ '^https://[^/\s]+/\S+$' or length(p_endpoint) > 1000
     or p_p256dh !~ '^[A-Za-z0-9_-]{80,100}$' or p_auth !~ '^[A-Za-z0-9_-]{16,30}$' then
    raise exception 'bad subscription';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, lang)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, case when p_lang = 'en' then 'en' else 'he' end)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang,
        off_at = null, created_at = now();
  return true;
end $function$;
revoke all on function public.push_subscribe(text, text, text, text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text) to authenticated;

-- notifications off on this phone
create or replace function public.push_unsubscribe(p_endpoint text)
 returns boolean language sql security definer set search_path to '' as $$
  with u as (update public.push_subscriptions set off_at = now()
              where endpoint = p_endpoint and user_id = auth.uid() and off_at is null returning 1)
  select exists (select 1 from u)
$$;
revoke all on function public.push_unsubscribe(text) from public, anon;
grant execute on function public.push_unsubscribe(text) to authenticated;

-- the switch, off; and the public half of the key the phones subscribe with (the private half is the function's secret)
update public.app_settings set value = value || '{"push": false}'::jsonb
 where key = 'features' and not (value ? 'push');
insert into public.app_settings (key, value)
values ('push_public_key', to_jsonb('BNknZVcdMjZmj4FE5lPwHBXyi8RMhYYofyuZUlGZxyqBQgWINVkojtzCnJIOKzvEMyse1jswDNreRk387qzdl4s'::text))
on conflict (key) do nothing;
