---
title: High risk - offline saves
chapter: 5
explains: [outboxFetch, flush, arrivedBefore]
---
Matters most in Japan: trains, weak eSIM, "signal but no data".

## Where
`src/outbox.ts` (see frontend `03-offline-outbox.md`). Test: `node scripts/outbox-test.mjs`, plus `npm run test:money` for the write path.

## Rules to keep
- Write timeout 8 s, token timeout 5 s, then queue; retry at 15/30/60 s.
- A 409 counts as sent only for 23505 on our own row id (`arrivedBefore`). Any other 409 is `failed`.
- 400, 403, 404 are kept as `failed` and shown, never dropped.
- `NATURAL_UNIQUE` tables: bookings, places, candidates.
- Full localStorage must free caches before unsent writes.
- Offline screens must not say "all settled" or "nothing planned" (`screenLogic.ts`).

## How to test
Fake fetch that never answers, answers 409, answers 403; fake storage that throws when full. Assert queue contents after each.

## Gotcha
Bookings and expenses must never change because of a retry. Replaying the same row id twice must leave one row.

Related: 06, 09.
