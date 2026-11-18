---
title: Places, maps, photos, ratings
chapter: screens
explains:
  - Places
  - PlaceRow
  - PlaceSheet
  - PlaceForm
  - AddToDay
  - PickSheet
  - placeWhoOk
  - PlacesMap
  - PIN_COLORS
  - AreaMap
  - PlaceHero
  - AddPhoto
  - useRatings
  - RateBox
  - StarsInput
  - ratingRow
  - safePhoto
  - safeUrl
  - mapsUrl
  - samePlace
  - normName
---
## Places (`views/Places.tsx`)
The trip's own list (matches and hand-added). `PlaceRow` list, `PlaceSheet` detail (photo `PlaceHero`, notes, `RateSheet`), `PlaceForm` edit, `AddToDay` puts a place on a plan day, `PickSheet` chooses. The couple filter uses `placeWhoOk(who, mode, mine)` (`views/placeWho.ts`; before the fix it always returned true). Map toggle shows `PlacesMap`.
Known: English edit can overwrite Hebrew notes; "Navigate" opens a pasted TikTok link; raw city slugs; no photo licence/credit field (rule 5); guide card can insert a weak card (rule 4).

## Maps (leaflet)
- `PlacesMap` (`views/PlacesMap.tsx`): clustered markers coloured by `PIN_COLORS`. Open: places with identical coordinates cannot be opened (cluster zooms forever); places without coords vanish silently; markers rebuilt each render; tile errors silent offline.
- `AreaMap`: small map of one place/area. Tiles are cached by the service worker (cap 600), pre-saved by `ready.ts`.
- Links: `mapsUrl(query)` and `navUrl`; opened via `openExternal`.

## Photos
Show a photo only when it looks good (rule 5): `safePhoto(u)` accepts only https from our storage host or the known photo hosts; `withMedia` / `mediaIndex` read `public/media.json` (a failed fetch is cached for the session, a QA note); `Thumb` falls back to an icon tile. User photo upload: `AddPhoto` and the review row `PhotoReviewRow` (views/PlacePhotos.tsx), reviewed before publishing.

## Ratings (`views/Ratings.tsx`)
`useRatings(ids)` loads stars/notes; `RateBox` + `StarsInput` save through `ratingRow(base, stars, note, noteKnown)` (`views/ratingRow.ts`): tapping a star before the note loaded no longer wipes the saved note. `RatingSummary` and `CardRatings` show the smoothed average (`src/rank.ts`).

## De-duplication
`samePlace` / `normName` / `metresBetween` in `src/lib.ts`. Known: the substring rule skips the generic-name guard ("Osaka" vs "Osaka Aquarium"); `normName` has no NFKC.

Tests: `node scripts/import-review-test.mjs` (includes `placeWhoOk` and `ratingRow`). Related: [08-views-discover](08-views-discover.md).
