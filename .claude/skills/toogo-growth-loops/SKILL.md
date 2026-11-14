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
