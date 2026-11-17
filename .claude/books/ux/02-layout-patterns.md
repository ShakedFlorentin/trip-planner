---
title: Layout patterns
chapter: foundations
explains:
  - Sheet
  - SheetHead
  - Tabs
  - UnderlineTabs
  - SwipeRow
  - PlaceHero
  - NextCard
  - StopItem
  - Field
  - WhoChips
---
## App frame
Slim top bar (44 px: search, the wand on Plan, the avatar opening the account sheet) with a large iOS title under it that collapses into the bar on scroll. Bottom tab bar, 50 px, five solid glyphs: Home, Discover, Plan, Bookings, Places; the active tab only changes colour. Money, lists, translator, baby live in the account sheet (decision 4). A floating + (QuickFab wheel) adds from anywhere. Toasts sit above the + row.

## Sheet (one shape)
Every secondary screen is a bottom sheet (`Sheet` in `src/ui.tsx`): grabber, centred title, close at the start, the action ("Save") at the end, drag down or Escape to dismiss. Edit sheets carry Cancel / Save in the title row like iOS. Long titles stack into a large-title header (`SheetHead`). Closing returns to the same page and scroll (decision 5). Places, plan items and bookings should open in the same shape.

## Rows and groups
Grey `--card` groups (`.card`) with rows of `--row-h` min 52. Avoid cards inside cards and borders on everything. Swipe rows (`SwipeRow`): swipe to edit or delete; a visible edit/delete path must also exist (accessibility). Chips for filters: neutral fill when selected, not red (decision 3). One filter everywhere for whose item: all, ours, each other couple, together (`WhoChips`, decision 7). Chip rows that cut off get a soft fade at the edge (decision 10, `src/fades.ts`).

## Plan timeline
Day strip (tabs) then a ui-sdk Timeline of stops with time, title, travel hop and navigate link; arrival card on landing day; "now" marker for today. Bookings are merged into the same timeline.

## Cards
Discover card: full photo (or icon tile when no good photo), title, verdict tags, vote faces; tap opens the full card. Home hero is a large tile in the city's colour with a countdown (decision 19). Last odd tile spans the full row (16).

## Buttons
`.primary` red capsule (one per screen), `.secondary` grey, `.danger` text red with an icon, `.link`. Min height 44. Pressed state scales to 0.97.

## Density
Calm at the top, denser as you scroll. A screen equally dense top to bottom is an "AI look" flag (`toogo-premium-feel` 4).

Code map: `.claude/books/frontend/13-ui-sdk-and-styles.md`, `07-views-home-plan.md`.
