---
title: Writing Hebrew and English together
chapter: voice
explains:
  - t
  - setLang
  - cityLabel
  - localizeCard
---
Rule 1: every new or changed Hebrew string gets its English in the same change, and the layout is checked mirrored.

## Method
1. Write the Hebrew first, as the owner would say it.
2. Write the English fresh for an English reader, not a word-for-word copy. The meaning must match; the rhythm may not.
3. Check both fit: Hebrew words and sentences run longer on video and in tabs; English is wider in the tab bar ("Bookings", "Discover" crowd six equal tabs).
4. Check direction: arrows, chevrons, back and not-now icons, swipe direction. Known misses: not-now and undo icons point the wrong way in Hebrew, English arrows in QuickFab.
5. Dates, numbers and names follow the language (`locale`). City names stored in Hebrew show through `cityLabel`.

## Card text
Cards carry Hebrew columns plus an `en` jsonb, shown over the Hebrew by `localizeCard` (`src/lib.ts`). User-typed text stays as typed. English card text was not regenerated after the 3 Nov Hebrew clean-up (TODO): do not assume parity.

## Store and video
HE and EN listings are separate texts with their own keywords (Hebrew keyword list is half as long in bytes). Slideshow hooks: Hebrew first.

## Gotchas
- Names stay in their own script; do not glue Hebrew prefixes onto Latin names.
- English photo-licence line says "for good" while the Hebrew says "forever" (QA): align when the legal wording is fixed.

Related: [i18n-process](i18n-process.md).
