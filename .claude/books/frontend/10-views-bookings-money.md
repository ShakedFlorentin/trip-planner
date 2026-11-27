---
title: Bookings, import check, Expenses and money
chapter: screens
explains:
  - Bookings
  - BookingForm
  - BookingSheet
  - ImportSheet
  - wallClock
  - outsideTrip
  - readFlags
  - dateDropped
  - sameTime
  - Expenses
  - ExpenseForm
  - SettleSheet
  - RateSheet
  - balances
  - simplify
  - settleUp
  - partiesOf
  - toMinor
  - convert
  - parseAmount
  - findSettleTwin
  - canSayBalanced
  - newExpenseCurrency
---
High-risk area: money and bookings must never be changed by the planner or by an offline replay.

## Bookings (`views/Bookings.tsx`, ~1000 lines)
List grouped by kind with filter tabs (`BOOKING_TABS`), `BookingSheet` (detail, document buttons `DocButtons`/`DocSaver` using `src/docs.ts` Cache Storage `docs`), `BookingForm` (manual add/edit, can read a file via `parse-booking`), `CopyCode`. The Pass (`views/Pass.tsx`) is the credits/trip-pass sheet, switched off.

## Import (`ImportSheet`)
1. User pastes text or picks a file (`isDocType`, PDF/image; `toBase64`). 2. `supabase.functions.invoke('parse-booking')` returns `bookings[]` with `flags` (a one-off, cacheable AI call; allowed by rule 2). 3. `readFlags` keeps known flags; flags are stripped before insert or the insert is refused. 4. Duplicate drop: `isDup` compares kind, `sameTime`, confirmation or normalized title and couple; a booking with no time is never the same as another with no time. 5. Review step: every row is shown for a check before saving (a confirmation can be a forged forward). A row outside the trip dates (`outsideTrip`) or with a dropped date (`dateDropped`) starts unticked and says why. 6. Save only ticked rows; the original file is kept beside them (orphan doc on failed save is an open issue).
Times are local wall-clock `YYYY-MM-DDTHH:mm` (`wallClock`; hotel defaults 15:00 / 11:00). Open: more than 20 bookings cut silently; HEIC refused with a generic error; no client size check.
Test: `node scripts/import-review-test.mjs`.

## Expenses (`views/Expenses.tsx`) and `src/money.ts`
- Amounts are stored in minor units: `toMinor` / `fromMinor`, scale per currency (`JPY` 1, `ILS` 100). `convert(amount, from, to, ilsPerJpy)` uses the trip-wide `trips.ils_per_jpy` (default 0.025); changing it (`RateSheet`) changes old balances (warning added; `hasSettlements`).
- `balances(expenses, ids, cur, rate)` then `settleUp(bal, parties, cur, rate)` (debts between couples via `partiesOf`, or person by person when `trip.settle_by === 'people'`); `simplify` minimizes transfers; `splitEvenly` shares remainders.
- `SettleSheet` records a settlement expense (`kind: 'settlement'`). `findSettleTwin` (screenLogic.ts) detects the same repayment recorded by both payer and receiver within 6 hours, so it is not counted twice. `newExpenseCurrency(shown)` makes the form start in the shown currency, not yen.
- `canSayBalanced` stops "all settled" while loading, offline or failed.
- `parseAmount` accepts messy typed numbers; `roundFor` caps decimals.
Open: stale edit overwrites; former-member ids vanish from sums; names glued to prepositions in Hebrew.
Tests: `npm run test:money`, `node scripts/screen-logic-test.mjs`. Related: [03-offline-outbox](03-offline-outbox.md).

## Craft rules (`toogo-frontend-craft` "Forms and input", "Errors never raw")
- **Raw server text reaches the user** in `BookingForm`: `Bookings.tsx:414` (upload) and `:436` (save) show `error.message`. Map to plain Hebrew and English (rule wins over the existing `t('שגיאה: {msg}')`).
- **Postel for money:** `parseAmount` already takes " 1,250.50 " and "12,5". Use it, never `Number()` or `parseFloat`, on any new amount field.
- **Keyboards:** amounts use `inputMode="decimal"` and `dir="ltr"`; keep it on every money field.
- **Break tests:** double-tap Save saves once (client uuid plus busy guard); delete asks first (`askDelete`, 25 call sites); closing an unsaved `BookingForm` or `ExpenseForm` does not ask "Discard changes?" yet; after saving, the new row should be visible and confirmed, not only a toast.
- **Rolling numbers** for totals (`--dur-2`, `tabular-nums`) only if the owner wants it; money text already uses `tabular-nums`.
- **Import check is a designed waiting state:** show the stage and one sentence; errors from `parse-booking` go through `aiError`, not raw.
