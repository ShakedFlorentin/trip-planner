---
title: Copy voice
chapter: copy
explains:
  - t
  - errorText
  - translateError
  - EN
---
Source of truth for strings: `src/i18n/` (Hebrew is the key; English beside it). Rule 1: every Hebrew change ships its English in the same change; `node scripts/i18n-check.mjs` must pass.

## Voice
- **Plural "we"** for Toogo speaking: "we could not read the confirmation", "we check before saving" (commit d43fc23 moved the booking import to this voice). First-person singular strings still exist and are bugs (QA i18n list); fix when touched. The UI addresses the user in plural imperatives ("נסו שוב", "בדקו"), which also fits a trip shared by several people.
- **Hebrew first, written natively**, not translated from English; then English that reads like a person wrote it (British spelling, `en-GB` locale).
- **Plain words.** Never the server's raw text, SQL, status codes or English error inside Hebrew UI. `errorText(message)` maps failures to a few plain lines; `translateError` does it for the translator.
- **Say what is true and what to do.** "No internet, not saved. Try again when there is signal." not "Error 500".
- **No squeezing** (rule 7): no fake urgency, no nagging, no guilt. Ask for push or a rating only after a win (`toogo-first-run`).
- **Buttons are verbs**; destructive ones name the thing ("Delete place"), with the one line "This cannot be undone". Delete wording must be the same everywhere (open item).
- **Numbers and plurals:** write both forms: 1, 2, many ("1 מקומות" is a bug); use `{n}` placeholders, not string concatenation. Hebrew has special forms for 1 and 2 (`שעה`, `שעתיים`).
- **Names:** never glue a Latin name to a Hebrew preposition ("לYuki"); rephrase.
- **Legal wording** (photo licence, privacy, tester agreement) is not edited by UX alone: the English "for good" vs Hebrew "forever" mismatch is flagged for the owner.

## Where to look
`docs/design-decisions.md` (agreed wording, e.g. "ביחד" replaces "של כולם"; "שלנו" is always my couple), `docs/design-review.md`, `toogo-premium-feel`.

## Check
Read every changed string aloud in both languages; look for first-person singular, English error leaks, missing plural, clipped text in the mirrored layout.

Code: `.claude/books/frontend/05-i18n.md`.
