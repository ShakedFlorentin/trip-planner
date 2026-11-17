---
title: How adding a place works (and what it costs)
chapter: features
explains:
  - requestAdd
  - requestAddLink
  - useTripTable
---
Source: `docs/next-steps-2026-11-12.md`. UI: `src/views/AddPlace.tsx`; server: `supabase/functions/suggest-place`.

## Steps of one lookup
1. Free checks: same link or name already saved, or already a library card: reused, $0.
2. Plain code reads the Instagram caption and pictures, or the TikTok title.
3. Claude Haiku researches (up to 3 web searches, optionally one Tabelog page): about 90% of the cost.
4. Claude lists up to 10 places, then writes each card in its own call, plus tags.
Single place about 2 cents; a post with several places about 4 cents (tests, not many real runs).

## Reuse
- The link or typed name answer is kept for good (since 12 Nov, v40). Only opening hours age: re-checked after 180 days, at the match, by `card-facts` (0.2-1.2 cents). Not before late April 2027.
- Every place someone adds becomes a library card; it goes live for others once trips by 2 different people have it.
- Rule 4: saved cards with no description or no address are left out, also when served from a saved answer.

## Limits and gates
- 30 lookups per person per day, 300 in total. With `trip_pass` on, the first 10 new places per trip are free, then the server answers 402.
- Photos come after: `card-photos` function. Rule 5 applies.

## Gotchas
- A card never enters the trip by itself: the user adds it to Discover and a swipe and match puts it in the plan (rule 3). `places_all` still allows a direct insert; the fix file is not applied.
- Needs a connection: AI lookups are not queued offline.
- The app has no "closed for good" label yet.

Related: [feature-map](feature-map.md).
