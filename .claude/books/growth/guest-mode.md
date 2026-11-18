---
title: Guest mode (Toogo before an account)
chapter: funnel
explains:
  - readGuest
  - writeGuest
  - pendingGuest
  - forgetGuest
  - guestDeck
  - loadGuestCards
  - GuestImport
  - Guest
---
Built 13 Nov, in main, **switched off** (`features.guest_mode`).

## Flow
Welcome, questionnaire, real cards of the visitor's cities (`dist/guest/<city>.json`, built with the guide pages, no photos), swipes; a sign-up ask after 8 likes. Answers and swipes stay in localStorage `guest` (`src/guest.ts`: `readGuest`, `writeGuest`, `forgetGuest`) until sign-in. Then `GuestImport` (`src/views/GuestImport.tsx`) saves the profile, makes a trip or uses the first, syncs the library and writes votes. Invited people join their friend's trip instead. The deck comes from `loadGuestCards` and `guestDeck`.

## Why it matters
It is the "value before sign-up" step (first-run principle 2, Apple 5.1.1(v)). It would be the main upgrade to the funnel.

## Open problems (QA 16 Nov)
- Retry creates a second trip; can overwrite a saved questionnaire; give-up deletes likes without warning.
- Guest deck empty for day-trip-only choices; Nara has 5 cards.
- Sign-up sheet every 12 swipes counts as nagging (rule 7): once, plainly.
- Invite link drops guest likes. 8 questions before the first card.
- `guest/<city>.json` exposes some internal fields.

## Switching on
Needs the problems above fixed, the English strings checked, and the owner's go. Not before the trip.

Related: [open-sign-up-plan](open-sign-up-plan.md).
