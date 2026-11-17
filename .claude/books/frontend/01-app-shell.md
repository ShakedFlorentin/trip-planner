---
title: App shell and routing
chapter: shell
explains:
  - App
  - AppMain
  - ProfileGate
  - SignedOut
  - TripGate
  - TripApp
  - LoadError
  - countSignIn
---
No router library. `src/App.tsx` is a chain of gates, each returning the next component. `src/main.tsx` mounts `ErrorBoundary > App`.

## The gates (outside in)
1. `App`: `?share=slug` (slugInUrl) shows `SharedPlan` read-only, before any login. The guide video (`Guide`) plays over everything on first open.
2. `AppMain`: asks Supabase for the session. `userId` is `undefined` (Loading rings), `null` (SignedOut) or an id. Gotchas: the id is cached under `userId` so an offline refresh failure (`AuthRetryableFetchError`) is not a sign-out; after `SESSION_WAIT_MS` (3 s) a hanging token refresh opens as the cached user. `PASSWORD_RECOVERY` shows `ResetPassword`. On `SIGNED_OUT`: `clearCache`, delete Cache Storage `docs`/`tiles`/`photos`, drop per-account localStorage keys (outbox rows stay, kept for their own account).
3. `SignedOut`: with `features.guest_mode` a visitor sees `Guest` (questions + real cards) first; an invite link (`inviteInUrl`) goes straight to `Login`.
4. `ProfileGate`: invited or new-Google users answer `Onboarding` before anything else.
5. `TripGate`: picks the trip. `localStorage.tripId` ('' = left on purpose, show `TripPicker`), `lastTrip`, and a cached `memberTrips:<uid>` list so it works offline. A failed members query is not "no trip". Also handles a pending shared plan (`ImportShared`) and a pending guest import (`GuestImport`).
6. `TripApp`: loads trip + members (cache first, banner after 6 s stale), subscribes to live changes (`onLive`, or two postgres_changes channels while `liveOn()` is false), shows the tabs.

## TripApp
- `TABS`: home, swipe (Discover), plan, bookings, places. Glyph paths are inline SVG, solid, one weight; `nudge` evens the spacing.
- State: `tab`, `day`, and sheets for menu, tool (`MoreTab`: lists, money, say, ...), settings, prefs, reporting, searching.
- Header: search, the wand (plan tab only; always asks first via `ReplanSheet`, then `replan()` and polls `plan_state` for 30 s), the account avatar opening `Menu`.
- Routes without a router: `useQuickAddRoute` (+ wheel), `useGoRoute` (widget/Siri), a tapped notification's `?go=plan&day=3` (read once, then `history.replaceState`).
- `OfflineBanner` shows when the trip row is a stale copy.

## Known gaps (docs/qa-2026-11-16.md)
No history entries: iOS swipe-back leaves the app and sheets do not close. `TripApp` is not keyed by trip id (stale state if removed from a trip). Signed-in user opening an `?invite` link: nothing happens.

Related: [02-data-layer](02-data-layer.md), [12-views-share-settings-report](12-views-share-settings-report.md).
