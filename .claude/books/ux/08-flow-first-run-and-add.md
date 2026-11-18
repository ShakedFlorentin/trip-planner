---
title: Flows: first run, add place, swipe, match, plan
chapter: flows
explains:
  - Guest
  - GuestCards
  - Welcome
  - Onboarding
  - GuestImport
  - Login
  - TripPicker
  - AddPlace
  - SwipeGame
  - MatchPop
  - Places
  - AddToDay
  - ReplanSheet
  - Home
  - PushAsk
---
Skills: `toogo-first-run` (one real action before any ask, never an empty app, no forced sign-in before value), `toogo-premium-feel`. Rule 3: a place enters a trip only by swipe and match.

## First run (visitor, guest mode on)
1. `Guest` welcome: three lines of what Toogo is, one start button, "I already have an account". 2. `Onboarding` questionnaire (cities, interests; today 8 questions before the first card: a known debt). 3. Real cards to swipe (`GuestCards`); likes are kept on the phone. 4. After `PROMPT_AFTER` swipes and again every 12, a sign-up sheet asks to keep the likes (QA calls the repeat nagging). 5. `Login` (email or Google on the web), then `GuestImport` carries answers and likes into the new account and trip (a retry that makes a second trip is an open bug). 6. `TripGate` opens `TripPicker` to create or join with a code, or straight into the trip.
Invite link: `Login` with the invite; the invited answer the questionnaire first (`ProfileGate`) and cannot skip it (debt). A shared plan link opens `SharedPlan` read-only, with "copy to my trip" after sign-in.
After first value: push pre-screen `PushAsk` only after likes or a match; rating prompt only after a win on a later visit.

## Add a place
Plus button, Discover's + or a link shared from Instagram/TikTok/Maps (share extension) opens `AddPlace`. It reads the link or text (one-off AI lookup, streamed `Steps`), shows a draft form to check. The result is a **card in Discover** (candidate), not a place. Weak cards (no what/where) are left out (rule 4). Photo only if it looks good (rule 5).

## Swipe
`SwipeGame`: card stack with photo, title, tags; heart or drag to like, X or drag to pass, "not now" (skip, not a vote), undo last. Cards ranked by taste and rating; the filter chips narrow by city and audience.

## Match
When every couple the place is for has said yes, `MatchPop` celebrates (photo, rings, faces) and the place appears in `Places` for everyone. Several matches queue and show one at a time. Web push tells others.

## Plan
`Places` > a place > `AddToDay` puts it on a day; or the wand (`ReplanSheet`: asks first, keeps past days, ticked and hand-made stops, never touches bookings) lets the planner arrange the open days. `Itinerary` shows the days; `Home` shows next up. Planner output is a suggestion the group can edit; edits do not replan automatically.

## Checks per flow
Works signed out on a fresh install with no local storage, Hebrew and English; invite link and `?share=` still land correctly; no path puts a place in the trip without swipe and match.

Code: `.claude/books/frontend/08-views-discover.md`, `12-views-share-settings-report.md`.
