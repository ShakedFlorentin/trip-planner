---
title: Known UX debts (QA round 2026-11-16)
chapter: debts
explains:
  - Swipe
  - PlacesMap
  - Itinerary
  - Settings
  - Translator
  - LoginCarousel
  - Guide
  - QuickFab
---
Full list: `docs/qa-2026-11-16.md` (the top section is prioritised; "Full notes" below it is per screen). Per rule 8, list every problem however small. Items fixed in commit cfdb3cc are left out here; confirm anything below against the code before working on it, many are from read-only reviews.

## High (before more users)
- Discover: "not now" on all cards gives the wrong empty state and "show all" does nothing; drag starting on photo edges does nothing (photo-tap zones are 34% each side); undo race on double tap.
- Settings: changing trip dates silently shifts bookings, stays and items, no warning; failed rename keeps the value.
- Menu: "Switch trip" dead end for a one-trip user (list added in cfdb3cc; re-verify).
- Maps: places at identical coordinates cannot be opened.
- First run: 8 questions before the first card; invited users cannot skip them; sign-up sheet every 12 swipes; push asked after 3 likes; guest deck empty for day-trip-only answers.
- Dark mode: white tick on green about 2:1.
- English photo-licence line differs in meaning from Hebrew (owner decision on legal text).
- Translator mic and booking PDFs on the Android test build.

## Medium
- Places: raw city slugs; "Takes" shown in Hebrew in English; "Navigate" opens a pasted social link; English edit can overwrite Hebrew notes; places with no coordinates vanish from the map with no empty state.
- Itinerary: day strip does not scroll to today (`.active` vs `data-selected`); "now" repeated per owner; "mine" filter hides stops when the user is in no couple; "in 0 min".
- Replan: undated trip shows all days red; last-day message "trip over"; singular wording; no undo warning.
- Home: proposed stay shown as booked; Discover count wrong; no-start-date hero.
- Share: stop link revokes only newest; "1 מקומות".
- Bookings: pass sheet says "free used up" while loading; dead buy button with a price (store risk); overnight flight no "+1".
- Stays (parked until after the trip): linking a booking keeps default dates; no overlap check.
- Small screens (320 px): Lists tabs overflow; swipe buttons under the tab bar at 320x568; map guide button covered; Bookings title column about 46 px.
- RTL: not-now and undo icons; names glued to prepositions; breadcrumb arrow; English arrows in the wheel.

## Polish
Screen-reader names and focus in dialogs (`ShowFull`, Guide), tap targets under 44 pt, large text, login carousel pause (WCAG A), Android back closing the Menu and wheel, danger buttons not red, delete wording inconsistent, input borders about 1.8:1, switch-off nearly invisible, haptics, motion polish, first-person singular strings, plural n=1 cases, Stays dates ignore app language.

## Method for a new review
List everything (rule 8), grouped by screen; for each proposed fix produce a before/after image in Hebrew and English (the owner reads on a phone); run the "AI look" audit from `toogo-premium-feel` per screen.

Related: [04-states-empty-loading-error](04-states-empty-loading-error.md), [06-accessibility](06-accessibility.md), `.claude/books/qa/`.
