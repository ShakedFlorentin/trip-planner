# @ceez.ai: reels read on 2026-11-17

**Account:** @ceez.ai posts daily AI and vibe-coding tool tips. Read: 1 reel, sent by the owner. It was read from its caption and a 24-frame contact sheet (the video was deleted after). The voice-over was not heard.

| Reel | Topic | How read |
|---|---|---|
| [DfdSZzURvdt](https://www.instagram.com/reel/DfdSZzURvdt/) | "Vibe-coded your app? Hackers are counting on it": a 27-point pre-launch security checklist you paste into Claude and work through one item at a time | frames and caption |

Skipped: the "Comment VIBE" DM funnel at the end.

## The checklist (as seen in the frames), and where Toogo stands
| Item | Toogo |
|---|---|
| Proper auth: password rules, lockout after 5 tries, sessions | Supabase Auth. Check its password-length and rate-limit settings before open sign-up. |
| Lock the database: each row has an owner | RLS on every public table (all 44 tables show rls_enabled). |
| HTTPS | GitHub Pages and Supabase are HTTPS only. |
| Validate on the server (e.g. quantity 1 to 10) | Partly done. Edge functions check input, and credits are checked on the server. |
| Block XSS (a script in a review steals cookies) | React escapes text. Check any `dangerouslySetInnerHTML` and the place notes shared between trips. |
| Lock admin routes | `app_admins` table plus RLS. Covered by the 2026-11-09 security fixes. |
| Parameterized SQL | supabase-js and RPCs, no string-built SQL from the client. |
| Check environment variables | Checked 2026-11-17: the committed `.env` holds only `VITE_SUPABASE_URL` and the **publishable** key (it matches Supabase's public key by hash). Nothing secret. It is still tracked in git; untracking it is tidy, not urgent. |
| Restrict CORS | Edge functions: check that `Access-Control-Allow-Origin` is not `*` for functions that cost money. |
| Secure cookies (HttpOnly, Secure, SameSite) | Supabase keeps the session in localStorage, not cookies. N/A, but XSS matters more because of it. |
| CSRF protection | Bearer tokens, not cookies. Low risk. |
| Password reset links expire | Supabase default (1 h). Check before open sign-up. |
| Verify prices on the server | Credits price and spend are server side (credit_prices, ledger). Keep it so when IAP comes. |
| Debug mode off in production | Check that dev-only logging and test switches are off in the production build. |
| Update vulnerable dependencies | `npm audit --omit=dev` on 2026-11-17: 0 vulnerabilities. |
| Check for exposed files (/.env, /.git/config, backup.sql, .js.map) | The public site serves no source maps (`dist` has none). The repo itself is public until 31 Dec, so everything in git is public. |
| Scan Git history for leaked secrets | 2026-11-17 pattern scan of all branches: no Anthropic, Supabase secret, Stripe, AWS, Google or GitHub keys, and no private keys. Do a proper gitleaks run before the repo goes private and before launch. |
| Revoke and rotate any leaked key | Nothing found to rotate. |
| Full review, then test every fix | Matches toogo-ship-check and the security agent. |

## What Toogo should take
1. Run the checklist as a pre-launch gate in January, one item at a time, with the security agent. Add it to the App Store must-list.
2. Before open sign-up goes on: Supabase password rules, sign-in rate limits and reset-link expiry.
3. A real gitleaks scan before 31 Dec, because the repo is public until then.

Processed shortcodes: DfdSZzURvdt
