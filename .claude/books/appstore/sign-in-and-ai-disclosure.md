---
title: Sign-in, AI disclosure and permissions
chapter: review
explains:
  - Login
  - Guest
  - syncPush
  - openExternal
---
## Sign-in
- Email and password today; sign-up by invite (edge function `sign-up`). Google sign-in is built, off (`features.google_signin`), web only.
- If any third-party sign-in shows in the app: Sign in with Apple too, labelled clearly (4.8). Build Google and Apple together; needs the paid account.
- Visitors should see value before sign-up (`Guest`, off); a shared plan opens before login.

## AI disclosure (5.1.2(i))
Features that send data to Claude (Anthropic, US): add place by link or name (`suggest-place`), read a booking (`parse-booking`: files may include passport numbers), translate (`translate`), card facts and photos (server side). `plan-trip` and the wand use no AI. Say it in the privacy page, in the app near the feature and in reviewer notes. Not checked: whether the app already says so.

## Permissions
Camera, photos, speech recognition (translator, `webkitSpeechRecognition`), notifications (web push only; the App Store app needs APNs), location (none today). Each usage string in `ios/App/App/Info.plist` must say why: not checked.

## Push
Web push is live for the website and home-screen app. The Capacitor app has no web push; needs APNs and the Apple licence (`syncPush` in `src/push.ts`).

## Ratings
Apple's prompt only, after a win, never on first visit, at most 3 times a year; code in `src/rating.ts`.

Related: [review-readiness](review-readiness.md), [privacy-label](privacy-label.md).
