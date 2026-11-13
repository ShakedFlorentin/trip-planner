-- Open sign-up through Google (2026-11-13). New accounts used to need an unused invite, always. Now an account that
-- Google made (its email checked by Google, so no fake addresses and no confirmation mail of ours) may also come in
-- without one, but only while app_settings features.google_signin is true. The same switch shows the Google button in
-- the app. Email and password sign-up stays by invitation, as before. With the switch off nothing changes.
--   update public.app_settings set value = value || '{"google_signin": true}' where key = 'features';
-- Safe to run twice.

create or replace function public.block_new_users()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c text := upper(trim(coalesce(new.raw_user_meta_data->>'invite', '')));
  google_open boolean := coalesce((select (value->>'google_signin')::boolean from public.app_settings where key = 'features'), false);
begin
  -- an invite, when there is one, is used up as before (an invited friend may also arrive through Google)
  if c <> '' then
    update public.invites set used_by = new.id, used_at = now()
     where code = c and used_at is null and used_by is null and expires_at > now();
    if found then return new; end if;
  end if;
  if google_open and coalesce(new.raw_app_meta_data->>'provider', '') = 'google' then return new; end if;
  raise exception 'sign-ups are by invitation only';
end $function$;
