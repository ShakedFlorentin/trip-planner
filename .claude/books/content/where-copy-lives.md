---
title: Where copy lives
chapter: locations
explains:
  - privacyUrl
  - t
---
| Copy | Location |
|---|---|
| App strings (English) | `src/i18n/en-*.ts`; Hebrew inline in `src/views/*.tsx` via `t()` |
| Onboarding, questionnaire | `src/views/Onboarding.tsx`, `src/prefs.ts` |
| Card text (HE, EN) | database columns on `place_library` and `candidates`; originals in `data/card-text-2026-10.json`, `data/card-text-en-2026-10.json` |
| Planner notes | `itinerary_items.notes` and `notes_en` (written by plan-trip) |
| Store listing (EN + HE) | `docs/app-store-listing.md`; new store files in `docs/appstore/` |
| Privacy page and terms | `scripts/pages/privacy.mjs` (built to `/privacy/`, `/en/privacy/`); link `privacyUrl` in `src/native.ts` |
| Guide pages (SEO) | `scripts/pages/` |
| Testers' agreement | `docs/testers-agreement-he.md` |
| Legal drafts (not live) | `docs/legal-drafts-2026-11-14.md` |
| AI prompts (card text, translate) | `supabase/functions/suggest-place`, `card-facts`, `translate` (backend owns) |
| Reviewer notes | in `docs/app-store-listing.md`, appstore agent rewrites as numbered steps |
| Emails | no email templates or copy file found in this checkout; `docs/email-setup-2026-11-16.md` named in the brief is absent. Auth emails come from Supabase (built-in mail only reaches the team). |
| Reel hooks and captions | skills `toogo-short-video`; ideas, not files |

## Rules for locations
- Store text goes in `docs/appstore/`, in-app strings in `src/i18n/`; do not mix.
- Privacy page: change both languages together and move `UPDATED`; `CONTACT_EMAIL` is empty.

Related: [legal-copy-cautions](legal-copy-cautions.md).
