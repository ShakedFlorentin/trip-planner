---
title: Feature map (live, built but off, planned)
chapter: features
explains:
  - GuestImport
  - SharedPlan
  - buildSnapshot
  - SplitStart
  - PushAsk
  - pushWidgetData
  - hop
  - settleUp
  - ErrorBoundary
---
Status as of 16 Nov 2026 from `docs/HANDOFF.md`. Check the code before relying on a row.

## Live
| Feature | Where |
|---|---|
| Swipe, couple votes, vetoes, match | `src/views/Swipe.tsx`; SQL `match_place` |
| Planner (no AI) | `supabase/functions/plan-trip` |
| Plan with travel hops | `src/views/Itinerary.tsx`, `hop` and `navUrl` in `src/views/planUtils.ts` |
| Add place by link or name (Claude, cached) | `supabase/functions/suggest-place`, `src/views/AddPlace.tsx` |
| Bookings, file read by Claude | `src/views/Bookings.tsx`, `parse-booking` |
| Expenses split by couple | `src/views/Expenses.tsx`, `partiesOf` and `settleUp` in `src/money.ts` |
| Translator he/en/ja | `src/views/Translator.tsx`, `translate` |
| Offline: cached reads, queued writes | `src/outbox.ts`, `src/cache.ts`, `useTripTable` |
| Ready for today and tomorrow | `src/ready.ts`, `src/views/Ready.tsx` |
| Match notification (web push) | `src/push.ts`, `PushAsk.tsx`, function `notify` |
| Night split suggestion, "Where we sleep" | `plan-trip/split.ts`, `SplitStart` in `Stays.tsx` |
| Share plan link, reviews, ratings | `Share.tsx`, `SharedPlan.tsx`, `Review.tsx`, `Ratings.tsx` |
| Usage counting | `src/track.ts` |
| Privacy page | `scripts/pages/privacy.mjs` |
| iOS widgets data | `src/widgetData.ts`, `src/views/WidgetSync.tsx` |

## Built, switched off (flags in [feature-switches](feature-switches.md))
Guest mode, Google sign-in, trip pass (`src/pass.ts`), credits, where-to-stay hotel search (`src/affiliate.ts`, ID empty), live Broadcast.

## Built, not applied or not in main
Delete account and leave trip (SQL and function in another checkout, nothing before the trip). Fix file for rule 3 (`places-insert-via-match.sql`).

## Planned
Share from Instagram into Toogo (share extension), Apple and Google sign-in together, Apple in-app purchase, website checkout, Booking.com and Klook affiliate, free search pages, "closed" label on cards, trip wrapped card. See [roadmap](roadmap.md).
