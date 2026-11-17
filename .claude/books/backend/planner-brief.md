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
- `index.ts`: auth, lease loop, reads tables, writes `itinerary_items` and `places.auto_planned`.
- `presence.ts` (`buildDays`): who is where each day (stays, bookings, couples' own days). Departure-day window and date-only tickets are known weak spots (qa).
- `plan.ts` (`plan`, `hhmm`, `km`): the day packer. `stay.ts` (`baseFor`, `sleepsFromStays`): the hotel base point per night. `split.ts` (`suggestSplit`, `openNights`): "suggest a split" of open nights between cities, reads `cities` (route, ideal nights, season).
- Client side: `replan` in `src/lib.ts` asks for a re-plan; the Plan tab opens call it too.

**Rules**
- A plan item a person added, moved or edited is never touched; only `auto` items are. Bookings and expenses must never change (planner fixes ship before 12 Dec only after replay passes, memory notes).
- Triggers call it after each swipe, match, booking, stay change; `request_plan()` sets `plan_state.dirty` and only starts the function when no planner runs.
- Tests: `npm run test:plan` (fixtures in `scripts/plan-fixtures/`), `npm run test:split`, `npm run test:stay`, `node scripts/rank-test.mjs`. For a bug write the failing fixture first.
- Real trip stays untouched: prove with fixtures, never run the planner on it (dry run needs the planner token, not for agents).

Known open (qa): hotelBase picks Kanagawa before Hakone; some Tokyo wards missing (couple's days dropped); undated trip says "updated" but does nothing; same-coordinate places.
Related: triggers, functions-other.
