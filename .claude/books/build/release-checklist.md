---
title: Release checklist
chapter: release
explains: []
---
Why: a diff that was only re-read is not a release. Commands from `toogo-ship-check` and HANDOFF. Release = the owner pushes (file by file, never `git add -A`) after the checks below. Before 12 Dec 2026 nothing risky ships (planner, where-to-stay, anything touching bookings or expenses); after the trip ends the parked SQL can go.

**Must pass** (repo root, paste output tails in the report)
1. `npx tsc --noEmit -p .`
2. `npm run build`
3. `node scripts/i18n-check.mjs` (every Hebrew string has an English one)
4. By change: `npm run test:plan`, `test:split`, `test:stay`, `test:recheck`, `test:table`, `test:money`, `test:guard`, `test:suggest-guard`, `test:widget`, `node scripts/rank-test.mjs`, `node scripts/sw-test.mjs`, `node scripts/outbox-test.mjs`.
5. UI change: build to a temp dir, `vite preview --port 4190`, Playwright with Supabase mocked (Toogo Test simulator only, never a real session), screenshots in Hebrew and English at 390x844, light and dark.

**Before pushing to main** (it deploys the web app at once)
- Read open reports (`reports` table), see issue-fixer book.
- Check no service key in `src/` or `dist/`.
- For an edge function: the owner dispatches deploy-function.yml; compare live source with git afterwards. For SQL: run-sql.yml or the SQL editor, one file, ask first.
- For iOS: `npm run build`, `npx cap sync ios`, Xcode build on a device, version bump.
- Rollback: web = revert commit and push (Pages redeploys); function = redeploy the previous source; SQL = the file's rollback section.

**Not yours**: commit, push, branch, deploy, SQL on live (toogo-rules 6, 9).
Report format: what changed, each command and result, screenshot paths, what was not checked.
Related: web-build-and-pages, ios, android, backend book (deploys).
