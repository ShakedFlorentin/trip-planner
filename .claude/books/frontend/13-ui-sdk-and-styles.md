---
title: ui.tsx, ui-sdk, styles and tokens, ErrorBoundary
chapter: building-blocks
explains:
  - Sheet
  - SheetHead
  - Field
  - Empty
  - Skeleton
  - EmptyState
  - Tabs
  - useRemembered
  - LoadNote
  - say
  - ask
  - askDelete
  - OverlayLayer
  - Icon
  - springTo
  - reducedMotion
  - ErrorBoundary
  - Loading
  - RingsIcon
  - Thumb
---
Skill to read first: `.claude/skills/ui-sdk/SKILL.md`. `@ui-sdk/react` 0.1.0-beta.1 on React 19.2.9. Import from entries (`@ui-sdk/react/drawer`), never a root import; style from `data-slot` / state attributes; name every control; `@layer ui-sdk;` is the first line of `src/styles.css`.

## Shared pieces (`src/ui.tsx`)
- `Sheet`: bottom sheet on ui-sdk `Drawer` (grabber, drag to dismiss, Escape, scroll lock, focus return). Props `title`, `onClose`, `action` (the save button in the title row), `closeLabel`, `tall`. Mounts closed, opens on next frame so it slides. It stops pointer events so a sheet opened from a swipe card does not swipe it. `SheetHead` switches to a stacked large-title layout when the title is too long. Rule: one sheet shape for places, plan items, bookings (`toogo-premium-feel` 6).
- `Tabs`: chip tabs on ui-sdk Tabs. `Field`, `Empty` (plain line), `EmptyState` (icon, bold title, line, one button), `Skeleton`, `LoadNote` (refresh failed, rows stay), `useRemembered` (localStorage-backed state).
- `src/toast.tsx`: `say(msg, {undo, error, duration})` toast; `ask`/`askDelete` iOS-style confirm (ui-sdk AlertDialog); `OverlayLayer` mounted once in App.
- `src/icons.tsx`: `Icon` wraps lucide at stroke 1.75, decorative unless `label`; category maps (`CATEGORY_ICON`, `CARD_ICON`). No emoji as icons.
- ui-sdk entries in use: tabs, menu, drawer, checkbox, toggle, toast, timeline, segmented-control, collapsible, toolbar, switch, select, radio, overlays, meter, dialog, alert-dialog, avatar. Hand-rolled `role=` widgets next to these are a bug.

## Styles
`styles.css` (global tokens + base) then per-area files in `src/styles/` imported by their views; `ltr.css` (mirror) and `ux.css` (toast, confirm, offline bar) load after it from `main.tsx`. Tokens are CSS variables in `:root` with a `prefers-color-scheme: dark` override: colours (`--bg --card --text --muted --line --accent --ok`), type ramp (`--fs-micro` to `--fs-large`), radii (`--r-*`), 4 px spacing (`--s-1`..`--s-8`), motion (`--ease`, `--dur-1..3`). Details and rules: `.claude/books/ux` tokens page. Motion: `src/spring.ts` (`springTo`, `reducedMotion`) before adding a library.

## Loading and crash
`Loading` / `RingsIcon` (`src/rings.tsx`) is the boot screen. `ErrorBoundary` (`src/ErrorBoundary.tsx`) wraps App in `main.tsx`: a render error shows a plain "something went wrong" screen with a reload button (inline styles on purpose: it must work even if styles fail) and counts only the error class via `track('render_error')`, never the message. Unsent changes stay in the outbox. It does not catch async errors or event-handler errors.

Related: [05-i18n](05-i18n.md), [14-testing-and-ship-check](14-testing-and-ship-check.md).

## Craft rules (`toogo-frontend-craft` CSS and animation)
- **Inline styles:** ui-sdk says state from attributes, not inline styles. `ErrorBoundary` is the one allowed exception (it must work with no CSS); `AreaMap` tiles use inline transforms for positions, not state.
- **Borders and colours:** tokens are rgb/hex; new tokens use alpha borders (`rgb(0 0 0 / .12)`) and `color-mix` (already used 39 times) or OKLCH. `accent-color` is set (4 uses); no `::selection` or `caret-color` yet (low).
- **Radius:** inner = outer minus padding; use `--r-*` tokens and check nested cards.
- **Shadows:** `--elev-*` are black; a tinted brand shadow is a token change for the owner. In dark mode use lighter surfaces.
- **Motion budget:** `--dur-1` .12, `--dur-2` .22, `--dur-3` .32 s; rare reveals up to ~.4 s (`match-in` .42, `guide-up` .45). 26 `@keyframes`, 19 `prefers-reduced-motion` blocks: every new infinite animation (skeleton, spinner, pulse) needs its reduced-motion line. JS motion goes through `springTo` / `reducedMotion()`.
- **Skeleton:** `Skeleton` shapes (`rows`, `hero`, `card`, `deck`) match real layouts, with a slow shimmer; do not use it where the layout is unknown (small spinner then).
- **Buttons:** pressed state, loading inside the button and `aria-busy`. Only `SignOutSheet` and `AddPlace` Steps set `aria-busy`; the primary save buttons do not.
- **Inputs:** 16 px floor is set in `styles.css` (`input, select, textarea`); any override below it brings back the iOS focus zoom.
- **Type:** no added letter-spacing on Hebrew (see [05-i18n](05-i18n.md)); `text-wrap` (6 uses): test Hebrew.
- **Error boundary:** per-tile boundaries are a rule idea, not built; one global boundary only.
