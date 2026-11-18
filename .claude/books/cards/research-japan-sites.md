---
title: research/japan-sites
chapter: data
explains: []
---
Folder `research/japan-sites/` (README inside). Scrape of ptitim.com and yapanit.com on 2026-11-11 by six agents, text paraphrased as facts, Hebrew and English. The raw HTML is not in the repo.

- `places_merged.json`: 670 places after removing duplicates. `weak: true` (171) = no description or no area/address. `in_library: true` (112) = name already in `place_library`. New and not weak: 414 (140 stays, 69 sights, 48 shops, 38 food, 38 experiences, 28 museums, others); 212 are in Tokyo.
- `tips_merged.json`: 366 practical facts (transport 63, booking 44, festival 41, season 33, food glossary 23, stay-area 14, Jewish 14, kosher 12, baby 9, ...). Unused so far except where cards use them.
- `agent-summaries/`: each agent's report with gaps and outdated items.

**In the database**: `supabase/sql/2026-11-11-ptitim-yapanit-cards.sql` loads 178 cards INACTIVE (`active = false`, `facts_at = 2026-11-11`), coordinates from OpenStreetMap (`coord_precision` exact or approx). Safe to run again: a card whose name is already in the library is skipped. Turn on only after the owner agrees and after the weak-card and photo checks.
**Cautions** (from the README): no coordinates came with the scrape; many prices are 2015-2023 (`year_written`); JR Pass prices are 2023; Expo 2025 is over; the Robot Restaurant has closed; the Edo-Tokyo Museum may be under renovation. Check before using. Stays (hotels) and tips are unused material for the where-to-stay feature, which waits until after the trip (rule 6).
Related: quality-rules, adding-cards-checklist, library-model.
