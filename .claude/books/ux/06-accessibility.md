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
Skills: `ui-sdk` ("name every control", style from state attributes, right to left without a provider, check colour in a real browser); `toogo-ux-ui-craft` ("Tap targets at least 44 pt"); `toogo-ux-audit` (contrast, tap size, controls and answers rows). Prefer ui-sdk components: Drawer, Dialog, AlertDialog, Tabs, Menu, Toast, Switch already give keyboard, focus and dismissal. A `div` with `role="dialog"`, `"menu"`, `"tablist"` etc. next to ui-sdk is almost always a bug (the hand-rolled match pop was one; now `Dialog`).

## Basics for every change
1. **Name:** every icon-only button has `aria-label` in the app's language (top-bar search, wand, avatar do). Decorative icons: `Icon` is `aria-hidden` unless given a `label`.
2. **Focus:** dialogs move focus in and return it (ui-sdk does); `:focus-visible` shows a 3 px accent ring (styles.css). Do not remove outlines.
3. **Targets:** at least 44 x 44 pt to tap, on a real phone. The visible part may be smaller: `src/styles/tap.css` grows the area with a transparent `::after` (segmented, Lists tabs, round icons, undo, offline-bar link, steppers, review close) and keeps 8 px between neighbours' visible parts. Any new small control gets a line there. Not covered today: `.pill` (32 px, used for the emergency call links in Essentials and the booking actions), plain `.chip`, the arrival summary (42 px).
4. **Contrast:** text 4.5:1, control edges and focus 3:1; check every colour pair in dark mode too. Never red-on-green alone to say state.
5. **State by more than colour:** a switch or toggle shows On/Off by thumb position *and* fill, and a word where space allows; selected chips and days are not told apart by colour alone (`toogo-ux-audit`, controls row).
6. **Text size:** layouts must survive larger system text and 320 px width (iPhone SE 1st-gen widths). Nothing is cut off at the biggest text size; price and credit screens keep amount, terms and button on one screen.
7. **Gestures need a button:** swipe-to-edit/delete rows need a visible edit/delete path too; a swipe delete is undoable.
8. **Language:** `<html lang>` follows the app language; mixed-script names get `dir="auto"` / `<bdi>`.
9. **Motion and haptics:** honour `prefers-reduced-motion` (see [05-motion-and-haptics](05-motion-and-haptics.md)); haptics never carry meaning alone.
10. **Status:** `role="status"` for the offline bar, `role="alert"` for load errors and crash screen. Inline errors are tied to their field.

## Known gaps (QA round, "Polish")
Edit/delete only by swipe in Lists, Baby, Essentials; `ShowFull` and Guide dialogs have no accessible name or focus handling; check buttons unnamed; calendar in Settings; push toggle fails silently; login carousel has no pause (WCAG A); Android back does not close the ui-sdk Menu or the + wheel; danger buttons not red; map guide button covered at 320x568; Lists tabs overflow at 320 px; swipe buttons under the tab bar on small phones; dark-mode contrast items in [01-tokens-and-type](01-tokens-and-type.md). From the 2026-11-27 audit: `.pill` targets, no pressed state on most small buttons (chapter 02), see `10-ux-debts.md`.

How to test: Playwright role queries by name (every control found by name is a pass); manual VoiceOver is not done anywhere yet.

Code: `.claude/books/frontend/13-ui-sdk-and-styles.md`.
