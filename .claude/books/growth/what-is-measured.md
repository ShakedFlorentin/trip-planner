---
title: What is measured (track events)
chapter: measurement
explains:
  - track
  - trackOpen
  - countingOn
  - setCounting
  - lookStart
  - lookTake
---
Code: `src/track.ts` -> `rpc('track')` -> table `public.events` (`supabase/sql/2026-11-13-events.sql`). Only app admins can read it. Exclude the owner's own rows when reading numbers.

## Events
`open` (from guide/invite/shared_plan/link/direct, lang, ios/web, installed), `screen {tab}`, `tool {tool}`, `signed_out_view`, `guest_step`, `guest_swipes {n}`, `guest_ask`, `guest_save`, `quiz_done`, `guest_import`, `google_tap`, `sign_up` / `sign_in {provider}`, `first_swipe {liked}`, `first_match {members}`, `first_plan {items, days}` (each once per account per device, via `trackOnce` in src/track.ts; nothing is sent or remembered while counting is off), `hotel_tap {area}`, `link_out {host}`, `ready`, `error {msg, where}`.

## Rules
- Never typed text by design. But `error` messages up to 200 characters can by chance carry screen text (privacy gap, see the legal book).
- Off server-side with `features.counting = false`, or per device in Settings ("עזרה בשיפור Toogo", `setCounting`).
- On by default, tied to the account when signed in; deleted after 12 months (`events_cleanup`, about 1 call in 200).
- Card look time (`src/look.ts`: `lookStart`, `lookTake`) goes with each vote as `swipes.look_ms`, only when counting is on.

## Not measured yet
Exposure of the offer, first match, first full plan, onboarding drop per question, retention. First-run skill lists the minimum events. Add them only with a privacy check.

## Gotchas
- Anyone can flood the counter through anon `track` (QA, before public launch).
- One trip today: numbers are anecdotes, not rates.

Related: [funnel-today](funnel-today.md).
