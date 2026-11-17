---
title: The place library model
chapter: model
explains:
  - areaOf
---
**Three levels**
1. `place_library` (shared, one row per place, `name` unique across all cities): text (`hype`, `reality`, `tip`, `baby_notes`, `en` jsonb), location (`city` slug, `area`, `address`, `lat`, `lng`, `coord_precision` exact or approx), kind (`category`: food, sight, shopping, nightlife, cafe, experience), facts (`opens`, `closes`, `closed_weekdays`, `closed_dates`, `open_dates`, `best_time`, `visit_mins`, `time_needed`, `booking`, `plan_line`, `facts_at`, `facts_sure`), links (`maps_url`, `website_url`, `instagram_url`, `tiktok_url`, `sources`), `photos` (urls), `kosher`, `audience` (baby or adults), `tags`, and switches `active` and (after the poisoning fix) `approved`.
2. `candidates` (per trip, the swipe deck): a copy of a library card with `trip_id`, `library_id` (unique per trip), `added_by`, `rev` (bumped on each change), and later `source` (`member`, `library`, `shared_import`).
3. `places` (per trip): the matched places, the trip's list. Created only by `match_place` after swipes (rule 3). `itinerary_items` point at them.

**Flow**
- Library card active -> `sync_library(tid)` (runs when Discover opens; latest version `2026-11-14-sync-library-speed.sql`, then the poisoning file) copies active cards into the trip as `candidates`. A city's cards only go to trips that go there (a stay in the city or a questionnaire pick); tokyo, yokohama, kyoto, osaka, nara and daytrip go to every trip (`2026-11-13-new-cities.sql`). Each copy of a card with no photos asks `card-photos`; each without `facts_at` asks `card-facts`.
- A member adds a place (link or name): `suggest-place` returns a researched card; it is inserted into `candidates`; trigger `card_to_library` links or creates the library row.
- `place_library_links` / `candidates_to_library` keep `library_id` filled.
- Library photos flow back: an approved member photo (`review-photo`) is added to the library card and so to every trip.

**City data**: the `cities` table (id, route region, ideal nights, season) and `_shared/areas.ts` (`AREAS`, `areaOf`: Hebrew area names per city, used for planner and for the public Pages build). A card with no area/address is weak.
**State**: 10 new cities (Hakone, Nikko, Kobe, Hiroshima, Kanazawa, Takayama, Fukuoka, Nagoya, Sapporo, Okinawa) have 1,338 cards loaded 9-11 Nov, switched off until a city is turned on: `update place_library set active = true where city = '<slug>'` (owner runs). Reason: sync copies every active card into every trip deck.
Scale: the Japan trip has 282 cards; the whole library deck is about 1.3 MB, read once per phone by `rev`.
Related: member-cards-approval, quality-rules.
