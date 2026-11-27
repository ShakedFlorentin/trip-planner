---
name: toogo-frontend-craft
description: The frontend craft rulebook for Toogo, taught from creators' reels and checked against the house rules - React, CSS in a Capacitor WebView, performance, offline, accessibility in code, animation code. Use when building or reviewing any Toogo frontend code.
---

# Frontend craft (Toogo)

Short rules taught by the teacher agent from creators' reels, each with a why and its source. `toogo-rules` wins over anything here. Toogo is React 19 + Vite + TypeScript in a Capacitor WebView, with `@ui-sdk/react` installed and used: prefer its components. Hebrew RTL first, English LTR: check every rule mirrored. Numbers are the creators' claims. Look and flow rules live in `toogo-ux-ui-craft`; this file is the code side.

## CSS

- **Inner radius = outer radius minus padding.** Why: nested corners with equal radii look off. Source: @charles.unemployed https://www.instagram.com/charles.unemployed/reel/DfxOhZmyLXz/
- **Borders as alpha colours** (`rgb(0 0 0 / 0.12)`), not solid hex. Why: they adapt to any surface, light or dark. Same reel.
- **OKLCH for palettes, gradients written `in oklch`.** Why: no grey dead zone in the middle. Repo has no `oklch(` or `hsl(` today; adopt for new tokens only. Same reel.
- **`100dvh`, never `100vh`.** Why: the iOS toolbar. Repo already complies (checked 2026-11-16). Same reel.
- **Fade scrolling edges with a mask**, not an overlay div. Mirror the mask in RTL. Same reel.
- **Dark mode: depth from lighter surfaces, not shadows.** Same reel.
- **`mix-blend-mode: multiply`** for product-style images on white. Same reel.
- **Icon stroke width matches the text weight beside it**; blur the outgoing icon on a swap. Same reel.
- **Tabular figures** (`font-variant-numeric: tabular-nums`) for prices, times, counters. Why: digits stop shifting. https://www.instagram.com/reel/DdtlmICKd8p/
- **Keep decorative DOM light:** one element with `clip-path`, mask or gradients beats stacks of wrapper divs, above all in the swipe stack. Measure on a real device before claiming a gain (her claim). @aniakubow https://www.instagram.com/aniakubow/reel/DfE208excKT/
- **Check browser support before new CSS** (anchor positioning, `sibling-index()`): find the lowest iOS Safari/WebView Toogo supports first. She always states Baseline status; copy that habit. https://www.instagram.com/reel/DdrMjrwK7IR/
- **Fonts:** system fonts incl. SF Hebrew and Noto Sans Hebrew stay. Any new font must carry Hebrew glyphs; the "AI-look" font lists are Latin-only and paid. https://www.instagram.com/charles.unemployed/reel/DfsT4vkRM9H/
- Material 3 Expressive shapes, wavy progress and button groups are an Android look: not adopted (iPhone app).

## Animation code

- **Budget:** UI motion under 300 ms; slow in, slow out, never constant speed; a small wind-up and a settle for big moves. Why: feels physical, not mechanical. https://www.instagram.com/charles.unemployed/reel/DfphRvFBx54/
- **Frequency of use decides richness:** swipe and match pop may be rich; tabs, list rows and toggles stay near-silent. Same reel.
- **A press answers in about a blink, a reveal takes under 1 s** (their claim). https://www.instagram.com/reel/Dfvja0XCyIi/
- **Respond within 400 ms (Doherty) or show a skeleton.** Same reel as the budget.
- **Shared-element transition:** the tapped card becomes the detail sheet, back reverses it; popups grow from the thing tapped (origin-aware), mirrored in RTL. https://www.instagram.com/reel/DfwhC1riuuO/ and https://www.instagram.com/p/DffBKUZhy6B/
- **Reuse `src/spring.ts`** before adding a library (see `toogo-premium-feel` section 2).
- **Ambient motion (moving blurred blobs) only on login/onboarding hero,** never on list, map or swipe screens; needs `prefers-reduced-motion` and a phone test. Why: blur plus animation drains battery in a WebView. https://www.instagram.com/aniakubow/reel/DfP8Z0ARCqY/ (owner decides).
- **Small controls get a pressed state, a settle and a haptic at the commit point;** toggle thumb, slider fill and progress direction mirror in RTL. https://www.instagram.com/aniakubow/reel/Dfhr3ySRqzw/
- Haptics: `@capacitor/haptics` is not installed; one no-op-on-web wrapper in `src/native.ts` (details in `toogo-premium-feel` section 1).

## State, offline and speed

- **Optimistic update:** show the result at once (swipe, match, tick an expense), sync in the background, and give a clear failed state. Why: instant feel; matches the offline queue. https://www.instagram.com/p/DffBKUZhy6B/
- **Reserve space; skeletons not spinners.** Show the screen's shape at once and fill in order (Home, Discover, trip list). Why: the same wait feels shorter. @theglidestudio https://www.instagram.com/theglidestudio/reel/DfyconoB6sG/
- **Designed waiting states** (booking-import check, planner run, link fetch, offline queue): progress or skeleton plus one sentence, Hebrew and English. https://www.instagram.com/aniakubow/reel/DfUzxobxFfa/
- **Human in the loop:** code that suggests changes must ask before changing; the planner never touches bookings or expenses. https://www.instagram.com/p/DffBKUZhy6B/
- **Postel:** accept messy input (dates, place names, pasted links) and return it clean.
- **Warm the next day before it starts:** on good Wi-Fi save the next trip day's plan, maps and card photos on the phone. Why: instant open in Japan on a weak signal. Plain code, no AI (idea from @ayoships, TikTok keep-warm; owner chooses). `docs/ayoships-reels-2026-11-12.md`
- **Time on each card as a ranking signal** (long look before "no" still means interest): extra field next to `learnTags` in `src/rank.ts`; stays on the phone. Idea, needs code, owner chooses.

## Forms and input

- **Reward early, punish late:** show progress while typing, hold errors until the field is left; chunk long strings into groups. https://www.instagram.com/charles.unemployed/reel/Dfm33XyhRN3/ Wording in both languages.
- **Recognition over recall:** a few tappable prompts instead of an empty field (add-a-place from a link, trip search). https://www.instagram.com/p/DffBKUZhy6B/

## Accessibility and targets

- **Hit areas bigger than they look** (Fitts): swipe and match buttons, back, close. Same reel as the budget.
- **Respect `prefers-reduced-motion` and the system haptics setting.**

## Do not

- Build a path that puts a place in a trip without swipe and match (rule 3), even in a demo.
- Ship a home-made star box before Apple's rating prompt (Apple disallows it; `src/rating.ts` does it the allowed way).
- Add tracking by Wi-Fi, per-user models or anything that runs an LLM per view (rule 2).

## Pointers

`toogo-premium-feel` (haptics, feedback levels, AI-look audit), `toogo-first-run` (onboarding code), `toogo-ship-check` (the checks before done).

## Frames read

Seen in video frames, 2026-11-16 (creators' demos, not tested in Toogo).
- **A row of options that appear one after another** (FAB menu, share sheet): `@starting-style` gives the start values and `transition-behavior: allow-discrete` lets `display: none` to `block` animate; stagger with `transition-delay: calc(var(--i) * 60ms)`. Why: no JS timers. Needs Safari 17.5+: check the lowest iOS WebView first, fall back to no animation. https://www.instagram.com/reel/DfAOZLNoVVV/ (@aniakubow)
- **Rolling digits for a price or count change**: each digit is a 0-9 column of height `1lh` behind an `overflow: hidden` window; set `translate: 0 calc(var(--d) * -1lh)` and flip the variable with `:has(#yearly:checked)`. Use a `linear()` spring easing (overshoot about 16%, one dip) instead of a plain ease. Why: the number feels physical. Toogo use: trip cost totals, currency switch. https://www.instagram.com/reel/DdtlmICKd8p/ (@aniakubow)
- **Slider built on a real `<input type=range>`**: one CSS variable `--v` drives three pieces (active track, handle, inactive track) with a 6px gap either side of the handle and a small stop dot; the handle narrows while pressed. Why: custom look, free keyboard and screen-reader support. https://www.instagram.com/reel/Dfhr3ySRqzw/ (@aniakubow)
- **Sliding highlight under nav items** via CSS anchor positioning (`anchor-name`, `position-anchor`, `transition: inset .4s`). Safari 26 only: ship it as an enhancement behind `@supports`, never the only indicator. https://www.instagram.com/reel/DdrMjrwK7IR/ (@aniakubow)
- **Liquid-glass look** (SVG `feTurbulence` plus `feDisplacementMap` in `backdrop-filter: url(#id)`) works in Chromium only, not iOS Safari. Do not build it for the WebView; a plain `blur() saturate(180%)` panel with an inset 1px highlight is the safe version. https://www.instagram.com/reel/DcwFH02NF3i/ (@aniakubow)
- **Ten small CSS rules in one list** (concentric radius, alpha borders, OKLCH, masked edges, `dvh` heroes, `mix-blend-mode: multiply` for white-background photos): details already in the rules above and in `toogo-premium-feel`; new here: alpha borders (`border-color` as a low-opacity white/black, not a fixed grey) so a card border stays visible on any card colour, and `multiply` to drop a white product-photo background onto a tinted card. https://www.instagram.com/reel/DfxOhZmyLXz/ (@charles.unemployed; the code chips are shown too briefly to copy exactly, test before use)

## Added 2026-11-26 from @ceciliakimdesign (captions only; her claims)
- **Pre-beta break test** (fake data, "Toogo Test" only, rule 11): double-tap Save saves once; paste and accidental delete behave; swipe-closed form keeps a draft; offline save says whether it saved; editing a booking or expense updates every total; the keyboard never covers Save or the field (check in Hebrew RTL too); money typed messy ("1,200") does not crash. Why: first failure is where people quit. https://www.instagram.com/ceciliakimdesign/reel/De2FkoNo88G/ (slides read 2026-11-26, see below) and https://www.instagram.com/ceciliakimdesign/reel/DeCl4Ynyl68/
- **Judge on a real phone** (Toogo runs as a web version on phones): tap size, text at arm's length and at the largest text size, haptics (Simulator has none), real speed, animations you will see daily. Figma and static screens hide all of these. https://www.instagram.com/ceciliakimdesign/reel/DeIDpsZycU4/ , https://www.instagram.com/ceciliakimdesign/reel/DcKXM4YNA34/ , https://www.instagram.com/ceciliakimdesign/reel/DXsKlGJEezZ/
- **Right keyboard per field** (numeric, URL, email) and a review step before saving. Ideas (owner): draft kept on close, hide-amounts toggle.

### Watched by frame 2026-11-26 (@ceciliakimdesign; SwiftUI shown on screen, translated to Toogo's CSS; her claims, test on a phone)
- **Tinted shadow:** SwiftUI `.shadow(color: brand.opacity(0.24), radius: 12, y: 4)` becomes roughly `box-shadow: 0 4px 16px rgb(188 0 45 / 0.24)` on the red `--accent` button. Toogo's `--elev-1..3` are black `rgba(0,0,0,…)`; a tinted variant is a token change for the owner to decide. In dark mode keep depth from lighter surfaces (rule above). https://www.instagram.com/ceciliakimdesign/reel/DeCl4Ynyl68/
- **Keyboards:** `.keyboardType(.decimalPad)` becomes `inputmode="decimal"` on amount fields (only `Expenses.tsx` uses `inputMode` today); URL fields get `inputmode="url"` and `type="url"`. Same reel.
- **Accept a pasted amount:** "1,250.50 " with a trailing space must be read as 1250.50, not rejected as "Invalid amount". Trim the value, strip thousands separators (`,` and Hebrew-locale ones too), then parse. https://www.instagram.com/ceciliakimdesign/p/De2FkoNo88G/ (slides read)
- **The other four break tests on those slides** (her "after" each time):
  - Delete asks first: `Delete "Website project"?` with Keep and Delete.
  - Swiping an unsaved form closed asks "Discard changes?" with Keep editing and Discard.
  - Back from a detail returns to the same scroll position in the list.
  - After saving, the new item is visible and confirmed ("Done"), not just a "Saved" toast that leaves you to hunt for it.
  Hebrew and English strings for each (rule 1).
- **Rolling numbers in about 0.2 s** (SwiftUI `.contentTransition(.numericText(countsDown:))`): use the CSS rolling-digit columns under "Frames read" above with `--dur-2` (0.22s). Add `tabular-nums` and a no-motion fallback. https://www.instagram.com/ceciliakimdesign/reel/Dd9unmGyVmp/
- **Reduce Motion stills ambient motion:** under `@media (prefers-reduced-motion: reduce)`, the moving background stops and shows its first frame. She drew hers with a Metal shader (water and `grainAmount` film grain). In the WebView, a still grain image (an SVG `feTurbulence` noise as a background image, drawn once) is the cheap version. A live canvas loop is not, because of battery. Same reel.
- **Hide amounts** (SwiftUI `.privacySensitive()`): one state flag on the trip that renders amounts as `••••` (not a CSS blur that screenshots can undo), plus a toast. Idea for the owner. https://www.instagram.com/ceciliakimdesign/reel/DeCl4Ynyl68/

## Added 2026-11-27 from @aniakubow (816 posts, captions; code mostly on screen, so check before use), @synsation_ (frames), @kunaluxui
Toogo already has `<bdi>` (13 files), `accent-color`, `text-wrap`, reduced-motion and `color-scheme` in `src`; the rest are gaps to check. Links https://www.instagram.com/reel/<code>/.
- **Mixed Hebrew and English strings:** wrap embedded opposite-direction text (English or Japanese place names in Hebrew lines) in `<bdi>`; keep strings in i18n files, not concatenated. DF5buvPTZVW, C_QZ8U_yAqL, DC1yXV2z0iL. Japanese vertical text `writing-mode` and `<ruby>` only if the owner wants furigana: DEu0GMDT_rT, DBgr6DZAtJD.
- **iOS WebView gotchas:** the input-focus zoom (DavJDLpMGBH: the usual fix is input font size of 16px or more; her on-screen line was not read, test on a phone); `dvh` not `vh` (already done, C9KvHHISSzA); reduced motion (DaneS6rs4EM).
- **Brand the native controls in one line each:** `accent-color` (checkbox, radio, progress; DZm_leNMxif), `::selection` (none in `src`; DZvDt8cN5cA), `caret-color` (DNx-bcx2BSM), `color-mix()` instead of JS colour mixing (DbD3Qs2sHg6), `light-dark()` for one-source light and dark (DEfUPfBzzyl). `contrast-color()` (DZ5LRqNNsGP) is new: check the lowest iOS WebView first.
- **Native HTML before custom JS:** `<details>` and `<details name>` for accordions (DL7WxFBzti7, DExLeC9zZ3f), the Popover API (C-sj2VGS0O8), `scroll-snap` (DD7CSGqTrY_), `scroll-padding` (DEUvBaozBqy), `:focus-within` (DbTQVwqsOHr), `<meter>`/`<progress>` for semantics (C_S9Y7GyRfo), `autocomplete` and `inputmode` on forms (DMF1RR1Tgww). Check each against the lowest iOS Safari first; anchor positioning, `if()`, scroll timelines are newer (C--lRNESSK6, DbJB2fjsB46, DbV49H8Mc3D).
- **Headings:** `text-wrap: balance` for titles, `pretty` for body (DEkfrggzzX9); test Hebrew.
- **Photos (place cards):** `fetchpriority="high"` on the first card's image (none in `src`; Dak8KUvM9gg), `<picture>`/`srcset` for smaller phone images (DMh9YpETdPh), `object-fit` and `object-position` to avoid stretched images (DM79yLqzF5I), keep media light (DGf8c3vz9Fo). Only photos that pass rule 5.
- **Glass in 4 steps:** translucent background, `backdrop-filter: blur() brightness() saturate()`, 1px border (DNicIKjT6j2); use sparingly, measure on a phone.
- **Per-section loading and errors:** each section owns its fetch, its error and a Retry; one failed tile never blanks the page (`@synsation_` DZIHbbIt5mc). Idea: an error-boundary wrapper per tile; owner decides.
- **Optimistic update with rollback** for swipe, match and save: the heart fills at once, the count rolls back on failure (DYcbCoiIKK1).
- **Tap vs swipe:** set a movement threshold so a swipe or scroll never opens the card (Dc2Z_OyBWtc); hit area 44 pt via padding, not a bigger icon.
- **Buttons:** loading spinner inside the button and `aria-busy`; focus ring kept for VoiceOver and keyboard (DcjkR2PSkml).
- **Success pulse and micro-interactions:** a short confetti or pulse on match only (DgIeEggCaIy idea; frames not read); loading dots and pulsing glow are CSS only (DFK2fD6z2OJ, DEiKUqTzuSU), pause under reduced motion.
- **Not for Toogo:** Pinterest masonry (Safari-only experiment), custom cursors, mix-blend overlays, typewriter and metaball effects (no use, battery), 3D CSS scenes. Her glass reel is a repost of an earlier rule.
