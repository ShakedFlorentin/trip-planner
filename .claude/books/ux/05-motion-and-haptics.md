---
title: Motion and haptics
chapter: patterns
explains:
  - springTo
  - project
  - reducedMotion
  - MatchPop
  - Card
  - Sheet
---
Sources: `toogo-premium-feel` (sections 1 and 2) and `toogo-ux-ui-craft` (animation rules, filled over time). Link, do not copy.

## Four levels of feedback
For each key moment: (1) nothing, (2) a toast, (3) an animation, (4) an animation tuned until it feels right. Key moments: swipe, match, add to trip, the wand finishing, a credit spent. Aim 3-4 there and 2 elsewhere. Frequency of use decides richness: swipe and match may be rich; tabs, rows, toggles stay near silent.

## What exists
- `src/spring.ts`: `springTo(from, to, velocity, {damping, response}, onFrame, onDone)` in Apple terms (damping 1 = no overshoot, response about seconds to settle); starts from the current position and velocity so a gesture can grab it mid-flight; `project` gives where a flick would stop; `reducedMotion()` reads the system setting. Use it before adding a library.
- Swipe card: dragged and flung with springs (`Card` in Swipe.tsx); like/nope stamps and tint fade with distance.
- `MatchPop`: photo, rings drawn with a burst and a hop, faces of the likers (`styles/match.css`). The moment that gets the most polish.
- Sheets slide up (mounted closed, open next frame) and drag down to dismiss. Press state: buttons scale to 0.97 in `--dur-1`.
- Loading rings (`styles.css`, `RingsIcon`).

## Budget
UI motion under 300 ms; slow in, slow out; a small wind-up and settle for big moves. Respond within about 400 ms or show a skeleton. Ambient motion (moving blurred blobs) only on login or onboarding hero, never on lists, maps or swipe (battery in a WebView); owner decides.

## Reduced motion
`prefers-reduced-motion` rules exist for the rings loader, ready-line spinner, switch, and others in `styles.css`; any new animation needs its own reduced-motion branch, and `reducedMotion()` for JS-driven ones.

## Haptics
None yet: `@capacitor/haptics` is not installed. Plan (premium-feel 1): one no-op-on-web wrapper in `src/native.ts`. Light on each swipe card leaving and toggle or chip tap; medium on tab change and sheet snap; success on a match and a finished wand. Never on scroll, never twice per action, respect the system setting. Cannot be felt in a browser, so say "not checked on device".

Code: `.claude/books/frontend/08-views-discover.md`.
