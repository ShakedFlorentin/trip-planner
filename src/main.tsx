import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import './styles.css'
import './styles/ltr.css'
import './styles/ux.css'
import { endLaunch, isNative } from './native'
import { watchFades } from './fades'
import { trackOpen } from './track'

let registration: ServiceWorkerRegistration | undefined

// relative path: the site lives under /<repo>/ on GitHub Pages; dev has no worker so it never serves stale files
// the iOS app carries its files inside, so it has no worker
if (import.meta.env.PROD && !isNative && 'serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker
      .register('./sw.js')
      .then((r) => void (registration = r))
      .catch(() => {}),
  )
}

// A phone keeps the app open in the background for days, so a deploy only showed after it was closed for real.
// Back in front after a short while: ask the worker to look for a new version, and if the site has a newer build,
// load it. Unsent changes wait in localStorage (outbox).
// the iOS app updates through the App Store / TestFlight, not by reloading
if (import.meta.env.PROD && !isNative) {
  const BUILD = /assets\/index-[\w-]+\.js/
  const running = document.querySelector<HTMLScriptElement>('script[src*="assets/index-"]')?.src.match(BUILD)?.[0]
  let hiddenAt = 0
  // someone is in the middle of typing: a reload would lose it, so wait for the next time the app comes forward
  const typing = () =>
    [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit])')].some(
      (el) => el.value !== '',
    )
  const comingBack = async () => {
    registration?.update().catch(() => {})
    if (!running || !navigator.onLine || Date.now() - hiddenAt < 10_000) return
    try {
      const html = await (await fetch('./', { cache: 'no-cache' })).text()
      const live = html.match(BUILD)?.[0]
      if (live && live !== running && !typing()) location.reload()
    } catch {
      // no connection after all: stay on this version
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') return void (hiddenAt = Date.now())
    void comingBack()
  })
  // a page restored from the back-forward cache fires this instead of a fresh load
  window.addEventListener('pageshow', (e) => e.persisted && void comingBack())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

endLaunch()
watchFades()
trackOpen()
