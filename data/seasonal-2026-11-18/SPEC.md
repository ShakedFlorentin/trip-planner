# Seasonal card notes — spec (18 Nov 2026)

Owner's ask: some cards give weather/season advice for December only. Toogo is for any season. Each card gets a few
season options, and every trip sees the one that matches its dates.

Nothing here is applied to the live database or shipped before the owner's Japan trip is over (toogo-rules 6).
Agents write files only (toogo-rules 9).

## Seasons (Japan)
| key | months |
|---|---|
| winter | Dec, Jan, Feb |
| spring | Mar, Apr, May |
| summer | Jun, Jul, Aug |
| autumn | Sep, Oct, Nov |

A trip's season = the season that covers most of its days (trips.start_date + num_days). Tie: the earlier season.
No start date: show no seasonal note and no dated note.

## New column: `seasonal jsonb` on `place_library` and `candidates` (null = nothing seasonal)
```json
{
  "winter": { "he": "…", "en": "…" },
  "spring": { "he": "…", "en": "…" },
  "summer": { "he": "…", "en": "…" },
  "autumn": { "he": "…", "en": "…" },
  "only": ["winter"],
  "dated": [ { "from": "2026-12-28", "to": "2026-12-31", "he": "…", "en": "…" } ]
}
```
- Every key is optional. A season with nothing worth saying is left out: no filler.
- `only`: the place is open or worth it only in these seasons (a snow park, a winter illumination, a summer-only
  beach). The card shows a short "Winter only" style line on trips in other seasons. Leave it out for year-round places.
- `dated`: facts tied to specific dates (closures, event runs, a season opening on a date). Shown only when the
  trip's dates overlap [from, to]. ISO dates, inclusive.

## Rules for the text
1. The card's general fields (tip, plan_line, reality, special, todo, hype, baby_notes, baby_block, highlights, and the
   same fields in `en`) must read true in any month. Take season-specific sentences out of them and move the meaning
   into `seasonal.<season>`. Keep everything else in the field word for word. If removing a sentence leaves a field
   empty, set it to null.
2. The original winter/December advice goes into `seasonal.winter` (reworded as winter advice, not "in December" for
   a single year, unless it's truly December-only, then say December).
3. Other seasons: write a note only for a real, well-known difference you are confident about: cherry or plum
   blossom, autumn leaves, the rainy season (June to mid-July), summer heat and humidity, typhoons (Aug–Sep),
   snow, a winter-only or summer-only attraction, a festival with a fixed season, opening hours that change by
   season when the card itself already says so. Never invent specific dates, hours or prices that aren't already on
   the card. If unsure, leave that season out and say so in `unsure`.
4. One short sentence per note, two at most. House style: plain, concrete, no hype words. Hebrew natural and first;
   English matching it.
5. Facts tied to Dec 2026 dates ("closed on 7 December", "the 2026–27 season opens on 5 December", "event 15.11–25.12
   last year") go into `dated` with real ISO dates. "Last year" facts without a confirmed 2026 date: put them as a
   seasonal note without dates, worded as "usually".
6. Don't change facts that aren't about season or dates. Don't touch closed_dates/open_dates (the planner reads them).

## Output from the cards agents
One JSON file per batch: `out-<batch>.json`, an array of:
```json
{
  "id": "uuid",
  "name": "Kenrokuen",
  "set":    { "plan_line": "…new Hebrew…", "reality": "…" },
  "en_set": { "plan_line": "…new English…", "reality": "…" },
  "seasonal": { …as above… },
  "unsure": "what you left out and why (or empty)"
}
```
- `set`/`en_set` hold only fields that changed, with the full new value. Use null to clear a field. For `highlights`,
  give the full new array.
- A card whose December mention is really general (e.g. "Christmas Market" in its name or a fact that isn't
  seasonal) can have empty set/en_set and only `seasonal`, or be skipped. List skipped ids at the end of your report.
