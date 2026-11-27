---
title: RTL and LTR rules
chapter: foundations
explains:
  - keepRanges
  - setLang
  - lang
---
Hebrew (RTL) is the default; English (LTR) is the mirror and is part of every change (rule 1; `docs/design-decisions.md` "every decision applies to English too"). `<html lang dir>` is set in `index.html` before first paint from `localStorage.lang`. Sources: `toogo-ux-ui-craft` ("Standard parts stay where people expect them (Jakob)", "Type rules"), `toogo-ux-audit` (Hebrew length and mirror rows).

## Write it so it mirrors by itself
Use logical CSS: `margin-inline-start`, `padding-inline`, `inset-inline-*`, `text-align: start`, flex/grid order. Never `left`/`right` for layout. The tab bar and the layout follow the direction with no code. Standard parts stay where people expect them, mirrored: back chevron, tab order, sheet close at the start.

## What must be flipped by hand
- Chevrons and arrows that mean "forward" or "back": add `flip-ltr` (`src/styles/ltr.css`) so English turns them. Back is a right-pointing chevron in Hebrew.
- Swipe directions: the card's drag is physical (`dx > 0` is the like stamp in both languages), so the icons and button order must read right in each language; check the card fly-out, the like/not-now buttons and the photo-tap zones (`.photo-tap.prev/.next` are swapped in `ltr.css`).
- Time before title, counters and numbers with a fixed order (`ltr.css` has the time gap; `.left-count` is forced LTR).
- Progress bars, switch thumbs, a reorder drag and "carry" motion (a card growing from where it was tapped) mirror.

## What must not be flipped
Phone numbers, codes, times like 10:00, clocks and countdown digits, media controls (play, pause, the translator's speak button), Japanese text, the Toogo logo, map pins. Wrap number ranges with `keepRanges` (`¥500–1,000`) so the dash does not reverse the range; never save the isolate marks.

## Mixed script
A name in another script inside Hebrew: `dir="auto"` on the element and `<bdi>` for inline names. This includes toasts and confirm lines that carry a place or person name ("למחוק את "Ichiran"?", "נוסף ליום 2: …"): today they are plain strings, so a Latin name with punctuation can land on the wrong side. In English, `dir="auto"` blocks are left-aligned; a Hebrew note on an English screen sits right, English left. Hebrew prefix glued to Latin ("ל-Yuki") is rendered with a right-to-left mark after the hyphen; do not glue names to prepositions in new copy, restructure the sentence.

## Type
No added letter spacing on Hebrew; negative title tracking belongs to English only (chapter 01).

## Checklist per UI change
Screenshot Hebrew and English at 390x844 and check: chevrons, swipe/undo/not-now icons, sheet close and action sides, text clipped, safe areas, number ranges, the longest Hebrew string and the longest English string (wraps, not cut), names in another script isolated. Known misses today: not-now and undo icons point the wrong way in Hebrew, English arrows in the + wheel, breadcrumb arrow, names glued to prepositions in Expenses and Review.

Code: `.claude/books/frontend/05-i18n.md`.
