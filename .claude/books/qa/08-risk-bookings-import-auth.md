---
title: High risk - booking import and sign-in
chapter: 8
explains: [ErrorBoundary, outboxFetch]
---
## Booking import
Where: `src/views/Bookings.tsx`, `importReview.ts`. Test: `node scripts/import-review-test.mjs`; server side `npm run test:guard` (parse-booking output validation).
- A booking outside the trip dates is flagged and unticked on import, never saved dateless.
- Double taps on import must not make duplicates.
- Fetches of links are guarded against private and internal addresses.

## Sign-in and sign-out
Where: `src/App.tsx` gates, `src/native.ts`.
- App must open when the token refresh hangs (5 s timeout) and show an error screen, not blank (`ErrorBoundary`).
- Sign-out on a shared phone must clear caches, outbox and push registration.
- Never test with a real session; mock auth.

## Not tested by any script
Google/Apple sign-in, email-link return on iOS, push registration. Check only on the Toogo Test simulator.

Related: 01, 04.
