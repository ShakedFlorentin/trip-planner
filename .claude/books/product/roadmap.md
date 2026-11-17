---
title: Roadmap (before the trip, after, later)
chapter: plan
explains:
  - hotelSearchUrl
  - AFFILIATE_ID
  - buyPass
---
From `docs/next-steps-2026-11-12.md`, `docs/qa-2026-11-16.md`, `docs/HANDOFF.md`. 4 users today, so the order is: cheaper and easier to get into, then bring people, then charge.

## Before the trip (to 12 Dec), small pieces, file by file
- Fix the live trip bugs from the 16 Nov QA: booking import drops out-of-trip dates silently, report box crash offline, couple filter in Places, offline timeouts (`src/outbox.ts`), wrong "empty" screens while loading, expense double count, slow-connection stale app (`public/sw.js`), double taps, share link leaking private places, translator errors, sign-out on a shared phone. List: `docs/qa-2026-11-16.md`.
- Planner fixes ship before 12 Dec after replay passes; bookings and expenses must never change.
- Share from Instagram into Toogo (needs a new App Store build).

## After the trip (from Dec 28 or January)
- Turn on where-to-stay with the hotel link (`hotelSearchUrl` in `src/affiliate.ts`, `AFFILIATE_ID` empty).
- Delete account and leave trip (apply order in the QA doc), privacy contacts, App Store listing and submission.
- Free search pages from the live cards; apply to Booking.com and Klook.
- Value before sign-up (guest mode), Google plus Apple sign-in together.
- Security items before open sign-up: push endpoint allow-list, invite rate limit, places insert fix.

## Later (50+ real trips)
- Trip pass paying: website checkout and Apple in-app purchase (`buyPass` says "payment opens soon").
- Notifications near a saved place (needs the App Store app's background location).
- Over-the-air updates, session replays (privacy decision first), trip wrapped card, public feedback board.

Related: [open-decisions](open-decisions.md).
