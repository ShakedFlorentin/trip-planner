---
title: The planner in brief
chapter: planner
explains:
  - buildDays
  - baseFor
  - suggestSplit
  - plan
  - replan
---
plan-trip puts every matched place on a day its people are near it, close to the day's other plans, on a day it is open, around bookings, with a rough time and one short line. No AI: hours and facts come with the card (`place_library` to `candidates`); a card without them is planned from its kind and `time_needed`.

**Files** (`supabase/functions/plan-trip/`)
- `index.ts`: auth, reads tables, writes `itinerary_items` and `places.auto_planned`.
- `lease.ts` (`loop`; branch planner-fixes-2026-11-26): one planner per trip, and what the app reads of a run in `plan_state`. Taking the lease clears `error`; a failed run writes `error` as code and time (`plan_failed:<ISO time>`), so the app's check `row.error !== before.error` (src/App.tsx) also sees the same failure twice in a row. `plan_state` has no started column.
- `errors.ts` (`failBody`, `failMark`; same branch): a failed call answers `{ error: 'plan_failed' | 'stays_failed', message }` with status 500; the error's text and stack go to `console.error` only. Test: `node scripts/plan-error-test.mjs`.
- `presence.ts` (`buildDays`): who is where each day (stays, bookings, couples' own days). On the branch `planner-fixes-2026-11-26` (not in main, not deployed): a city-change day starts after the booked train or from check-out plus the ride, the departure day counts the ride to its airport, a couple with a baby ends by 20:30. Date-only tickets are a known weak spot (qa).
- `geo.ts` (`locate`, `addressVariants`; same branch): address to coordinates through `geo_cache` only (free, cached; a miss is asked again after 14 days). `areaPoint` (round 3): a card with no coordinates whose address is not found gets the main station of the neighbourhood its card (or address) names, from `_shared/areas.ts`; an area that names no place stays unknown.
- `plan.ts` (`plan`, `hhmm`, `km`): the day packer. `stay.ts` (`baseFor`, `sleepsFromStays`): the hotel base point per night. `split.ts` (`suggestSplit`, `openNights`): "suggest a split" of open nights between cities, reads `cities` (route, ideal nights, season).
- `flags.ts` (`servesDinner`, `daylightOnly`; same branch, round 2): the two flags a card gets, from its facts (category, best time, visit minutes, hours, plan line), never from words in its name. A nightlife card is a dinner only when it says izakaya or yakitori, asks for the evening and takes an hour; a sight is held to daylight only when it has no hours and asks for the daytime, or (round 4) has no hours, says "any" and its name or plan line calls it a path, a trail, a walk, a garden or a park. Cards carry no "outdoors" fact: a flag that can't be known is left off.
- Client side: `replan` in `src/lib.ts` asks for a re-plan; the Plan tab opens call it too.

**Rules**
- A plan item a person added, moved or edited is never touched; only `auto` items are. Bookings and expenses must never change (planner fixes ship before 12 Dec only after replay passes, memory notes).
- Triggers call it after each swipe, match, booking, stay change; `request_plan()` sets `plan_state.dirty` and only starts the function when no planner runs.
- Tests: `npm run test:plan` (fixtures in `scripts/plan-fixtures/`), `npm run test:plan-fixes` (one test per fix of 2026-11-26, and `r1` to `r7` for the round-2 fixes of 2026-11-27: shared places first, flags from facts, a lone far place, meals on a day in another city, an early dinner, known points, a late lunch; `r8` to `r12` for round 3: a neighbourhood's station as a place's point, an unknown point first or last in the day, a couple that flies out in the morning is not company, free hours take a place left out (a meal counts 45 minutes of pace there, checked against the day's times), a shared morning market as the lunch of the couple that has none; `r13` to `r15` for round 4: a walk in the open with no hours and no time of day is over by dusk, a day that starts by 14:15 gets a late lunch first (started by 14:45; a later start has no lunch to plan), one couple's own far place between two stops in the same part of town moves to another day or waits (no out-and-back); before/after numbers with `node scripts/plan-metrics.mjs`), `npm run test:split`, `npm run test:stay`, `node scripts/rank-test.mjs`. For a bug write the failing fixture first.
- Real trip stays untouched: prove with fixtures, never run the planner on it (dry run needs the planner token, not for agents).

Known open (qa): hotelBase picks Kanagawa before Hakone; some Tokyo wards missing (couple's days dropped); undated trip says "updated" but does nothing; same-coordinate places.
Related: triggers, functions-other.
