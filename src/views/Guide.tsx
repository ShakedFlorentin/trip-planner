import { useEffect, useRef, useState } from 'react'
import { isEn, t } from '../i18n'
import '../styles/guide.css'

// remembered on this device once the guide has been watched or skipped, so it opens by itself only the first time
const SEEN_KEY = 'guideSeen'
const OPEN_EVENT = 'guide:open'
// the guide videos are in public/guide/ (guide-he.mp4, guide-en.mp4); false hides the first-open guide and the ☰ row
export const GUIDE_READY = true

/** The guide has not been shown on this device yet. */
export function guideUnseen() {
  try {
    return !localStorage.getItem(SEEN_KEY)
  } catch {
    // no storage (private browsing): don't show it on every launch
    return false
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // it just won't be remembered
  }
}

/** Opens the guide again from anywhere (the ☰ menu); App listens for it. */
export function openGuide() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

/** Calls `f` whenever something asks for the guide (openGuide). */
export function onGuideOpen(f: () => void) {
  window.addEventListener(OPEN_EVENT, f)
  return () => window.removeEventListener(OPEN_EVENT, f)
}

/**
 * Waits for the opening rings (index.html #intro) to finish and leave, so the video starts on a clear screen rather
 * than under the rings. A fallback timer covers a page where the rings never get their start.
 */
function afterIntro(f: () => void) {
  if (!document.getElementById('intro')) {
    f()
    return () => {}
  }
  let done = false
  const go = () => {
    if (done) return
    done = true
    obs.disconnect()
    clearTimeout(timer)
    f()
  }
  const obs = new MutationObserver(() => !document.getElementById('intro') && go())
  obs.observe(document.body, { childList: true })
  const timer = setTimeout(go, 2500)
  return () => {
    done = true
    obs.disconnect()
    clearTimeout(timer)
  }
}

/**
 * The guide: a 36-second video of how the app works (swipe, the plan, adding from a link, the ☰ menu, bookings from
 * an email), full screen on the video's own cream, muted and with no player controls. "Skip" sits at the top all
 * along; at the end "Let's go" closes it and "Again" plays it once more. The video's language follows the app's.
 */
export default function Guide({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [ended, setEnded] = useState(false)
  // autoplay refused (Low Power Mode, a strict browser): a play button instead of a still first frame
  const [blocked, setBlocked] = useState(false)
  const close = useRef(onClose)
  close.current = onClose

  const play = () => {
    const v = video.current
    if (!v) return
    setBlocked(false)
    v.play().catch(() => setBlocked(true))
  }

  useEffect(() => {
    const stop = afterIntro(play)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish()
    window.addEventListener('keydown', onKey)
    return () => {
      stop()
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  function finish() {
    markSeen()
    close.current()
  }

  const again = () => {
    const v = video.current
    if (!v) return
    v.currentTime = 0
    setEnded(false)
    play()
  }

  return (
    <div className="guide" role="dialog" aria-modal="true" aria-label={t('מדריך')}>
      <video
        ref={video}
        className="guide-video"
        src={`${import.meta.env.BASE_URL}guide/guide-${isEn ? 'en' : 'he'}.mp4`}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        onEnded={() => {
          markSeen()
          setEnded(true)
        }}
        // no video (a missing file, no network on the web): straight to the way into the app
        onError={() => setEnded(true)}
      />
      {!ended && (
        <button className="guide-skip" onClick={finish}>
          {t('דלג')}
        </button>
      )}
      {blocked && !ended && (
        <button className="guide-play" onClick={play} aria-label={t('הפעלה')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        </button>
      )}
      {ended && (
        <div className="guide-end">
          <button className="guide-go" onClick={finish} autoFocus>
            {t('מתחילים')}
          </button>
          <button className="guide-again" onClick={again}>
            {t('שוב')}
          </button>
        </div>
      )}
    </div>
  )
}
