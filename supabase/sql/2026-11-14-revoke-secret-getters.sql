-- Close get_anthropic_key() and get_planner_token() to every role except service_role.
-- APPLIED to the live database on 14 Nov 2026 (owner approved; prechecks were clean). The other 2026-11-14 files still wait until after the trip.
--
-- WHAT IT DOES
--   Both functions are SECURITY DEFINER and return a vault secret (the Anthropic key, the planner token). Postgres gives
--   EXECUTE to PUBLIC on every new function, so without a revoke any signed-in (or anonymous) caller could read the secret
--   through the API. 2026-10-28-trip-planner.sql already revokes get_planner_token; get_anthropic_key had NO revoke anywhere
--   in the repo (repo/live drift: the live grants were checked read-only on 14 Nov and are already closed). This file makes a
--   rebuilt database (a branch, a local copy, a restore) safe, and re-states the service_role grant the edge functions need.
--
-- CALLERS CHECKED (grep over supabase/functions, supabase/sql, src on 14 Nov)
--   Only edge functions call them, always on the `admin` client made from SUPABASE_SERVICE_ROLE_KEY:
--     get_anthropic_key: card-facts, card-photos, parse-booking, suggest-place, translate
--     get_planner_token: card-facts, card-photos, plan-trip
--   None calls them with a user token. src/ never calls them. No SQL trigger or function calls them (request_plan and friends
--   read vault.decrypted_secrets directly, and as SECURITY DEFINER owner they would not be affected anyway).
--   So the revoke cannot break an edge function. Roles that MUST keep EXECUTE: service_role (and the owner, postgres, which
--   keeps it implicitly).
--
-- WHAT IT CHANGES ON THE LIVE DATABASE
--   Function ACLs only. If the live grants are already closed (they were) this is a no-op. No data, no function body.
--
-- PRECHECK (read-only, run first; expected: anon, authenticated, public all false; service_role true)
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
--          has_function_privilege('service_role', p.oid, 'execute') as service_role,
--          p.proacl
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname in ('get_anthropic_key', 'get_planner_token');
--
-- ROLLBACK (only if an edge function fails with "permission denied for function get_...": it means that function is not
-- running as service_role; fix the function, do not reopen the secret to users)
--   grant execute on function public.get_anthropic_key() to service_role;
--   grant execute on function public.get_planner_token() to service_role;
--
-- Idempotent: revoke and grant can run any number of times.

revoke execute on function public.get_anthropic_key() from public, anon, authenticated;
revoke execute on function public.get_planner_token() from public, anon, authenticated;
grant execute on function public.get_anthropic_key() to service_role;
grant execute on function public.get_planner_token() to service_role;
