---
title: Affiliate links and money disclosure
chapter: money
explains:
  - hotelSearchUrl
  - AFFILIATE_ID
  - buyPass
---
## State
Hotel search link exists in code (`hotelSearchUrl`, `src/affiliate.ts`) with `AFFILIATE_ID = ''`. The where-to-stay feature is off and waits for after the trip (rule 6). Partner IDs wait for real clients (owner decision). `hotel_tap {area}` and `link_out {host}` are counted.

## What to say, and when
- Until IDs exist: privacy page says "Partner links will be marked as such". Remove "may earn us a commission" until it is true.
- Once live: mark each partner link where it is shown ("partner link" in Hebrew and English), and add to the testers' agreement: "Booking links may earn the owner a commission at no extra cost to you."
- Money wording is plain: price, what it buys, no fake urgency.
- Store description must not promise hotel search before it is live.

## Cautions
- Booking.com (through CJ) pays about 4% and Klook about 5% (blogs, not the dashboards: check there).
- Labelling duties: Israel and the FTC in the US (a lawyer question).
- Passing a user id to a partner may count as tracking in the App Store label.
- Do not show a price or an offer that the user cannot actually complete.

## Credits and pass
Apple per-storefront rules: appstore book. Refunds and cancellation under Israeli consumer and distance-selling law are not drafted.

Related: [lawyer-questions](lawyer-questions.md).
