# What Toogo can take from @nels_ysng and 5 topic scouts (2026-11-14)

**@nels_ysng** is Nelson, a solo developer with 8.9K followers who builds iPhone apps with Claude Code and sold his first app. He has 83 reels. 47 of them were read from their burned-in captions, by 3 Sonnet agents with the caption tool. The other 36 were left out from their post captions alone: his stutter-app diary, Mac utilities, earnings and day-in-the-life clips.

Five more Sonnet agents looked for other creators on 5 topics: design, architecture, marketing, monetization and travel apps. Instagram had almost nothing concrete on these topics, so 4 of the 5 read no reels: design and architecture used YouTube transcripts, and marketing, monetization and travel used articles and podcast summaries. Numbers in this file are the creators' own claims unless marked otherwise.

Full notes are in the scratchpad (`out/A.md`, `B.md`, `C.md`, `scout-*.md`). Items already in `docs/next-steps-2026-11-12.md` (the rating prompt, PostHog, privacy page) are marked "already planned".

## My verdict

Nelson is worth following. He covers Toogo's exact next step: getting a solo-built app through App Review and making money from it. He is open about his own rejections and mistakes. Half his reels sell a keyword-for-DM guide, but the reels themselves carry the content. The scouts added less: no reels, mostly secondhand sources. Their two strongest ideas are haptics and turning Toogo's rules into Claude Code hooks.

## 1. App Review: what Toogo is missing (checked in the code today)

Nelson has 3 checklist reels (DeFbijfOCTB, Dcg63h2ub2t, DcwaLOWO4Ry) and 2 rejection stories (DaF346FMjTa, DZzcMBuOVDg). Checked against Toogo's code:

| Item | Toogo today | Needed? |
|---|---|---|
| **Delete account inside the app** | Missing: no delete button in Settings | **Yes.** Apple requires it for any app where you can create an account (guideline 5.1.1(v)). The likeliest rejection. |
| Privacy policy and terms, linked in the app and on the store page | Missing (TODO.md line 30) | Yes, already planned |
| **"Web app wrapped for mobile"** | Toogo is a Capacitor app | It's a risk (guideline 4.2, minimum functionality). Native touches reduce it: haptics, push, share sheet, photos. |
| Sign in with Apple | Email and password only | Not needed today. **It becomes required the day Google sign-in is added** (guideline 4.8), so build both together. |
| Don't force sign-in before the user sees value | To check | His reel Da-QJUruQPg: forced sign-in made people leave. Apple also rejects apps that make you create an account before the main features. |
| Say which features use AI | To check | Wand, suggest-place and plan generation use Claude: say so in the app and in the review notes. |
| Restore Purchases button, purchases tested in the StoreKit sandbox | No in-app purchase yet | Needed when Israel's Apple in-app purchase goes in |
| Notes for the reviewer, plus a demo account | n/a | Yes: a test login with a ready trip, so the reviewer sees swipe and match working |

## 2. From Nelson, most useful first

1. **Ratings (DeH_fzaOe2f).** Apple shows its native rating prompt at most 3 times a year per user, so don't spend one in onboarding. Ask after the user's second visit or after a win. *Already planned (next-steps #3); this adds "not on the first visit".*
2. **Onboarding where you do one real thing first (DduRXwgupNB, DfdFuNfuVso).** Only 34% of his users finished onboarding. Letting them do one real action before any ask fixed it, and notification permission came after that first moment. For Toogo: one swipe on real cards before sign-up and before the notification prompt.
3. **Empty states with sample data (DffwAIJuf8z).** A new user's empty app is "one of the worst feelings". His fix: a sample-data switch and tips that point to the first action. For Toogo: a demo trip a new user can look at before making their own.
4. **Paywall: value before price (Dd7JWT9O10e).** A paywall in a few steps that shows the personal plan first, then the price. His "37% better" has no source. For Toogo: show the finished plan, then the credit offer.
5. **A RevenueCat trap (DeNL5P3Oagz).** Changing the default offer broke his live app while the new build was in App Review. Keep a separate offer for each app version. This matters only if Toogo uses RevenueCat for Israel's in-app purchase.
6. **Design tools for Claude Code (DfagCXFuqNI, De7m1yTubk-, DenAHoEOKco, DePwcE6u2Iv).** The Mobbin MCP gives Claude real screens from top apps, such as onboarding and paywalls, to copy patterns from. "Impeccable" is a skill whose /critique and /detect commands point out AI-looking UI. The apple-design and taste skills are similar. Low cost to try. Note: "Apple Design skill" code is SwiftUI, only the ideas carry over.
7. **CLAUDE.md as a short map (DeUzIcXuHL0).** One doc per topic in a docs folder with an index file. Claude reads them before coding and updates them after each feature. Toogo partly does this already (HANDOFF.md).
8. **Analytics before launch (Da3ME-TursL, Db6Pu6OO7WS).** He launched blind with 18 downloads. PostHog then found a broken first sign-in that was losing users. *Already planned (next-steps #14).*

Skip: his move to SwiftUI, Expo Go, the iPhone Duo reel, the Mac apps, and the hand-drawn component library.

## 3. From the 5 scouts

**Design (YouTube: Chris Raroque, ~103K subscribers; Oliur; App Breakdown)**
- **Haptics.** Toogo has none today. A light tap on swipes, and a firmer one on match, tab changes and sheets snapping into place, using Capacitor Haptics. Small effort, and it also helps against the "web wrapper" judgement.
- Polish the 3-4 moments people hit most (swipe, match, add to trip, the wand finishing) with a proper animation, not a toast.
- One icon family: outline when not selected, filled when selected, no decorative emojis.
- A screen before each iOS permission prompt that shows what the user gets, for example a sample notification.

**Architecture (YouTube: Anthropic, Supabase, The Coding Sloth)**
- **Rules as hooks.** "English with every UI change" and "no deploy before the trip ends" are memory notes today, followed most of the time. A Claude Code hook runs every time and can block the action. Toogo has no project hooks.
- Run Supabase locally and push to the real project in small chunks, as a separate step.
- Give the Sonnet subagent a check it must pass: type check, tests, and Hebrew and English screenshots for UI changes.
- Before launch, check that every table has row-level security, and test the rules while signed in as a normal user. *Checked today: the Supabase service key is not in the app code.*

**Marketing (articles: Oliver Henry, HabitKit, AppTweak)**
- Photo slideshows on TikTok: 6 portrait slides, a hook on the first, strong photos only.
- A hook about two people who disagree: "she wanted the beach, I wanted museums, we both swiped yes on this plan". He says these got 147K-234K views, against 0.9K-2.7K for feature hooks.
- A Hebrew App Store listing, plus English (UK) for extra keywords. 5 store screenshots of the real app, each with a headline about what you get, A/B-tested for free with Apple's Product Page Optimization.
- Warnings: one app waited ~6 months for its first hit video, and a paid influencer deal lost money.

**Monetization (Superwall and RevenueCat articles, one podcast)**
- Apple's rules: credits bought in the app may not expire, and outside the US the app may not point to paying elsewhere. That matches the current web-in-the-US, Apple-in-Israel plan.
- Measure what share of installs ever see the credit offer before changing anything.
- One plain credit screen: a big finished-plan image, 3-5 benefits, 2-3 packs with one picked by default, and a "credits never expire" line.

**Travel apps (articles only, the weakest scout)**
- A shareable "trip wrapped" card at the end of a trip, built from data Toogo already has.
- A read-only trip link that opens without sign-up and has an install button. Polarsteps grew this way with no marketing spend.
- Keep swipe and match free. Wanderlog was criticised for locking basic features.

## 4. What I'd do, in order

1. **Delete account in Settings** (mandatory for App Review), with the English strings.
2. **Privacy and terms page** (already in TODO), linked from Settings and sign-up.
3. **Haptics** on swipe, match and sheets.
4. **Claude Code hooks** for the two rules most often missed.
5. Try the **Mobbin MCP and Impeccable** on one screen, Discover, and compare before and after.
6. The rest after the Japan trip: onboarding with one real swipe first, a demo trip for new users, the credit screen, the rating prompt, PostHog.

## Full re-read 2026-11-27 (@nels_ysng, captions via signed-in Chrome 2026-11-26, read only)
- **Count:** 95 of 95 posts listed (the registry said 83); 19 already in this doc, **76 new read, 0 failed**. All reels. No challenge or rate limit. Frames: 0 (most captions are "Comment X for the guide", so the tips live in the video text).
- **Kept (about 45):** Tiles build log (DgNg4DvOZRm, DgDc7R4OiTw, Df21HSdOrRX, DfxuD74uhlH, DfvKbSvu7Jd, DfnY2Z7OjXF, DfVYEUXOxEq, DfS1AhiORxa, DfQQ_fQOGZ4); Claude Code workflow (DdPa2EeuVhs, DdR8LreOk-N, DdW_qmXulCC, DfiToSjue0w, Dez2DHKOSdC, DeaDCrIu0_u, Dehzr_kubi1); UI and design tools (DbVKtwiox1k, DesH8C4uzqX, Dec3xydOvBm, DekX6NvOUQR, DeXeDLyOtX_, DeU-EtQu7mg, De2QqRMO3WG, DZrx9RIO6le, Df0Ugb3OVZr); first-app lessons (DasNnFROctO, Dac0F0DOhzg, DaflcGAscXR, DZcxX54suIU, DX6zJlfMAu1, Db_HwTlMKGD, Dcorz64Oq9P, Dc13ucruQXP); backend and billing (DYMWCBruzec, DYeJY6czlWl, DXey4S8DPNt, DdCXDPnuplR); launch (DfX9sS0usjK, Df-J6wxOiTM, DdzbAR5O4ES).
- **Skipped:** promos and sponsored tools (Kanbuild, Demi AI, CouCou, HiNoter, Vorssaint, Renoise, Videotto, Df-WZhtuRzu); earnings brags (DfLILxXOJmg, DeC4XGIOtXG); personal and travel (DcTTYSoujM4, DZKiI6oMsvJ, DYop39KTn_1, DYRtVOKMaB5, DZ8IgHeu0Zu); his comment-to-DM tool (DdHtQ2guNR5); sale-price stories (his claims).
- **Went to:** ux-ui-craft, premium-feel (sounds, haptics), first-run (sign-in disagreement), app-review (sandbox, policy URLs), indie-launch, marketing-craft (waitlist, build in public), backend-craft (dev/prod, admin view).
- **Still worth reading by frame (11):** DfsjocVuDDf, DgGO1h5OgjN, DfVYEUXOxEq, DfxuD74uhlH, Dc13ucruQXP, Dec3xydOvBm, DesH8C4uzqX, De2QqRMO3WG, Dez2DHKOSdC, Dehzr_kubi1, DcbvQL7ucoJ.
