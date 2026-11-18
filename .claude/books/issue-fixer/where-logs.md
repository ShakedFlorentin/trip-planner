---
title: Where the logs are
chapter: evidence
explains:
  - logCall
  - track
---
- **`reports`**: the report itself, with screen, build, device (see reports-table).
- **`events`** (`src/track.ts`, SQL `2026-11-13-events.sql`): usage events and an `error` event (`msg` up to 200 chars, `where` up to 120) from `window.onerror`. Only app admins read them; kept 12 months; a person can turn counting off in Settings, and `app_settings features.counting = false` stops it on the server. The scrubber of typed text is narrow (QA).
- **`ai_calls`**: each Claude call from the edge functions (`logCall`): function, tokens, web searches, cost, time. **`ai_usage`**: daily counters for `ai_take`. **`place_lookups`**: each add-a-place lookup and its result or error.
- **Edge function logs**: Supabase dashboard, Edge Functions, Logs per function (`console.error` lines such as "reserve_credits failed" and "app_settings unreadable"). Only the owner has dashboard access.
- **`plan_state`**: planner lease and `dirty` flag per trip; a stuck trip shows an old `lease_until`.
- **pg_net**: trigger calls to plan-trip, card-facts, card-photos are queued here; a pile-up shows slow replans.
- **Build id**: `app_version` in a report is `VITE_BUILD`; match it to the deploy (Pages workflow run) to know which code the phone ran. The service worker cache version (`shell-<hash>`) tells whether the phone has the new build.
- **Phone**: Safari Web Inspector for the web app on iPhone; Android Chrome `chrome://inspect`; the outbox in localStorage (see `outboxFetch`). Never read or run the app signed in to a real account (memory: no real session in tests).
- **Local tests**: `scripts/*-test.mjs`, `scripts/plan-fixtures/`.
Related: triage-steps, backend book (functions-overview).
