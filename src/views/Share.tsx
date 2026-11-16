import { useEffect, useMemo, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox'
import { Toggle } from '@ui-sdk/react/toggle'
import { supabase } from '../supabase'
import { CARD_STYLE, CATEGORIES, CITY_HE, type Candidate, type DayInfo, type Place, type Trip } from '../types'
import { buildSnapshot, type SharedSnapshot } from '../shareSnapshot'
import { cityLabel, errorText, mutate } from '../lib'
import { isEn, locale, t } from '../i18n'
import { ask } from '../toast'
import { Icon } from '../icons'
import { Sheet } from '../ui'
import type { PlanItem } from './planUtils'
import { appUrl } from '../native'

// Opt-in public sharing of the itinerary. The snapshot is built in shareSnapshot.ts; the sheet shows it as the
// preview, so what is on screen is exactly what is published.
export { buildSnapshot, type SharedStop, type SharedDay, type SharedSnapshot } from '../shareSnapshot'

/** Ten random characters from a 32-letter alphabet (no bias: 256 is a multiple of 32). */
export function newSlug() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => alphabet[b & 31]).join('')
}

export const shareUrl = (slug: string) => `${appUrl()}?share=${slug}`

export const stopLabel = (category: string) => CARD_STYLE[category]?.label ?? CATEGORIES[category] ?? category

/** The read-only list of days and stops, as the public sees it and as the preview shows it. With `pick`, each day has a
 * checkbox and a day that is unticked greys out as "left out of the link" (the sender's preview only). */
export function PlanList({ snap, pick }: { snap: SharedSnapshot; pick?: { skip: ReadonlySet<number>; onToggle: (day: number) => void } }) {
  return (
    <div className="stack">
      {snap.days.map((d) => {
        const out = !!pick?.skip.has(d.day)
        const title = (
          <>
            {t('יום {day}', { day: d.day })}
            {d.city ? ` · ${cityLabel(CITY_HE[d.city] ?? d.city)}` : ''}
          </>
        )
        return (
          <section key={d.day} className={'card' + (pick ? ' share-day' : '')} data-left-out={out ? '' : undefined}>
            {pick ? (
              <label className="share-day-head">
                <Checkbox className="share-day-box" checked={!out} onCheckedChange={() => pick.onToggle(d.day)} aria-label={t('לכלול את יום {day} בקישור', { day: d.day })}>
                  <CheckboxIndicator>
                    <Icon as={Check} />
                  </CheckboxIndicator>
                </Checkbox>
                <h3>{title}</h3>
                {out && <span className="share-day-out muted small">{t('לא ייכלל בקישור')}</span>}
              </label>
            ) : (
              <h3>{title}</h3>
            )}
            {!out && (
              <ol className="share-stops">
                {d.stops.map((s, n) => (
                  <li key={n}>
                    <b dir="auto">{s.name}</b> <span className="muted small">{stopLabel(s.category)}</span>
                    {(isEn ? (s.tip_en ?? s.tip) : s.tip) && (
                      <div className="small" dir="auto">
                        {isEn ? (s.tip_en ?? s.tip) : s.tip}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}

type Row = { slug: string; created_at: string }

export function ShareSheet(props: {
  trip: Trip
  days: DayInfo[]
  items: PlanItem[]
  places: Place[]
  cards: Candidate[]
  onClose: () => void
}) {
  const { trip } = props
  const [withName, setWithName] = useState(false)
  const [withTips, setWithTips] = useState(true)
  const [active, setActive] = useState<Row | null | undefined>(undefined)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  // days unticked in the preview: they are left out of the published snapshot
  const [skip, setSkip] = useState<ReadonlySet<number>>(new Set())
  const toggleDay = (d: number) => setSkip((cur) => { const n = new Set(cur); if (n.has(d)) n.delete(d); else n.add(d); return n })

  // a link already published for this trip (members can read their own trip's rows)
  useEffect(() => {
    let live = true
    setLoadFailed(false)
    setActive(undefined)
    supabase
      .from('shared_plans')
      .select('slug, created_at')
      .eq('trip_id', trip.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!live) return
        // on an error a link may still exist, so the form is not shown: offer a retry instead
        if (error) return setLoadFailed(true)
        setActive((data?.[0] as Row | undefined) ?? null)
      })
    return () => {
      live = false
    }
  }, [trip.id, attempt])

  // the preview shows every day, so a left-out day can be ticked back; what is published is the same snapshot with the unticked days dropped
  const preview = useMemo(() => buildSnapshot({ ...props, withName, withTips }), [props.days, props.items, props.places, props.cards, trip, withName, withTips])
  const snap = useMemo(() => buildSnapshot({ ...props, withName, withTips, skipDays: skip }), [props.days, props.items, props.places, props.cards, trip, withName, withTips, skip])
  const anyTips = useMemo(() => buildSnapshot({ ...props, withName: false, withTips: true }).days.some((d) => d.stops.some((x) => x.tip)), [props.days, props.items, props.places, props.cards, trip])
  const total = snap.days.reduce((n, d) => n + d.stops.length, 0)

  const publish = async () => {
    if (!navigator.onLine) return setNote(t('אין אינטרנט. נסו שוב כשיש קליטה.'))
    setBusy(true)
    setNote('')
    let error: { message: string; code?: string } | null = null
    for (let tries = 0; tries < 3; tries++) {
      const slug = newSlug()
      ;({ error } = await supabase.from('shared_plans').insert({ slug, trip_id: trip.id, snapshot: snap }))
      if (!error) {
        setActive({ slug, created_at: new Date().toISOString() })
        break
      }
      // 23505: the slug is taken, draw another
      if (error.code !== '23505') break
    }
    setBusy(false)
    if (error) setNote(errorText(error.message))
  }

  const stop = async () => {
    if (!active) return
    if (!(await ask({ title: t('להפסיק את השיתוף?'), description: t('הקישור יפסיק לעבוד לכל מי שקיבל אותו.'), confirmLabel: t('הפסקת שיתוף'), danger: true }))) return
    if (!navigator.onLine) return setNote(t('אין אינטרנט. נסו שוב כשיש קליטה.'))
    // every live link of this trip, not only the newest one
    if (await mutate(supabase.from('shared_plans').update({ revoked_at: new Date().toISOString() }).eq('trip_id', trip.id).is('revoked_at', null))) setActive(null)
  }

  const send = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ url, text: t('המסלול שלנו') })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    navigator.clipboard
      .writeText(url)
      .then(() => setNote(t('הקישור הועתק')))
      .catch(() => setNote(t('אפשר להעתיק את הקישור מכאן')))
  }

  return (
    <Sheet title={t('שיתוף המסלול')} onClose={props.onClose}>
      <div className="stack">
        {loadFailed ? (
          <>
            <p className="msg" role="alert">{t('לא הצלחנו לבדוק אם המסלול כבר משותף. בדקו את החיבור ונסו שוב.')}</p>
            <button className="secondary" onClick={() => setAttempt((n) => n + 1)}>{t('נסו שוב')}</button>
          </>
        ) : active === undefined ? (
          <p className="muted" role="status">{t('טוען…')}</p>
        ) : active ? (
          <>
            <p>{t('המסלול משותף. כל מי שיש לו את הקישור יכול לראות אותו, בלי להתחבר.')}</p>
            <p className="muted small">{t('שותף ב-{date}', { date: new Date(active.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}</p>
            <input readOnly dir="ltr" value={shareUrl(active.slug)} onFocus={(e) => e.currentTarget.select()} aria-label={t('קישור לשיתוף')} />
            <div className="row">
              <button className="primary" onClick={() => send(shareUrl(active.slug))}>
                <Icon as={Link2} /> {t('שליחה')}
              </button>
              <button className="secondary" onClick={stop}>
                {t('הפסקת שיתוף')}
              </button>
            </div>
            <p className="muted small">{t('מה שפורסם הוא תמונת מצב מרגע השיתוף. כדי לעדכן, מפסיקים ומשתפים שוב.')}</p>
          </>
        ) : (
          <>
            <p>{t('הקישור יציג למי שיקבל אותו רק את מה שמופיע כאן. הוא לא כולל הזמנות, מסמכים, מלונות, הוצאות או שמות.')}</p>
            <div className="share-pills" role="group" aria-label={t('מה ייכלל בקישור')}>
              <Toggle className={'chip' + (withName ? ' on' : '')} pressed={withName} onPressedChange={setWithName}>
                {withName && <Icon as={Check} />} {t('שם הטיול')}
              </Toggle>
              {anyTips && (
                <Toggle className={'chip' + (withTips ? ' on' : '')} pressed={withTips} onPressedChange={setWithTips}>
                  {withTips && <Icon as={Check} />} {t('טיפים קצרים')}
                </Toggle>
              )}
            </div>
            <h3 className="share-preview-title">{t('כך זה ייראה למי שיקבל')}</h3>
            {snap.name && <div className="big" dir="auto">{snap.name}</div>}
            {preview.days.length === 0 ? (
              <p className="muted">{t('אין עדיין מקומות במסלול לשיתוף.')}</p>
            ) : (
              <PlanList snap={preview} pick={{ skip, onToggle: toggleDay }} />
            )}
            {preview.days.length > 0 && snap.days.length === 0 && <p className="muted small" role="status">{t('בחרו לפחות יום אחד לשיתוף.')}</p>}
            <div className="share-bar">
              {note && <p className="msg" role="status">{note}</p>}
              <button className="primary" disabled={busy || total === 0} onClick={publish}>
                {snap.days.length === 1 ? t('פרסום הקישור · יום אחד') : t('פרסום הקישור · {n} ימים', { n: snap.days.length })}
              </button>
            </div>
          </>
        )}
        {note && active !== null && <p className="msg" role="status">{note}</p>}
      </div>
    </Sheet>
  )
}
