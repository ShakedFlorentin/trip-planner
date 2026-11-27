---
title: Discover: Swipe, MatchPop, ranking, AddPlace
chapter: screens
explains:
  - SwipeGame
  - Card
  - CardFull
  - Votes
  - MatchPop
  - Match
  - rankDeck
  - cardScore
  - learnTags
  - learnNotNow
  - hidden
  - score
  - queueMatches
  - nextMatch
  - lookStart
  - lookTake
  - AddPlace
  - springTo
  - useSkipColumn
---
Rule 3: a place joins the trip only by swipe and match. Cards in Discover (`candidates`) are candidates. Never add a path that inserts into `places` directly (the DB policy fix `places-insert-via-match.sql` is written but not applied).

## SwipeGame (`views/Swipe.tsx`, 1000+ lines)
- Data: `useTripTable` for `candidates` and `swipes`; `useProfile` answers filter with `hidden` and order with `score` (`src/prefs.ts`); `useMediaIndex`/`withMedia` add photos; `rankDeck` (`src/rank.ts`) orders by Bayesian rating, learned tag weights (`learnTags`, `learnNotNow`) and card look time (`src/look.ts`: `lookStart`, `lookTake`; stays on the phone).
- A swipe writes to `swipes` (`candidate_id, user_id` key). "Not now" is `swipes.skipped` and is never a vote (`useSkipColumn` checks the column exists). Undo, double taps and the empty states are the fragile parts.
- `Card` is the draggable photo card, `CardFull` the opened detail; drag physics use `springTo` / `reducedMotion` from `src/spring.ts`. `SwipeRow` is for list rows, not cards.
- A match (every couple the place is for said yes; `who` is that couple, or null for everyone) queues `Match {c, names, who}`; `queueMatches` / `nextMatch` (screenLogic.ts) hold several matches, shown one by one. `notifyMatch` sends the web push; `askForRating` only after a win on a later visit (`src/rating.ts`, Apple's prompt only). `PushAsk` pre-screen precedes the OS permission.
- Search can open one card with everyone's votes (`showCard`).

## MatchPop (`views/MatchPop.tsx`)
The match moment on ui-sdk `Dialog` (focus moves in, Escape closes, card behind inert): photo (`safePhoto`), the Toogo rings drawn with a burst, faces of the likers. A broken photo falls back to the rings. Styles `styles/match.css`.

## AddPlace (`views/AddPlace.tsx`)
Add from a link or text: calls the `suggest-place` edge function, streamed (one-off, cacheable Claude work, allowed by rule 2), shows `Steps` progress, then `DraftForm`. Rule 4: a card without what-and-where is not added. Known: a link inside share text is not detected (AddPlace.tsx near line 298), suggester "like" insert error ignored.

## Known open (QA)
Drag starting on photo edges does nothing; not-now icon not mirrored in Hebrew; only the last of several matches announced if a match is made on another tab; deck loads before the questionnaire.

Tests: `node scripts/rank-test.mjs`, `node scripts/look-test.mjs`, `node scripts/screen-logic-test.mjs`. Related: [09-views-places-maps](09-views-places-maps.md).

## Craft rules (`toogo-frontend-craft`, `toogo-premium-feel`)
- **Swipe is the one place for rich motion** (`Card`, `springTo`, `MatchPop`); tabs and rows stay near-silent. `match.css` `match-in` is 0.42 s, a hair over the 0.4 s ceiling for a rare reveal; fine, do not add more.
- **Tap vs swipe:** `Swipe.tsx` decides direction after 10 px and `moved` stops a swipe opening the card. Keep that threshold when changing drag code.
- **First card image:** `Swipe.tsx` `card-photo` is `loading="lazy"` with no `fetchpriority`; the first card should be eager (see [15-craft-gaps](15-craft-gaps.md)). Only photos that pass rule 5; no photo keeps the icon tile.
- **Optimistic swipe with rollback:** a swipe shows its result at once through `put`; if the write is refused the card must come back, not vanish.
- **Per-section error:** the deck has `candidatesError` plus `LoadNote`; keep a failed photo (`onError` -> `broken`) from blanking the card.
- **AddPlace waiting state:** `Steps` with `aria-live` and `aria-busy` is the model for any long call. Errors there still print `error.message` (AddPlace.tsx:421).
- **Postel:** pasted links with surrounding text should still work (known miss, near AddPlace.tsx:298).
