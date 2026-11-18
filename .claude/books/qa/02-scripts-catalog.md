---
title: Script catalog
chapter: 2
explains: [plan, flush, canSayBalanced, findSettleTwin, buildSnapshot, TableStore]
---
Run from the repo root. Every script is plain Node; code under test is bundled with esbuild on the fly.

## npm scripts (package.json)
| Command | Covers |
|---|---|
| `npm run test:plan` | planner engine `supabase/functions/plan-trip/plan.ts` against `scripts/plan-fixtures/*.json` |
| `npm run test:split` | night-split suggester `plan-trip/split.ts` |
| `npm run test:stay` | where-to-sleep `plan-trip/stay.ts` |
| `npm run test:recheck` | hours re-check, plain-code parts of `card-facts/facts.ts` |
| `npm run test:rating` | when the app may ask for a rating, `src/rating.ts` |
| `npm run test:table` | `src/tableStore.ts`: shared load, one channel, few reloads |
| `npm run test:money` | `src/money.ts`, `src/outbox.ts`, `parseAmount` |
| `npm run test:widget` | `src/widgetSnapshot.ts` |
| `npm run test:suggest-guard` | `_shared/guard.ts` with hostile input |
| `npm run test:guard` | guard plus card-photos, card-facts, parse-booking validation |

## Scripts with no npm alias (`node scripts/<name>.mjs`)
- `outbox-test` - timeout queue, 15/30/60 s retry, 409 rule, full storage.
- `screen-logic-test` - `src/screenLogic.ts` (empty-state rules from the 16 Nov round).
- `import-review-test` - booking import review, Places "whose" filter, rating row.
- `search-share-test` - `searchMatch.ts` and the share snapshot filter.
- `sw-test` - `page()` in `public/sw.js` with a fake worker scope.
- `rank-test` - Discover ranking helpers in `src/rank.ts`.
- `look-test` - card look time in `src/look.ts`.
- `landing-ui-test` - landing-day line, `arrivalLine.ts`.
- `i18n-check` - every `t('...')` key has an English entry; `--list` shows all gaps.
- `push-keys` - not a test (key helper); check its header before use.

## Not covered by any script
Screens and layout (only Playwright with mocks), native features, haptics, real push, real devices. See 03 and 04.

Related: 03, 09.
