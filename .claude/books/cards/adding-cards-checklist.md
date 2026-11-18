---
title: Checklist for adding a batch of cards
chapter: quality
explains: []
---
For a SQL load of library cards (the owner applies it). Model: `2026-11-09-new-city-cards.sql`, `2026-11-11-ptitim-yapanit-cards.sql`.

1. **Filter first.** Drop weak cards (no description, or no area/address) and count them. Drop duplicates by name (`place_library.name` is unique, case-insensitive check in the file). Drop closed or outdated places.
2. **Fields.** City slug must exist in `cities`; `category` one of the six; `area` from `_shared/areas.ts` for that city; coordinates with `coord_precision`; Hebrew text plus `en` jsonb; `facts_at` only if the facts were really checked; `sources` http(s) only.
3. **Photos.** Leave `photos` empty unless each one passes the rule 5 bar and has a usable licence and credit. No photo is fine.
4. **Insert inactive** (`active = false`; `approved` true is the default for seeded cards). Wrap in `begin; ... commit;`, make it safe to run twice, no DELETE or DROP words.
5. **Header comment**: what it loads, how many were left out and why, how to turn a city on (`update place_library set active = true where city = '<slug>'`), a verify query (counts by city and category), a rollback note.
6. **Do not** run it, apply it, or run the planner; give the owner the exact steps. Turning cities on waits until the trip is over if it changes the real trip's deck (rule 6, real trip untouched).
7. **Report**: cards added, cards left out (with reasons), photos skipped, what was not checked (no live run, no device).
8. Test impact: `npm run pages:data` refreshes `data/pages/cards.json` for the public city pages (a city needs 8 cards); `node scripts/rank-test.mjs` if ranking inputs change.
Related: quality-rules, research-japan-sites, member-cards-approval.
