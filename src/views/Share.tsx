import { useEffect, useMemo, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox'
import { Toggle } from '@ui-sdk/react/toggle'
import { supabase } from '../supabase'
import { CARD_STYLE, CATEGORIES, CITY_HE, type Candidate, type DayInfo, type Place, type Trip } from '../types'
import { cityLabel, errorText, mutate } from '../lib'
import { isEn, locale, t } from '../i18n'
import { ask } from '../toast'
import { Icon } from '../icons'
import { Sheet } from '../ui'
import type { PlanItem } from './planUtils'
import { appUrl } from '../native'

// Opt-in public sharing of the itinerary. What gets published is a snapshot built here from the plan, and it holds
// only the pieces below. Never put anything else in it: no bookings, files, confirmation numbers, hotels or
// addresses, expenses, member names, whose plan an item is, or notes people typed. The sheet shows the snapshot
// itself as the preview, so what is on screen is exactly what is published.

export type SharedStop = { name: string; category: string; tip?: string; tip_en?: string; lat?: number; lng?: number }
export type SharedDay = { day: number; city: string | null; stops: SharedStop[] }
export type SharedSnapshot = { v: 1; name?: string; num_days: number; days: SharedDay[] }

// kinds of place that are shared; a hotel or an errand saved as a place never is
const SHARED_CATEGORIES = new Set(['sight', 'food', 'cafe', 'shopping', 'nightlife', 'experience'])
const TIP_MAX = 240
const NAME_MAX = 120

const round = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 1e5) / 1e5 : undefined)

/** The snapshot of this plan: for each day its city and its places in order, from places that have a card or a name. */
export function buildSnapshot(opts: {
  trip: Trip
  days: DayInfo[]
  items: PlanItem[]
  places: Place[]
  cards: Candidate[]
  withName: boolean
  withTips: boolean
  /** days the sender left out: they are not in the snapshot at all */
  skipDays?: ReadonlySet<number>
}): SharedSnapshot {
  const { trip, days, items, places, cards } = opts
  const out: SharedDay[] = []
  for (let d = 1; d <= trip.num_days; d++) {
    if (opts.skipDays?.has(d)) continue
    const stops: SharedStop[] = []
    const cityCounts = new Map<string, number>()
    const todays = items
      .filter((i) => i.day === d && i.place_id)
      .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.sort - b.sort)
    for (const i of todays) {
      const p = places.find((x) => x.id === i.place_id)
      if (!p) continue
      const card = cards.find((c) => c.id === p.candidate_id)
      const category = card?.category ?? p.category
      if (!SHARED_CATEGORIES.has(category)) continue
      // track the city of this stop in Hebrew (p.city is already Hebrew; card.city is a city ID)
      // skip the day-trip pseudo-city so a day-trip stop does not influence the heading
      const stopCity = p.city?.trim() || (card?.city ? (CITY_HE[card.city] ?? null) : null)
      if (stopCity && stopCity !== CITY_HE['daytrip']) {
        cityCounts.set(stopCity, (cityCounts.get(stopCity) ?? 0) + 1)
      }
      const stop: SharedStop = { name: p.name.trim().slice(0, NAME_MAX), category }
      // the card's own tip (shared library text), never the notes someone typed on the place
      const tip = card?.tip?.trim()
      if (opts.withTips && tip) {
        stop.tip = tip.slice(0, TIP_MAX)
        const en = card?.en?.tip?.trim()
        if (en) stop.tip_en = en.slice(0, TIP_MAX)
      }
      const lat = round(p.lat ?? card?.lat)
      const lng = round(p.lng ?? card?.lng)
      if (lat !== undefined && lng !== undefined) Object.assign(stop, { lat, lng })
      if (stop.name) stops.push(stop)
    }
    // label the day with the city most of its shared stops are in; fall back to the sleep city on tie or no data
    const dayCity = days.find((x) => x.day === d)?.city?.trim() || null
    let city = dayCity
    if (cityCounts.size > 0) {
      const sorted = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])
      // unique winner only: if the top two are tied, keep the sleep city
      if (sorted.length === 1 || sorted[0][1] > sorted[1][1]) {
        city = sorted[0][0]  // already in Hebrew
      }
    }
    if (stops.length) out.push({ day: d, city: city ? (CITY_HE[city] ?? city) : city, stops })
  }
  const snap: SharedSnapshot = { v: 1, num_days: trip.num_days, days: out }
  if (opts.withName && trip.name.trim()) snap.name = trip.name.trim().slice(0, NAME_MAX)
  return snap
}

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
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  // days unticked in the preview: they are left out of the published snapshot
  const [skip, setSkip] = useState<ReadonlySet<number>>(new Set())
  const toggleDay = (d: number) => setSkip((cur) => { const n = new Set(cur); if (n.has(d)) n.delete(d); else n.add(d); return n })

  // a link already published for this trip (members can read their own trip's rows)
  useEffect(() => {
    let live = true
    supabase
      .from('shared_plans')
      .select('slug, created_at')
      .eq('trip_id', trip.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!live) return
        // no table yet or offline: offer to share anyway, the publish will say if it can't
        setActive(error ? null : ((data?.[0] as Row | undefined) ?? null))
      })
    return () => {
      live = false
    }
  }, [trip.id])

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
    if (await mutate(supabase.from('shared_plans').update({ revoked_at: new Date().toISOString() }).eq('slug', active.slug))) setActive(null)
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
        {active === undefined ? (
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
