---
name: toogo-store-listing
description: Toogo's App Store listing - Hebrew and English name, subtitle, keywords, screenshots, and how to test them for free. Use when writing or reviewing store text, screenshots, the preview video or anything about App Store search ranking (ASO).
---

# Store listing

Sources: AppTweak and AppDrift articles, HabitKit's founder, @nels_ysng (read 2026-11-14 as text, not verified in App Store Connect). The cross-locale keyword trick comes from a 2022 test and may be dated - verify before relying on it.

## Text
- **Limits:** name 30 characters, subtitle 30, keyword field 100 (comma-separated, no spaces, no word repeated from the name or subtitle, no plurals of a word already there).
- **Hebrew listing for the Israel storefront.** Only 4 of the top 30 Israeli apps had localised listings in 2024, so this is cheap ground.
- **English (UK) as the second locale** for Israel to index extra keywords (the dated trick above).
- Name = brand + the one thing ("Toogo: plan trips together"). Subtitle = the outcome, not a feature list.
- Write Hebrew first in the owner's voice, then English; neither is a translation of the other.
- A Terms of Use link belongs in the description (a Nelson rejection, `toogo-app-review`).

## Screenshots
- 5 strong ones beat 10. The first two carry most of the decision.
- Real UI, each with a short headline about what the user gets ("Everyone swipes. The trip plans itself.").
- Hebrew set mirrored (RTL) and an English set.
- Only good-looking card photos in them (`toogo-rules` 5).
- **Do not show where-to-stay or anything else not yet live** (`toogo-rules` 6).
- Order suggestion: swipe -> match -> day plan -> map -> split costs.

## Testing
Apple's **Product Page Optimization** tests up to 3 alternative screenshot/icon sets against the original for free. Change one thing per test.

## Ratings
Ratings move ranking and conversion. The prompt rules live in `toogo-first-run` (after a win, not on the first visit, Apple's prompt only).

## Not worth it
Product Hunt for a consumer travel app (a scout's judgement, no data). Paid influencer deals: one founder got 200-500 downloads from 38K views.

Deliverable format: a table per locale with each field, its character count, and the reasoning.

## Added 2026-11-16 from @danh.app
- **Study a big app's product page before writing ours** (reel DfvTxL5ScLH, seconds 23-36, https://www.instagram.com/danh.app/reel/DfvTxL5ScLH/): he walks through Duolingo's listing (rating and rank line, age, screenshots with one short line each, and an **in-app event card**, "Trick or Streak / HAPPENING NOW"). Do the same for two competitor listings and write down what the first three screenshots promise.
- **In-app events** (an Apple feature, shown on the product page and in search): worth trying for a dated, honest moment, such as "Plan your winter Japan trip" in November. Not before the owner's trip is over if it needs anything not yet live (`toogo-rules` 6). Apple's current rules for events were not checked here; read them first. Do not copy streak or "limited time" framing (`toogo-rules` 7).
- **Reviews in the screenshots' first line** are not needed; keep to `toogo-rules`: real UI, real photos.
