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

## Added 2026-11-16 from @theglidestudio (captions read)
- **Responding at once is the feel** (https://www.instagram.com/theglidestudio/reel/Dfy7ig_B-FL/): a screen that responds immediately feels like a team that responds. Every tap gets feedback within one frame (press state, haptic), and slow data shows a skeleton, not a spinner on white.
- **Motion carries the brand** (https://www.instagram.com/theglidestudio/reel/Dfzkwu3hSj5/): the same logo drawn slowly feels calm, snapped together feels quick, grown from a dot feels friendly. Pick one motion personality for Toogo (calm, friendly) and use it for the splash, the match pop and sheet transitions, one curve and duration family. Decision on the personality is the owner's.
- **Layout says "safe" before copy does** (https://www.instagram.com/theglidestudio/reel/DfyFShTounu/): same words, calmer spacing and alignment read as more trustworthy. Add to the AI-look audit: margins and alignment consistent on every screen, in Hebrew and in English mirrored.

## Added 2026-11-16 from @charles.unemployed (captions read; video text NOT read, sign-up overlay)
Web/UI design rules aimed at AI-built interfaces. Toogo is web in a WebView, so the CSS applies directly. Check each one on Hebrew (RTL) and English.
- **CSS rules block** (https://www.instagram.com/charles.unemployed/reel/DfxOhZmyLXz/): nested rounded corners, inner radius = outer radius minus padding; borders as alpha colours (`rgb(0 0 0 / 0.12)`) not solid hex; palettes in OKLCH and gradients written `in oklch` so they do not go grey in the middle; icon stroke width matches the text weight beside it; fade carousel edges with a mask (check mirrored in RTL); blur the outgoing icon on icon swaps; dark mode shows depth with lighter surfaces, not shadows; `100dvh` not `100vh` (repo already uses `100dvh`, no `100vh`); `mix-blend-mode: multiply` for product shots on white. Add the radius and stroke-weight checks to the AI-look audit.
- **Motion budget** (https://www.instagram.com/charles.unemployed/reel/DfphRvFBx54/): UI animation under 300 ms, slow in and slow out (never constant speed), a small wind-up before a big move, follow-through that settles, curves not straight lines; and "frequency of use: the more often used, the less it should animate". So the swipe and the match pop may be rich; tab switches, taps on list rows and toggles stay near-silent.
- **Targets and choices** (same reel): Fitts, bigger and closer targets are faster, so hit areas can be larger than they look (swipe and match buttons, back, close); Hick, fewer choices per screen; Miller, about seven items, chunk lists; Doherty, respond within 400 ms; Jakob, behave like the iPhone apps people know (standard sheets, back swipe).
- **Accent goes on what the screen is about** (https://www.instagram.com/charles.unemployed/reel/DfsTwyAxO_N/, https://www.instagram.com/charles.unemployed/reel/DfpgMtHhyNA/, caption lines only): one accent colour, used on the primary action or result, not on decoration, and chosen for fit, not liking. Never use it to push a credits purchase harder (toogo-rules 7).
- **Fonts:** his "looks AI-made" list (Inter, Roboto, Space Grotesk, Geist and similar, https://www.instagram.com/charles.unemployed/reel/DfsT4vkRM9H/, https://www.instagram.com/charles.unemployed/reel/DfuhpYpxM96/) is Latin-only and mostly paid alternatives. Toogo uses system fonts incl. SF Hebrew and Noto Sans Hebrew: keep them. Any new display font must carry Hebrew glyphs and be shown in both languages first; owner decides.
- **Not adopted:** "comment a word to get the skill" DM funnel (engagement gate).
