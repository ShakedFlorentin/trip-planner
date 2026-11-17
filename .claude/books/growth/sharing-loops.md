---
title: Sharing loops
chapter: loops
explains:
  - buildSnapshot
  - SharedPlan
  - SharedSnapshot
  - notifyMatch
---
Evidence level: weak (secondhand articles on Polarsteps, TripBFF; one solo developer's screens). Treat as ideas to test. Skill: `toogo-growth-loops`.

## What exists
- **Invite**: every trip needs its group, so each trip is an invite loop. Fewest steps from message preview to first swipe matters (`toogo-first-run`).
- **Shared plan link**: `src/views/Share.tsx` publishes a snapshot (`buildSnapshot` in `src/shareSnapshot.ts`, type `SharedSnapshot`: days, city, place names, tips, lat/lng). `?share=<slug>` opens `SharedPlan`. Needs `supabase/sql/2026-11-02-reviews-sharing.sql` applied (state live not checked).
- **Match notification** to the others who liked the same place (`notifyMatch`, `src/push.ts`): a return loop for existing groups.

## Known problems (QA 16 Nov)
- The share link includes a couple's private places; stop link revokes only the newest; import can make weak cards (rule 4). Fix before promoting the link.

## Ideas, not built
- Share card image for Instagram Stories (trip wrapped): plain code over existing data, free, app name and link on it. Test after December.
- Quiet milestones ("first match"). No streaks, no loss messages, no countdowns (rule 7).
- Public ideas board: needs a privacy decision.

## Free vs paid
Swipe, match and seeing the plan stay free. Credits or the pass pay only for AI lookups.

Related: [what-not-to-do](what-not-to-do.md).
