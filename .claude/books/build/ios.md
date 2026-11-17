---
title: iOS app
chapter: native
explains:
  - isNative
---
**Config**: `capacitor.config.ts`: appId `com.shakedflorentin.tripplanner`, appName Toogo, `webDir: 'dist'`, splash stays until the page has drawn (`launchAutoHide: false`), Keyboard `resize: 'native'`, iOS `contentInset: 'never'` (the page handles notch and home bar with `env(safe-area-inset-*)`).
**Project**: `ios/App/App.xcodeproj` (Xcode), Swift Package Manager (`ios/App/CapApp-SPM`), no CocoaPods. Targets: `App` (`AppDelegate.swift`, `SceneDelegate.swift`, `ShareInbox.swift`, `QuickAction.swift`, `AppReview.swift`, `WidgetData.swift`), `ToogoShare` (Share-menu extension, bundle id `...tripplanner.share`), `ToogoWidget` (`TodayWidget.swift`, `TranslateWidget.swift`, bundle id `...tripplanner.widget`). Marketing version 1.0, build 1.
**App Group**: all three targets carry `group.com.shakedflorentin.tripplanner` in their `.entitlements`; the app writes widget data and shared links into it (`WidgetData.swift`, `ShareInbox.swift`). A new target needs the same group or it cannot read the data. Test: `npm run test:widget`.
**Signing**: the project file has no `DEVELOPMENT_TEAM` set; each Xcode user picks a team under Signing & Capabilities for all three targets.
- Free (personal) team: runs on the owner's own device, the profile lasts a short time and must be re-signed (Apple's rule, not checked here); no TestFlight or App Store.
- Paid Apple Developer team: needed for TestFlight, the App Store, and Apple push. HANDOFF: the App Store app has no web push until the licence exists.
- Whether App Groups work with the free team was not checked here; ask the owner or try an on-device build.
**Steps to put new web code in the app** (owner): `npm run build`, then `npx cap sync ios`, then Run in Xcode. `ios/App/App/public` is a copy of `dist`; the Capacitor bundle is on every phone and can be unpacked, so no service key may be in it.
**Store**: listing text in `docs/app-store-listing.md`; Israel needs Apple in-app purchase for credits (toogo-rules 7); account deletion is required for review (delete-account feature is not applied).
Not checked: a device build was not run for this page.
Related: release-checklist, android.
