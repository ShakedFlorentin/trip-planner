---
title: Verified safe on the live project
chapter: findings
explains: []
---
Checked by the main session on 16 Nov 2026 against the live database (qa report, "Checked and SAFE"). Re-check after any change to these areas; this page is evidence, not a guarantee.

- A member can change only their display name in their membership row, so nobody can move into another trip (members UPDATE grant is `display_name` only).
- The booking-documents bucket is limited to the trip's own members.
- The backup copies of real bookings and expenses cannot be read by the app or users.
- The real trip's 7 hotels are read in the right city by the planner.
- The real trip is under the 1,000-row read limit (388 swipes, 282 cards, 140 places).

Also applied and recorded (HANDOFF and file headers, not re-run now)
- `get_anthropic_key()` and `get_planner_token()` closed to every role except `service_role` (`2026-11-14-revoke-secret-getters.sql`).
- `ai_take` shared daily ceiling (`2026-11-09-security-fixes.sql`).
- `create_trip` guard: name length, double tap, per-user limit (`2026-11-14-create-trip-guard.sql`).
- Service key absent from `src/`, `dist/` and `ios/App/App/public` on 14 Nov (toogo-supabase-prelaunch); re-check after any build change.
- Link guards with DNS check: 45 tests in `scripts/guard-test.mjs`, run offline (not against the live functions).

Not verified live: any policy that was only read; the storage policy text (not in the repo); whether `google_signin` and `credits` switches are off right now; anon EXECUTE on RPCs.
How to verify a policy: as a normal user of trip A, try to read and write trip B; as a signed-out visitor, reach only `get_shared_plan`. Never with the service role, never on the real trip.
Related: open-findings, backend book (rls-and-membership).
