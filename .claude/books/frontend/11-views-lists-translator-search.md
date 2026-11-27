---
title: Lists, Essentials, Baby, Translator, Search
chapter: screens
explains:
  - Lists
  - Essentials
  - EssentialCard
  - ShowFull
  - JaLine
  - PhraseList
  - Baby
  - Translator
  - translateError
  - Search
  - SearchTarget
  - makeHas
  - norm
  - SwipeRow
  - ToolSheet
  - PrefsSheet
  - QuickFab
  - Say
---
These open as tool sheets from the Menu (`ToolSheet` and `MORE_TABS` in `views/More.tsx`: lists, money, say/translate, essentials, baby), or from the quick-add wheel (`QuickFab`).

## Lists (`views/Lists.tsx`)
Three lists (`LISTS`: todo, packing, shopping) in `checklist_items`. Rows use `SwipeRow` (`src/swipe.tsx`, swipe to edit/delete; edit/delete only by swipe is an accessibility gap). Add uses a `adding` ref so a double Enter does not add twice. Items marked `each` keep per-couple ticks in `done_couples`, written whole-array: two couples ticking offline can erase one tick (open).

## Essentials, Baby
`Essentials` holds practical cards (hotel details, phrases). `importHotels` copies hotels from bookings with a double-tap guard. `ShowFull` shows text full screen for showing to someone; `JaLine`, `PhraseList`, `sentences` render Japanese. `Baby` appears only when `useTripHasBaby`. Open: `ShowFull` dialog has no name/focus; check buttons unnamed.

## Translator (`views/Translator.tsx`)
Speech in (`SpeechRecognition`, not on Android build) to `translate` edge function, turns kept in `localStorage translator-turns` (cleared at sign-out). `TRANSLATE_TIMEOUT_MS` 20 s; `translateError(error)` maps status to plain words (offline, 413, 429 daily limit of 200, 5xx); never shows server English text. A failed translation keeps the heard text for one-tap retry. It is a per-tap call with a daily cap on the server; do not add translation or other AI calls that run on every view (rule 2).

## Search (`views/Search.tsx`, `src/searchMatch.ts`)
One sheet searches places, deck cards, bookings, plan items and lists: `useTripTable` for six tables, `makeHas(term)` and `norm` (folds case and width; Japanese now matches inside names). Result goes through `SearchTarget` to `openResult` in App.tsx. Minimum two characters. Results capped (silent). Search must say "searching/failed", not "no results", while loading.
Test: `node scripts/search-share-test.mjs`.

Related: [01-app-shell](01-app-shell.md), [13-ui-sdk-and-styles](13-ui-sdk-and-styles.md).

## Craft rules (`toogo-frontend-craft`)
- **Errors:** `Translator` is the good model (`translateError`, retry keeps heard text). But `Translator.tsx:290-291` prints the speech API's `err.message`, and `Essentials.tsx:134` prints `error.message`: map both.
- **Per-section load:** `Lists`, `Essentials`, `Baby` each have `Skeleton` plus `LoadNote`; keep that shape for new tools.
- **Search "searching/failed, not no results"** is implemented through the six `useTripTable` errors; keep it.
- **`SwipeRow`** swipe-only edit and delete is an accessibility gap (add a named button path). Hit areas 44 pt via padding.
- **Rule 2:** no AI per view; `Translator` is a per-tap call with a server cap.
