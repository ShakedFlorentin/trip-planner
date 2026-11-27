---
title: Data layer: tableStore, useTripTable, live, cache
chapter: data
explains:
  - TableStore
  - tableStore
  - dropTableStores
  - useTripTable
  - liveOn
  - onLive
  - LiveChange
  - readCache
  - writeCache
  - clearCache
---
Screens never query trip tables themselves. They call `useTripTable<T>(table, tripId, order)` (`src/lib.ts`), which reads a shared `TableStore` (`src/tableStore.ts`).

## One copy per table
- `tableStore(table, tripId, order)` returns one `TableStore` per key `table:trip:order`. Every screen on the same table shares one load and one realtime subscription (before this, 300 new cards meant hundreds of loads; see docs/stress-test-2026-11-14.md).
- State is `{rows, loading, error, stale, updatedAt}`. Starts from the localStorage cache (`cache:<key>`): `loading` is false and `stale` true if a copy exists.
- Timings: `WAIT` 250 ms after a change before loading, `MAX_WAIT` 1.5 s, `FRESH` 5 s (a screen opening soon after a load reuses it), `LINGER` 3 s after the last screen leaves.
- `reload()` loads now; a reload asked during a load runs once more after it. `put(rows)` / `remove(rows)` place rows without a read (used after own saves). `ROW_KEY` names rows whose key is not `id` (swipes, day_info, members, plan_state).
- The deck (`candidates`) is read by revision: ids and revs first, then only missing cards, in pieces of `PIECE` (80).
- Scale gap: reads cap silently at 1000 rows (QA report). Today's real trip is under it.

## Live changes (`src/live.ts`)
`liveOn()` = `localStorage.live` (1/0, for tests) else `app_settings features.live`. When on, `onLive(tripId, fn)` shares one private Broadcast channel `live:<tripId>`; payload `LiveChange {t, op, n, rows}` (`rows` null when over 20 rows changed: read again). `'resync'` fires when the channel dropped and came back. When off, TableStore uses Postgres Changes per table.
Gaps: first join failure never resyncs; an old-path drop loses changes until refocus.

## Pending writes on top
`useTripTable` returns `withPending(table, rows)`: offline changes from the outbox are laid over the rows so they show at once. See [03-offline-outbox](03-offline-outbox.md).

## Cache helpers (`src/cache.ts`)
`readCache(key)` / `writeCache(key, data)` store `{data, at}` under `cache:`; never throw (storage full = no offline copy). Also used for `trip:<id>`, `members:<id>`, `memberTrips:<uid>`. `clearCache()` drops all stores and every `cache:*` key on sign-out.

## Rules
- A new trip table: use `useTripTable`, add its row key to `ROW_KEY` if not `id`, add the table to the live SQL (backend), and to `ready.ts` if it must work offline.
- Screens must check `loading`/`error` before saying "empty" (QA found this on Home, Expenses, Plan, Search; helper `canSayBalanced` in screenLogic.ts).
- Test: `npm run test:table` (fake Supabase).

## Craft rules (`toogo-frontend-craft` "State, offline and speed")
- **Saved plan first, fresh later:** `TableStore` starting from `cache:<key>` with `stale` true is exactly this rule. Keep it: a new screen must render from `rows` while `loading` is false and `stale` true, and show the fresh data when it lands without a spinner.
- **Per-section load, error and Retry:** every table hook returns `error` and `reload`; `LoadNote` (`ui.tsx`) is the Retry line. Rule: each section owns its `useTripTable`, its `LoadNote` and its `Skeleton`, so one failed table never blanks the screen. `Itinerary` loads three tables but shows one `loadFailed` note for all; split if one table can fail alone.
- **Errors never raw:** `message` in the store state is for logs only. Never put `error.message` in the UI; map it (`errorText`, see [03-offline-outbox](03-offline-outbox.md)). Today seven places still do (list in [15-craft-gaps](15-craft-gaps.md)).
- **Optimistic with rollback:** `put(rows)` after an own save is the optimistic step; if the write is refused (outbox `failed`), `withPending` stops covering the row and it disappears: that is the rollback, so the failed-changes sheet must say so.
- **Warm the next day:** `ready.ts` `prepare()` is this idea (today and tomorrow); it is the place for any "save the next day" extension. Plain code, no AI.
- **Silent cap at 1000 rows** is a break of "every fetch has a state": a capped read must say so.
