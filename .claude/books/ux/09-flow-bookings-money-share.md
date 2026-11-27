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
Skills: `toogo-ux-ui-craft` ("Feedback sized to the stakes", "Errors say what happened, why, and one action", "No roach motel", "Take complexity off the user (Tesler)", "Break tests"), `toogo-rules` 7 and the credits memory (sold on the web, no squeezing).

## Add a booking
Bookings tab > + : two ways. (a) **Import**: paste a confirmation or pick a PDF/photo (`ImportSheet`); wait state "reading" inside the button with a time limit; then a **check step** that lists what was found, each row ticked, before anything is saved (a confirmation can be a forged forward). Rows with a date outside the trip or a dropped date start **unticked with a reason**; duplicates are skipped and counted ("1 already exists"). Save keeps the original file beside the booking. This sheet is the model for a long AI wait: real stage, inline error, check before save. (b) **Manual** (`BookingForm`). Booking kinds have icons; times are local wall-clock; hotel defaults 15:00 check-in, 11:00 check-out (pre-filled, Tesler).
- A failed save or file upload must stay inside the form as a plain line (what, why, one action). Today `BookingForm` shows the database or storage text in a toast and a wrong file type only lists "PDF, JPG, PNG" (see debts).
Copy: the import speaks as "we" and says the check comes before saving. Open UX issues: more than 20 cut silently; HEIC refused with a generic message; empty state under a filter wrong; overnight flight lacks "+1"; check-out before check-in accepted.

## Add an expense and settle
Money tool (menu or the wheel's expense action). `ExpenseForm`: amount (decimal keypad, messy input accepted), currency (should start in the currency the screen shows, not yen), who paid, split among, date. The screen shows per-person or per-couple **balances** (tabular figures) and a short list of **who pays whom** (couples settle between couples unless the trip is set to people). "Repaid" opens `SettleSheet` and records a settlement; the other side's record is matched so it is not counted twice (warning shown if a twin exists). `RateSheet` sets the trip-wide yen to shekel rate and warns that it changes old balances. "All settled" is only said when data is loaded. Offline saves queue and show at once; the new row is shown, not just "Saved" (break test).
Open: stale edit overwrites a partner's change; former members vanish from sums.

## Credits (money, high stakes)
Buying and moving credits get the full treatment: the button says "Processing…" while it works, then a clear confirmation naming what moved ("2 credits moved to the trip"), in a calm success style, never the red error line. A failure is a plain line with one action; a failed purchase may use a dialog because it needs an answer. Refunds and cancelling are as easy to find as buying (no roach motel). Price, terms and button fit on one screen at the biggest text size. Today the wallet in Settings shows the raw RPC error and uses the same red `.msg` for success and failure (see debts).

## Share a plan
Plan tab > Share (`ShareSheet`): preview shows days, cities, stops and tips; untick days to leave out; options for including the trip name and tips. Private places and stops of a couple are left out by the snapshot. "Publish link" creates `?share=slug`; copy or share sheet; stop-sharing removes it. A visitor sees `SharedPlan` read-only; if they sign in they can copy it into their own trip (`ImportShared`). A failure there must say what failed (the link, the copy), not the generic "we could not save".
Open: "stop" revokes only the newest link; the member who leaves cannot stop their link; import twice duplicates; member-typed tips are published by default.

## Sign out
`SignOutSheet` says how many changes have not been sent before signing out (the destructive button is red and separate from the safe link); sign-out then clears the phone's per-account data (see frontend app-shell page).

Tone: no urgency, no nagging. Both languages, mirrored.

Code: `.claude/books/frontend/10-views-bookings-money.md`, `12-views-share-settings-report.md`.
