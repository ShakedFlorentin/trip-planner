---
title: Consents
chapter: privacy
explains:
  - setCounting
  - countingOn
  - PushAsk
  - askForRating
---
## What needs consent, and what exists
| Item | Today | Gap |
|---|---|---|
| Usage counting and device id | On by default, opt-out "עזרה בשיפור Toogo" (`setCounting`) | EU testers: ePrivacy 5(3) probably needs opt-in (legal draft) |
| Dietary answers (can hint at religion) | Questionnaire, no explicit consent | Special-sensitivity data: needs an explicit ground (GDPR Art. 9, Israel Amendment 13) |
| Passport numbers in booking files | Testers' agreement asks not to upload full numbers; the app reads files anyway | Explicit consent, or block |
| Sending files to Anthropic | Privacy page names it | Consent ground and transfer mechanism undecided |
| Push notifications | Asked by `PushAsk` after 3 likes or a match, at most twice, never after own "Don't allow"; Settings switch | Apple's own prompt for the app (APNs) later |
| Review photos | Uploader accepts wording at upload; approved photos follow it | EXIF GPS copied to the public bucket (QA) |
| Terms and age 18+ | Terms draft says 18 and over | Not collected at sign-up |
| Testers | Agreement by chat message | See [testers-agreement](testers-agreement.md) |
| Rating prompt | Apple's own | Fine |

## Rules
Consent must be real: no pre-ticked boxes for sensitive data, no nagging (rule 7). Withdrawal as easy as giving. Counting off means off, server side too (`features.counting`).

## Open
Whether an EU representative (Art. 27) is needed; the legal basis for the device id for EU users.

Related: [lawyer-questions](lawyer-questions.md).
