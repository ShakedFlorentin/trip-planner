---
title: Open findings by priority
chapter: findings
explains: []
---
From `docs/qa-2026-11-16.md` (50 agents, read-only code review; the main session CONFIRMED only some). Everything else needs a run check before it is called fixed. Commit cfdb3cc (main) claims fixes for many "live" items; re-verify before closing any.

**P1, live and touches the trip (security or privacy side)**
1. Share link includes a couple's private (who=) places and stops (Share.tsx:49). Commit says fixed.
2. Sign-out on a shared phone: notifications keep going to the old account; map and photo caches stay.
3. Booking import out-of-trip date saved with no warning (data integrity, CONFIRMED).
4. Report box crash offline (no ErrorBoundary, CONFIRMED).

**P2, live server side, before opening to the public**
- notify/push: any https endpoint accepted (SSRF-ish, no timeout), endpoint takeover.
- `sign-up`: no rate limit; answers reveal valid invite codes; `email_confirm: true` squatting.
- `places_all` allows direct insert (rule 3); fix file not applied.
- `events` counter can be flooded by anon `track`.
- plan-trip returns raw Postgres errors and has no rate limit; translate shows server English errors (can expose "ANTHROPIC_API_KEY missing").
- `review-photo` copies EXIF GPS to the public bucket.
- Join code about 40 bits, 10 per hour per user.
- `shared_plans` slug and snapshot chosen by the client; "stop link" revokes only the newest link.
- `bookings.file_path` any string; docs not cleaned on trip delete.
- Library poisoning (audit finding 1): fix file not applied.

**P3, before open sign-up and the App Store (after the trip)**
- Delete account is not transactional, leaves files and backups; leave_trip leaves booking files; not live.
- Branch local-signup-android items (see auth-and-deep-links); Android `allowBackup`, `toogo://` hijack.
- Privacy page vs reality: Instagram/TikTok iframes, Google photo host, error events may carry typed text, Maps links send hotel names; reports kept forever (page says 2 years).
- English photo licence says "for good", Hebrew says "forever" (legal wording).
- Credits/pass: Apple 3.1.1 (in-app purchase on Israel store), dead buy button.
- Known gaps left on purpose (toogo-supabase-prelaunch): CSP header, `normName` accent folding, `matchFor` counting only joined members.

**Polish**: accessibility, contrast, tap targets, RTL icons.

Rule: do not "fix" RLS, grants, storage rules, `verify_jwt` or auth settings on a report alone; the owner must ask in the session (HANDOFF).
Related: verified-safe, threat-model.
