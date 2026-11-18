---
title: Open sign-up plan and its risks
chapter: funnel
explains:
  - Login
  - inviteInUrl
  - SignOutSheet
---
Today sign-up is by invite only. Open sign-up (Google, guest mode) is planned after the trip.

## Pieces
1. Guest mode on ([guest-mode](guest-mode.md)).
2. `features.google_signin` plus Google provider, Auth URL settings (Site URL and `**` redirect). Needs the owner's Google Cloud setup.
3. Sign in with Apple together with Google (Apple 4.8) and the paid Apple account.
4. `block_new_users` lets a Google account in without an invite while on; email/password stays invite-only.

## Risks before opening (QA 16 Nov, security)
- Join code about 40 bits, 10 tries an hour per user: brute-forceable.
- `sign-up` function: no attempt limit, answers reveal valid invite codes, `email_confirm:true` allows squatting.
- Usage-event counter floodable; `plan-trip` has no rate limit and returns raw errors.
- Push endpoint accepts any https address (SSRF-ish).
- Places can be inserted directly (breaks rule 3); fix file not applied.
- 30 lookups per person a day, 300 total: AI cost is capped but a bot ring could use up the 300.
- Sign-up bugs: invite + Google loses the invite, silent Google errors on web, no resend for expired confirmation.
- Cost: 1.5 AI lookups a day per trip at 2-4 cents is small; trip pass covers beyond 10 free places.

## Order
Fix security items, then guest mode, then Google and Apple together, then store submission. Each needs the owner's go.

Related: [what-not-to-do](what-not-to-do.md), the appstore book.
