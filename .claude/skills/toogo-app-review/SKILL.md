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

## Added 2026-11-16 from @danh.app (a 304-follower solo developer; reel Dfy_BeWSnqN is his own rejection story)
Source: https://www.instagram.com/danh.app/reel/Dfy_BeWSnqN/ (burned-in captions read at 1 s steps; his voice was not heard). Nothing here is measured; it matches Apple's published process, so check each line against Apple's live pages.
- **Rejected for the privacy policy and terms of use** (his App Review screen: "Please update your privacy policy and terms of use"). Cover the basics before the first submission: a Privacy Policy and Terms of Use row inside Settings **and** the same URLs in App Store Connect. Toogo status: the Settings row exists (`openExternal(privacyUrl())` in `src/views/Settings.tsx`, page from `scripts/pages/privacy.mjs`); the store-page fields and the support URL are still on the "Before you submit" list in `docs/app-store-listing.md`.
- **Reviewer notes as numbered steps, not a paragraph.** His example: "1. Sign in with the demo account / 2. Tap Record to start session / 3. Upgrade lives under Profile, Membership (sandbox) / 4. Camera is used for scans only". Toogo's draft in `docs/app-store-listing.md` is a paragraph with the demo account still "to be created". Rewrite it as steps: sign in, open Discover (flame tab), swipe, see the match, open the plan; one line per permission saying where it is used; one line saying which features use AI (row 6). Add a "where to find in-app purchase" step the day Israel credits go in.
- **In-app purchase products with "Missing Metadata"** blocked his submission (monthly, yearly and lifetime all showed it). When Toogo adds credit packs, fill name, description, price and the review screenshot for every product *before* pressing submit, and attach them to the version.
- **Expedited review** (his last App Review screen): Apple has a request form for a critical bug fix or a dated event; the request must include the steps to reproduce, or the event and its date. Keep it for real emergencies. It is not a way around the queue, and the Japan trip is not an event Apple will accept as a reason.
- Calm rule from the same reel: one rejection is a fix-and-resubmit, not a rebuild. Already in "Rejections are vague" above.

## Added 2026-11-26 from @ceciliakimdesign (https://www.instagram.com/ceciliakimdesign/reel/DgJC8RKShKc/, captions only)
- Link terms of use in description and paywall; back end on and the test account working on submit day; rating prompt in the first build, after a good moment; first subscription goes in with the first version; the real charge is the biggest number; expedited review exists for a serious post-launch bug.
- **Gates, part 2** (checklist before submit/TestFlight): Sign in with Apple if Google sign-in is offered; in-app account deletion; privacy policy in the app and in App Store Connect; a real reason string per permission; reviewer test login; no placeholder or "coming soon" screens; privacy labels; export compliance; lowest iOS set deliberately; in-app purchase for paid features (Israel, rule 7). https://www.instagram.com/ceciliakimdesign/reel/Ddcti0Mt8Wf/ , https://www.instagram.com/ceciliakimdesign/reel/DexFOPgSkIL/

## Added 2026-11-27 from @danh.app (caption) and @nels_ysng (captions)
- **His 4 rejections:** a crash that only the release build showed, a broken onboarding button, in-app purchases not submitted, legal links that need public web URLs. Test a release or TestFlight build, not the dev build. https://www.instagram.com/reel/DTSzyk0kp4H/ , https://www.instagram.com/reel/DTXY_-Dks0j/
- **Privacy policy, terms and landing page ready before submit** (he used a generator, Termly); name purchase product IDs consistently in App Store Connect; test in the StoreKit sandbox. @nels_ysng https://www.instagram.com/reel/DZcxX54suIU/ , https://www.instagram.com/reel/DdCXDPnuplR/ , https://www.instagram.com/reel/DYMWCBruzec/
