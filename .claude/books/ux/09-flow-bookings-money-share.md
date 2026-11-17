---
title: Flows: add booking, add expense and settle, share
chapter: flows
explains:
  - Bookings
  - ImportSheet
  - BookingForm
  - Expenses
  - ExpenseForm
  - SettleSheet
  - RateSheet
  - ShareSheet
  - SharedPlan
  - ImportShared
  - SignOutSheet
---
## Add a booking
Bookings tab > + : two ways. (a) **Import**: paste a confirmation or pick a PDF/photo (`ImportSheet`); wait state "reading" with a time limit; then a **check step** that lists what was found, each row ticked, before anything is saved (a confirmation can be a forged forward). Rows with a date outside the trip or a dropped date start **unticked with a reason**; duplicates of existing bookings are skipped and counted ("1 already exists"). Save keeps the original file beside the booking. (b) **Manual** (`BookingForm`). Booking kinds have icons; times are local wall-clock; hotel defaults 15:00 check-in, 11:00 check-out.
Copy: the import speaks as "we" and says the check comes before saving. Open UX issues: more than 20 cut silently; HEIC refused with a generic message; empty state under a filter wrong; overnight flight lacks "+1"; check-out before check-in accepted.

## Add an expense and settle
Money tool (menu or the wheel's expense action). `ExpenseForm`: amount (messy input accepted), currency (should start in the currency the screen shows, not yen), who paid, split among, date. The screen shows per-person or per-couple **balances** and a short list of **who pays whom** (couples settle between couples unless the trip is set to people). "Repaid" opens `SettleSheet` and records a settlement; the other side's record is matched so it is not counted twice (warning shown if a twin exists). `RateSheet` sets the trip-wide yen to shekel rate and warns that it changes old balances. "All settled" is only said when data is loaded. Offline saves queue and show at once.
Open: stale edit overwrites a partner's change; former members vanish from sums.

## Share a plan
Plan tab > Share (`ShareSheet`): preview shows days, cities, stops and tips; untick days to leave out; options for including the trip name and tips. Private places and stops of a couple are left out by the snapshot. "Publish link" creates `?share=slug`; copy or share sheet; stop-sharing removes it. A visitor sees `SharedPlan` read-only; if they sign in they can copy it into their own trip (`ImportShared`).
Open: "stop" revokes only the newest link; the member who leaves cannot stop their link; import twice duplicates; member-typed tips are published by default.

## Sign out
`SignOutSheet` says how many changes have not been sent before signing out; sign-out then clears the phone's per-account data (see frontend app-shell page).

Tone: no urgency, no nagging. Both languages, mirrored.

Code: `.claude/books/frontend/10-views-bookings-money.md`, `12-views-share-settings-report.md`.
