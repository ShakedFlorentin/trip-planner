---
title: Auth and deep links
chapter: auth
explains:
  - isNative
  - track
---
**Live today (main)**
- Sign-up is by invitation. `block_new_users` on `auth.users` requires an unused, unexpired invite code (or Google when `features.google_signin` is true; check live). The `sign-up` function creates confirmed accounts for invited friends. Invites: 30-day expiry, server-picked code, 10 a week per person.
- Sessions via Supabase Auth in the browser. After sign-out the app should leave nothing for the next user; QA found notifications, map and photo caches, outbox bodies and device ids left behind (cfdb3cc says sign-out now leaves nothing behind; verify).
- Never build a path that signs a device in from a link it did not start.

**Not live: branch `local-signup-android` (unpushed, switched off)**
Files there: `src/authCallback.ts`, `src/authFlow.ts`, `scripts/auth-callback-test.mjs`, Android `AuthCallbackPlugin.java`, iOS `SceneDelegate.swift`/`QuickAction.swift`, `supabase/sql/2026-11-16-open-signup.sql`, `docs/email-setup-2026-11-16.md`, `docs/data-map-2026-11-16.md`. These exist only on that branch, not on main.
Rules for the deep link `toogo://auth-callback` (written in that code):
1. Only host `auth-callback`, no path, user or port; only the keys `code`, `access_token`, `refresh_token`, `type`, `error`, `error_code`, `error_description`, each at most 4096 chars. Swift, Java and the page each re-check.
2. A link is trusted only when this device started the flow: an "expect" marker is written when sign-up starts (email, 48 h) or Google starts (15 min), used once whatever the answer. Without it anyone could send a victim a link that signs them into the attacker's account (session injection).
3. The Google `code` also needs the PKCE verifier made on this device.
4. The email in the token must equal the email the device waited for; a different user never replaces the existing session (`other_user`); on mismatch sign out locally.
5. The result waits in memory only, never logged or written to disk.
6. Supabase redirect URL list must contain the toogo link, `?reset=1` and the Pages URL (email-setup guide on the branch).
Open on that branch (qa): invite + Google loses the invite; Google errors silent on web; no resend for expired confirmation; `toogo://` scheme can be claimed by another Android app; `allowBackup=true` lets a session be restored.
Related: storage-and-push, open-findings.
