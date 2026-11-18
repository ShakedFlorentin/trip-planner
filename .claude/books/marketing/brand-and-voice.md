---
title: Brand and voice
chapter: brand
explains:
  - t
  - setLang
---
## Voice
- Hebrew first, in the owner's plain voice: people talking, not a translation. English written as its own text, not a mirror.
- Plural "we": "we read it", "we'll tell you". No first-person singular in app text (some old singular strings remain, QA lists them).
- Calm and honest. Say what Toogo does; do not hype. No fake urgency or scarcity (rule 7).
- "No pork or seafood", never "kosher" in app copy (store keyword only; the description says what the app checks).
- No emoji anywhere in the app (icons are lucide).

## Look
iOS grouped style, one red tint, large tight titles, system font (`toogo-premium-feel`). Place photos only if they look good (rule 5): icon tile otherwise.

## Language switch
Settings "שפה · Language" (`setLang` in `src/i18n.ts`); Hebrew text is the key in `t('עברית')`, English in `src/i18n/en-*.ts`.

## Names
Product name Toogo. Store name idea: "Toogo: Japan Trip Planner" (EN), "Toogo: תכנון טיול ליפן" (HE). Name availability unchecked. No domain yet.

## Brand systems from reels
Lessons from the brand and motion accounts go into `toogo-marketing-craft` and `toogo-premium-feel` (rules are teacher-owned; read the skill, not the reel notes).

Related: [positioning](positioning.md); content book, voice rules.
