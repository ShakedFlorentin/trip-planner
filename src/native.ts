import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { Share } from '@capacitor/share'
import { AppLauncher } from '@capacitor/app-launcher'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard } from '@capacitor/keyboard'
import { requestAddLink } from './quickAdd'
import { settings } from './settings'

/** Running inside the iOS app (Capacitor), not in a browser. */
export const isNative = Capacitor.isNativePlatform()

// links sent to other people must point at the website: inside the app the page lives at capacitor://localhost
const SITE = 'https://shakedflorentin.github.io/trip-planner/'

/** The address of the app's start page that other people can open (invite and share links). */
export const appUrl = () => (isNative ? SITE : location.origin + location.pathname)

/** Open an outside page: a new tab on the web, an in-app Safari sheet in the iOS app. */
export function openExternal(href: string) {
  if (isNative) void Browser.open({ url: href })
  else window.open(href, '_blank', 'noreferrer')
}

const MAPS = /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl)\//

/**
 * A Google Maps link goes to the Google Maps app when it is installed (easier to navigate from there):
 * comgooglemapsurl:// opens the same link inside the app. Without the app, iOS opens it in Safari.
 */
async function openMaps(href: string) {
  const inApp = href.replace(/^https:\/\//, 'comgooglemapsurl://')
  try {
    if ((await AppLauncher.canOpenUrl({ url: 'comgooglemapsurl://' })).value) {
      await AppLauncher.openUrl({ url: inApp })
      return
    }
  } catch {
    // fall through to the website
  }
  location.href = href
}

/** The app's own plugin (ios/App/App/ShareInbox.swift): the link Toogo's share extension left for the page. */
const ShareInbox = registerPlugin<{
  take(): Promise<{ url?: string }>
  addListener(event: 'shared', cb: () => void): Promise<PluginListenerHandle>
}>('ShareInbox')

/** A link shared into Toogo from Instagram, TikTok or Maps opens the add-place sheet with it filled in. */
async function takeShared() {
  // switched off with app_settings features.share_extension = false; a link already shared then waits in the phone
  if (!settings().features.share_extension) return
  try {
    const { url } = await ShareInbox.take()
    if (url) requestAddLink(url)
  } catch {
    // an app build from before the share extension has no such plugin
  }
}

if (isNative) {
  void takeShared()
  void ShareInbox.addListener('shared', () => void takeShared()).catch(() => {})

  // no web form bar (✓ ∨ ∧) above the keyboard: it made the app look like a website
  void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {})

  // every <a target="_blank"> (maps, websites, sources) opens in the Safari sheet instead of replacing the app's page
  document.addEventListener(
    'click',
    (ev) => {
      if (ev.defaultPrevented) return
      const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || !/^https?:/.test(a.href) || a.target !== '_blank') return
      ev.preventDefault()
      if (MAPS.test(a.href)) void openMaps(a.href)
      else void Browser.open({ url: a.href })
    },
    true,
  )

  // the web share calls go to the iOS share sheet; a cancel comes back as AbortError like in Safari
  navigator.share = async (data?: ShareData) => {
    try {
      await Share.share({ text: data?.text, url: data?.url, title: data?.title })
    } catch (e) {
      const err = new Error((e as Error)?.message ?? 'Share canceled')
      err.name = /cancel/i.test(err.message) ? 'AbortError' : 'NotAllowedError'
      throw err
    }
  }
}

/**
 * Opening: the native launch screen is kept up (capacitor.config.ts) until the page has painted the same rings in the
 * same spot (index.html #intro); then it goes away with no fade, and the rings take their step.
 */
export function endLaunch() {
  // the web app: no native launch screen, the rings take their step as soon as the page has painted
  if (!isNative) {
    requestAnimationFrame(() => (window as { startIntro?: () => void }).startIntro?.())
    return
  }
  requestAnimationFrame(() =>
    requestAnimationFrame(async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 0 })
      } finally {
        ;(window as { startIntro?: () => void }).startIntro?.()
      }
    }),
  )
}
