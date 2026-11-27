---
name: toogo-credits-offer
description: How Toogo offers credits - Apple's payment rules per storefront, where and when to show the offer, what the credit screen looks like, pricing. Use when touching credits, the buy link, in-app purchase, pricing or any paywall-like screen.
---

# The credit offer

Sources: Apple guideline 3.1.1 (read by a scout 2026-11-14), Sub Club podcast transcript (David Barnard, Jake Mor, Darrell Stone), RevenueCat and Superwall blog posts, @nels_ysng reel Dd7JWT9O10e. The conversion numbers are **vendor-reported and from subscription apps, not credit packs** - directional only.

## What is already decided (do not reopen - `toogo-rules` 7)
Credits are an AI-cost wallet, priced to cover cost plus a little. Affiliate hotel search is the main income. Sold on the web; no manipulative tactics. Credits code: `supabase/functions/_shared/credits.ts`, switched off by the `credits` flag.

## Apple's rules
- **Credits bought in the app may not expire** (3.1.1).
- **Outside the US storefront** the app may not show a button, link or wording that points to paying elsewhere (3.1.1(a)). So: web buy link on the US store only; Israel and the rest need Apple in-app purchase, with a Restore Purchases button.
- Web-bought credits may be used in the app only if the same credits are also sold through in-app purchase.
- US link-out fees are unsettled in court (0% now; Apple proposed 5-15% in Aug 2026). Re-check before relying on it.
- Legal reviews any change here. This is a rejection and a money risk.

## Design
1. **Measure exposure first:** what share of installs ever see the offer. Apps rarely pass 80%; some sit at 20-30%. Do not tune a screen few people reach.
2. **Show it at the moment of value:** when someone uses the wand or generates a plan and is out of credits - not at launch, not as a nag.
3. **Value before price:** show the finished plan (or what the credit just did), then the packs.
4. **One plain screen:** a big image of a finished trip plan, an outcome headline, 3-5 benefits, 2-3 packs with one pre-selected, one coloured button, "credits never expire", an easy close. Native iOS look. (A stripped-down screen beat a comparison chart by 111% in Superwall's test.)
5. **Price per storefront** with Apple's tiers, and say what a credit buys in trip terms ("about 3 full day plans").
6. A cheaper pack later for someone who closed the first offer is allowed; fake urgency, countdowns and repeated pop-ups are not (`toogo-rules` 7).

## Open questions for the owner
- Packs only, or a yearly pass too? (Scout's inference: packs suit people who travel once or twice a year. Not backed by data.)
- RevenueCat or StoreKit directly for Israel? If RevenueCat: one offering per app version (`toogo-app-review`).

## Added 2026-11-16 from @danh.app
- His in-app purchase screen in the review reel (https://www.instagram.com/danh.app/reel/Dfy_BeWSnqN/, second 44) lists Monthly $4.99, Yearly $39.99, Lifetime $79.99, all marked "Missing Metadata". When Toogo adds credit packs through Apple in-app purchase for Israel, every product needs its metadata and review screenshot before submission (see `toogo-app-review`). Nothing else on pricing or paywalls was found in his reels; his subscription prices are not advice for Toogo.

## Added 2026-11-26 from @ceciliakimdesign (her claims, options only)
- Show monthly beside yearly on one screen; plan for Apple's cut (up to 30%, 15% small business); one subscription group so nobody pays twice; Restore purchases visible; cancel one tap away (opens Apple's screen); biggest number is the real charge. https://www.instagram.com/ceciliakimdesign/reel/Dfp6X0DSG3l/ and https://www.instagram.com/ceciliakimdesign/reel/DfsZN3jSSUV/
- Her hard-paywall-converts-better claim is NOT taken: Toogo v1 is free with capped AI and no rigged free tier (rule 7).
