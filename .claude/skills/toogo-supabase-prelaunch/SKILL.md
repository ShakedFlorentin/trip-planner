---
name: toogo-supabase-prelaunch
description: Supabase safety checks for Toogo before launch and for every schema or edge-function change - row-level security, keys, testing as a normal user, safe migrations. Use when touching supabase/sql, supabase/functions, auth, or reviewing backend security.
---

# Supabase before launch

Sources: Supabase's own video on local development, @sharkbyte.py (thin reel), web articles (2026-11-14), plus Toogo's own notes in `docs/HANDOFF.md` and `security-audit/`.

## Checks
1. **Row-level security on every table in `public`.** List tables with RLS off; each one is a finding unless it is meant to be world-readable, and then say why.
2. **Test policies as a normal user, not as the service role.** For each table: a member of trip A cannot read or write trip B; a signed-out visitor reaches only what `get_shared_plan` returns. A policy that was only read, not run, is "read review only".
3. **The service key never ships.** It must not appear in `src/`, `dist/`, or `ios/App/App/public`. (Checked clean on 2026-11-14; re-check after any build change.) The Capacitor bundle is on every phone and can be unpacked.
4. **Edge functions check who is calling** and that the caller belongs to the trip, before using the service role.
5. **AI spend:** functions that call Claude (`suggest-place`, `plan-trip`, `parse-booking`, `translate`, `card-facts`, `review-photo`) go through `_shared/credits.ts` and have a per-user limit. Known gap: the AI quota is not atomic.
6. **Account deletion** (needed for App Review): one edge function that removes the user's rows and the auth user, leaving shared trips usable for the other members.

## Changing the schema
- SQL lives in `supabase/sql/`, dated. The live baseline snapshot is reference only.
- The Supabase MCP asks for approval on SQL containing DELETE or DROP and the prompt usually times out unseen. Keep deletes inside edge functions and keep migrations free of those words (`docs/HANDOFF.md`).
- Never write to the real database from tests.
- **Proposed, not set up:** run Supabase locally in Docker, let `supabase db diff` write migrations, push to the hosted project in small reviewed steps. Until then, every production change is the owner's to apply.

## Known gaps left on purpose (do not "fix" unasked)
CSP header, atomic AI quota, `normName` accent folding, `matchFor` counting only joined members.

Agents do not deploy functions or apply SQL (`toogo-rules` 6, 9). Write the file and the exact steps for the owner.
