---
title: App Review readiness status
chapter: review
explains:
  - privacyUrl
  - openExternal
  - askForRating
  - ErrorBoundary
---
Status from `toogo-app-review` (14 Nov), `docs/handoff-2026-11-14-agents-and-delete-account.md` and QA 16 Nov. Re-check each row before submission: pass, fail or not checked with the file that proves it.

| # | Apple expects | Status |
|---|---|---|
| 1 | Delete account in the app (5.1.1(v)) | Built and not applied or in main (SQL, function `delete-account`, `DeleteAccount.tsx` in another checkout). Likeliest rejection. |
| 2 | Privacy policy and terms in app and store (5.1.1(i)) | Page exists, Settings row uses `privacyUrl`/`openExternal`. Contact email empty. Store fields not filled. |
| 3 | More than a website (4.2) | Risk. Offline, share extension (planned), Apple rating prompt (`src/rating.ts`), widgets data, haptics help. Say so in notes when on. |
| 4 | Sign in with Apple if Google is offered (4.8) | Google is off. Build both together. |
| 5 | No forced account before value (5.1.1) | Guest mode exists, off. Shared plan works before login. |
| 6 | Say where AI is used (5.1.2(i)) | Privacy page lists Anthropic; in-app and reviewer notes to do. |
| 7 | In-app purchase, Restore (3.1.1) | None yet. Dead buy button with a price is a store risk (QA). |
| 8 | Usage strings in `ios/App/App/Info.plist` | Not checked. |
| 9 | Support URL, marketing URL, age rating, label | Draft in `docs/app-store-listing.md`; support page needs a contact email. |
| 10 | Reviewer notes and demo account (2.1) | Not created. |
| 11 | No fake ratings (3.2.2(x), 5.6.3) | Apple's prompt only. |

## Also from QA
No app-wide error screen was found in the first QA read, but `src/ErrorBoundary.tsx` now exists in main (`ErrorBoundary`): verify it wraps the app. Android test build is sideload only.

Related: [whats-missing](whats-missing.md).
