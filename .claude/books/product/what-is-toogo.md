---
title: What Toogo is and who it is for
chapter: basics
explains:
  - SwipeGame
  - Itinerary
  - Onboarding
---
Toogo plans a trip for a small group. Everyone swipes on places on their own phone; when the group likes a place it is a match, and the planner turns matches into a day-by-day plan. Bookings, expenses, lists and a Japanese translator live alongside.

## Who
- First user: the owner's own Japan trip, 12-31 Dec 2026 (two couples, one with a 5-month-old baby, some avoid pork and seafood). 4 users, 1 trip today.
- Next users: small groups (couples, friends, families) planning Japan. Hebrew first, English with it.
- Not for: solo trip loggers, or people who want a list of saved reels. Toogo is for deciding together.

## The one line (test every screen against it)
HE: "מחליקים יחד על מקומות, והטיול מתכנן את עצמו." EN: "Everyone swipes. The trip plans itself." (Wording lives in `toogo-short-video`; the owner may change it.)

## How it feels in the app
- Discover (`SwipeGame`, `src/views/Swipe.tsx`): cards of hand-picked places; a match puts the place in the plan.
- Plan (`Itinerary`, `src/views/Itinerary.tsx`): the planner (edge function `plan-trip`, no AI) lays out days by where each couple sleeps.
- A short questionnaire (`Onboarding`, `src/views/Onboarding.tsx`) filters cards: who, cities, food, budget, pace.

## Stack in one line
React + Vite + TypeScript PWA, Capacitor iPhone app, Supabase (database, auth, edge functions). Hebrew RTL, English LTR (`src/i18n`).

Related: [feature-map](feature-map.md), [standing-decisions](standing-decisions.md).
