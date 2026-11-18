---
title: QA book - table of contents
chapter: 0
explains: []
---
How Toogo is tested, safely. Read 01 before running anything.

- [01-safe-testing.md](01-safe-testing.md) - never a real account; Toogo Test simulator; mocked Supabase; fixtures.
- [02-scripts-catalog.md](02-scripts-catalog.md) - every npm script and `scripts/*.mjs`, what each covers.
- [03-ship-check.md](03-ship-check.md) - the list a change must pass before "done".
- [04-qa-round-2026-11-16.md](04-qa-round-2026-11-16.md) - the 50-agent review: where the list is, what was fixed, what remains.
- [05-risk-offline-outbox.md](05-risk-offline-outbox.md) - high-risk area: offline saves.
- [06-risk-money.md](06-risk-money.md) - high-risk area: expenses and debts.
- [07-risk-planner.md](07-risk-planner.md) - high-risk area: the trip planner and its fixtures.
- [08-risk-bookings-import-auth.md](08-risk-bookings-import-auth.md) - high-risk areas: booking import, sign-in and sign-out.
- [09-writing-a-new-test.md](09-writing-a-new-test.md) - the esbuild-bundle pattern, step by step.
