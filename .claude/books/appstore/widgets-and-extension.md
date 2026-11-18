---
title: Widgets and share extension needs
chapter: native
explains:
  - pushWidgetData
  - widgetsOn
  - requestAddLink
  - hop
---
Both help the 4.2 "more than a website" case and both need the native build (Xcode, paid Apple account).

## Widgets
- Web side exists: `buildSnapshot` in `src/widgetSnapshot.ts` (today's stops, done flags), `pushWidgetData` and `clearWidgetData` in `src/widgetData.ts` (`widgetsOn`: iOS native only), synced by `src/views/WidgetSync.tsx`.
- Needs: a WidgetKit extension target and an app group to read the snapshot, in `ios/`. Whether it exists in the project: not checked. Idea in `docs/design-review.md` items 75-76: next stop today, days to the flight.
- Never show a real trip in widget screenshots (rule 11).

## Share extension
- Goal: Instagram or TikTok Share menu -> Toogo opens the add-place sheet with the link. Web side: `requestAddLink` and `takeSharedLink` in `src/quickAdd.ts`; flag `features.share_extension` (default true).
- Needs a new App Store build and an iOS Share Extension target. It still must end in swipe and match (rule 3): the link goes to AddPlace, not into the trip.
- Mention it in reviewer notes only once on.

## Other native needs
Haptics (a real plugin; `navigator.vibrate` does nothing on iOS), Apple rating prompt plugin, APNs push, background location (for "near a place"), photos and tiles served offline in the app (no service worker in Capacitor).

## Test
Simulator "Toogo Test" only, mock data (rule 11).

Related: [review-readiness](review-readiness.md).
