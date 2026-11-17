---
title: Feature switches (app_settings.features)
chapter: features
explains:
  - liveOn
  - countingOn
  - setCounting
  - usePassStatus
  - passPrice
---
Switches live in the database (`app_settings`), read by the app in `src/settings.ts`. Changing one needs no new app version; phones follow within about 10 minutes.

| Flag | Default | What it does |
|---|---|---|
| `share_extension` | true | Share from other apps into Toogo (needs an App Store build) |
| `rating_prompt` | true | Apple's own rating prompt after a win (`src/rating.ts`: `mayAskForRating`, `askForRating`) |
| `guest_mode` | false | Visitor sees questionnaire and real cards before an account (`src/guest.ts`, `Guest.tsx`) |
| `google_signin` | false | "Continue with Google" (web only) plus invite-free Google sign-up |
| `counting` | true | Usage events (`src/track.ts`); device switch `countingOn` / `setCounting` |
| `trip_pass` | false | First 10 new places per trip free, then offer (`src/pass.ts`) |
| `push` | false in code default, on in live DB since 14 Nov | Web push for matches |
| `live` | false | Realtime by Broadcast (`liveOn` in `src/live.ts`) |

Other switches: `app_flags.credits` (AI credits, off), `free_places_per_trip` (10), `trip_pass_price` ($7.99).

## Gotchas
- The live DB may differ from the code defaults: read before claiming a state. Not checked from here.
- To switch live off: `update app_settings set value = jsonb_set(value,'{live}','false') where key='features'` (owner runs SQL).
- A phone can override `live` with `localStorage live = 1/0` for tests.

Related: [feature-map](feature-map.md).
