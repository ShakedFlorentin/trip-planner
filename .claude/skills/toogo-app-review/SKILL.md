---
name: toogo-app-review
description: Apple App Review readiness for Toogo - the checklist of what Apple rejects solo-built apps for, with Toogo's status on each item. Use before any App Store submission, when adding sign-in, payments, account or AI features, or when writing reviewer notes.
---

# App Review preflight (Toogo)

Sources: three checklist reels and two rejection stories by @nels_ysng (read 2026-11-14), checked against Apple's guideline numbers from memory. **Re-read the live guideline text before a submission**; numbers and wording change.

Status column is what the code showed on 2026-11-14. Re-check it, do not trust it.

| # | Apple expects | Guideline | Toogo on 2026-11-14 |
|---|---|---|---|
| 1 | Delete the account from inside the app (not just sign out, not "email us") | 5.1.1(v) | **Missing.** No delete in `src/views/Settings.tsx`. Likeliest rejection. Needs an edge function that removes the user's data and the auth user. |
| 2 | Privacy policy link in the app and on the store page; terms of use | 5.1.1(i) | **Missing** (`docs/TODO.md` line 30) |
| 3 | More than a website in a wrapper | 4.2 | **Risk**: Capacitor app. Lower it with native behaviour: haptics, share sheet (already in), push, offline, native-feeling sheets. |
| 4 | If any third-party sign-in (Google) is offered, Sign in with Apple must be offered too | 4.8 | Email + password only, so not needed yet. **Build Google and Apple together.** Label the Apple button clearly. |
| 5 | Do not force an account before the user can see what the app does | 5.1.1(v) | To check. `?share=` plan view works before login; the rest needs a look. |
| 6 | Say where AI is used and what is sent | 5.1.2(i) | To check: wand, suggest-place, plan-trip, parse-booking, translate use Claude. Say so in the app and in review notes. |
| 7 | Anything bought in the app: Apple in-app purchase, a Restore Purchases button, tested in the StoreKit sandbox; paid vs free clearly labelled | 3.1.1 | No in-app purchase yet. Needed for Israel credits. See `toogo-credits-offer`. |
| 8 | Camera / photos / location usage strings that say why | 5.1.1 | To check in `ios/App/App/Info.plist` |
| 9 | Support URL, marketing site, accurate age rating and privacy "nutrition label" | 1.5, 5.1.1 | To do with the store listing |
| 10 | Reviewer notes and a demo account | 2.1 | To write: a test login with a ready trip, two members, cards to swipe, so the reviewer sees a match happen |
| 11 | No fake or forced ratings | 3.2.2(x), 5.6.3 | Fine today (no prompt yet) |

## How to use

- **Before submission:** walk the table top to bottom on the real build. For each row write: pass / fail / not checked, and the file or screen that proves it. "Not checked" is a valid answer; a guess is not.
- **When a feature touches sign-in, payments, accounts, AI or permissions:** find its row first and design to it.
- **Rejections are vague.** Nelson was rejected twice for sign-in and paywall labelling with no clear reason given. When rejected, fix the named guideline narrowly, reply in Resolution Center with what changed, and do not change unrelated things in the same build.
- **A RevenueCat trap (his reel DeNL5P3Oagz):** changing the default offering changed the live app while the new build was still in review. If RevenueCat is used, keep one offering per app version.

Every fix here follows `toogo-rules` (English strings too; owner deploys).
