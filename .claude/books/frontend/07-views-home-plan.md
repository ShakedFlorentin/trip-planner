---
title: Home, Itinerary, Replan, Stays
chapter: screens
explains:
  - Home
  - NextCard
  - BeforeTrip
  - byTime
  - Itinerary
  - StopItem
  - ItemSheet
  - ItemForm
  - Spare
  - ArrivalCard
  - ReplanSheet
  - replanDays
  - StaysSheet
  - SplitSheet
  - NightsSheet
  - recommendedArea
  - dayEntries
  - navUrl
  - arrivalOf
  - arrivalLine
  - ReadyLine
---
## Home (`views/Home.tsx`)
Trip-day hero: `NextCard` (what is next today, `leftCount`), `TodayRow`, and before the trip `BeforeTrip` (countdown, flight and hotel status, `InviteFriend`, `CityTile`). `ReadyLine` (views/Ready.tsx) is the "saved on the phone" line that runs `prepare()` (see [03-offline-outbox](03-offline-outbox.md)). The QA round added loading/error handling so a cold or failed load no longer says "no flight / no hotel". Still open: a proposed stay shown as booked, no-start-date hero.

## Itinerary (`views/Itinerary.tsx`, 1100+ lines)
- Day strip (ui-sdk Tabs) + timeline of `Entry` objects built by `dayEntries(items, bookings, day, ymd, who, couple)` in `views/planUtils.ts`; plan items and bookings merge, ordered by `byTime`.
- `StopItem` rows; `Hop` shows travel between stops with `NavLink` (Google Maps via `navUrl`); `ArrivalCard` uses `arrivalOf` / `arrivalLine` (`views/arrivalLine.ts`, the planner's `arrival` field; test `scripts/landing-ui-test.mjs`).
- `ItemSheet` (view) and `ItemForm` (edit/add; "add to this day" double tap duplicated rows, fixed with a busy guard). `Spare` lists places the planner left unplanned. `WhoChips` (src/who.tsx) filters by couple.
- Known: day strip looks for `.active` but ui-sdk sets `data-selected`, so it does not scroll to today; "now" line repeats per owner; edits do not replan.

## Replan (`views/Replan.tsx`)
The wand in the header opens `ReplanSheet`: lists days that would be redone (`replanDays`). The planner keeps past days, today, ticked stops, hand-added stops, and never touches bookings or expenses (human-in-the-loop rule). Backend side: `supabase/functions/plan-trip`. Test the engine with `npm run test:plan`, not the UI.

## Stays (`views/Stays.tsx`)
Where-to-sleep sheets: `StaysSheet`, `SplitSheet`, `NightsSheet`, `recommendedArea`. Parked: the where-to-stay feature waits until after the trip (rule 6). Tests: `npm run test:stay`, `npm run test:split`.

Related: [08-views-discover](08-views-discover.md), [10-views-bookings-money](10-views-bookings-money.md).
