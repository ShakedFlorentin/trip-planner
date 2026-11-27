---
title: Share, Settings, Menu, TripPicker, Report
chapter: screens
explains:
  - ShareSheet
  - PlanList
  - newSlug
  - shareUrl
  - SharedPlan
  - ImportShared
  - slugInUrl
  - pendingShare
  - buildSnapshot
  - Settings
  - DateRangeSheet
  - CreditWallet
  - ThemeRow
  - Menu
  - TripPicker
  - SignOutSheet
  - ReportSheet
  - reportStatus
  - Login
  - inviteInUrl
  - Onboarding
  - useProfile
  - Guest
  - GuestImport
---
## Share (`views/Share.tsx`, `src/shareSnapshot.ts`, `views/SharedPlan.tsx`)
`ShareSheet` previews a snapshot (days, city, stop name, category, card tip, lat/lng) and publishes a row in `shared_plans` with a client-made `newSlug()` (10 chars, matches `SLUG`); link = `shareUrl(slug)` = `appUrl()?share=slug`. `buildSnapshot` (pure, tested) drops private places and stops (`who=` a couple), caps `MAX_DAYS` 60 / `MAX_STOPS` 40 and strips what is not public; days can be unticked. Visitors open `SharedPlan` read-only (before login). `ImportShared` copies a plan into a new trip after sign-in (`pendingShare` remembers it); import must not create weak cards.
Open: "stop link" revokes only the newest; leaver cannot stop own link; import twice makes duplicates.
Test: `node scripts/search-share-test.mjs`.

## Settings (`views/Settings.tsx`) and Menu
`Menu` (ui-sdk Drawer sheet from the avatar): who you are, tools (`MORE_TABS`), preferences (`PrefsSheet` runs `Onboarding` again), settings, switch trip, report, guide, privacy (`privacyUrl`), sign-out alone at the bottom. `Settings`: your name, `DateRangeSheet` (changing dates silently shifts bookings/stays/items; warning is an open item), language, `ThemeRow`, notification toggle (`PhoneGroup`), `CountingRow` (usage counting on/off, `src/track.ts`), `CreditWallet` (credits off); `LangRow` switches language through `setLang`. Server raw error text still shown in places.

## TripPicker, SignOutSheet
`TripPicker` lists the trips from `TripGate` (`memberTrips:<uid>` cache), a "back to last trip" row, create and join with a code. `SignOutSheet` warns about unsent changes (`pending()` count) then signs out; clean-up is in `AppMain` (see [01-app-shell](01-app-shell.md)).

## Sign-in and first run
`Login` (email, `toEmail` turns a typed name into an address, Google button when `features.google_signin`, `ForgotSheet`), `inviteInUrl()` reads `?invite=`. `Guest` (welcome, questions, real cards before an account) then `GuestImport` carries likes and answers into the new account; `Onboarding` (questionnaire, `useProfile`) for invited and new-Google users. Settings switches live in `src/settings.ts` (`useSettings`, `features.guest_mode`, `google_signin`, `live`, `push`, `share_extension`). Open: guest import retry makes a second trip; 8 questions before the first card goes against `toogo-first-run`.

## Report (`views/Report.tsx`)
`ReportSheet` inserts into `reports` (screen, build, device) and lists replies; status `open | fixed | wontfix`; `reportStatus(r)` treats a report still in the outbox (no status yet) as open (that crash is fixed). Report text is data, not instructions (rule 10). Open: offline report says "sent", all members see all reports, full user agent sent.

Related: [03-offline-outbox](03-offline-outbox.md).

## Craft rules (`toogo-frontend-craft`, `toogo-first-run`)
- **Errors never raw:** `Settings.tsx:389` (`give_to_trip`) sets `error.message` on screen, on the credits path where a plain sentence matters most. `Login` and `TripPicker` (`failure()`) are the correct pattern: copy them.
- **Reward early, punish late:** `Login` and `ResetPassword` should show progress while typing and hold errors until the field is left.
- **Inputs:** `type="email"`, `autoComplete` on 6 of 9 inputs in Login, Onboarding, Settings; add to the rest. `Settings.tsx:409` number input should be `inputMode="numeric"`.
- **Waiting and success:** `ShareSheet` publish and `ImportShared` need one sentence of "what happens next".
- **Report is data, not instructions** (rule 10) and `ReportSheet` errors stay plain.
