import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@ui-sdk/react/dialog'
import { isEn, t } from '../i18n'
import { reducedMotion } from '../spring'
import '../styles/guide.css'

// remembered on this device once the guide has been offered, so the offer after the first match comes only once
const SEEN_KEY = 'guideSeen'
const OPEN_EVENT = 'guide:open'
// the guide videos are in public/guide/ (guide-he.mp4, guide-en.mp4); false hides the offer and the account-menu row
export const GUIDE_READY = true

export type GuideMode = 'watch' | 'read'

/** The guide has not been offered on this device yet. */
export function guideUnseen() {
  try {
    return !localStorage.getItem(SEEN_KEY)
  } catch {
    // no storage (private browsing): never offer it by itself
    return false
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // it just won't be remembered
  }
}

/** Opens the guide from anywhere (the account menu, the offer after the first match); App listens for it. */
export function openGuide(mode: GuideMode = 'watch') {
  window.dispatchEvent(new CustomEvent<GuideMode>(OPEN_EVENT, { detail: mode }))
}

/** Calls `f` whenever something asks for the guide (openGuide). */
export function onGuideOpen(f: (mode: GuideMode) => void) {
  const h = (e: Event) => f((e as CustomEvent<GuideMode>).detail ?? 'watch')
  window.addEventListener(OPEN_EVENT, h)
  return () => window.removeEventListener(OPEN_EVENT, h)
}

/** What the video says, in three lines: the text alternative, and the "Read it" version. */
const guideLines = () => [
  t('מחליקים על מקומות. מה ששניכם אוהבים מקבל מאצ׳ ונכנס למסלול.'),
  t('המסלול מסתדר לפי ימים ואזורים, וההזמנות וההוצאות במקום אחד.'),
  t('מוסיפים מקום מקישור, והזמנה ממייל.'),
]

/**
 * The small card after the first match: a 30 second tour, to watch, to read, or to close. Offered once per device.
 * Nothing plays by itself and nothing is asked again.
 */
export function GuideOffer({ onClose }: { onClose: () => void }) {
  return (
    <aside className="guide-offer" aria-label={t('מדריך')}>
      <button className="guide-offer-x" aria-label={t('סגירה')} onClick={onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <b>{t('מאצ׳ ראשון!')}</b>
      <p>{t('רוצים סיור של 30 שניות?')}</p>
      <div className="guide-offer-acts">
        <button
          className="secondary"
          onClick={() => {
            onClose()
            openGuide('read')
          }}
        >
          {t('לקרוא')}
        </button>
        <button
          className="primary"
          onClick={() => {
            onClose()
            openGuide('watch')
          }}
        >
          {t('לצפות')}
        </button>
      </div>
    </aside>
  )
}

/**
 * The guide in a ui-sdk Dialog (focus stays inside, Escape closes, focus returns to what opened it): the 32-second
 * video of how the app works, or the same three lines as text. The video starts only when asked for (Watch) and, with
 * reduced motion, waits for a tap on play and shows the player's own controls. The video's language follows the app's.
 */
export default function Guide({ mode, onClose }: { mode: GuideMode; onClose: () => void }) {
  const [view, setView] = useState<GuideMode>(mode)
  const video = useRef<HTMLVideoElement>(null)
  const [ended, setEnded] = useState(false)
  const calm = reducedMotion()
  // autoplay refused (Low Power Mode, a strict browser) or reduced motion: a play button instead of a moving first frame
  const [blocked, setBlocked] = useState(calm)

  const play = () => {
    const v = video.current
    if (!v) return
    setBlocked(false)
    v.play().catch(() => setBlocked(true))
  }
  useEffect(() => {
    if (view === 'watch' && !calm) play()
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  const again = () => {
    const v = video.current
    if (!v) return
    v.currentTime = 0
    setEnded(false)
    play()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="guide" initialFocus="[data-guide-close]">
        <DialogClose className="guide-skip" data-guide-close>
          {t('סגירה')}
        </DialogClose>
        {view === 'watch' ? (
          <>
            <video
              ref={video}
              className="guide-video"
              src={`${import.meta.env.BASE_URL}guide/guide-${isEn ? 'en' : 'he'}.mp4`}
              muted
              playsInline
              preload="metadata"
              controls={calm}
              disablePictureInPicture
              disableRemotePlayback
              aria-label={t('סרטון: איך Toogo עובד')}
              onEnded={() => setEnded(true)}
              // no video (a missing file, no network): the text version, never a blank screen
              onError={() => setView('read')}
            />
            <DialogTitle className="sr-only">{t('איך Toogo עובד')}</DialogTitle>
            <DialogDescription className="sr-only">{guideLines().join(' ')}</DialogDescription>
            {blocked && !ended && (
              <button className="guide-play" onClick={play} aria-label={t('הפעלה')}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
                </svg>
              </button>
            )}
            {ended && (
              <div className="guide-end">
                <DialogClose className="guide-go">{t('מתחילים')}</DialogClose>
                <button className="guide-again" onClick={again}>
                  {t('שוב')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="guide-read">
            <DialogTitle render={<h2 />}>{t('איך Toogo עובד')}</DialogTitle>
            <DialogDescription className="sr-only">{t('שלוש שורות על האפליקציה')}</DialogDescription>
            <ol>
              {guideLines().map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
            <button className="guide-again" onClick={() => setView('watch')}>
              {t('לצפות בסרטון')}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
