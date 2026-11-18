---
title: Privacy policy draft vs reality
chapter: privacy
explains:
  - track
  - buildSnapshot
  - privacyUrl
  - SignOutSheet
---
Page: `scripts/pages/privacy.mjs` (live at `/privacy/` and `/en/privacy/`, terms under `#terms`). Fixes drafted in `docs/legal-drafts-2026-11-14.md`; none published.

## Gaps (page says X, reality Y)
| Page or gap | Reality |
|---|---|
| No controller name, address or contact | `CONTACT_EMAIL` empty; Apple and GDPR need one |
| Anthropic "keeps it only for a limited time" | No cited source |
| Never includes what you type | `error` events up to 200 chars can include screen text (`src/track.ts`) |
| No OpenStreetMap mention | `plan-trip` sends place and hotel names to Nominatim |
| AI calls | Logged with the user id in `ai_calls`; no retention period set |
| Share coordinates "rounded" | Cut to 5 decimals (about 1 m); tips on by default; days included |
| "May earn us a commission" | No partner IDs yet |
| Sign-out clears data | Leaves push subscription, outbox bodies, device id, map and photo caches (QA) |
| Iframes | Instagram and TikTok embeds, Google photo host contact third parties |
| Maps links | Send hotel names to Google |
| Delete account | Not live; page must keep "write to us" until it is |
| Photo wording | English "for good", Hebrew "forever" differ (`en-c.ts:321`) |
| Usage list | Also sends city from guide link, referrer host, iOS or web, installed, screen width |

## Share link leaks (QA)
The shared plan includes a couple's private places and stops. Approved review photos keep GPS EXIF when published.

## Rule
Change the page in both languages together and move `UPDATED`. The App Store label must agree.

Related: [data-flows-and-providers](data-flows-and-providers.md).
