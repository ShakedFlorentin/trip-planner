---
title: Offline outbox
chapter: data
explains:
  - outboxFetch
  - startOutbox
  - flush
  - withPending
  - failedChanges
  - retryFailed
  - discardFailed
  - setOutboxUser
  - onOutbox
  - arrivedBefore
  - writeFetch
  - OfflineBanner
  - useOnline
  - errorText
  - mutate
  - prepare
  - daysToKeep
---
`src/outbox.ts`. The Supabase client is created with `global.fetch = outboxFetch` (`src/supabase.ts`), so every table write passes through it. Only POST/PATCH/DELETE on `/rest/v1/<table>` queue; AI calls, translation and file uploads need a connection.

## Flow
1. `outboxFetch`: if offline or others are waiting, `enqueue`; else `writeFetch` (the real fetch with an `AbortController`, `WRITE_MS` = 8 s). A timeout or network error counts as offline and queues. Rows for `HAS_ID` tables get a client uuid so a later edit hits the same row.
2. The app answers "saved" and `withPending` (see [02-data-layer](02-data-layer.md)) lays the change over rows.
3. `startOutbox` flushes on `online`, on becoming visible and 1.5 s after start. `scheduleRetry` retries at 15, 30, then every 60 s while the app is open.
4. `flush` sends in order, only with the token of the account that made the change (`uid`; `setOutboxUser`). Token wait capped at `TOKEN_MS` (5 s).

## Status rules (the 409 trap)
- Network error, 401, 408, 429: stop, try later.
- 5xx: hold back only later changes to the same row (`touches`).
- 409 with Postgres 23505 on our own row id: the first send arrived, count as sent (`arrivedBefore`). Any other 409 is a refusal.
- 400, 403, 404 and other refusals: kept with `failed` status, never auto-resent. UI: `failedChanges`, `retryFailed`, `discardFailed` (sheet in `src/offline.tsx`).
- A retry of an insert whose first send may have arrived (`tried`) adds `resolution=ignore-duplicates`, except for tables with another unique rule (`NATURAL_UNIQUE`: bookings, places, candidates), where that would hide a real clash.

## Storage
Queue lives in localStorage key `outbox` and memory. When full it first frees `cache:*` copies; if still full it is memory only (lost on close). Known open: queue shares the 5 MB budget with caches; signed-out rows can be adopted by the next account; two tabs share one outbox.

## Pre-saving for the trip (`src/ready.ts`)
`prepare(trip, days)` saves today and tomorrow (`daysToKeep`): table copies, place photos, map tiles, booking docs. Runs in front with a connection, at most every few hours, and from `ReadyLine` on Home.

## Errors to the user
`mutate(promise)` shows `errorText(message)` (plain words, never raw server text) as a toast. `OfflineBanner` + `useOnline` show the connection state.

Test: `node scripts/outbox-test.mjs`, `npm run test:money` (also covers writes). Related: [04-service-worker-updates](04-service-worker-updates.md).
