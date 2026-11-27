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
  - hapticLight
  - hapticSelect
  - hapticSuccess
---
Sources: `toogo-premium-feel` (sections 1, 2 and the 2026-11-26 timing notes) and `toogo-ux-ui-craft` ("Motion feel", "Premium motion = restraint"). Link, do not copy.

## Four levels of feedback
For each key moment: (1) nothing, (2) a toast, (3) an animation, (4) an animation tuned until it feels right. Key moments: swipe, match, add to trip, the wand finishing, a credit spent. Aim 3-4 there and 2 elsewhere. Frequency of use decides richness: swipe and match may be rich; tabs, rows, toggles stay near silent. One big celebration only, for the top moment (`MatchPop`; later a finished trip plan).

## What exists
- `src/spring.ts`: `springTo(from, to, velocity, {damping, response}, onFrame, onDone)` in Apple terms (damping 1 = no overshoot, response about seconds to settle); starts from the current position and velocity so a gesture can grab it mid-flight; `project` gives where a flick would stop; `reducedMotion()` reads the system setting. Use it before adding a library.
- Swipe card: dragged and flung with springs (`Card` in Swipe.tsx); like/nope stamps and tint fade with distance.
- `MatchPop`: photo, rings drawn with a burst and a hop, faces of the likers (`styles/match.css`). The moment that gets the most polish.
- Sheets slide up (mounted closed, open next frame) and drag down to dismiss. Press state: `.primary`/`.secondary` scale to 0.97 in `--dur-1`. Other buttons (`.pill`, `.chip`, `.link`, icon buttons) have no pressed state yet (see debts).
- Loading rings (`Loading` in `src/rings.tsx`) for the full-screen boot only.

## Budget (house reading)
`toogo-premium-feel` (2026-11-26) records a disagreement: @charles.unemployed "under 300 ms", @ceciliakimdesign "start at 400 ms" for a reveal. **House rule:** about 0.2 s (`--dur-2` 0.22 s) for anything used often; up to about 0.4 s only for one rare reveal (a match, a finished plan). Slow in, slow out; a small wind-up and settle for big moves. Respond within about 400 ms (Doherty) or show a waiting state (chapter 04). Give motion feedback as a number ("400 ms", "damping 0.8"), not "smoother".
- Numbers that change (balances, credits, counts) may roll to the new value in about 0.2 s; digits use `font-variant-numeric: tabular-nums` so they do not shift.
- Carry, don't cut: a tapped Discover card should grow into its detail and shrink back to the same spot in the deck; a popup grows from what was tapped. Mirror the direction in RTL. Not built yet.
- Ambient motion (moving blurred background) only on the login or onboarding hero, never on lists, maps or swipe (battery and frames in a WebView); still under Reduce Motion and Low Power; owner decides.

## Reduced motion
`prefers-reduced-motion` rules exist for the rings loader, ready-line spinner, skeleton pulse, switch, and others in `styles.css`; any new animation needs its own reduced-motion branch, and `reducedMotion()` for JS-driven ones.

## Haptics (built)
`@capacitor/haptics` 8.0.2 is installed; `src/haptics.ts` is the one wrapper. It does nothing on the web, under reduced motion, or if the phone refuses; it never throws or waits. Three calls:
- `hapticLight`: the swipe card crossing its threshold or leaving by a button (`Swipe.tsx`), a wheel item picked (`QuickFab.tsx`).
- `hapticSelect`: a choice changing: the tab bar (`App.tsx`), `Tabs` (`ui.tsx`), Lists tabs, the Places list/map and Expenses currency segmented controls, `WhoChips` (`who.tsx`).
- `hapticSuccess`: a match (`MatchPop`).

Rules for any new haptic (`toogo-premium-feel` 1): go through `src/haptics.ts`, never the plugin directly; light for small commits, success only for real wins; never on scroll, never twice for one action; the haptic matches something visible at the same moment (`toogo-first-run`, "chunk and match"). Not yet covered: the wand finishing (should be success), a sheet snapping open or closed (medium, needs a new `hapticMedium`), toggles (`.switch`). Haptics cannot be felt in a browser: say "not checked on device" in reports.

Code: `.claude/books/frontend/08-views-discover.md`.
