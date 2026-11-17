---
title: Database triggers
chapter: data
explains: []
---
Source: `2026-11-02-live-baseline.sql` (triggers near line 1230) plus later files. All trigger functions are SECURITY DEFINER with `search_path ''`.

**Sign-up**
- `block_new_users` (BEFORE INSERT on `auth.users`): an account needs an unused, unexpired invite in `raw_user_meta_data.invite` (marks it used), or, only when `app_settings.features.google_signin` is true, a Google provider. Otherwise raises "sign-ups are by invitation only". Latest body: `2026-11-13-google-signin.sql`.
- `invites_rules` (before insert on `invites`): server picks code and 30-day expiry, needs a trip, 10 a week.

**Swipes and places**
- `swipes_match` (AFTER insert/update/delete on `swipes`) runs `on_swipe()`, which calls `match_place(candidate)`: counts who liked, and creates or removes the `places` row (the only legal way a place enters a trip, rule 3). `match_place` is not callable by app roles.
- `check_same_trip` (BEFORE on `swipes`, `places`, `itinerary_items`): the candidate or place must belong to the same trip as the row, else "candidate belongs to another trip".
- `swipes_replan`, `places_replan_new`, `places_replan_who`, `bookings_replan`, `trip_stays_replan`: call `request_plan()`, which sets `plan_state.dirty` and calls plan-trip through pg_net (see replan-while-running).
- `itinerary_touched`: a person's edit marks the item so the planner never moves it. `itinerary_item_address`: fills address from the place.

**Cards**
- `candidates_to_library` / `card_to_library` (BEFORE insert): links a card to `place_library` (member cards go in unapproved after the poisoning fix). `candidates_plan_facts` (`fill_plan_facts`). `card_needs_facts` (AFTER insert, when `facts_at` is null) and `card_needs_photos`: call the card-facts and card-photos functions with the planner token. `place_recheck_facts`: re-check facts older than 180 days when a place is matched.
- `candidates_rev` bumps `rev` on each change so the app reads only changed cards.

**Live updates**
- `live_ins`, `live_upd`, `live_del` (statement triggers on 14 trip tables) run `live_change()`: one Broadcast message per statement and trip on topic `live:<trip id>`: `{t, op, n, rows}`, rows up to 20. A failure there must never fail the write. Policy "trip members hear their trip" on `realtime.messages`.
- Switch: `app_settings.features.live`.

Gotcha: a trigger that calls an edge function must not let the call fail the write; `request_card_facts` returns null silently when the AI cap is hit.
Related: rls-and-membership, planner-brief.
