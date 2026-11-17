---
title: Design tokens and type scale
chapter: foundations
explains:
  - Icon
  - Thumb
---
All tokens are CSS variables at the top of `src/styles.css` (`:root`, then a `prefers-color-scheme: dark` override). Look: Apple Music-like, content on a plain white or black page, soft grey tiles, one deep red. Toogo red `#bc002d` is for primary actions and state only (design decision 3: red marks the logo, the active tab, the + button and one main button per screen).

## Colour (semantic, never raw hex in a view)
`--bg --card --fill --text --muted --line` neutrals; `--accent` (text and icons; brighter `#ff4f6d` in dark so it reads on black), `--accent-fill` (solid red surfaces with `--on-accent` white text), `--accent-soft`; `--ok/--like` green, `--nope` red, `--warn` orange; `--control-edge` for input and control borders; `--scrim` behind sheets; `--glass-*` Liquid Glass for floating controls only, never content. System colours `--sys-*` exist for badges.

## Type ramp (one step per role)
`--fs-micro` 11, `--fs-caption` 12, `--fs-footnote` 13, `--fs-subhead` 15, `--fs-input` 16, `--fs-body` 17, `--fs-title` 20, `--fs-large` 28 (rem values in the file). Weights 400 / 600 / 700. Inputs are 16 px so iOS does not zoom on focus. Font is the system stack (SF Pro, SF Hebrew, Noto Sans Hebrew as fallback). Any new font must carry Hebrew glyphs. Big type is kept only on glance-at items (boarding-pass codes, the big title); everything else is calm and small.

## Space, radius, elevation, motion
- Spacing on a 4 px grid: `--s-1` 4, 2 = 8, 3 = 12, 4 = 16, 5 = 20, 6 = 24, 8 = 32. Off-scale padding is an "AI look" flag.
- Radii: `--r-xs` 8, `--r-sm` 12, `--r-md` 16, `--r-lg` 20, `--r-xl` 28, `--r-pill`. Buttons are pill capsules; inputs `--r-sm`.
- Elevation: `--elev-1..3`; in light mode cards use fill, not shadow (`--shadow: none`).
- Motion: `--ease` cubic-bezier(0.2, 0.9, 0.3, 1), `--dur-1` 0.12 s press, `--dur-2` 0.22 s, `--dur-3` 0.32 s. UI motion stays under 300 ms (see [05-motion-and-haptics](05-motion-and-haptics.md)).
- Sizes: `--tabbar-h` 50, `--top-h` 44, `--row-h` 52, icons `--icon-s` 18 / `--icon-m` 22, stroke `--icon-stroke` 1.75.

## Icons
One family: lucide through `Icon` (`src/icons.tsx`), stroke 1.75, outline idle and filled when selected for tab glyphs. No emoji as decoration or icons (design decisions use some in copy like a tick; keep them out of UI chrome). A place without a good photo keeps its icon tile (rule 5): `Thumb`.

## Dark mode
Every colour must be checked in both. Known: white tick on green about 2:1 (check, swipe ok cap), badge and delete caps 3.4:1, input borders about 1.8:1, switch off nearly invisible (QA). `color-scheme` is set per mode.

Where it is used in code: `.claude/books/frontend/13-ui-sdk-and-styles.md`.
