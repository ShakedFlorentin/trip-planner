---
title: Report flow in the app
chapter: flow
explains:
  - ReportSheet
  - mutate
  - reportStatus
---
File: `src/views/Report.tsx`, component `ReportSheet({trip, me, from, onClose})`, opened from the menu as "דיווח על בעיה" (English string comes from `src/i18n`; every UI change needs both, toogo-rules 1).

1. The user types what is wrong (textarea, max 2000 chars, `dir="auto"`). A note says the screen, app version and phone type are saved too.
2. `send` trims the text and calls `mutate(supabase.from('reports').insert({...}))` with `trip_id`, `reporter` (the person's name), `body`, `screen` (from `props.from`, cut to 100), `app_version` (`VITE_BUILD`, cut to 40), `device` (user agent, cut to 300).
3. `mutate` (`src/lib.ts`) writes through the offline queue. Online it says "sent, thanks" and the list reloads (reports are not broadcast live). Offline it says "saved on the phone, will send when there is signal" (`sent = 'queued'`).
4. The list under the form: "waiting for a fix" (open) and a collapsed "handled (n)" with each report's status pill and the owner's `reply`.
5. The reply and status come back here once the owner sets them in the database.

Tests: `scripts/screen-logic-test.mjs` covers `reportStatus` and `reportKey`.
Known (QA): offline report says "sent" (fixed to "queued"); draft lost on a failed send; the whole app crashed offline-then-"handled" because there was no ErrorBoundary (main now has an error screen per cfdb3cc; verify).
Changing this screen: Hebrew and English strings together, check mirrored layout, screenshot both languages (toogo-ship-check).
Related: reports-table, triage-steps.
