import type { CapacitorConfig } from '@capacitor/cli'

// The iOS app is the same web build (dist), served from inside the app.
const config: CapacitorConfig = {
  appId: 'com.shakedflorentin.tripplanner',
  appName: 'Toogo',
  webDir: 'dist',
  plugins: {
    // the launch screen stays up until the page has drawn the same rings (index.html #intro), so there is no blank gap
    SplashScreen: { launchAutoHide: false, launchFadeOutDuration: 0, showSpinner: false },
    // the keyboard shrinks the app and gives the space back when it closes; without this iOS pushed the whole page up
    // (sheet titles under the clock) and sometimes kept the page 68 pt short after the keyboard closed
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
  },
  ios: {
    // the page itself handles the notch and home bar (viewport-fit=cover + env(safe-area-inset-*))
    contentInset: 'never',
  },
}

export default config
