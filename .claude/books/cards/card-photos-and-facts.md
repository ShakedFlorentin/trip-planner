---
title: card-photos and card-facts
chapter: functions
explains:
  - fetchLimited
  - publicHttpsAllowed
  - areaOf
---
Both run on the server, started by database triggers on `candidates` inserts, with the planner token; no user waits for them. Details per function: backend book, functions-cards.

**card-facts**: fills hours, closed days, visit length, best time and one Hebrew plan line for a card with no `facts_at`; also fills the library card for other trips. One Claude call per card. Re-check at match time when facts are over 180 days old: hours, closing days, closed for good (then all weekdays closed so the planner skips it).
**card-photos**: finds 2-3 photos for a card with none. Sources: the post's cover frame, Tabelog for food, the place's website and source pages, Wikipedia and Commons for sights. Drops small (under 15 KB or 400 px) and repeated images, shows at most 8 to Claude Haiku, keeps up to 3 that show the place, stores them in the public `card-photos` bucket. Fetches are guarded (`fetchLimited`, `publicHttpsAllowed`).
- By hand for older cards: the function accepts `dry: true` to preview; the owner runs it (needs the planner token).
- Quality bar is rule 5; when the picker finds nothing good, the card stays without photos (icon tile).

**Admin photo queue**: a traveller uploads a jpeg to `photo-submissions` (private); `photo_submissions` row `pending`; an app admin approves or rejects in the app through `review-photo`. Approved: copied to `card-photos`, added to the library card and all trips. Waiting photos are never public. Open: EXIF GPS is kept on publish.

**Cost**: both log to `ai_calls`; trigger inserts by signed-in users are metered 60 a day per person and 400 everyone through `ai_take`; server-side inserts (SQL loads) are not metered. That is why SQL card loads go in inactive: each active card would trigger lookups in every trip.
Related: quality-rules, backend book (ai-cost-controls).
