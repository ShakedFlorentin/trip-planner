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
Sources: `toogo-ux-ui-craft` ("One primary action per screen", "Main action at the bottom", "A button has six states", "Space before colour", "Hick and progressive disclosure", "Break tests"), `toogo-ux-audit` (one job, answers rows).

## App frame
Slim top bar (44 px: search, the wand on Plan, the avatar opening the account sheet) with a large iOS title under it that collapses into the bar on scroll. Bottom tab bar, 50 px, five solid glyphs: Home, Discover, Plan, Bookings, Places; the active tab only changes colour. Money, lists, translator, baby live in the account sheet (decision 4). A floating + (QuickFab wheel) adds from anywhere. Toasts sit above the + row.

## One job, one primary action
Each screen and sheet has one job and one red `.primary`. Ask "can they finish this without thinking twice?" Fewer choices per screen; advanced planner settings go behind an expand, never a main feature (Hick). The main action sits at the bottom within thumb reach, in RTL too.

## Sheet (one shape)
Every secondary screen is a bottom sheet (`Sheet` in `src/ui.tsx`): grabber, centred title, close at the start, the action ("Save") at the end, drag down or Escape to dismiss. Edit sheets carry Cancel / Save in the title row like iOS. Long titles stack into a large-title header (`SheetHead`). Closing returns to the same page and scroll (decision 5). Places, plan items and bookings should open in the same shape. The close control is always visible.

## Rows and groups
Grey `--card` groups (`.card`) with rows of `--row-h` min 52. Avoid cards inside cards and borders on everything. Swipe rows (`SwipeRow`): swipe to edit or delete; a visible edit/delete path must also exist, and a swipe delete is undoable. Chips for filters: neutral fill when selected, not red (decision 3). One filter everywhere for whose item: all, ours, each other couple, together (`WhoChips`, decision 7). Chip rows that cut off get a soft fade at the edge (decision 10, `src/fades.ts`). A whole card may be tappable, but a scroll or swipe must never open it.
- Reorder (idea): one "Reorder" button opening its own sheet, ending with "Done" and a toast, beats drag handles on every row; drag direction mirrors in RTL.

## Plan timeline
Day strip (tabs) then a ui-sdk Timeline of stops with time, title, travel hop and navigate link; arrival card on landing day; "now" marker for today. Bookings are merged into the same timeline. Its loading skeleton must have the same shape (chapter 04).

## Cards
Discover card: full photo (or icon tile when no good photo), title, verdict tags, vote faces; tap opens the full card. Big photos get a gradient under white text, only for photos that pass rule 5. Home hero is a large tile in the city's colour with a countdown (decision 19). Last odd tile spans the full row (16).

## Buttons (six states)
`.primary` red capsule (one per screen), `.secondary` grey, `.danger` text red with an icon, `.link`, `.pill`, `.chip`, icon buttons. Visible size may be small; the tap area is at least 44 (chapter 06). Every button needs six states: default, hover (mouse only), focus ring, pressed, loading inside the button, disabled.
- *Changed:* this chapter said "Pressed state scales to 0.97" for all buttons. True only for `.primary`/`.secondary`; `.pill`, `.chip`, `.link` and icon buttons have no pressed state (debt).
- Loading: the button keeps its place and shows a spinner or "Saving…"; it cannot be tapped twice. Money buttons say "Processing…".
- Disabled only when the missing thing is visible on the same screen (Previous on step 1). Otherwise keep it enabled and on tap scroll to the red field with its message (`toogo-ux-ui-craft` house decision).
- Destructive answers look different from the safe one and ask once (Keep / Delete); closing an unsaved form asks (Keep editing / Discard).

## Density and space
Calm at the top, denser as you scroll. A screen equally dense top to bottom is an "AI look" flag (`toogo-premium-feel` 4). A cramped screen is fixed by padding, line height and section gaps before any colour change.

## Break tests for any new screen
Delete asks first; unsaved close asks; back keeps your place in the list; a new item is shown, not just "Saved"; a pasted messy amount is understood. Code side: `toogo-frontend-craft`.

Code map: `.claude/books/frontend/13-ui-sdk-and-styles.md`, `07-views-home-plan.md`.
