# Scrape of ptitim.com and yapanit.com (2026-11-11)

Six Sonnet agents read the Japan pages of both sites (~230 yapanit pages, 13 ptitim posts; recipes, news, covid and manga skipped).
Text is paraphrased (facts only), Hebrew + English. Raw HTML stays in the session scratchpad, not in the repo.

- `places_merged.json`: 670 places after removing duplicates. `weak: true` = no description or no area/address (171). `in_library: true` = name already in place_library (112).
  New and not weak: 414 (140 stays, 69 sights, 48 shops, 38 food, 38 experiences, 28 museums, ...). 212 are in Tokyo.
- `tips_merged.json`: 366 practical facts (transport 63, booking 44, festival 41, season 33, food glossary 23, stay-area 14, jewish 14, kosher 12, baby 9, ...).
- `agent-summaries/`: each agent's report, with gaps and outdated items.

Cautions: no coordinates anywhere. Many prices are from 2015–2023 (`year_written`). JR Pass prices are from 2023.
Expo 2025 is over; the Robot Restaurant has closed; the Edo-Tokyo Museum may be under renovation. Check before using.
