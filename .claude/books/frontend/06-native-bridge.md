---
title: Native bridge (Capacitor, iOS)
chapter: native
explains:
  - isNative
  - appUrl
  - openExternal
  - privacyUrl
  - endLaunch
  - takeShared
  - takeAction
  - widgetsOn
  - pushWidgetData
  - clearWidgetData
  - WidgetSync
  - buildSnapshot
  - requestAdd
  - requestAddLink
  - requestGo
  - useQuickAddRoute
  - useGoRoute
  - pushState
  - enablePush
---
The iOS app is the same web build (`dist`) served from inside the app (`capacitor.config.ts`, appId in the config). All native touch points are in `src/native.ts`, `src/widgetData.ts`, `src/push.ts`, `src/rating.ts`; Swift sides are in `ios/App/App/` (ShareInbox, QuickAction, WidgetData, AppReview) plus `ios/App/ToogoShare`, `ios/App/ToogoWidget`.

## native.ts
- `isNative` = `Capacitor.isNativePlatform()`. Branch on it, never on user agent. There is no `isIos` export: widgets use `widgetsOn` (native and platform ios); push.ts has a private `ios()` user-agent check for the home-screen rule.
- `appUrl()`: inside the app the page is `capacitor://localhost`, so links sent to others use the website base (`SITE`). Use `appUrl()` for invite, share and reset links; `privacyUrl()` for the privacy page.
- `openExternal(href)`: Browser sheet in the app, new tab on the web; counts `link_out` by host. A global click handler sends every `<a target=_blank>` to the Safari sheet, and Google Maps links to the Maps app when installed (`openMaps`).
- `navigator.share` is replaced by the iOS share sheet; cancel becomes `AbortError`.
- `Keyboard` accessory bar hidden. `endLaunch()` hides the splash only after the page painted the same rings (`index.html #intro`).
- Share extension: Instagram/TikTok/Maps link arrives through plugin `ShareInbox`; `takeShared` calls `requestAddLink` (opens AddPlace filled). Switch: `features.share_extension`.
- Quick actions, widget taps, Siri: plugin `QuickAction`; `takeAction` calls `requestAdd('expense')` or `requestGo('translate' | 'plan')`. `TripApp` listens through `useQuickAddRoute` / `useGoRoute` (`src/quickAdd.ts`, a tiny event bus with a pending slot so a request made before the screen mounts is not lost).

## Widgets
`WidgetSync` (mounted only when `widgetsOn`) renders nothing: it builds `buildSnapshot` (`src/widgetSnapshot.ts`, pure, tested) from day_info, itinerary_items and bookings, and `pushWidgetData` writes it to the shared App Group through the `WidgetData` plugin; identical JSON is not resent. `clearWidgetData` on sign-out / leaving a trip. Tokyo date rolls over via a 5-minute tick. Test: `npm run test:widget`.

## Web-only things that are off in the app
Service worker and update reload (see [04-service-worker-updates](04-service-worker-updates.md)); web push (`pushState` returns 'unsupported' when `isNative`); the Google button (`App.tsx` passes `google={features.google_signin && !isNative}`).

## Auth links
Password reset emails use `appUrl() + '?reset=1'`; the reset screen opens only on the `PASSWORD_RECOVERY` event (see [01-app-shell](01-app-shell.md)). The iOS Info.plist registers the `toogo://` scheme. No JS handler for a custom-scheme auth callback exists in `src/` (checked by search), so how email tokens return into the app is not documented here; QA flagged a `toogo://` hijack on Android.

## Gaps
No haptics (`@capacitor/haptics` not installed). Android test build: translator mic dead, PDFs offline, `allowBackup`. See `toogo-premium-feel` section 1.
