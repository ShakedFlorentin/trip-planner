---
title: Retention promises and deletion
chapter: privacy
explains:
  - SignOutSheet
  - track
---
## What is kept, how long
| Data | Retention today |
|---|---|
| Usage events (`public.events`) | 12 months, `events_cleanup()` runs on about 1 in 200 `track` calls |
| AI call log (`ai_calls`) | No period set: legal draft says "[PERIOD]" |
| Booking files | While the trip exists; docs not cleaned on trip delete (QA) |
| Saved place lookups | Kept for good (the link never expires; hours re-checked after 6 months) |
| Photos shown on cards | Licences unverified for group C photos (`docs/photo-credits-audit.md`) |
| Backups of bookings and expenses | Readable only by the owner; not covered by deletion |

## Deletion
- Testers' agreement promises deletion "within a reasonable time" on request.
- In-app delete account: built, not live, not applied (after the trip). Decided: a trip with only the leaver is deleted; a shared trip stays; the display name stays next to expenses paid or shared (table `former_members`); library places stay with no link to the person; share links the leaver made are deleted.
- QA: delete is not transactional, may say "nothing deleted" on a half failure; booking files and backups are left behind; leaving deletes swipes so matched places go.
- Caches left on sign-out: push subscription, tiles and photos, outbox bodies, device id.

## Promises to avoid until true
"Everything is deleted", "kept only for a limited time", "never includes what you type".

## To decide
Period for `ai_calls`; backup retention; whether to honour "remove my library places" by hand (the built function keeps them).

Related: [privacy-policy-vs-reality](privacy-policy-vs-reality.md).
