---
title: Open decisions for the owner
chapter: plan
explains:
  - buyPass
  - passPrice
  - privacyUrl
---
Not decided. Do not build around a guess; ask.

## Money model
- Decided: trip pass idea, $7.99, 10 free places, affiliate hotel search main income.
- Open: payment company for the website (must serve Israeli businesses; needs the owner's business details); RevenueCat or StoreKit directly for Israel; a yearly pass too; whether the credits code (`app_flags.credits`) stays or is removed (pass and credits conflict, QA 16 Nov).
- Apple 3.1.1 per storefront: see the appstore book.

## Apple account and publishing
- The paid Apple developer account (licence) decides: Apple in-app purchase, APNs push, Sign in with Apple, TestFlight, the store itself.
- App name free in App Store Connect? Fallback "Toogo Japan: Trip Planner".

## Domain and contact
- No own domain: the site is `shakedflorentin.github.io/trip-planner`. A real domain (and its email) is open. The four group accounts use `@japantrip.app` addresses (a risk noted in an older review).
- `CONTACT_EMAIL` in the privacy page is empty; privacy page, support page and Apple all need it. Email-setup notes were not found in this checkout.

## Other
- Leaver's share links and credit history (keep and anonymise?), couple mode balances for leavers.
- When to apply delete-account SQL (after the trip unless the owner says otherwise).
- Public feedback board (outside tool vs "no outside tools" promise).
- Session replays and cross-trip stats: privacy decision.
- Photo licences: keep only free-licence photos with credit, or icon tiles (`docs/TODO.md`).

Related: [standing-decisions](standing-decisions.md), [roadmap](roadmap.md).
