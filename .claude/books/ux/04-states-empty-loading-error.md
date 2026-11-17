---
title: Empty, loading, offline and error states
chapter: patterns
explains:
  - EmptyState
  - Empty
  - Skeleton
  - LoadNote
  - OfflineBanner
  - canSayBalanced
  - say
  - errorText
  - LoadError
  - Loading
  - ErrorBoundary
---
Rule of thumb born from the QA round: **never say "empty" before you know.** A list that is loading, failed or offline must not read "all settled", "nothing planned", "no places", "no results", "no flight / no hotel".

## Pattern per situation
1. **Loading, no rows yet:** `Skeleton` (grey rows of the screen's real shape), not a spinner; the first boot shows the rings (`Loading`). Rows from the phone's cache show at once with no skeleton.
2. **Loaded and really empty:** `EmptyState` (Apple style): grey line icon about 50 pt that fits the case, a bold title, one line, one red button that does the obvious next thing. Cases are specific: Discover has four (voted on everything, filter hides all, preferences hide all, none yet; decision 20). `Empty` is the plain one-line fallback inside small lists.
3. **Failed refresh, rows exist:** keep the rows, show `LoadNote` ("update failed, check the connection, try again") at the top.
4. **Failed and nothing to show:** the same `LoadNote` plus no empty message; full-screen only for the trip itself (`LoadError` with retry).
5. **Offline:** `OfflineBanner` under the top bar: "no internet", "last update N ago", "N changes will be sent when there is signal"; failed changes open a sheet to retry or discard. Never block the screen.
6. **Save failed:** `say(errorText(...), {error: true})` toast in plain words, never the server's text; offline saves answer as saved and queue (see frontend outbox page).
7. **Crash:** `ErrorBoundary` full screen: "something went wrong", reload button, "unsent changes are kept on the phone".

## Guard in code
Show the empty state only when `!loading && !error`: `canSayBalanced({loading, error, rows})` is the model (screenLogic.ts); copy it for new screens. Use the same pair `loading`/`error` from `useTripTable`.

## Writing the lines
Title says what is true now ("No places to discover yet"); the line says why or what to do; the button is a verb. Hebrew and English both, mirrored layout checked. Filters: hide filter chips when there is nothing to filter, except when the filter is why it is empty (decision 21), and offer "show all".

## Waiting that takes time
Booking-import check, the wand (30 s poll with a progress toast), link fetch in Add place (`Steps` list), AI translation: show progress or a skeleton plus one sentence, and a time limit with a retry.

Known bad cases still open: Swipe "not now" on all cards shows the wrong empty state; empty state under a filter in Bookings is wrong; Search says "no results" while loading (partly fixed).

Code: `.claude/books/frontend/13-ui-sdk-and-styles.md`.
