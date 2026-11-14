# Handoff, 2026-11-14: agent organization and account deletion

For the next session. Nothing here is committed, deployed or applied to the live database.

## 1. The agent organization (done)
- Prytan 2.0.1 installed for this project (local scope). Config: `config.yaml`, code graph in `codegrapher_out/`, hooks log to `.logs/` (gitignored by its own file).
- 14 agents in `.claude/agents/`: atlas, product, ux (opus), frontend, backend, build, qa, security (opus), legal (opus), growth, content, appstore ("Dana"), cards ("Noa"), issue-fixer. All have `autoCompactWindow: 200000`. Roster and routing are in `atlas.md`.
- 11 skills in `.claude/skills/`: toogo-rules, toogo-app-review, toogo-premium-feel, toogo-first-run, toogo-credits-offer, toogo-store-listing, toogo-short-video, toogo-growth-loops, toogo-supabase-prelaunch, toogo-ship-check, ui-sdk. `ui-sdk` is loaded for ux, frontend and qa; the package is NOT installed (needs React 19, Toogo is on 18.3).
- Not set up: terminal chat with Atlas (`pip install -e ~/prytan`), nightly run, Telegram, the five unused base agents (devops, governance, reliability, reflection, tech), the `handoff` skill (not pushed to the Prytan repo).
- New agents appear only in sessions started after they were created.

## 2. Research behind the skills
`docs/nels-and-scouts-2026-11-14.md` (verdict, App Review gaps, order of work). Sources are secondhand for marketing, monetization and travel; the design and architecture parts come from YouTube transcripts.

## 3. Account deletion (built and QA'd in a mocked browser, not run for real)
Owner's decisions: a trip where the leaver is the only member is deleted. A shared trip stays. The leaver's display name stays next to expenses they paid or are in the split of (table `former_members`), so the group can settle up. Admin accounts are refused. What a person added to a shared trip stays in it. Places that reached the shared `place_library` stay without any link to the person (the library has no user column).

Files (all uncommitted):
- Server: `supabase/sql/2026-11-14-delete-account.sql`, `supabase/functions/delete-account/{index.ts,plan.ts}`, `scripts/delete-account-test.mjs` (no npm script yet; suggested `"test:delete-account": "node scripts/delete-account-test.mjs"`).
- App: `src/views/DeleteAccount.tsx` (new), `src/accountDelete.ts` (new), `src/former.ts` (new), edits in `src/views/{Settings,TripPicker,Expenses,Login}.tsx`, `src/outbox.ts`, `src/styles.css`, `src/styles/expenses.css`, `src/i18n/en-c.ts`.
- Review: `docs/appstore/2026-11-14-account-deletion-review.md` (App Store agent: what remains after deletion, reviewer-notes draft, privacy-policy bullets).

QA found defects and they are fixed (checked 2026-11-14 by the frontend agent in a mocked browser, and tsc, i18n-check and test:split re-run by Atlas): D1 the delete sheet was nested in Settings, so closing gestures hit both and a failure message could vanish (`Sheet` in `src/ui.tsx` has a new `locked` prop; the delete sheet now sits beside Settings); D2 the "Everyone" chip dropped a former member from an old expense; D4 the sticky bar hid the "cannot be undone" line on small screens. The line about the shared library is added in Hebrew and English. Backend fixes (deterministic hand-over, race on removing a sole-member trip, generic 500 reply) are done and tested. Final screenshots: scratchpad `delete-account/final-he.png`, `final-en.png`.

Not run by anyone: Escape when idle on the delete sheet, tapping a former member's chip off and then "Everyone", dark mode after the last edits.

**Warning: another session is editing the same working tree.** While this work ran, files appeared as modified that this work did not touch (`src/views/Home.tsx`, `Itinerary.tsx`, `planUtils.ts`, `src/styles/plan.css`, `src/App.tsx`, `src/i18n/en-b.ts`; hotel-name wrapping) and two commits were made by someone else (f3d1cb2, 0539970). `src/i18n/en-c.ts` and `src/styles.css` hold both kinds of change. Never `git add -A`: stage the delete-account files by name, and commit them separately from that other work.

## 4. Owner decisions still open
1. **Leaver's share links and credit history (QA R3).** The function deletes the leaver's `shared_plans` links, even in shared trips, and their whole credit ledger including purchases. Keep and anonymise instead?
2. **Couple mode (QA D3).** A current member with no couple gets no balance row, but a leaver with no couple does, so the balances shown do not add up to zero. Show a row for every current member? Also: if a whole couple leaves, one remaining couple flips the trip to person-by-person settling.
3. `test:stay` has 11 old failures: `scripts/stay-test.mjs` line 48 boxes Japan at lat 30-37 / lng 129-141, which excludes Sapporo and Okinawa. Widen the box or exempt them.
4. **When to apply.** The SQL changes `expenses.paid_by` (drops a foreign key) and the expense trigger on the live database the trip group uses. Per the deploy-after-the-trip rule, apply and deploy after the Japan trip unless the owner says otherwise.

## 5. To go live (owner, in this order)
1. Apply `supabase/sql/2026-11-14-delete-account.sql` (safe to run twice; the one statement the approval prompt may stop on is the `drop constraint` inside the `do` block).
2. Check `expenses.paid_by` has no foreign key to `auth.users`: `select conname from pg_constraint where conrelid = 'public.expenses'::regclass and contype = 'f';`
3. `supabase functions deploy delete-account --project-ref wbofjfwbdewgnwjmcpnv` (the folder includes `plan.ts`).
4. Try it with a throwaway account: one solo trip, one shared trip with an expense, then check `auth.users`, `former_members`, storage, and that sign-in fails.

## 6. Still to do for App Review (from the review)
Privacy policy and terms page (TODO.md line 30; add the kept-name and shared-library lines), non-admin demo accounts plus an invite code and reviewer notes, Sign in with Apple together with Google, AI-use disclosure, restore purchases once Apple in-app purchase exists. First fixes suggested by the research: haptics, hooks for the owner's rules, Mobbin MCP and Impeccable on one screen.

## 7. Not checked anywhere
The edge function was never run or type-checked with Deno. Nothing ran on a device or in Capacitor. Screenshots were taken with Supabase fully mocked. Apple's live guideline pages were not read (the review is from notes and memory).
