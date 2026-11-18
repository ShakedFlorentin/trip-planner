---
title: Branches
chapter: release
explains: []
---
Read from `git branch -a` on 16 Nov 2026. Git is the owner's: agents do not create, switch, merge or push branches.

- `main` (checkout `RentCalc-main` worktree): the line that deploys to GitHub Pages on every push. Latest work should be based on `origin/main`. The other checkout `RentCalc` may be used by another session; do not edit it.
- `local-signup-android`: local only (no remote branch contains it). 5 commits ahead of main: Android project, open sign-up with Google on the phone and email, `toogo://auth-callback` link checks, `open_signup` SQL, email templates, `docs/email-setup-2026-11-16.md`, `docs/data-map-2026-11-16.md`, `scripts/auth-callback-test.mjs`, plus copies of recent main commits (same messages, different ids, so a merge may conflict). Everything in it is switched off. Because it is unpushed, a lost laptop loses it. Ask the owner to push it or merge it after the trip.
- `publish-fixes`, `fix/security-hardening`, `roadmap`, `react19-ui-sdk` exist locally; `origin` also has `japan-trip`, `ios-app`, `roadmap`, `claude/commit-changes-lmx6io`. Their state was not examined; HANDOFF says `japan-trip` was the deploy branch earlier, now `main`.
- Untracked on main: `android/`, `build-out/`, `.playwright-mcp/`, `.claude/books/`. Do not `git add -A`.

Rules: changes from issue-box reports go on their own branch and the owner reads the diff before main (HANDOFF). A risky change waits on a branch until the trip is over.
Gotcha: SQL on a branch is not live; check `docs/HANDOFF.md` and the file header for the real state.
Related: release-checklist, backend book (sql-files-status).
