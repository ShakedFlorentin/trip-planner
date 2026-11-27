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
  - Steps
  - SwipeGame
  - MatchPop
  - Places
  - AddToDay
  - ReplanSheet
  - Home
  - PushAsk
---
Skills: `toogo-first-run` (one real action before any ask, never an empty app, no forced sign-in before value, reward early and ask late, chips not forms, pre-fill), `toogo-premium-feel`, `toogo-ux-ui-craft` ("Onboarding before features", "Take complexity off the user (Tesler)", "Honest waiting"). Rule 3: a place enters a trip only by swipe and match.

## First run (visitor, guest mode on)
1. `Guest` welcome: three lines of what Toogo is, one start button, "I already have an account".
2. `Onboarding` questionnaire (cities, interests). Today 8 questions before the first card: a known debt. Target: one or two chip questions (tap, not type), the rest learned from swipes or asked later; pre-fill what is known (dates and travellers from an invite or a booking).
3. Real cards to swipe (`GuestCards`); likes are kept on the phone. Never an empty app: a visitor always lands on real cards. A practice swipe that teaches the gesture is an idea (owner).
4. After `PROMPT_AFTER` swipes and again every 12, a sign-up sheet asks to keep the likes. "Reward early, ask late" says ask once, after a win (a few likes), and let "not now" stick; the repeat every 12 is the nagging QA flagged (debt).
5. `Login` (email or Google on the web; Apple and Google together are wanted, `toogo-first-run`), then `GuestImport` carries answers and likes into the new account and trip (a retry that makes a second trip is an open bug). Sign-in is built early but shown only after the first swipes.
6. `TripGate` opens `TripPicker` to create or join with a code, or straight into the trip. A failure there must say what failed ("the code was not found") and not only "we could not".

Invite link: `Login` with the invite; the invited answer the questionnaire first (`ProfileGate`) and cannot skip it (debt). A shared plan link opens `SharedPlan` read-only, with "copy to my trip" after sign-in. After first value: push pre-screen `PushAsk` only after likes or a match; rating prompt (Apple's own) only after a win on a later visit.

## Add a place
Plus button, Discover's + or a link shared from Instagram/TikTok/Maps (share extension) opens `AddPlace`. It reads the link or text (one-off AI lookup, streamed `Steps` with real stage names: the model for every long wait), shows a draft form to check. The result is a **card in Discover** (candidate), not a place. Weak cards (no what/where) are left out (rule 4). Photo only if it looks good (rule 5). Accept any pasted format (a messy address, a Maps link, plain text). A failed save shows a plain line inside the sheet, never the database text.

## Swipe
`SwipeGame`: card stack with photo, title, tags; heart or drag to like, X or drag to pass, "not now" (skip, not a vote), undo last. Light haptic at the threshold. Cards ranked by taste and rating; the filter chips narrow by city and audience. Tapping a card should grow it into its detail and back to the same spot ("carry, don't cut", not built).

## Match
When every couple the place is for has said yes, `MatchPop` celebrates (photo, rings, faces, success haptic) and the place appears in `Places` for everyone. The one big celebration in the app. Several matches queue and show one at a time. Web push tells others.

## Plan
`Places` > a place > `AddToDay` puts it on a day; or the wand (`ReplanSheet`: asks first, keeps past days, ticked and hand-made stops, never touches bookings) lets the planner arrange the open days. `Itinerary` shows the days; `Home` shows next up. Planner output is a suggestion the group can edit; edits do not replan automatically.
- The wand's wait is a 30 s toast today with no stages; a failure is a toast with no reason and no Retry. Target: status on the Plan screen with real stage names and a Retry, a success haptic and a clear "plan ready" when done (big moment, `toogo-ux-ui-craft` "Feedback sized to the stakes").
- Show the cached plan at once; travel times and photos fill in after (Japan's networks).

## Checks per flow
Works signed out on a fresh install with no local storage, Hebrew and English; invite link and `?share=` still land correctly; no path puts a place in the trip without swipe and match; the five-line brief from `toogo-ux-audit` (User, Task, Show, Constraint, Edge case) is written before any flow change.

Code: `.claude/books/frontend/08-views-discover.md`, `12-views-share-settings-report.md`.
