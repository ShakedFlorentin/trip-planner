---
title: Card quality rules
chapter: quality
explains: []
---
**Weak cards are left out** (toogo-rules 4, owner memory). A card must say what the place is (a description, `hype` or `reality` or `tip`) and where it is (`address` or `area`/neighbourhood). Otherwise do not add it, and report how many were left out and why. In the ptitim/yapanit scrape a card is `weak: true` when it has no description or no area/address (171 of 670).

**Photos must look good** (rule 5, owner memory: "no photo is better than a weak one, even if free and correct"). Sharp, well lit, the place is the subject, licence and credit usable. If not, no photo: the card keeps its icon tile. Do not lower the bar to fill a gap.
- Open (TODO.md, qa): the app has no licence or credit field on photos, and the audit of 192 stored files found only 15 with a free licence needing no credit, 68 needing credit, 109 not free or unverified (`docs/photo-credits-audit.md`). Plan: keep only Commons images with licence data plus our own pictures, and store a credit line. Until then do not add third-party-site photos.
- Photos are stored in our own bucket so links never expire (Instagram's do).

**Facts**: sensitive claims (kosher, free, safe, opening hours, price) need an independent source or stay empty (`DATA_RULE`). `facts_at` is the date they were checked; stale after 180 days, rechecked when the place is matched. Old prices (2015-2023 in the scrape) and closed places (Robot Restaurant) must be checked before use.
**Entry**: a card is a candidate, never a place. Nothing here may put a place straight into the trip (rule 3). QA found two weak entry points to fix: `GuideCard` in `src/views/Places.tsx` inserts a card without checking, and a shared-plan import makes cards with no area.
**Language**: Hebrew text and an English version in `en` jsonb for each card (rule 1 spirit); no emoji, icons only.
**Names**: `place_library.name` is unique across cities; a new card cannot reuse another city's name (Hakone Yuryo was left out for this).
Related: card-photos-and-facts, adding-cards-checklist.
