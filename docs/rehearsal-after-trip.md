# After the trip: the SQL runbook (owner)

Nothing here is run before 31 Dec 2026. The real trip (a779ec4d-a64a-4fa1-bfee-17fda9e433f6) is never used for a test. All files are idempotent; each has its own header with precheck, verify and rollback. I (the backend agent) wrote them and ran none of them: they are read-reviewed only.

## 1. Order

| # | File | Needs | Notes |
|---|------|-------|-------|
| 1 | `supabase/sql/2026-11-14-revoke-secret-getters.sql` | nothing | ACLs only; live is already closed, so a no-op there |
| 2 | `2026-11-14-delete-account.sql` (still in the OTHER folder `/Users/maorsaadon/RentCalc/RentCalc/supabase/sql/`; copy it in first) | nothing | drops the `expenses.paid_by` foreign key and replaces `check_expense_people`. The only risky one. Then deploy the `delete-account` edge function |
| 3 | `2026-11-14-create-trip-guard.sql` | nothing | patches `create_trip` text; two NOT VALID checks |
| 4 | `2026-11-14-leave-trip.sql` | 2 | stops by itself if `former_members` is missing |
| 5 | `2026-11-14-places-insert-via-match.sql` | the app build without "ישר לרשימה" and PlaceForm-create on every phone | last; a stale phone gets 403 |

Run one file per sitting, verify, then the next. Not while anyone is editing expenses.

## 2. Rehearsal without the live project

Never `supabase link`, `db push` or `db dump` against the live ref for a rehearsal. Use a copy with no live data:

- **Local `supabase start` (cheaper: free).** Needs Docker Desktop (a few GB of disk, a few minutes). Start it, open Studio's SQL editor on localhost, run `supabase/sql/2026-11-02-live-baseline.sql`, then the dated files after it in name order, then the five files above in the order of section 1 (file 2 from the other folder). Cost: your time only. Honest caveat: the baseline is a reference snapshot, not a migration; some files patch live text (`pg_get_functiondef` + replace) and may stop on a baseline copy. A stop in an OLD file is a rehearsal-setup problem, not a finding on the new files; note which and continue. I did not test that the baseline loads clean.
- **Supabase branch (dashboard).** A branch is a separate throwaway database. Branching is a paid-plan feature billed by branch-hours (check the current price on the Supabase pricing page; it is cents for a day). It does not copy live data, and since this repo has no `supabase/migrations`, the branch starts empty: you load the baseline and files into it the same way. Same effort as local, closer to the real server version (Postgres version, vault, storage). Delete the branch afterwards.
- Recommendation: local first (free); if something behaves differently from what you expect, repeat on a branch for the final dress rehearsal. Run every file twice on the copy; the second run must change nothing and raise nothing (the create_trip one prints a notice and skips).

On the copy, also run: `node scripts/delete-account-test.mjs` (in the other folder), and as a signed-in test user (not service role) the checks in each file's "VERIFY AFTER".

## 3. Read-only prechecks on LIVE (before each file)

The query for each file is in the file's header ("PRECHECK"). Run them in the SQL editor; they only read. Expected answers are written next to them. Stop and send me the output if any is different. Two worth repeating here:

- places: the policy list must be exactly `places_all`, and `match_place` and `on_swipe` must show `prosecdef = true`. If not, file 5 must not run.
- create_trip: the printed function text must contain `declare tid uuid; code text;` and `values (trip_name, start,`.

## 4. Dump before (your rollback), on LIVE, read-only

Save each result to a file outside the repo (CSV export or copy):

```sql
-- the group's expenses, whole
select * from public.expenses order by created_at;
-- the trigger and its function, and the foreign key that file 2 drops
select pg_get_triggerdef(t.oid) from pg_trigger t where t.tgrelid = 'public.expenses'::regclass and not t.tgisinternal;
select pg_get_functiondef('public.check_expense_people()'::regprocedure);
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.expenses'::regclass;
-- the other things the files change
select pg_get_functiondef('public.create_trip(text, text, date)'::regprocedure);
select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename in ('places', 'members');
select p.proname, p.proacl from pg_proc p where p.proname in ('get_anthropic_key', 'get_planner_token');
select * from public.members;   -- names and couples
```

Rollback of file 2: re-create the FK `expenses_paid_by_fkey` from the saved definition (it is `foreign key (paid_by) references auth.users(id)`; only valid while every paid_by is still an existing user) and re-run the saved `check_expense_people` text. Rollback of the others is in their headers.

## 5. Verify after (read-only)

```sql
select pg_get_functiondef('public.check_expense_people()'::regprocedure) ilike '%former_members%' as trigger_ok;   -- true after 2
select count(*) from pg_constraint where conrelid = 'public.expenses'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass;   -- 0 after 2
select count(*) as expenses_now from public.expenses;    -- same number as in the dump
select has_function_privilege('authenticated', 'public.get_anthropic_key()', 'execute');   -- false
select has_function_privilege('authenticated', 'public.leave_trip(uuid)', 'execute'), has_function_privilege('anon', 'public.leave_trip(uuid)', 'execute');   -- true, false
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'places' order by 1;   -- select/update/delete only
select has_table_privilege('authenticated', 'public.places', 'insert');   -- false
select conname, convalidated from pg_constraint where conname in ('members_display_name_len', 'trips_name_len');
```

Then open the app with your own account: the expenses screen shows the same total as before.

## 6. Account-deletion test with a throwaway account

First on the copy, then once on live with a brand new account (never a travelling friend's). Make the account through the normal sign-up with an invite.

1. Account T creates a solo trip "test-solo".
2. T creates (or is invited to) a shared trip "test-shared" with a second throwaway account U, and adds one expense paid by T split between T and U.
3. As T: Settings, Delete account. Expect success.
4. Check (as owner, SQL editor):
   - `select id from auth.users where email = '<T email>';` returns no row.
   - `select * from public.former_members where user_id = '<T id>';` has one row, in test-shared, with T's name.
   - test-solo is gone: `select * from public.trips where name = 'test-solo';` no row. Its storage: `select name from storage.objects where bucket_id = 'docs' and name like '<solo trip id>/%';` no rows (upload one document to the solo trip first to test this). Same for the `photo-submissions` bucket if T uploaded one.
   - As U: test-shared still opens, the expense shows T's name, and U can edit it and settle up with T.
   - Signing in as T fails (wrong credentials / user not found).
5. Repeat with `leave_trip`: V joins test-shared, pays an expense, calls Leave. Expect `left`; V's name stays on the expense; if V was the creator, `trips.created_by` is the earliest-joined remaining member. A sole member leaving: trip gone. Orphan files check: `select name from storage.objects where bucket_id = 'docs' and (storage.foldername(name))[1]::uuid not in (select id from public.trips);` (storage files of deleted sole-member trips are not removed by SQL; remove them by hand in the dashboard).
6. Delete test-shared and U afterwards.

## 7. Your dashboard steps (forgot-password)

Supabase dashboard, Authentication, URL Configuration:
- Redirect URLs (allow-list), add (from `src/views/Login.tsx:144`, which already calls `resetPasswordForEmail` with `redirectTo: appUrl() + '?reset=1'`; `appUrl()` in `src/native.ts` is `location.origin + location.pathname` on the web and the constant `SITE` in the iOS app):
  - web: `https://shakedflorentin.github.io/trip-planner/?reset=1` (the Pages address from the board record; confirm it equals the real `location.origin + pathname`), and for safety the wildcard `https://shakedflorentin.github.io/trip-planner/**`;
  - iOS app: `SITE` in `src/native.ts` is the same Pages address, so the same entry covers it (the reset link opens in the browser, not in the app). The `toogo` URL scheme is in `ios/App/App/Info.plist`; add `toogo://**` only if the flow later moves to it. Whether a reset link can return to the iOS app was not checked and needs a device.
  - for local tests add `http://localhost:5173/**` only on the copy, not on live.
- Site URL: leave as is unless it points at a localhost.
- Authentication, Email Templates, "Reset password": the text is English by default; change it to Hebrew if wanted (the link variable `{{ .ConfirmationURL }}` stays).
- Authentication, Providers, Email: confirm "secure password change" matches what you want.
