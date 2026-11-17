---
title: Android sideload build
chapter: native
explains:
  - isNative
---
Status: a sideload test build, not a store release. On main the `android/` folder is untracked (it shows as `??` in git status); it is committed on the unpushed branch `local-signup-android` (see branches).

**Gradle**: wrapper `gradle-8.14.3`, `minSdkVersion 24`, `compileSdkVersion 36`, `targetSdkVersion 36`, Cordova Android 14. App id `com.shakedflorentin.tripplanner`, `versionCode 1`, `versionName 1.0`. Capacitor config is shared (`capacitor.config.ts`; the Android comment says Capacitor 8 SystemBars shrinks the page for the keyboard itself).
**Build** (owner or a scratch checkout): `npm run build`, `npx cap sync android`, then `cd android && ./gradlew assembleDebug`. Gradle needs a JDK: the brief for this book says JDK 21 is kept in scratch (not in the repo); Android Gradle needs 17 or newer. Not verified here. The debug APK that was built is `build-out/toogo-debug.apk` (untracked; never commit APKs or keystores).
**Back button**: `MainActivity.java` asks the page on every press; `src/native.ts` (branch) handles it: sheets and questions close on a synthetic Escape key (ui-sdk), a drawer slides out. QA: the ui-sdk Menu is not closed (selector at native.ts:110), the QuickFab wheel is not closed, and a dialog that ignores Escape traps the back button.
**Manifest** (branch): `allowBackup="true"` (QA: a session can be restored from backup; set false before sharing builds); intent filter for `toogo://auth-callback` handled by `AuthCallbackPlugin.java` (see security book).
**Known gaps** (QA): translator mic does not work (no SpeechRecognition, no RECORD_AUDIO); booking PDFs do not open offline; no push, haptics; Maps links iOS-only.
Not checked here: no build was run for this page.
Related: branches, security book (auth-and-deep-links).
