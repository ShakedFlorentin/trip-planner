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
  - aiError
  - LoadError
  - Loading
  - ErrorBoundary
  - Steps
---
Sources: `toogo-ux-ui-craft` ("In-between screens are retention screens" and the 2026-11-27 section: errors, error placement, loader for the job, honest waiting, Japan's networks, empty states), `toogo-ux-audit` (states row, incl. "no permission"). Link, do not copy.

Rule of thumb from the QA round: **never say "empty" before you know.** A list that is loading, failed or offline must not read "all settled", "nothing planned", "no places", "no results", "no flight / no hotel".

## Pattern per situation
1. **Loading, no rows yet.** Pick the loader for the job (`toogo-ux-ui-craft`, house decision 2026-11-27). *Changed:* this chapter used to say "Skeleton, not a spinner" everywhere; the house rule wins because it settles the @ceciliakimdesign / @synsation_ debate for Toogo: skeletons that do not match the layout feel slowest on a bad connection.
   - `Skeleton` only where it matches the real layout: the trip day list (time column, node, line) and the Discover card deck. Slow shimmer.
   - Anywhere else, a small spinner for a short unknown wait.
   - Long waits (wand, planner, booking import, link fetch): real stage names, like `Steps` in Add place. A progress bar only when the length is known. Never a fake or stuck percentage ("honest waiting").
   - Submit: spinner or "Saving…" inside the button.
   - First boot: the rings (`Loading`). Rows from the phone's cache show at once with no loader.
2. **Loaded and really empty:** `EmptyState` (Apple style): grey line icon about 50 pt that fits the case, a bold title, one line that says *why*, one red button for the next step. Never "nothing here yet" alone. Discover has four cases (decision 20). `Empty` is the one-line fallback inside small lists. Search with no results offers a suggestion (Hebrew and English spellings of Japanese names).
3. **Failed refresh, rows exist:** keep the rows, show `LoadNote` with Retry *at the section that failed*, not one note for the whole screen. Each section loads and fails on its own (Japan's subway and hotel Wi-Fi); photos and travel times may arrive later.
4. **Failed and nothing to show:** the `LoadNote` plus no empty message. Full screen only for the trip itself (`LoadError`). It must tell "no connection" apart from "trip not found / you were removed", and the second needs a way back to the trip list, not only Retry.
5. **Offline:** `OfflineBanner` under the top bar: "no internet", "last update N ago", "N changes will be sent when there is signal". Say what still works (the cached plan, bookings, essentials). Failed changes open a sheet to retry or discard; discard looks destructive and asks once. Never block the screen.
6. **No permission** (location, notifications, microphone refused): say what is missing, what still works, and one button to the setting. Treat it as a state like the others.
7. **Save failed:** error where it belongs (below).
8. **Crash:** `ErrorBoundary` full screen: "something went wrong", reload button, "unsent changes are kept on the phone".

## Errors: what, why, one action
- Never the server's text. `errorText()` and `aiError()` in `src/lib.ts` turn raw messages into plain words; every `error.message` on screen goes through one of them.
- The line names what failed *for this action* ("the link was not created", not the generic "we could not save") and why when known (offline, too big, limit reached).
- **Where it goes:** inline under the field or tile that failed (best; forms keep their `err` line); a toast (`say`) only for passing problems the app is already retrying; a dialog (`ask`) only when an answer is needed (failed credit purchase). A toast for something the user must act on is a break: `say` has no Retry action today.
- Money and big moments: full confirmation naming the amount; the button shows "Processing…" (Hebrew "מעבדים…") so nobody taps twice. Success and error never share the same red style.

## Guard in code
Show the empty state only when `!loading && !error`: `canSayBalanced({loading, error, rows})` (screenLogic.ts) is the model; copy it for new screens. Use the same `loading`/`error` pair from `useTripTable`.

## Writing the lines
Title says what is true now ("No places to discover yet"); the line says why or what to do; the button is a verb. Hebrew and English both, mirrored layout checked. Filters: hide filter chips when there is nothing to filter, except when the filter is why it is empty (decision 21), and offer "show all".

Open cases: see `10-ux-debts.md` (audit 2026-11-27: raw errors, wand toast, skeleton shapes, Home's single `LoadNote`, `LoadError` dead end).

Code: `.claude/books/frontend/13-ui-sdk-and-styles.md`.
