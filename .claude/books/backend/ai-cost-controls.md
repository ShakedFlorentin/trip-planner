---
title: AI cost controls
chapter: money
explains:
  - creditsOn
  - hold
  - settle
  - refund
  - settingInt
  - featureOn
  - holdPlace
  - logCall
---
Rule (toogo-rules 2, 7): no per-user AI on every view; Claude only for one-off cacheable work; credits cover cost plus a little, no squeezing. Sorting, travel times and ranking stay plain code (`learnTags` in `src/rank.ts` runs on the phone); AI improves the product, it is not the product (`toogo-backend-craft`). Credits wallet is the decided model per `toogo-credits-offer` and rule 7; the trip pass below is an older, conflicting plan (see appstore book payments page): the owner picks one before anything is built. One price for everyone; bought credits never expire.

**Layers, outermost first**
1. Shape and size checks before anything is spent (a malformed request must not burn a slot).
2. `ai_take(uid, fn, per_user, all_users)` (SQL, `2026-11-09-security-fixes.sql`, live): takes a lock (`pg_advisory_xact_lock` per function), counts `ai_usage` rows of the last 24 h for this user and for everyone, inserts a row and returns `ok`, `user` or `all`. Executable by `service_role` only. So extra accounts cannot multiply spend. It IS atomic; `toogo-supabase-prelaunch` still lists "AI quota not atomic" as a known gap, which this file contradicts: check the live function before trusting either.
3. Caps come from `app_settings` (`lookup_limit_person/_all`, `booking_limit_*`, `translate_limit_*`), read through `settingInt`, fallback numbers in code: suggest-place 30/300, parse-booking 30/150, translate 200/2000.
4. Trigger-started lookups (card-facts, card-photos) are metered per signed-in inserter in `request_card_facts` (60/400 a day); server-side inserts are not.
5. Credits (off): `creditsOn` reads env `CREDITS_ON` or `app_flags('credits')`. When on: `hold` (RPC `reserve_credits`, price from `credit_prices`, fallback suggest-place 4, parse-booking 1, translate 1), then `settle` on success or `refund` on failure. The same key twice is one charge (repeat = 409, no new AI work). Trips in `credit_unlimited_trips` (the owner's) are never charged.
6. Trip pass (off): `features.trip_pass`; `free_places_per_trip` (10) new places free per trip for the whole group, a pass lifts it. `holdPlace` / `settlePlace` / `refundPlace` in `_shared/pass.ts`. When the pass is on the old credits are not used for suggest-place.

**Logging**: every Claude call writes `ai_calls` through `logCall` (tokens, web searches, list-price cost, time). Prices are in `ai-log.ts`, one identical copy per function folder.

**Nothing charges today.** Known open (qa): a daily slot is burned on a 402; holds never time out; pass paywall has a dead buy button; Apple 3.1.1 needs in-app purchase on Israel's store; Settings credit transfer op id regenerated (possible double transfer).
Switch on credits only on the owner's word: `update public.app_flags set enabled = true where key = 'credits'`.
Related: functions-ai, deploys.
