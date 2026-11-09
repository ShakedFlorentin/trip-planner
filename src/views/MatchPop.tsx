import { useEffect, useState } from 'react'
import type { Candidate } from '../types'
import { t } from '../i18n'
import '../styles/match.css'

export type Match = { c: Candidate; names: string[]; who: string | null }

// the burst around the rings: eight short strokes on an ellipse, alternating strong and faint
const BURST = Array.from({ length: 8 }, (_, i) => {
  const a = ((i * 45 + 22.5) * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x1: 101 + 76 * c, y1: 64 + 46 * s, x2: 101 + 88 * c, y2: 64 + 54 * s, o: i % 2 ? 0.4 : 0.75 }
})

/**
 * The match moment: the place's photo, the Toogo rings drawn in with a burst and a hop, "מאצ׳!" and the faces of
 * everyone who liked it. Without a photo (or when it fails to load) the card starts at the rings.
 */
/** A face's letters: the first one, or the first two when another liker starts with the same letter (שקד, שניר). */
function letters(names: string[]) {
  const first = names.map((n) => n.trim()[0] ?? '')
  return names.map((n, i) => (first.filter((f) => f === first[i]).length > 1 ? n.trim().slice(0, 2) : first[i]))
}

export default function MatchPop({ match, onClose }: { match: Match; onClose: () => void }) {
  const photo = match.c.photos?.find(Boolean)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div className="backdrop center-modal" onClick={onClose}>
      <div className="match-pop" role="dialog" aria-modal="true" aria-labelledby="match-title" onClick={(e) => e.stopPropagation()}>
        {photo && !broken && <img className="match-photo" src={photo} alt="" onError={() => setBroken(true)} />}
        <div className="match-rings" aria-hidden="true">
          <svg className="burst" width="202" height="128" viewBox="0 0 202 128">
            {BURST.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} opacity={l.o} />
            ))}
          </svg>
          {/* room above the right ring: it hops 8px up at the end and must not be cut */}
          <svg className="rings" width="112" height="77" viewBox="0 -12 112 77">
            <circle className="r1" cx="26.5" cy="37" r="22" />
            <circle className="r2" cx="85.5" cy="27" r="22" />
          </svg>
        </div>
        <h2 id="match-title">{t('מאצ׳!')}</h2>
        <p className="match-line">
          <b dir="auto">{match.c.name}</b>{' '}
          {match.who ? t('נכנס לרשימה של {who}', { who: match.who.split(' + ').map((w) => t(w)).join(' + ') }) : t('נכנס לרשימה של כולם')}
        </p>
        {match.names.length > 0 && (
          <div className="match-faces">
            <span className="faces" aria-hidden="true">
              {letters(match.names.slice(0, 5)).map((l, i) => (
                <i key={i} className={'f' + (i % 3) + (l.length > 1 ? ' two' : '')}>
                  {l}
                </i>
              ))}
            </span>
            <span className="muted small">{t('{names} אהבו את המקום', { names: match.names.join(' · ') })}</span>
          </div>
        )}
        <p className="muted small">{t('נכנס למסלול ביום פנוי בעיר שלו. טיול יום יחכה עד שתבחרו לו יום.')}</p>
        <button className="primary" onClick={onClose}>
          {t('המשך')}
        </button>
      </div>
    </div>
  )
}
