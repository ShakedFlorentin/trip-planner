---
title: High risk - the planner
chapter: 7
explains: [plan]
---
## Where
`supabase/functions/plan-trip/` (`plan.ts`, `split.ts`, `stay.ts`). Fixtures: `scripts/plan-fixtures/*.json` with its README.

## How it is tested
`npm run test:plan` bundles `plan.ts` with esbuild and runs each fixture through `plan(days, units, fixed)` the way `index.ts` does. It checks the engine's own rules plus each fixture's `expect`. Name fixtures to run only some: `node scripts/plan-test.mjs <name>`.
`test:split` and `test:stay` cover the two helpers; stay planner cases are fixtures named `stay-*.json`.

## Rules
- Planner fixes ship before 12 Dec; bookings and expenses must never change.
- Never run the planner on the real trip. Prove with fixtures.
- A bug becomes a fixture first, seen failing, then fixed.

## Gotcha
The Claude call in card-facts is not run by any test; only the plain-code parts are.

Related: 02, 09.
