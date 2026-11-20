-- Traveller photos on the card (design: docs/superpowers/specs/2026-11-20-place-photos-and-trip-album-design.md). NOT APPLIED.
-- The owner applies it, after the Japan trip (toogo-rules 6). Needs 2026-11-16-library-poisoning.sql first (photo_submissions.source).
--
-- HOW TO APPLY
--   1. Supabase SQL editor, project wbofjfwbdewgnwjmcpnv: paste this whole file and run it (idempotent, no deletes).
--   2. Deploy the edge function: supabase functions deploy review-photo   (gallery.ts is imported by index.ts)
--   3. Check as a normal signed-in user: select * from public.traveller_photos(array['<a library id>']::uuid[]);
--      a signed-out call must fail (no execute right).
--
-- WHAT IT DOES
--   1. my_pending_photos() counts only source = 'member' rows. Photos the card-photos function files under the trip creator
--      (source = 'server') no longer use up their 20-waiting cap.
--   2. traveller_photos(library_ids): per library card, the approved public_urls of source = 'member' rows, newest first,
--      at most 12 per card, no user ids. Input capped at 200 ids. Everyone signed in may read them: they are public photos
--      only after an admin approved them (waiting and rejected rows are never returned).

create or replace function public.my_pending_photos() returns bigint
language sql stable security definer set search_path to '' as $$
  select count(*) from public.photo_submissions p
   where p.user_id = auth.uid() and p.status = 'pending' and p.source = 'member'
$$;
revoke execute on function public.my_pending_photos() from public, anon;
grant execute on function public.my_pending_photos() to authenticated;

create or replace function public.traveller_photos(library_ids uuid[])
returns table(library_id uuid, urls text[])
language sql
stable
security definer
set search_path to ''
as $$
  select x.library_id, array_agg(x.public_url order by x.reviewed_at desc, x.id) as urls
    from (select p.library_id, p.public_url, p.reviewed_at, p.id,
                 row_number() over (partition by p.library_id order by p.reviewed_at desc, p.id) as rn
            from public.photo_submissions p
           where auth.uid() is not null
             and p.library_id = any (library_ids[1:200])
             and p.source = 'member'
             and p.status = 'approved'
             and p.public_url is not null) x
   where x.rn <= 12
   group by x.library_id
$$;
revoke all on function public.traveller_photos(uuid[]) from public, anon;
grant execute on function public.traveller_photos(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- ROLLBACK (commented; run only if something breaks)
-- ---------------------------------------------------------------------------------------------------------------
--   drop function if exists public.traveller_photos(uuid[]);
--   -- my_pending_photos goes back to the definition in 2026-11-05-photo-submissions.sql (same text without "and p.source = 'member'").
--   -- Redeploy the previous review-photo function (git: supabase/functions/review-photo/index.ts before this change).
