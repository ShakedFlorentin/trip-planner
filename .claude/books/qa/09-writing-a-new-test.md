---
title: Writing a new test
chapter: 9
explains: [plan, flush]
---
## Pattern (all existing tests use it)
1. Header comment: what it checks and the run command.
2. `import { build } from 'esbuild'`; bundle the file under test with `write: false`, `format: 'esm'`, `platform: 'node'`.
3. Import the bundle from a `data:` URL, or write to a throwaway dir outside the repo.
4. Stub browser globals (`localStorage`, `document`, `performance`, `fetch`) before importing.
5. Use `node:assert/strict`; one clear case per assertion.
6. Exit non-zero on failure.

## Steps
- Write the failing case first and watch it fail.
- Keep the code under test pure where you can; move logic out of the view into a small `.ts` file (as `screenLogic.ts`, `placeWho.ts`).
- Use made-up data only.
- Add an npm alias in `package.json` if it should run often.
- Add a line to `02-scripts-catalog.md`.

## Examples to copy
`scripts/rank-test.mjs` (smallest), `scripts/outbox-test.mjs` (fake fetch and clock), `scripts/sw-test.mjs` (fake worker scope).

Related: 02, 03.
