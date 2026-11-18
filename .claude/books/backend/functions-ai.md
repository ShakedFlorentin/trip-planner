---
title: AI functions, suggest-place, parse-booking, translate
chapter: functions
explains:
  - hold
  - holdPlace
  - fence
  - DATA_RULE
  - sanitiseCard
---
All three: user is signed in (`getUser()`), the request is checked for shape and size BEFORE any quota is spent, then `ai_take` (daily per-person and everyone-together caps), then optional credits hold (off today), then Claude, then `logCall`. Folder code: `supabase/functions/<name>/index.ts`.

**suggest-place** (~1000 lines)
- In: `{link?, text?, id?, stream?, trip_id?}`; link up to 500 chars, text up to 1000, else 413. `id` is the app's lookup id (kept only if unused or the caller's own); a lookup still running answers 409 and the app reads the saved row in `place_lookups`.
- Does: reads an Instagram / TikTok / Google Maps link or a place name (fetches go through `followRedirects`, see guard-shared), asks Claude with web search (max 3 searches, 1 fetch, 8 slides, 10 places per post), returns researched cards. Output is cleaned by `sanitiseCard`; untrusted text goes in `fence` blocks with `DATA_RULE`.
- Caps: fallback 30 per person and 300 for everyone per 24 h; live values `lookup_limit_person`, `lookup_limit_all` in `app_settings`.
- Trip pass: `holdPlace` (`_shared/pass.ts`) counts "new places" per trip when `features.trip_pass` is on (off). 422 when nothing is found; a search that finds nothing is given back.
- `stream: true` answers NDJSON progress.

**parse-booking**
- In: `{text?, file?{data base64, media_type}, id?, trip_id?}`. Text up to 50,000 chars; file up to 15 MB; PDF or jpeg/png/gif/webp only (415 otherwise). Gateway JWT stays ON.
- Out: `bookings[]` (kind flight/hotel/restaurant/train/activity/insurance/other, title, starts_at, ends_at, confirmation, location, url, notes). `validate.ts` (`cleanBookings`, `tripWindow`) nulls dates outside the trip and flags them.
- Caps: 30 per person, 150 everyone (`booking_limit_*`).
- Open QA item: the client stripped the flags so an out-of-trip booking was saved with no date and no warning (commit cfdb3cc says import now flags and unticks them; not re-verified here).

**translate**
- In: `{text, from: he|en|ja, lang?, trip_id?}`; text up to 600 chars (413). Plain-text reply parsed from TRANSLATION / ROMAJI / BACK lines.
- Caps: 200 per person, 2000 everyone (`translate_limit_*`). The op id is made on the server, never taken from the request.
- It reads the user id from the unverified token only to start work in parallel; nothing is spent unless `getUser()` confirms the same user.
- Prompt carries diet and baby context (QA low: sent on every call).

429 "daily limit reached" for a cap; 429 "busy, try again" for an Anthropic rate limit.
Related: ai-cost-controls, guard-shared, security book (injection-defences).
