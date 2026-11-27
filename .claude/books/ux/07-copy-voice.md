---
title: Copy voice
chapter: copy
explains:
  - t
  - errorText
  - aiError
  - translateError
  - EN
---
Source of truth for strings: `src/i18n/` (Hebrew is the key; English beside it). Rule 1: every Hebrew change ships its English in the same change; `node scripts/i18n-check.mjs` must pass. Skills: `toogo-ux-ui-craft` ("On-screen copy", "Errors say what happened, why, and one action", "Feedback sized to the stakes", "Empty states say why", "Vibe-coded tells"), `toogo-rules` 7.

## Voice
- **Plural "we"** for Toogo speaking: "we could not read the confirmation", "we check before saving" (commit d43fc23 moved the booking import to this voice). First-person singular strings still exist and are bugs (e.g. the translator's "לא הצלחתי להתחיל", the offline bar's "שולח…"); fix when touched. The UI addresses the user in plural imperatives ("נסו שוב", "בדקו"), which also fits a trip shared by several people.
- **Hebrew first, written natively**, not translated from English; then English that reads like a person wrote it (British spelling, `en-GB` locale).
- **No squeezing** (rule 7): no fake urgency, no nagging, no guilt. Ask for push or a rating only after a win (`toogo-first-run`).
- **No AI-look copy:** no "New: AI-powered" pill, no "smart", no 10K+/99.9% stat rows. Say what it does for the trip.

## Errors: what, why, one action
- Never the server's text, SQL, status codes or English error inside Hebrew UI. The pattern `t('שגיאה: {msg}', { msg: error.message })` is banned; it is still in several screens (see `10-ux-debts.md`).
- `errorText(message)` (`src/lib.ts`) maps failures to plain lines; `aiError` does it for AI calls, `translateError` for the translator. *Changed:* this chapter said `errorText` is enough on its own. Its fallback is "we could not save", which is wrong when the failure was reading, creating a link or importing; the craft rule wins (say what happened *for this action*), so callers pass their own fallback line.
- Shape: what happened, why if known, one action. "No internet, not saved. Try again when there is signal." not "Error 500". "This file type is not supported. Use PDF, JPG or PNG." not "Upload failed: PDF, JPG, PNG".
- Success and failure never look alike (the credits wallet shows both in the same red line today).

## Wording sized to the stakes
- Small action: the change confirms itself (the tick stays ticked); no toast needed.
- Money and big moments: name what was charged or moved ("2 credits moved to the trip"); the button says "Processing…" / "מעבדים…" while it works.
- Long waits: real stage names ("reading the link", "finding the address"), never a fake percentage.
- Empty states: why it is empty plus one next step; search with no results suggests another spelling (Hebrew and English forms of Japanese names).

## Other rules
- **Buttons are verbs**; destructive ones name the thing ("Delete place"), with the one line "This cannot be undone". Delete wording must be the same everywhere (open item).
- **Numbers and plurals:** write both forms: 1, 2, many ("1 מקומות" is a bug); use `{n}` placeholders, not string concatenation. Hebrew has special forms for 1 and 2 (`שעה`, `שעתיים`).
- **Names:** never glue a Latin name to a Hebrew preposition ("לYuki"); rephrase. Names in toasts and confirm lines go in `<bdi>` (chapter 03).
- **Legal wording** (photo licence, privacy, tester agreement) is not edited by UX alone: the English "for good" vs Hebrew "forever" mismatch is flagged for the owner.

## Where to look
`docs/design-decisions.md` (agreed wording, e.g. "ביחד" replaces "של כולם"; "שלנו" is always my couple), `docs/design-review.md`, `toogo-premium-feel`.

## Check
Read every changed string aloud in both languages; look for first-person singular, English error leaks, a raw `{msg}`, missing plural, clipped text in the mirrored layout.

Code: `.claude/books/frontend/05-i18n.md`.
