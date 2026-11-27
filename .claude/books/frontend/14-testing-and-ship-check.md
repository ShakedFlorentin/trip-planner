---
title: Testing scripts and ship-check
chapter: testing
explains:
  - outboxFetch
  - TableStore
  - buildSnapshot
  - makeHas
  - findSettleTwin
  - rankDeck
---
Rule 11: tests never use a real account. Skill: `.claude/skills/toogo-ship-check/SKILL.md`. The full QA picture is in `.claude/books/qa`.

## Must pass before "done" (repo root)
```
npx tsc --noEmit -p .
npm run build
node scripts/i18n-check.mjs
```
`npm run build` = `tsc -b && vite build && node scripts/pages/build-pages.mjs`.

## Unit-style scripts (esbuild bundles the source on the fly, no browser)
- `npm run test:table` table-test.mjs: [02-data-layer](02-data-layer.md).
- `node scripts/outbox-test.mjs`: [03-offline-outbox](03-offline-outbox.md). `npm run test:money` money + writes.
- `node scripts/sw-test.mjs`: [04-service-worker-updates](04-service-worker-updates.md).
- `node scripts/screen-logic-test.mjs`, `import-review-test.mjs`, `search-share-test.mjs`, `rank-test.mjs`, `look-test.mjs`, `landing-ui-test.mjs`, `npm run test:rating`, `npm run test:widget`.
- Backend logic that the UI relies on: `test:plan`, `test:split`, `test:stay`, `test:recheck`, `test:guard`, `test:suggest-guard`.

## Write the test first for a bug
Pure logic goes in a small `.ts` module (like `screenLogic.ts`, `importReview.ts`, `placeWho.ts`) so a script can bundle and assert it; the view imports it. Copy the header of `scripts/screen-logic-test.mjs`.

## UI changes
Build to a temp dir, `vite preview --port 4190`, drive with Playwright with Supabase calls mocked (`route()`), never the real database (docs/HANDOFF.md "How to verify a change"). Screenshot Hebrew and English at 390x844, light and dark, check mirrored chevrons and swipe direction, safe areas, clipped text. Run the premium-feel "AI look" list.

## Report
Files changed; each command with result; screenshot paths; what was not checked (device, haptics, real network). Never write "works" for something only read.

## Craft rules (`toogo-frontend-craft` "Pre-beta break test", `toogo-ux-audit`)
- Add to the UI check, with Supabase mocked and the "Toogo Test" account only (rule 11): double-tap Save saves once; paste " 1,250.50 "; delete asks first; closing an unsaved form asks; back returns to the same place; the keyboard never covers Save (also in Hebrew RTL); offline save says what happened; the longest real Hebrew name wraps.
- Judge speed and zoom on a real phone, not in the browser: focus zoom, haptics and safe areas cannot be seen in Playwright.
- Reduced motion: run once with `prefers-reduced-motion: reduce` emulated.
- `toogo-ux-audit` is the screen review; this book's [15-craft-gaps](15-craft-gaps.md) is the code-side list to re-check after fixes.
