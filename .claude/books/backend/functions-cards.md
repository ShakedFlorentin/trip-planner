---
title: Card functions, card-photos, card-facts, review-photo
chapter: functions
explains:
  - publicHttpsAllowed
  - fetchLimited
---
**card-facts** (`supabase/functions/card-facts/index.ts`, helpers `facts.ts`, `prompt.ts`)
- Called by trigger `card_needs_facts` (pg_net, header `x-plan-token`) when a new card has no `facts_at`. Only the token is accepted (401 `bad token`); no user JWT, gateway check off.
- In: `{candidate_id}`. One Claude lookup fills hours, closed days, visit length, best time, one Hebrew plan line; the library card is filled too, so other trips get it free.
- Re-check: when a place is matched and its facts are older than 180 days (`STALE_DAYS`, same number in trigger `place_recheck_facts`), only hours, weekly closing days and "closed for good" are checked. A closed place gets all seven weekdays, so the planner gives it no day.
- The trigger meters a person's own inserts with `ai_take` (60 a day, 400 everyone); over the cap the card just stays without facts.

**card-photos** (`card-photos/index.ts`, `prompt.ts`)
- Called by trigger `card_needs_photos` (planner token) for a new card with no photos, also by hand for old cards (`dry: true` previews).
- Candidates: the post's cover frame, Tabelog photos for food, the place's website and source pages (share image, photos captioned with the name), Wikipedia/Commons for sights. Every fetch goes through `fetchLimited` / `publicHttpsAllowed`.
- Drops images under 15 KB or 400 px and repeats; at most 8 are shown to Claude (Haiku, structured output); keeps up to 3; stores them in the public `card-photos` bucket so links never expire.
- Rule 5 says a weak photo is worse than none: the picker must refuse blurry, dark or off-subject images. The app still has no licence/credit field (TODO.md, qa "rule 5"): do not add photos from sources without a usable licence.
- After the poisoning fix a photo found for a library card the caller did not create goes to the `photo_submissions` queue with `source = 'server'`.

**review-photo** (`review-photo/index.ts`)
- An app admin (`is_app_admin()`) approves or rejects a traveller's photo. In: `{id, approve: boolean}`. Row must be `pending` (409 otherwise); the stored path must match `<uuid>/<uuid>/<uuid>.jpg` before the storage calls run with full rights.
- Reject: file deleted, row `rejected`. Approve: copied to public `card-photos`, added to the library card and every trip.
- Open QA item: EXIF (GPS) is copied to the public bucket on approval; strip it.
Related: cards book (card-photos-and-facts), triggers.
