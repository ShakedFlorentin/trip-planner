import { useCallback, useEffect, useMemo, useState } from 'react'
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control'
import { BedDouble, CalendarDays, ChevronRight, Images, List, Lock, Map as MapIcon, MapPin } from 'lucide-react'
import { Icon } from '../icons'
import { t } from '../i18n'
import { cityLabel } from '../lib'
import { Sheet } from '../ui'
import type { Member, Trip } from '../types'
import { matchPhotos, type AlbumPhoto, type AlbumStop } from '../album/match'
import { useAlbumPlan } from '../album/plan'
import { clock, dayLabel, rangeLabel } from '../album/format'
import { albumList, albumOpenSettings, albumPickMore, albumRequestAccess, albumStatus, loadManual, saveManual, type AlbumAccess, type AlbumManual } from '../album/photos'
import { Thumb, Viewer } from './AlbumParts'
import AlbumMap from './AlbumMap'
import '../styles/album.css'

type Props = { trip: Trip; members: Member[]; userId: string; onClose: () => void }
type Open = { ids: string[]; start: number; title: string }

const DAY_MS = 86_400_000
const count = (n: number) => (n === 1 ? t('תמונה אחת') : t('{n} תמונות', { n }))

/**
 * The trip album (iOS app only): the phone's photos from the trip dates, put on days and places by where and when they
 * were taken. List and map. Everything is read on the phone and nothing is uploaded (src/album/, TripPhotos.swift).
 */
export default function Album({ trip, members, userId, onClose }: Props) {
  const { days, stops, cityByDay } = useAlbumPlan(trip, members, userId)
  const [access, setAccess] = useState<AlbumAccess | 'loading'>('loading')
  const [photos, setPhotos] = useState<AlbumPhoto[] | null>(null)
  const [manual, setManual] = useState<AlbumManual>({})
  const [view, setView] = useState<'list' | 'map'>('list')
  const [open, setOpen] = useState<Open | null>(null)
  const [choosing, setChoosing] = useState<number | null>(null)

  useEffect(() => {
    void albumStatus().then(setAccess)
    void loadManual(trip.id).then(setManual)
  }, [trip.id])

  const first = days[0]?.date
  const last = days[days.length - 1]?.date
  const scan = useCallback(async () => {
    if (!first || !last) return
    // a day's own zone is at most 14 hours from UTC; matching drops what falls outside the trip days
    const list = await albumList(Date.parse(first + 'T00:00:00Z') - DAY_MS, Date.parse(last + 'T00:00:00Z') + 2 * DAY_MS)
    setPhotos(list)
  }, [first, last])
  const granted = access === 'full' || access === 'limited'
  useEffect(() => {
    if (granted) void scan()
  }, [granted, scan])
  // back from Settings or the "select more" picker
  useEffect(() => {
    const again = () => {
      if (document.visibilityState !== 'visible') return
      void albumStatus().then(setAccess)
      if (granted) void scan()
    }
    document.addEventListener('visibilitychange', again)
    return () => document.removeEventListener('visibilitychange', again)
  }, [granted, scan])

  const result = useMemo(() => matchPhotos(photos ?? [], days, stops, manual), [photos, days, stops, manual])
  const total = result.days.reduce((n, d) => n + d.loose.photoIds.length + d.places.reduce((m, p) => m + p.photoIds.length, 0), 0)
  const stopName = useMemo(() => new Map(stops.map((s) => [s.placeId, s])), [stops])

  const choose = (day: number, ids: string[], placeId: string) => {
    const next = { ...manual }
    for (const id of ids) next[id] = { day, placeId }
    setManual(next)
    void saveManual(trip.id, next)
    setChoosing(null)
  }
  const pickMore = async () => {
    await albumPickMore()
    void albumStatus().then(setAccess)
    void scan()
  }
  const allow = async () => setAccess(await albumRequestAccess())

  const dates = first && last ? rangeLabel(first, last) : ''
  let body
  if (access === 'loading') body = <div className="al-wait" aria-hidden="true" />
  else if (access === 'undetermined') body = <FirstTime dates={dates} onAllow={allow} onLater={onClose} />
  else if (access === 'denied') body = <Denied />
  else if (photos === null) body = <Scanning />
  else if (total === 0) body = <Empty dates={dates} limited={access === 'limited'} onMore={pickMore} />
  else {
    body = (
      <>
        <SegmentedControl className="al-seg" aria-label={t('תצוגה')} value={view} onValueChange={(v) => v && setView(v as 'list' | 'map')}>
          <SegmentedControlIndicator className="al-seg-ind" />
          <SegmentedControlItem value="list" className="al-seg-item">
            <Icon as={List} size={18} /> {t('רשימה')}
          </SegmentedControlItem>
          <SegmentedControlItem value="map" className="al-seg-item">
            <Icon as={MapIcon} size={18} /> {t('מפה')}
          </SegmentedControlItem>
        </SegmentedControl>
        {view === 'list' ? (
          <>
            <p className="al-sub" dir="auto">{[trip.name, dates, count(total)].filter(Boolean).join(' · ')}</p>
            <p className="al-private"><Icon as={Lock} size={16} /> {t('נשאר רק בטלפון שלך. שום תמונה לא עולה.')}</p>
            {access === 'limited' && (
              <button className="al-more" onClick={pickMore}>
                <span>{t('הגישה לתמונות מוגבלת')}</span>
                <b>{t('לבחירת תמונות נוספות')}</b>
              </button>
            )}
            {result.days.map((d) => {
              const day = days.find((x) => x.day === d.day)!
              const n = d.loose.photoIds.length + d.places.reduce((m, p) => m + p.photoIds.length, 0)
              if (!n) return null
              const city = cityLabel(cityByDay[d.day])
              return (
                <section key={d.day} className="al-day" aria-label={t('יום {n}', { n: d.day })}>
                  <header className="al-day-head">
                    <h2 dir="auto">{[t('יום {n}', { n: d.day }), city].filter(Boolean).join(' · ')}</h2>
                    <span>{dayLabel(day.date)} · {count(n)}</span>
                  </header>
                  {d.places.map((p) => {
                    const s = stopName.get(p.placeId)
                    return (
                      <div key={p.placeId} className="al-place">
                        <div className="al-place-head">
                          <Icon as={p.hotel ? BedDouble : MapPin} size={18} />
                          <b dir="auto">{s ? placeName(s) : ''}</b>
                          <span>{p.photoIds.length}</span>
                        </div>
                        <Grid ids={p.photoIds} onOpen={(i) => setOpen({ ids: p.photoIds, start: i, title: s?.name ?? '' })} />
                      </div>
                    )
                  })}
                  {d.loose.photoIds.length > 0 && (
                    <Loose
                      day={d.day}
                      tz={day.tz}
                      ids={d.loose.photoIds}
                      photos={photos}
                      guess={d.loose.guessPlaceId ? stopName.get(d.loose.guessPlaceId) : undefined}
                      onAssign={(placeId) => choose(d.day, d.loose.photoIds, placeId)}
                      onOther={() => setChoosing(d.day)}
                      onOpen={(i) => setOpen({ ids: d.loose.photoIds, start: i, title: t('בלי מקום') })}
                    />
                  )}
                </section>
              )
            })}
          </>
        ) : (
          <AlbumMap days={days} result={result} stops={stops} cityByDay={cityByDay} onOpen={(ids, start, title) => setOpen({ ids, start, title })} />
        )}
      </>
    )
  }

  const dayStops = choosing != null ? [...new Map(stops.filter((s) => s.day === choosing).map((s) => [s.placeId, s])).values()] : []
  return (
    <div className="al-page" role="region" aria-label={t('אלבום הטיול')}>
      <header className="al-head">
        <button className="al-back" aria-label={t('חזרה')} onClick={onClose}>
          <Icon as={ChevronRight} className="chev flip-ltr" />
        </button>
        <h1 className="al-title">{t('אלבום הטיול')}</h1>
      </header>
      <div className={'al-body' + (view === 'map' && granted && total > 0 ? ' al-map-view' : '')}>
        <div className="al">{body}</div>
      </div>
      {open && <Viewer ids={open.ids} start={open.start} title={open.title} onClose={() => setOpen(null)} />}
      {choosing != null && (
        <Sheet title={t('בחירת מקום')} closeLabel={t('ביטול')} onClose={() => setChoosing(null)}>
          <div className="group">
            {dayStops.length === 0 && <p className="muted al-pad">{t('אין מקומות בתוכנית של היום הזה.')}</p>}
            {dayStops.map((s) => (
              <button key={s.placeId} className="group-row" onClick={() => choose(choosing, result.days.find((d) => d.day === choosing)?.loose.photoIds ?? [], s.placeId)}>
                <Icon as={s.hotel ? BedDouble : MapPin} className="lead" />
                <span className="k" dir="auto">{placeName(s)}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}

export const placeName = (s: AlbumStop) => (s.hotel ? t('מלון · {name}', { name: s.name }) : s.name)

/** One big tile and up to four small ones; the last small one says how many more there are. */
function Grid({ ids, onOpen }: { ids: string[]; onOpen: (i: number) => void }) {
  const shown = ids.slice(0, 5)
  const more = ids.length > 5 ? ids.length - 4 : 0
  return (
    <div className="al-grid" data-n={Math.min(ids.length, 5)}>
      {shown.map((id, i) => (
        <button key={id} className="al-tile" aria-label={t('פתיחת תמונה {n}', { n: i + 1 })} onClick={() => onOpen(i)}>
          <Thumb id={id} size={i === 0 ? 480 : 240} />
          {more > 0 && i === 4 && <span className="al-more-n">+{more}</span>}
        </button>
      ))}
    </div>
  )
}

function Loose(props: {
  day: number
  tz: string
  ids: string[]
  photos: AlbumPhoto[] | null
  guess?: AlbumStop
  onAssign: (placeId: string) => void
  onOther: () => void
  onOpen: (i: number) => void
}) {
  const times = props.ids.map((id) => props.photos?.find((p) => p.id === id)?.time).filter((x): x is number => typeof x === 'number')
  const span = times.length ? t('צולמו בין {a} ל-{b}.', { a: clock(Math.min(...times), props.tz), b: clock(Math.max(...times), props.tz) }) : ''
  const guess = props.guess ? t('כנראה בדרך ל-{name}.', { name: props.guess.name }) : ''
  return (
    <div className="al-loose">
      <h3>{t('{n} תמונות מהיום הזה בלי מקום', { n: props.ids.length })}</h3>
      <p dir="auto">{[t('לא הצלחנו לשייך אותן למקום מהתוכנית.'), span, guess].filter(Boolean).join(' ')}</p>
      <div className="al-loose-row">
        {props.ids.slice(0, 3).map((id, i) => (
          <button key={id} className="al-tile" aria-label={t('פתיחת תמונה {n}', { n: i + 1 })} onClick={() => props.onOpen(i)}>
            <Thumb id={id} size={240} />
          </button>
        ))}
      </div>
      <div className="al-loose-actions">
        {props.guess && (
          <button className="al-pill on" onClick={() => props.onAssign(props.guess!.placeId)}>
            {t('לשייך ל-{name}', { name: props.guess.name })}
          </button>
        )}
        <button className="al-pill" onClick={props.onOther}>{t('לבחור מקום אחר')}</button>
      </div>
    </div>
  )
}

function FirstTime({ dates, onAllow, onLater }: { dates: string; onAllow: () => void; onLater: () => void }) {
  return (
    <div className="al-first">
      <div className="al-hero" aria-hidden="true">
        <i /><i /><i />
      </div>
      <h2>{t('אלבום הטיול שלכם')}</h2>
      <p className="al-lead">{t('Toogo מסדר את התמונות מהטיול לפי ימים ומקומות, לבד.')}</p>
      <ul className="al-points">
        <li><Icon as={CalendarDays} /> {dates ? t('רק תמונות מתאריכי הטיול: {dates}', { dates }) : t('רק תמונות מתאריכי הטיול')}</li>
        <li><Icon as={MapPin} /> {t('המיקום בתמונה מראה איפה צילמתם')}</li>
        <li><Icon as={Lock} /> {t('שום דבר לא עולה לאינטרנט – רק אתם רואים')}</li>
      </ul>
      <button className="primary al-allow" onClick={onAllow}>
        {t('אפשרו גישה לתמונות')} <Icon as={Images} />
      </button>
      <button className="al-later" onClick={onLater}>{t('לא עכשיו')}</button>
    </div>
  )
}

function Denied() {
  return (
    <div className="al-state">
      <Icon as={Lock} size={28} />
      <h2>{t('אין גישה לתמונות')}</h2>
      <p>{t('כדי לבנות את האלבום Toogo צריך גישה לתמונות. אפשר לאשר אותה בהגדרות של האייפון.')}</p>
      <button className="primary" onClick={() => void albumOpenSettings()}>{t('פתיחת ההגדרות')}</button>
    </div>
  )
}

function Scanning() {
  return (
    <div className="al-state" role="status">
      <p>{t('מחפשים את התמונות מהטיול…')}</p>
      <div className="al-skel" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    </div>
  )
}

function Empty({ dates, limited, onMore }: { dates: string; limited: boolean; onMore: () => void }) {
  return (
    <div className="al-state">
      <Icon as={Images} size={28} />
      <h2>{t('אין עדיין תמונות מהטיול')}</h2>
      <p>
        {dates ? t('לא מצאנו תמונות מ-{dates}.', { dates }) : t('לא מצאנו תמונות מתאריכי הטיול.')}{' '}
        {limited ? t('נתתם גישה רק לחלק מהתמונות – אפשר לבחור עוד.') : t('אחרי שתצלמו, הן יופיעו כאן.')}
      </p>
      {limited && <button className="primary" onClick={onMore}>{t('לבחירת תמונות נוספות')}</button>}
    </div>
  )
}
