---
title: What is missing before submission
chapter: review
explains:
  - SignOutSheet
  - privacyUrl
---
## Blockers
1. **Paid Apple developer account.** Needed for TestFlight, the store, Apple push (APNs), in-app purchase, Sign in with Apple. Not set up.
2. **Delete account inside the app.** Built, QA'd in a mocked browser only, not applied. Decisions open (leaver's share links and credit history, couple-mode balances). Apply order: prechecks, rehearsal, `delete-account.sql`, deploy function, `leave-trip.sql`, client behind a flag, rehearsal with a new account. After the trip.
3. **Privacy contacts.** `CONTACT_EMAIL` empty on the privacy page; support page not made; no controller name or address. Apple and GDPR both need a real contact.
4. **Demo account** with a ready trip, two members, cards to swipe. Needs the owner's OK for a new account in the database.
5. **Store fields:** privacy URL, support URL, marketing URL, age rating, label.

6. **Public web links for terms and privacy, and a landing page** (a creator's rejection was for legal links; no domain yet). Short, no claim lines.
7. **A release-build test pass** on the simulator before upload (see review-readiness).

## Should fix (QA 16 Nov)
- Sign-out on a shared phone keeps push subscription, outbox, map and photo caches (privacy and review risk).
- Dead buy button with a price in the pass sheet.
- Error screen and offline states.
- English photo licence wording vs Hebrew.
- The listing says "More than 1,500 places": verify.

## Not blockers today
Credits and pass are off, so no in-app purchase is required until they go live.

## Order of work
`docs/nels-and-scouts-2026-11-14.md` section 4 (delete account first).

Related: [review-readiness](review-readiness.md), [reviewer-notes](reviewer-notes.md).
