---
name: toogo-first-run
description: First-run and onboarding patterns for Toogo - one real action before any ask, a demo trip instead of an empty app, when to ask for sign-up, notifications and ratings. Use when touching Onboarding, Login, LoginCarousel, Home empty states, or any permission or rating prompt.
---

# First run

Sources: @nels_ysng reels DduRXwgupNB, DfdFuNfuVso, DffwAIJuf8z, Da-QJUruQPg, DeH_fzaOe2f (read 2026-11-14); Apple's StoreKit docs for the rating limit. His numbers are his own, from one small app.

## Principles
1. **One real action before any ask.** His onboarding completion was 34% until users did a real first action before the paywall. For Toogo the real action is **swiping a few real cards**. Sign-up, notifications and any offer come after.
2. **Don't force sign-in before value.** Forced sign-in made his users leave; Apple also rejects it (`toogo-app-review` row 5). Toogo's trips are shared, so an account is needed to join one - but a visitor should be able to see and swipe a sample deck first.
3. **Never an empty app.** An empty first screen is "one of the worst feelings". Give a new user a **demo trip** they can look around in (plain saved data, no AI call - `toogo-rules` 2), and tips that point at the first action. The demo must not leak into a real trip (`toogo-rules` 3: only swipe and match adds a place).
4. **Onboarding slides show the thing, not a description of it:** a live swipe, a match, a day plan. Then "try it".
5. **Notifications:** ask after the first match or first plan, behind a pre-screen (`toogo-premium-feel` 5).
6. **Rating prompt:** Apple shows its prompt at most 3 times per user in 365 days, so each one is precious. Never in onboarding, never on the first visit. Ask after a win (a match, a first finished day plan) on a second or later visit. Apple's own prompt only; never force or reward a rating. Planned as next-steps #3; Toogo has no prompt yet and needs a Capacitor plugin for it.

## Measure before changing
Toogo has no analytics (2026-11-14). Without it, onboarding work is blind: he launched with 18 downloads and no data, then PostHog showed a broken first sign-in. Minimum events: app open, onboarding step N, sign-up done, first swipe, first match, first plan, credit offer seen. Session replay records what people type, so it needs the owner's privacy decision first.

## Checks for any first-run change
- Works signed out, in Hebrew and English, on a fresh install with no local storage.
- An invite link (`inviteInUrl()` in `Login.tsx`) and a shared plan (`?share=`) still land where they should.

## Added 2026-11-16 from @danh.app
- **Ask what the person wants, as chips, after the first look** (reel DfjiPD2yHB8, seconds 50-53: Rallio asks "What brings you to Rallio?" with four choices: keep a record of my tennis, share matches with friends, play more consistently, find courts and players). For Toogo: one screen with 3-4 chips ("who am I travelling with", "what I want most: food, sights, calm") that only re-orders Discover cards. Plain code over the cards, no AI per user (`toogo-rules` 2). Toogo's `src/views/Onboarding.tsx` has no such question today.
- **Sign-in screen with both providers** (reel DfvTxL5ScLH, second 19: "Continue with Apple / Continue with Google"). Matches the owner's wish for Google and Apple; they go in together (`toogo-app-review` row 4).
- **Dropped:** the Mealo "Enjoying Mealo? Tap star to rate it on the App Store" box with "Not Now" (reel DfrQoL-SwEG, second 11, https://www.instagram.com/danh.app/reel/DfrQoL-SwEG/). A home-made star box in front of Apple's prompt is the pattern Apple disallows, and `toogo-rules` already say Apple's own prompt only. `src/rating.ts` + `AppReview.swift` do it the allowed way.
