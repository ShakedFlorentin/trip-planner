---
title: High risk - money and debts
chapter: 6
explains: [canSayBalanced, findSettleTwin, parseAmount]
---
## Where
`src/money.ts`, `src/views/Expenses.tsx`. Tests: `npm run test:money`, `node scripts/screen-logic-test.mjs`.

## Risks seen in the 16 Nov round
- A repayment recorded by both people counted twice (`findSettleTwin` now looks for the twin).
- "All settled" shown while loading or offline (`canSayBalanced`).
- Changing the exchange rate changed old balances.
- The new-expense form started in yen while the screen showed shekels.

## Rules
Expenses must never change by a code fix without the owner's say (real trip data is untouched). Amounts go through `parseAmount`; test Hebrew digits, commas, and empty input.

## How to test
Pure functions first, in `money-test.mjs`. Screens only with mocked data and both languages.

Related: 05, 09, ux `10-ux-debts.md`.
