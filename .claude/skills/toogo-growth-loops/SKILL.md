---
name: toogo-growth-loops
description: Built-in sharing loops for Toogo - the read-only shared trip link, an end-of-trip "wrapped" card, invites - and what stays free. Use when planning or building anything a user shares outside the app, or deciding what is free versus paid.
---

# Growth loops inside the product

Sources: a podcast summary on Polarsteps, TripBFF's profile, search summaries on Wanderlog (2026-11-14). **Weakest evidence of all the Toogo skills**: secondhand articles, no first-hand posts read. Treat as ideas to test.

## 1. The shared trip link
Polarsteps' "follow my trip" link drove its growth with ~no marketing spend for years.
Toogo already has the base: `views/Share.tsx` publishes a snapshot, `?share=<slug>` opens `views/SharedPlan.tsx` before login, "Plan a trip like this" copies the places as candidates.
To strengthen: the shared page must look great on a phone with no account, load fast, show the app's name and one install / "plan your own" button, and have a good link preview image.

## 2. "Trip wrapped" card
At the end of a trip: a shareable image with the trip's numbers - days, cities, places visited, matches, who swiped yes the most, distance. Plain code over data Toogo already has (`toogo-rules` 2). Only if it looks good enough to post; test with the owner's Japan trip after December 2026.

## 3. Invites
A trip needs its group, so every trip is an invite loop. The invite must work from a message preview to a first swipe with the fewest steps (`toogo-first-run`).

## 4. What stays free
Swipe, match and seeing the plan stay free. Wanderlog was criticised for locking basics. Credits pay only for AI work (`toogo-credits-offer`).

## 5. Listening
Keep the "report a problem" box prominent; one travel app pipes feedback and a 0-10 "would you recommend" score to the team daily.

## Not to copy
"Turn saved reels into a trip" importers: crowded, and they bypass swipe and match (`toogo-rules` 3).

For any idea here, state the evidence level and how it will be measured before building.

## Added 2026-11-16 from @danh.app (first-hand: his own app screens read frame by frame)
Evidence level: one solo developer's screens, no numbers about results.
- **A share card made for Instagram Stories** (reel DdELXgxSBNf, seconds 33-35, https://www.instagram.com/danh.app/reel/DdELXgxSBNf/): after a tennis match, "Share Activity" builds a card ("Andrew vs Opponent 6-3, 6-4", app name on it) and offers Instagram Story, Clipboard and More. This is the "trip wrapped" idea (section 2) with a concrete delivery: a card image + the system share sheet. Toogo has the Capacitor share sheet (`src/native.ts`, `views/Share.tsx`) but no image card and no Story target. Put the app name and the link on the card; keep the card free.
- **A trophy case** (same reel, seconds 28 and 38: "First Match, First Win, 10 Matches", progress 1/10). For Toogo: milestones from real use ("first match", "first full day planned", "10 places matched"). Show progress quietly; **no streaks, no loss messages, no countdowns** (`toogo-rules` 7). Nothing like it exists in `src/`.
- **Feedback with votes** (reel DfrQoL-SwEG, seconds 24-30): the Mealo Support screen has three doors: "Suggest and vote on ideas" (a public board, "SORT BY: TRENDING", posts are public, "Votes help us prioritise; they are not a promise of delivery"), "Report a problem" (private) and a note that AI-generated content needs a check. Toogo has the private door (`views/Report.tsx`, table `reports`, status and reply come back). The public board is an outside tool (Fider): it needs the owner's privacy decision first, because Settings tells people "no outside tools". If built in-house, copy the honest wording ("not a promise") and keep personal details out of public posts.

## Added 2026-11-27 from @synsation_ (caption only)
- **Join without installing:** friends could join and build with no app download. Supports section 1: a read-only shared-trip web page that opens with no install. Idea for the owner; code needed. https://www.instagram.com/reel/DW4fmFLEiI9/
