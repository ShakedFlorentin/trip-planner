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
Haptics exist: `src/haptics.ts` (`hapticLight`, `hapticSelect`, `hapticSuccess`; no-op on the web and under reduced motion; 23 call sites). `toogo-premium-feel` section 1 still says "not installed": the code wins, that skill line is stale. Android test build: translator mic dead, PDFs offline, `allowBackup`. See `toogo-premium-feel` section 1.

## Craft rules (`toogo-premium-feel`, `toogo-frontend-craft`)
- **Haptics:** light on swipe, select on tab and chips, success on match, never on scroll, never twice: `haptics.ts` already guards the web and reduced motion. Add new calls only through it.
- **16 px inputs** matter most in the WebView (focus zoom). `styles.css` sets 16px on all fields; `.invite-link input` overrides it to 13px (see [15-craft-gaps](15-craft-gaps.md)).
- **Right keyboard per field:** `inputmode="decimal"` is on Expenses amounts; URL fields use `type="url"`. Check `autoComplete` on `Login` and `Onboarding` fields (6 of 9 inputs have it).
- **Share extension, quick actions:** a failed handoff must show a plain line, not stay silent.
- **Judge on a real phone:** the web version on phones is what the owner uses; haptics, zoom and safe areas cannot be checked in a browser.
