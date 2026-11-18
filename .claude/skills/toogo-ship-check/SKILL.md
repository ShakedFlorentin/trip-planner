---
name: toogo-ship-check
description: The checks a Toogo change must pass before an agent reports it done - type check, build, tests, English strings, Hebrew and English screenshots. Use at the end of every code change to Toogo, and when reviewing someone else's change.
---

# Ship check

Why: a subagent that only re-reads its own diff reports "done" on broken work. A change is done when these pass and the output is in the report. (Idea from The Coding Sloth and Anthropic's hooks video, 2026-11-14; the commands are Toogo's own from `docs/HANDOFF.md`.)

## Before writing code
- For a bug: write the failing case first (a fixture in `scripts/plan-fixtures/` or a new case in the matching `scripts/*-test.mjs`), see it fail, then fix. A test written after the fix tends to pass whatever the code does.
- State what the user will see when it works.

## Must pass (run from the repo root, paste the tail of each output)
```
npx tsc --noEmit -p .
npm run build
node scripts/i18n-check.mjs
```
Plus the ones that match what changed:
```
npm run test:plan      # planner (plan-trip, presence, placing)
npm run test:split     # splitting days / costs
npm run test:stay      # where-to-stay
npm run test:recheck   # card recheck
node scripts/rank-test.mjs   # Discover ranking
```
A failure that was already there before your change is still reported, with proof it is old.

## UI changes
- Build to a temp dir, `vite preview --port 4190`, drive with Playwright, **Supabase calls mocked**. Never the real database.
- Screenshot each changed screen **in Hebrew and in English**, at iPhone width (390x844), light and dark if the screen has both.
- Look at the screenshots: mirrored layout, chevrons and swipe direction, text not clipped, nothing overlapping the safe areas.
- Run the `toogo-premium-feel` "AI look" list on what you changed.

## Report format
1. What changed (files).
2. Each command and its result.
3. Screenshot paths.
4. What was **not** checked and why (for example: "not run on a device", "haptics cannot be felt in a browser").
Never write "works" for something that was only read.

## Not yours
No commit, push, deploy or SQL on the live project (`toogo-rules` 6, 9). The owner publishes, file by file.
