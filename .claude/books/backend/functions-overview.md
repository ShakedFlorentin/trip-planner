---
title: Edge functions overview
chapter: functions
explains:
  - logCall
  - creditsOn
---
Ten folders in `supabase/functions/` (nine functions plus `_shared/`). Deno, `npm:` imports, service role inside, CORS `*`. Claude model is `claude-haiku-5-5` where used.

| Function | Who calls it | Auth checked in the function | Claude? |
|---|---|---|---|
| plan-trip | database (pg_net) and the app | `x-plan-token` equals `get_planner_token()`, else JWT + `is_trip_member` | no |
| suggest-place | the app | `getUser()`; per-user and global daily caps | yes, with web search |
| parse-booking | the app | `getUser()`; caps; gateway JWT on | yes |
| translate | the app | `getUser()`; caps | yes |
| card-facts | database trigger | planner token only | yes |
| card-photos | database trigger, or by hand | planner token only | yes (looks at images) |
| review-photo | the app, admin only | `getUser()` + `is_app_admin()` | no |
| notify | the app after its own swipe | `getUser()`, membership, liked, match exists, 40/hour | no |
| sign-up | the app, signed out | none (invite code is the proof) | no |

Common rules
- Validate every id as a uuid and every body field by type; answer JSON `{error}` with a status (400, 401, 403, 404, 409, 413, 429).
- Service role only after the caller is known (toogo-supabase-prelaunch 4).
- Claude calls are one-off and cacheable (toogo-rules 2); each is logged by `logCall` in the function's own `ai-log.ts` (identical copy per folder, prices inside).
- Numbers that change (caps) come from `app_settings` through `settingInt`; the literal in the code is only the fallback.
- Secrets: `ANTHROPIC_API_KEY` env or Vault (`get_anthropic_key`), `VAPID_*` for push, never in the repo.
- Gateway `verify_jwt` is set per function at deploy time; see deploys.

**Errors never leak (`toogo-backend-craft`, 27 Nov):** a function answers a short safe message plus a code, never the raw error; the client maps the code to a Hebrew and English line. Raw text goes to `console.error` and `logCall` only. Today `plan-trip/index.ts` lines ~102 and ~111 return `e.message` and even `e.stack` in `json({error})`: fix before open sign-up (file for the owner to deploy, after the trip). `sign-up` already uses codes (`email_exists`, `invite_invalid`): copy that shape.

Known gaps (qa 16 Nov): plan-trip returns raw Postgres errors and has no rate limit; sign-up has no attempt limit and reveals valid invite codes; translate's English server errors can reach the screen.
Related: functions-ai, functions-cards, functions-other, guard-shared.
