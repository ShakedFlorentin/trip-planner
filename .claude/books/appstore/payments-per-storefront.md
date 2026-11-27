---
title: Payments rules per storefront
chapter: payments
explains:
  - buyPass
  - passPrice
  - usePassStatus
---
Skill: `toogo-credits-offer`. Re-read Apple 3.1.1 and the US fee status before building; legal reviews any change.

## Rules (from notes)
- Credits bought in the app may not expire.
- **US storefront:** a link to web checkout is allowed (fee status unsettled: 0% now, Apple proposed 5-15% in Aug 2026).
- **Israel and every other storefront:** only Apple in-app purchase; no button, link or hint of paying elsewhere (3.1.1(a)); a Restore Purchases button.
- Web-bought credits may be used in the app only if the same credits are also sold by in-app purchase.
- Every in-app product needs its metadata and review screenshot before submission ("Missing Metadata" blocks it).
- With RevenueCat: one offering per app version.
- Screen basics (a creator's claims, `toogo-credits-offer`): Restore Purchases visible, cancel one tap away for any subscription, the real charge is the biggest number, plan for Apple's cut (up to 30%, 15% small business). Her "hard paywall converts better" is not taken: rule 7.

## Where Toogo is
Skill and rule 7 say credits are the decided wallet (AI cost plus a little). The trip pass below is an older plan that conflicts; the skill wins, and the owner settles it before anything is built.
- Trip pass (earlier plan, now in conflict with the credits decision): first 10 new places per trip free for the group, $7.99 per trip (`features.trip_pass`, off). `buyPass` in `src/pass.ts` returns "soon"; `usePassStatus` reads `trip_pass_status`. Table `trip_passes` takes rows from web, apple or grant.
- Credits per person (`app_flags.credits`, off): conflicts with the pass; nobody was ever charged.
- Money is not decided (open decisions): do not build checkout.

## Design rules
Show the offer at the moment of value, not at launch; one plain screen; price per storefront with Apple tiers; say what it buys in trip terms; no fake urgency (rule 7).

## Hotel and ticket links
Affiliate links are not purchases in the app; label them as partner links. If a user id is passed to a partner, it may count as tracking (label).

Related: product book (open decisions).
