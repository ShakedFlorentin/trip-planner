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

## Craft rules (`toogo-frontend-craft`, `toogo-ux-ui-craft`)
- **Show the saved plan first, per section:** `Home` uses `Skeleton shape="hero"`/`"card"` while `planUnsure`/`gapsUnsure`, and one `LoadNote` (`loadFailed`) for all tables. `Itinerary` shows `Skeleton rows={3}` while items load and one `LoadNote` for three tables. The rule wants the plan rows to stay visible and only the failed part (bookings or travel times) to show its own Retry.
- **Travel times and photos arrive later:** `Hop` and `Thumb` must never block the row; keep them as fill-in.
- **Human in the loop:** `ReplanSheet` asks first and never touches bookings or expenses. Keep it.
- **Waiting state for the wand:** the 30 s poll of `plan_state` needs one calm sentence and stage names that are real; no fake percentage.
- **Reorder in one place** (rule from `toogo-premium-feel`): `Itinerary` is where a "Reorder" sheet would go; owner decides. Drag direction mirrors in RTL.
- **Tabular figures:** times use `tabular-nums` (`.next-time`, `.tl-code`); keep it for any new clock or cost.
- **Back keeps your place** is not met: opening `ItemSheet` and closing it is fine, but there are no history entries.
