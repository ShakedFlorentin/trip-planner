---
title: Ship check
chapter: 3
explains: [ErrorBoundary]
---
The full list lives in `.claude/skills/toogo-ship-check/SKILL.md`; this page is the short form.

## Must pass, from the repo root
```
npx tsc --noEmit -p .
npm run build
node scripts/i18n-check.mjs
```
`npm run build` is `tsc -b && vite build && node scripts/pages/build-pages.mjs`.

## Plus what matches the change
planner: `test:plan`, `test:split`, `test:stay`; card recheck: `test:recheck`; Discover: `node scripts/rank-test.mjs`; offline or money: `test:money` and `node scripts/outbox-test.mjs`.

## UI changes
Mocked Playwright run, Hebrew and English at 390x844, light and dark where both exist. Look at the screenshots: mirrored layout, chevrons, clipped text, safe areas. Then the "AI look" list in `toogo-premium-feel`.

## Report format
What changed, each command and result, screenshot paths, and what was not checked. A failure that predates your change is still reported, with proof.

## Gotcha
Write the failing test first for a bug; a test written after the fix tends to pass whatever the code does.

Related: 02, 09.
