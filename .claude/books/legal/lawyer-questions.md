---
title: Questions for a human lawyer
chapter: open
---
From `docs/legal-drafts-2026-11-14.md` section 5, extended by QA and the photo audit.

1. Controller's legal form (private person or registered business) and the details to publish.
2. EU testers: is opt-in needed for the device id and default counting (ePrivacy 5(3))?
3. Grounds for dietary answers and passport numbers (GDPR Art. 9; Israel Amendment 13) and the lawfulness of sending them to Anthropic in the US.
4. Whether an EU representative (Art. 27) is needed.
5. Do the liability cap and the "irrevocable photo licence, also for whoever takes over Toogo" survive Israel's Standard Contracts Law and consumer law?
6. Choice of law and forum for EU and US consumers.
7. Credit and pass refunds and cancellation (Israeli Consumer Protection Law, distance selling); labelling partner links (Israel, FTC).
8. Whether an accessibility statement is required at this size.
9. Card photos: group C photos (Tabelog, Instagram, unknown origin) have no verified licence. Keep only free-licence photos with a credit, or icon tiles? (`docs/photo-credits-audit.md`)
10. Text from other people's posts and cards: takedown contact for photos and text.
11. Leaving users: what must go, what may stay (expenses, shared library).
12. The Israeli data protection registration thresholds.

## Not checked by the legal agent
The delete-account SQL and function; the live Supabase region and flags; whether the events SQL is applied; Anthropic's current retention and DPA terms; Apple's live label definitions; whether translate or parse-booking store content on the server; Info.plist and speech recognition in the iOS app.

Related: [consents](consents.md).
