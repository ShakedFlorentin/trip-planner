---
title: plan-trip, notify, sign-up
chapter: functions
explains:
  - sendPush
  - featureOn
---
**plan-trip** (`plan-trip/index.ts`; modules `plan.ts`, `presence.ts`, `split.ts`, `stay.ts`, `route-data.ts`). See planner-brief.
- Auth: `x-plan-token` header (compared with `get_planner_token()`; wrong token is 401) OR a signed-in member (`getUser()` then `is_trip_member`, 403 if not). The gateway JWT check is off because the browser preflight has no JWT.
- In: `{trip_id, suggest_stays?, nights?, dry?, wait?}`. Plain call answers 202 `{started:true}` and runs in the background (`EdgeRuntime.waitUntil`). `suggest_stays` only reads. `dry` and `wait` need the token.
- One planner per trip: lease in `plan_state` (60 s `LEASE_MS`); requests during a run set `dirty` and it runs once more.
- No AI. Known gaps: raw Postgres errors returned, no rate limit.

**notify** (`notify/index.ts`, `_shared/webpush.ts`)
- The app calls it after its own swipe made a match. In: `{kind: 'match', candidate_id}`. Checks: signed in, member of the card's trip, the caller liked it, `match_place` made a place, `features.push` on, VAPID keys set (else `{ok, sent:0, off:true}`).
- At most 40 notifications an hour per sender (429). Each person is told once: rows claimed in `notifications_sent` first.
- `sendPush` encrypts (web push, VAPID). Web push only; the App Store app needs Apple push (needs the paid licence).
- Open: `push_subscribe` accepts any https endpoint, so the server can be made to POST anywhere (SSRF-ish, no timeout) and an endpoint row can be taken over; failed pushes are not retried.

**sign-up** (`sign-up/index.ts`)
- Signed-out call. In: `{invite, email, password, name}`. Invite must exist, unused, unexpired (410 `invite_invalid`); password 8-200 chars; creates a confirmed user with the service role and metadata `{invite, name}`; the `block_new_users` trigger still marks the invite used. Why: Supabase built-in mail only reaches team addresses.
- Errors are codes the app words: `invite_invalid`, `email_exists`, `weak_password`, `bad_request`, `failed`.
- Open: no attempt limit; 410 vs other answers reveals valid invites; `email_confirm: true` allows squatting an address.
Related: functions-overview, security book.
