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

## Shared link: what to build toward (`toogo-growth-loops`)
`SharedPlan` is the landing for every friend who gets a link, so judge it as a landing: it must look great on a phone with no account, load fast, show the app name, have one "plan your own" button and a good link preview image. No claim lines on it (owner: "too much AI"). A read-only page that opens with no install is the idea to aim for (a creator's claim, needs code, owner decides). If a partner hotel link is ever shown here, label it as a partnership.

## Ideas, not built
- Share card image for Instagram Stories (trip wrapped): plain code over existing data, free, app name and link on it. Test after December.
- Quiet milestones ("first match"). No streaks, no loss messages, no countdowns (rule 7).
- Feedback door: the private report (`src/views/Report.tsx`) stays; a public votes board is an outside tool and needs the owner's privacy decision (Settings says "no outside tools"). If built in-house: honest wording ("votes are not a promise"), no personal details in public posts.
- Trip wrapped card: Capacitor share sheet exists (`src/native.ts`); no image card or Story target yet.
- Rating prompt: Apple's own, after a win (`src/rating.ts`).

## Free vs paid
Swipe, match and seeing the plan stay free. Credits pay only for AI lookups (`toogo-credits-offer`, `toogo-rules` 7; the older trip pass is a conflicting plan the owner has not settled).

Related: [what-not-to-do](what-not-to-do.md).
