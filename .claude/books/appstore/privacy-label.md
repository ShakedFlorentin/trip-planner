---
title: App Privacy label (draft)
chapter: review
explains:
  - track
  - countingOn
---
Two drafts agree on most rows: `docs/app-store-listing.md` (13 Nov) and `docs/legal-drafts-2026-11-14.md` section 3. Tracking: No (no ad tools, brokers or outside SDK in `src/track.ts`); ATT not needed.

## Collected, linked to the person
- Contact info: email, name (the display name).
- User content: photos, customer support (problem reports), other user content (trips, bookings, files, expenses, lists).
- Identifiers: user id (functionality and analytics); device id (random `vid`, analytics).
- Usage data: product interaction (analytics).
- Diagnostics: other diagnostic data (error events).

## Not collected
Location, health, financial, contacts, browsing history, purchases (today).

## Open points (legal decides)
- Sensitive info: dietary answers can hint at religion. The 13 Nov listing leaves it out; the legal draft leans to declaring it. Disagreement: resolve with legal.
- Financial info: do expense debts count?
- Is an app-made random id a "device ID"?
- Coarse location from IP: not used, confirm.
- Affiliate links with a user id may become tracking.
- Counting is on by default with an opt-out: still declared.

## Keep in sync
Label, privacy page (`scripts/pages/privacy.mjs`) and the code must agree. If purchases or push (APNs) arrive, update all three.

Related: legal book; [sign-in-and-ai-disclosure](sign-in-and-ai-disclosure.md).
