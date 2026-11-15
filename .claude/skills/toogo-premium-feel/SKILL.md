---
name: toogo-premium-feel
description: How to make a Toogo screen feel like a polished native iPhone app instead of an AI-built web page - haptics, feedback levels, icons, the "AI look" audit, permission pre-screens. Use when designing, building or reviewing any Toogo UI.
---

# Premium feel

Sources: Chris Raroque (solo iOS dev, two YouTube videos), Oliur (fixing AI-generated design), App Breakdown ep. 84, and @nels_ysng's UI reels. Read as transcripts on 2026-11-14. These are practitioners' opinions, not measured results.

## 1. Haptics (Toogo has none as of 2026-11-14)
Needs `@capacitor/haptics` (not installed) and one wrapper in `src/native.ts` that does nothing on the web.
- **Light:** each swipe card leaving, a tap on a toggle or chip.
- **Medium:** tab change, a sheet snapping open or closed.
- **Success notification:** a match, a plan finished by the wand.
- Never on scroll, never twice for one action, and respect the system setting.
This also helps against Apple's "web wrapper" judgement (`toogo-app-review` row 3).

## 2. Four levels of feedback
For every key moment ask which level it is at: (1) nothing, (2) a toast, (3) an animation, (4) an animation tuned until it feels right.
Toogo's key moments: **swipe, match (`MatchPop.tsx`), add to trip, the wand finishing, a credit spent.** Bring these to level 3-4 and leave the rest at 2. Raroque's own example took ~6 hours and 50+ prompts for one interaction, so pick few.
Use the springs already in `src/spring.ts` before adding a library.

## 3. Icons
One family (Toogo uses `lucide-react` and `src/icons.tsx`), one stroke weight. Outline when idle, filled when selected. No emoji as decoration or as icons.

## 4. The "AI look" audit - run it per screen, in Hebrew and in English
Flag each of these with the file and line:
- emoji used as decoration
- a border on everything, or cards inside cards
- stray purple or a gradient with no reason
- oversized headings, uppercase labels
- icons not aligned with their text baseline
- spacing that is not on the scale, loose or uneven padding
- a screen that is equally dense top to bottom (should be calm at the top, denser as you scroll)
- an empty state that shows nothing useful
The owner wants **every** problem listed, however small, with a before/after image per proposed fix.

## 5. Permission pre-screens
Before an iOS prompt (notifications, location, photos) show one screen that says what the user gets, with a real example (a sample notification). Ask only after a moment of value, never on first launch. One chunky button, an easy "not now".

## 6. One sheet shape
Places, plan items and bookings should open in the same bottom-sheet shape with the same handle, radius and close gesture.

## Tools to try (not installed; ask the owner first)
- **Mobbin MCP:** real onboarding/paywall screens from top apps as references for Claude.
- **Impeccable** skill: `/critique` and `/detect` for AI-looking UI.
- **UI SDK** (`vercel-labs/ui`, beta): behaviours for popups, lists, typeahead. The `ui-sdk` skill is in `.claude/skills/ui-sdk` (added 2026-11-14) and loaded for ux and frontend. The package itself is not installed: its React package needs React 19; Toogo is on 18.3.

Follows `toogo-rules`: every change in Hebrew and English, checked mirrored.

## Added 2026-11-16 from @danh.app (design-tips reels, burned-in captions read)
- **"Your app sucks" test: first impression in seconds** (reel DfvTxL5ScLH, https://www.instagram.com/danh.app/reel/DfvTxL5ScLH/). His order: study reference apps for the screen you are about to build, then micro-animations for the key moments (his list: a click, a transition, a check mark, a screen change), then keep everything else quiet: "Good UI design is often the ones that go completely unnoticed". This matches section 2 (four levels of feedback): spend animation effort on the few key moments only.
- **Reference first, then build** (same reel, seconds 62-68: "never run out of design inspiration again", Mobbin and Dribbble open on screen). Same advice as the Mobbin tool above; nothing new to install.
- **Liquid Glass, Apple's own guidance** (reel Dfor0jxSp3c, https://www.instagram.com/danh.app/reel/Dfor0jxSp3c/, he shows Apple's WWDC25 page and the "Adopting Liquid Glass" doc): "If your app uses standard components from UIKit or AppKit, your interface picks up the latest look"; "reduce your use of custom backgrounds in controls and navigation elements". Toogo's screens are web content in a WebView, so they do **not** pick the new look up automatically. Practical rule: do not stack custom opaque backgrounds on top of the system bars and sheets, and ask the owner before any change that mimics glass in CSS (no change made here).
- **Dropped:** the reel's chat-naming and AI-workflow tips are not design; see `toogo-indie-launch`.
