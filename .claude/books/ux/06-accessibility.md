---
title: Accessibility basics
chapter: patterns
explains:
  - Sheet
  - MatchPop
  - ShowFull
  - SwipeRow
  - Tabs
  - Icon
---
Skill: `ui-sdk` ("name every control", style from state attributes, right to left without a provider, check colour in a real browser). Prefer ui-sdk components: Drawer, Dialog, AlertDialog, Tabs, Menu, Toast, Switch already give keyboard, focus and dismissal. A `div` with `role="dialog"`, `"menu"`, `"tablist"` etc. next to ui-sdk is almost always a bug (the hand-rolled match pop was one; now `Dialog`).

## Basics for every change
1. **Name:** every icon-only button has `aria-label` in the app's language (top-bar search, wand, avatar do). Decorative icons: `Icon` is `aria-hidden` unless given a `label`.
2. **Focus:** dialogs move focus in and return it (ui-sdk does); `:focus-visible` shows a 3 px accent ring (styles.css). Do not remove outlines.
3. **Targets:** at least 44 x 44 pt; inputs 44 min height, buttons 44. Hit area may exceed the visible icon (back, close, swipe and match buttons).
4. **Contrast:** text 4.5:1, control edges and focus 3:1; check dark mode too. Never red-on-green alone to say state.
5. **Text size:** layouts must survive larger system text and 320 px width (iPhone SE 1st-gen widths).
6. **Gestures need a button:** swipe-to-edit/delete rows need a visible edit/delete path too.
7. **Language:** `<html lang>` follows the app language; mixed-script names get `dir="auto"` / `<bdi>`.
8. **Motion:** honour `prefers-reduced-motion` (see [05-motion-and-haptics](05-motion-and-haptics.md)).
9. **Status:** `role="status"` for the offline bar, `role="alert"` for load errors and crash screen.

## Known gaps (QA round, "Polish")
Edit/delete only by swipe in Lists, Baby, Essentials; `ShowFull` and Guide dialogs have no accessible name or focus handling; check buttons unnamed; calendar in Settings; push toggle fails silently; login carousel has no pause (WCAG A); Android back does not close the ui-sdk Menu or the + wheel; danger buttons not red; map guide button covered at 320x568; Lists tabs overflow at 320 px; swipe buttons under the tab bar on small phones; dark-mode contrast items in [01-tokens-and-type](01-tokens-and-type.md).

How to test: Playwright role queries by name (every control found by name is a pass); manual VoiceOver is not done anywhere yet.

Code: `.claude/books/frontend/13-ui-sdk-and-styles.md`.
