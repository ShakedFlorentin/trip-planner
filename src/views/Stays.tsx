import { useEffect, useState } from 'react'
import { BedDouble, Bus, CalendarRange, Lock, MapPin, Minus, Plus, Search, TrainFront, Wand2 } from 'lucide-react'
import { supabase } from '../supabase'
import { askSplit, suggestSplits, type NightCount, type SplitAlt } from '../stays'
import { TOGETHER, whoOptions, type Booking, type City, type StayAreaPick, type StayAreaRec, type TripStay } from '../types'
import { mutate } from '../lib'
import { isEn, t } from '../i18n'
import { AREAS, type Area } from '../areas'
import { hotelSearchUrl } from '../affiliate'
import { openExternal } from '../native'
import { Empty, Field, Sheet } from '../ui'
import { Icon } from '../icons'
import { cityName, stayLabel } from './planUtils'

const dayMs = 86400000
const nightsBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / dayMs)
const shortDate = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * dayMs).toISOString().slice(0, 10)

type Props = {
  tripId: string
  /** the date of the day the sheet was opened from: new stays start there */
  date: string
  couples: string[]
  stays: TripStay[]
  cities: City[]
  bookings: Booking[]
  /** false while the table isn't in the database yet */
  available: boolean
  /** where to sleep in each stretch with no hotel (the planner's summary.stay_areas) */
  recs: StayAreaRec[]
  /** how many adults and rooms a hotel search is for, by party (null = everyone) */
  people: (party: string | null) => { adults: number; rooms: number }
  onClose: () => void
}

/** "Where we sleep": the nights of each party in each city, before and after any hotel is booked. */
export default function StaysSheet({ tripId, date, couples, stays, cities, bookings, available, recs, people, onClose }: Props) {
  const [edit, setEdit] = useState<Partial<TripStay> | null>(null)
  const [split, setSplit] = useState(false)
  const [counting, setCounting] = useState(false)
  // everyone first, then each couple, then any other party a stay names
  const parties: (string | null)[] = [null, ...new Set([...whoOptions(couples), ...stays.map((s) => s.party).filter((p): p is string => !!p)])]

  return (
    <>
      <Sheet title={t('איפה ישנים')} onClose={onClose}>
        {[...recs]
          .sort((a, b) => a.check_in.localeCompare(b.check_in))
          .map((r) => (
            <StayRecCard key={`${r.party ?? ''}|${r.city}|${r.check_in}`} rec={r} cities={cities} people={people(r.party)} />
          ))}
        {!available && <Empty>{t('הלינה לפי עיר תהיה זמינה אחרי עדכון השרת. עד אז התוכנית קוראת את הזמנות המלון.')}</Empty>}
        {available && stays.length === 0 && <Empty>{t('עוד לא הוזנה לינה. הוסיפו עיר ולילות, והתוכנית תסתדר גם לפני שמזמינים מלון.')}</Empty>}
        {available &&
          parties.map((party) => {
            const mine = stays.filter((s) => (s.party ?? null) === party).sort((a, b) => a.check_in.localeCompare(b.check_in))
            return mine.length ? (
              <div key={party ?? 'all'} className="stack">
                <h3 className="plan-owner">
                  {t(party ?? TOGETHER)}
                </h3>
                {mine.map((s) => (
                  <button key={s.id} className="card stay-row" onClick={() => setEdit(s)}>
                    <div className="row spread">
                      <b>
                        <Icon as={BedDouble} /> {cityName(s.city, cities)}
                        {s.area ? ` · ${s.area}` : ''}
                      </b>
                      {s.locked && <Icon as={Lock} className="muted" />}
                    </div>
                    <div className="small muted">
                      {shortDate(s.check_in)} – {shortDate(s.check_out)} · {nights(nightsBetween(s.check_in, s.check_out))}
                    </div>
                    <div className="small">
                      <span className="who-pill">{s.status === 'confirmed' ? t('מאושר') : t('מוצע')}</span>{' '}
                      {s.booking_id && bookings.some((b) => b.id === s.booking_id) ? stayLabel(s, bookings, cities) : t('אין הזמנה עדיין, השעות הן הערכה')}
                    </div>
                  </button>
                ))}
              </div>
            ) : null
          })}
        {available && (
          <button
            className="primary"
            onClick={() => setEdit({ party: null, city: cities[0]?.id ?? 'tokyo', check_in: date || undefined, check_out: date ? addDays(date, 1) : undefined, status: 'proposed', locked: false })}
          >
            <Icon as={Plus} /> {t('הוספת לינה')}
          </button>
        )}
        {available && (
          <button onClick={() => setCounting(true)}>
            <Icon as={CalendarRange} /> {t('יודעים כמה לילות בכל עיר')}
          </button>
        )}
        {available && (
          <button onClick={() => setSplit(true)}>
            <Icon as={Wand2} /> {t('הצעה לחלוקת לילות')}
          </button>
        )}
      </Sheet>
      {split && <SplitSheet tripId={tripId} stays={stays} cities={cities} onClose={() => setSplit(false)} />}
      {counting && <NightsSheet tripId={tripId} stays={stays} cities={cities} onClose={() => setCounting(false)} />}
      {edit &&<StayForm tripId={tripId} couples={couples} cities={cities} bookings={bookings} stay={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

const nights = (n: number) => (n === 1 ? t('לילה אחד') : t('{n} לילות', { n }))

// ---- where to sleep (plan-trip/stay.ts): the recommended area of a stretch with no hotel

const areaName = (a: Area) => (isEn ? a.en : a.he)
const areaOfRec = (rec: StayAreaRec, key: string) => (AREAS[rec.areas_city] ?? []).find((a) => a.key === key)

/** The recommended area of the stretch that covers this night, by name; null when there is none. */
export function recommendedArea(recs: StayAreaRec[] | undefined, date: string, party: string | null = null) {
  const r = recs?.find((x) => x.check_in <= date && date < x.check_out && (x.party == null || x.party === party))
  const a = r && areaOfRec(r, r.best.key)
  return a ? areaName(a) : null
}

// the day-trip line an area's station has (shared/areas.ts HUBS), in words
const HUB: Record<string, { text: () => string; bus?: true }> = {
  fuji: { text: () => t('קרוב לאוטובוס לפוג׳י ולרכבת להקונה'), bus: true },
  nikko: { text: () => t('קרוב לרכבת לניקו') },
  kamakura: { text: () => t('קרוב לרכבת לקמקורה') },
  karuizawa: { text: () => t('קרוב לשינקנסן לקארואיזאווה') },
  yokohama: { text: () => t('קרוב לרכבת ליוקוהמה') },
  nara: { text: () => t('קרוב לרכבת לנארה') },
  osaka: { text: () => t('קרוב לרכבת לאוסקה') },
  kyoto: { text: () => t('קרוב לרכבת לקיוטו') },
  kobe: { text: () => t('קרוב לרכבת לקובה ולהימג׳י') },
  uji: { text: () => t('קרוב לרכבת לאוג׳י') },
  amanohashidate: { text: () => t('קרוב לרכבת לאמאנוהאשידטה') },
  koyasan: { text: () => t('קרוב לרכבת לקויאסן') },
}

/** Why this area, from the planner's numbers. */
function whyText(p: StayAreaPick, basis: StayAreaRec['basis']) {
  if (basis === 'central') return t('בסיס מרכזי עם רכבות לכל העיר. ההמלצה תתעדכן לפי המקומות שתאהבו.')
  if (!p.total) return t('הכי קרוב ליציאה לטיולי היום שלכם')
  if (p.total === 1) return p.near ? t('המקום שאהבתם כאן במרחק עד {m} דק׳', { m: p.within }) : t('הכי קרוב למקום שאהבתם כאן')
  if (p.near === p.total) return t('כל {total} המקומות שלכם כאן במרחק עד {m} דק׳', { total: p.total, m: p.within })
  return t('{n} מתוך {total} המקומות שלכם במרחק עד {m} דק׳', { n: p.near, total: p.total, m: p.within })
}

/**
 * "Recommended: sleep in Shinjuku": the area for all the nights of a stretch with no hotel, why, the two others as
 * chips (a tap shows that one instead), and a hotel search there with the stretch's dates and the party's size.
 */
function StayRecCard({ rec, cities, people }: { rec: StayAreaRec; cities: City[]; people: { adults: number; rooms: number } }) {
  const [sel, setSel] = useState<string | null>(null)
  const best = areaOfRec(rec, rec.best.key)
  if (!best) return null
  const others = rec.alternatives.filter((a) => areaOfRec(rec, a.key))
  const pick = others.find((a) => a.key === sel) ?? rec.best
  const area = areaOfRec(rec, pick.key)!
  return (
    <div className="card stay-rec">
      <div className="stay-rec-head">
        <span className="stay-rec-mark">
          <Icon as={MapPin} />
        </span>
        <div className="stay-rec-text">
          <b>{t('מומלץ לישון ב{area}', { area: areaName(best) })}</b>
          <span className="small muted">
            {rec.party ? `${t(rec.party)} · ` : ''}
            {cityName(rec.city, cities)} · {shortDate(rec.check_in)} – {shortDate(rec.check_out)} · {nights(rec.nights)}
          </span>
        </div>
      </div>
      <div className="stay-rec-why">
        <span>{whyText(pick, rec.basis)}</span>
        {pick.hubs.map((h) =>
          HUB[h] ? (
            <span key={h} className="stay-rec-hub">
              <Icon as={HUB[h].bus ? Bus : TrainFront} /> {HUB[h].text()}
            </span>
          ) : null,
        )}
      </div>
      {others.length > 0 && (
        <div className="stay-rec-alts" role="group" aria-label={t('אזורים נוספים')}>
          <span className="small muted">{t('או:')}</span>
          {others.map((o) => (
            <button key={o.key} className={'chip' + (sel === o.key ? ' on' : '')} aria-pressed={sel === o.key} onClick={() => setSel(sel === o.key ? null : o.key)}>
              {areaName(areaOfRec(rec, o.key)!)}
            </button>
          ))}
        </div>
      )}
      <button
        className="primary"
        onClick={() => openExternal(hotelSearchUrl({ search: area.search, checkIn: rec.check_in, checkOut: rec.check_out, ...people }))}
      >
        <Icon as={Search} />
        <span>{t('חיפוש מלון ב{area}', { area: areaName(area) })}</span>
      </button>
    </div>
  )
}

/** Why an alternative is worth considering, in words. */
function reasonText(r: SplitAlt['reason']) {
  const places = t('{n} מתוך {total} המקומות שאהבתם', { n: r.coveredPlaces, total: r.totalPlaces })
  const moves = r.moves === 0 ? t('בלי החלפת מלון') : r.moves === 1 ? t('החלפת מלון אחת') : t('{n} החלפות מלון', { n: r.moves })
  // nothing liked yet: the split comes from what each city is usually worth, so there are no places to count
  if (!r.totalPlaces) {
    if (r.kind === 'fewer_moves') return t('הכי פחות החלפות מלון: {moves}.', { moves })
    if (r.kind === 'more_places') return t('יותר ערים באותו טיול: {moves}.', { moves })
    return t('חלוקה מקובלת לטיול באורך הזה: {moves}.', { moves })
  }
  if (r.kind === 'fewer_moves') return t('הכי פחות החלפות מלון: {moves}. {places}.', { moves, places })
  if (r.kind === 'more_places') return t('מכסה הכי הרבה ממה שאהבתם: {places}. {moves}.', { moves, places })
  return t('איזון בין מקומות להחלפות: {places}. {moves}.', { moves, places })
}

/** Replaces the planner's earlier proposals with this split. Confirmed, locked and typed-in stays are never touched. */
async function saveSplit(tripId: string, stays: TripStay[], a: SplitAlt) {
  const old = stays.filter((s) => s.source === 'auto' && s.status === 'proposed' && !s.locked).map((s) => s.id)
  return (
    (!old.length || (await mutate(supabase.from('trip_stays').delete().in('id', old)))) &&
    (await mutate(
      supabase.from('trip_stays').insert(
        a.rows.map((r) => ({ trip_id: tripId, party: r.party, city: r.city, check_in: r.checkIn, check_out: r.checkOut, status: 'proposed', locked: false, source: 'auto' })),
      ),
    ))
  )
}

/** One way to split the nights: each run of nights, why it is a good choice, and "use this". */
function AltCard({ a, cities, saving, onUse, why = true }: { a: SplitAlt; cities: City[]; saving: boolean; onUse: () => void; why?: boolean }) {
  return (
    <div className="card stack">
      {a.rows.map((r, k) => (
        <div key={k} className="row spread">
          <b>
            <Icon as={BedDouble} /> {cityName(r.city, cities)}
          </b>
          <span className="small muted">
            {r.party ? `${t(r.party)} · ` : ''}
            {shortDate(r.checkIn)} – {shortDate(r.checkOut)} · {nights(r.nights)}
          </span>
        </div>
      ))}
      {why && <div className="small muted">{reasonText(a.reason)}</div>}
      {!!a.reason.added?.length && (
        <div className="small muted">{t('כולל את {cities}, שלא בחרתם.', { cities: a.reason.added.map((c) => cityName(c, cities)).join(', ') })}</div>
      )}
      {!!a.reason.offSeason?.length && (
        <div className="small muted">{t('{cities}: פחות מומלץ בעונה הזו.', { cities: a.reason.offSeason.map((c) => cityName(c, cities)).join(', ') })}</div>
      )}
      {!!a.reason.ruleBreaks && <div className="small muted">{t('אפשר, אבל המסלול פחות נוח: יש בו נסיעה ארוכה ללילה או שניים, או חזרה לאזור שכבר הייתם בו.')}</div>}
      {a.reason.dayTrips.map((d) => (
        <div key={d.city} className="small muted">
          {t('טיול יום ל{city} מ{from}: {n} מקומות', { city: cityName(d.city, cities), from: cityName(d.from, cities), n: d.places })}
        </div>
      ))}
      <button className="primary" disabled={saving} onClick={onUse}>
        {t('להשתמש בזה')}
      </button>
    </div>
  )
}

/** "Suggest a split": 2-3 ways to spread the open nights between cities; "use this" saves one as proposed stays. */
function SplitSheet({ tripId, stays, cities, onClose }: { tripId: string; stays: TripStay[]; cities: City[]; onClose: () => void }) {
  const [alts, setAlts] = useState<SplitAlt[] | 'loading' | 'error'>('loading')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let live = true
    suggestSplits(tripId).then((a) => live && setAlts(a ?? 'error'))
    return () => {
      live = false
    }
  }, [tripId])

  const use = async (a: SplitAlt) => {
    setSaving(true)
    const ok = await saveSplit(tripId, stays, a)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Sheet title={t('הצעה לחלוקת לילות')} onClose={onClose}>
      {alts === 'loading' && <Empty>{t('מחשבים חלוקות אפשריות…')}</Empty>}
      {alts === 'error' && <Empty>{t('לא הצלחנו להציע חלוקה כרגע. נסו שוב עוד רגע.')}</Empty>}
      {Array.isArray(alts) && alts.length === 0 && <Empty>{t('אין לילות פתוחים לחלוקה, או שעוד אין ערים להציע.')}</Empty>}
      {Array.isArray(alts) && alts.map((a, i) => <AltCard key={i} a={a} cities={cities} saving={saving} onUse={() => use(a)} />)}
      {Array.isArray(alts) && alts.some((a) => a.reason.typical) && (
        <div className="small muted">{t('ההצעה מתבססת על מה שמקובל בכל עיר. ככל שתאהבו עוד מקומות בגילוי, היא תתאים לכם יותר.')}</div>
      )}
      {Array.isArray(alts) && alts.length > 0 && <div className="small muted">{t('נשמר כהצעה בלבד, רק בלילות הפנויים. לינות מאושרות ונעולות לא משתנות.')}</div>}
    </Sheet>
  )
}

/**
 * "We know how many nights in each city": the cities and their nights (filled in with the planner's own suggestion to
 * start from), then the planner chooses the order and the dates by the flights and the route, keeping the counts.
 */
function NightsSheet({ tripId, stays, cities, onClose }: { tripId: string; stays: TripStay[]; cities: City[]; onClose: () => void }) {
  const [open, setOpen] = useState<number | null | 'error'>(null)
  const [counts, setCounts] = useState<NightCount[]>([])
  const [alts, setAlts] = useState<SplitAlt[] | 'loading' | 'error' | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let live = true
    askSplit(tripId).then((r) => {
      if (!live) return
      if (!r || r.openNights == null) return setOpen('error')
      setOpen(r.openNights)
      // start from the planner's own split: each city once, with all its nights, in the order it comes
      const first = r.alternatives[0]
      const start: NightCount[] = []
      for (const row of first?.rows ?? []) {
        const c = start.find((x) => x.city === row.city)
        if (c) c.nights = Math.max(c.nights, row.nights)
        else start.push({ city: row.city, nights: row.nights })
      }
      setCounts(start)
    })
    return () => {
      live = false
    }
  }, [tripId])

  const total = counts.reduce((s, c) => s + c.nights, 0)
  const free = typeof open === 'number' ? open : 0
  const change = (city: string, d: number) => {
    setAlts(null)
    setCounts((xs) => xs.map((x) => (x.city === city ? { ...x, nights: x.nights + d } : x)).filter((x) => x.nights > 0))
  }
  const add = (city: string) => {
    if (!city) return
    setAlts(null)
    setCounts((xs) => [...xs, { city, nights: 1 }])
  }
  const order = async () => {
    setAlts('loading')
    const r = await askSplit(tripId, counts)
    setAlts(r ? r.alternatives : 'error')
  }
  const use = async (a: SplitAlt) => {
    setSaving(true)
    const ok = await saveSplit(tripId, stays, a)
    setSaving(false)
    if (ok) onClose()
  }
  const unused = cities.filter((c) => !counts.some((x) => x.city === c.id)).sort((a, b) => cityName(a.id, cities).localeCompare(cityName(b.id, cities)))

  return (
    <Sheet title={t('כמה לילות בכל עיר')} onClose={onClose}>
      {open === null && <Empty>{t('בודקים כמה לילות פנויים…')}</Empty>}
      {open === 'error' && <Empty>{t('לא הצלחנו לבדוק כרגע. נסו שוב עוד רגע.')}</Empty>}
      {open === 0 && <Empty>{t('כל הלילות כבר סגורים. אין מה לחלק.')}</Empty>}
      {free > 0 && (
        <>
          <p className="small muted">{t('מסמנים כמה לילות בכל עיר. את הסדר והתאריכים נסדר לפי הטיסות והמסלול.')}</p>
          <div className="stack">
            {counts.map((c) => (
              <div key={c.city} className="card nights-row">
                <b>{cityName(c.city, cities)}</b>
                <div className="nights-step">
                  <button aria-label={t('לילה אחד פחות ב{city}', { city: cityName(c.city, cities) })} onClick={() => change(c.city, -1)}>
                    <Icon as={Minus} />
                  </button>
                  <span aria-live="polite">{nights(c.nights)}</span>
                  <button aria-label={t('עוד לילה ב{city}', { city: cityName(c.city, cities) })} disabled={total >= free} onClick={() => change(c.city, 1)}>
                    <Icon as={Plus} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {unused.length > 0 && counts.length < 8 && (
            <Field label={t('הוספת עיר')}>
              <select value="" onChange={(e) => add(e.target.value)} disabled={total >= free}>
                <option value="">{t('בחירת עיר…')}</option>
                {unused.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cityName(c.id, cities)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <p className={'small' + (total > free ? ' msg' : ' muted')}>
            {t('{n} מתוך {total} לילות פנויים', { n: total, total: free })}
            {total < free && total > 0 && ' · ' + t('את השאר נשלים לפי מה שמתאים')}
          </p>
          {alts === null && (
            <button className="primary" disabled={!total || total > free} onClick={order}>
              <Icon as={Wand2} /> {t('לסדר לפי הטיסות')}
            </button>
          )}
          {alts === 'loading' && <Empty>{t('מסדרים…')}</Empty>}
          {alts === 'error' && <Empty>{t('לא הצלחנו לסדר כרגע. נסו שוב עוד רגע.')}</Empty>}
          {Array.isArray(alts) && alts.length === 0 && <Empty>{t('לא מצאנו סדר שמתאים למספרים האלה.')}</Empty>}
          {Array.isArray(alts) && alts.map((a, i) => <AltCard key={i} a={a} cities={cities} saving={saving} onUse={() => use(a)} why={false} />)}
          {Array.isArray(alts) && alts.length > 0 && <div className="small muted">{t('נשמר כהצעה, רק בלילות הפנויים. אפשר לשנות כל לינה אחר כך.')}</div>}
        </>
      )}
    </Sheet>
  )
}

function StayForm(props: { tripId: string; couples: string[]; cities: City[]; bookings: Booking[]; stay: Partial<TripStay>; onClose: () => void }) {
  const { stay, cities } = props
  const [f, setF] = useState<Partial<TripStay>>(stay)
  const set = <K extends keyof TripStay>(k: K, v: TripStay[K] | undefined) => setF((x) => ({ ...x, [k]: v }))
  const hotels = props.bookings.filter((b) => b.kind === 'hotel')

  /** Linking a hotel booking: its dates fill what is empty, and the stay becomes a confirmed one. */
  const link = (id: string) => {
    const b = hotels.find((x) => x.id === id)
    setF((x) => ({
      ...x,
      booking_id: id || null,
      ...(b
        ? {
            check_in: x.check_in ?? b.starts_at?.slice(0, 10),
            check_out: x.check_out ?? b.ends_at?.slice(0, 10),
            party: x.party ?? b.who ?? null,
            status: 'confirmed' as const,
          }
        : {}),
    }))
  }

  const save = async () => {
    if (!f.city || !f.check_in || !f.check_out) return
    if (f.check_out <= f.check_in) return alert(t('הצ׳ק-אאוט חייב להיות אחרי הצ׳ק-אין.'))
    const row = {
      party: f.party || null,
      city: f.city,
      area: f.area?.trim() || null,
      check_in: f.check_in,
      check_out: f.check_out,
      status: f.status ?? 'proposed',
      locked: !!f.locked,
      booking_id: f.booking_id || null,
    }
    const ok = await mutate(
      f.id ? supabase.from('trip_stays').update(row).eq('id', f.id) : supabase.from('trip_stays').insert({ ...row, trip_id: props.tripId, source: 'manual' }),
    )
    if (ok) props.onClose()
  }
  const remove = async () => {
    if (f.id && confirm(t('למחוק?')) && (await mutate(supabase.from('trip_stays').delete().eq('id', f.id)))) props.onClose()
  }

  return (
    <Sheet title={f.id ? t('עריכת לינה') : t('הוספת לינה')} onClose={props.onClose}>
      <Field label={t('של מי')}>
        <select value={f.party ?? ''} onChange={(e) => set('party', e.target.value || null)}>
          <option value="">{t(TOGETHER)}</option>
          {[...new Set([...whoOptions(props.couples), ...(f.party ? [f.party] : [])])].map((c) => (
            <option key={c} value={c}>
              {t('רק {who}', { who: t(c) })}
            </option>
          ))}
        </select>
      </Field>
      <div className="chips scroll" role="group" aria-label={t('עיר')}>
        {cities.map((c) => (
          <button key={c.id} className={'chip' + (f.city === c.id ? ' on' : '')} aria-pressed={f.city === c.id} onClick={() => set('city', c.id)}>
            {cityName(c.id, cities)}
          </button>
        ))}
      </div>
      <Field label={t('אזור או שכונה (לא חובה)')}>
        <input value={f.area ?? ''} onChange={(e) => set('area', e.target.value)} dir="auto" />
      </Field>
      <div className="row">
        <Field label={t('צ׳ק-אין')}>
          <input type="date" value={f.check_in ?? ''} onChange={(e) => set('check_in', e.target.value)} />
        </Field>
        <Field label={t('צ׳ק-אאוט')}>
          <input type="date" value={f.check_out ?? ''} onChange={(e) => set('check_out', e.target.value)} />
        </Field>
      </div>
      {f.check_in && f.check_out && f.check_out > f.check_in && <div className="small muted">{nights(nightsBetween(f.check_in, f.check_out))}</div>}
      <div className="chips" role="group" aria-label={t('סטטוס')}>
        {(['proposed', 'confirmed'] as const).map((s) => (
          <button key={s} className={'chip' + ((f.status ?? 'proposed') === s ? ' on' : '')} aria-pressed={(f.status ?? 'proposed') === s} onClick={() => set('status', s)}>
            {s === 'confirmed' ? t('מאושר') : t('מוצע')}
          </button>
        ))}
        <button className={'chip' + (f.locked ? ' on' : '')} aria-pressed={!!f.locked} onClick={() => set('locked', !f.locked)}>
          <Icon as={Lock} /> {t('נעול')}
        </button>
      </div>
      <div className="small muted">{t('נעול: התוכנית לא תזיז את הלינה הזו.')}</div>
      {hotels.length > 0 && (
        <Field label={t('הזמנת מלון')}>
          <select value={f.booking_id ?? ''} onChange={(e) => link(e.target.value)}>
            <option value="">{t('ללא הזמנה')}</option>
            {hotels.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
                {b.starts_at ? ` · ${shortDate(b.starts_at.slice(0, 10))}` : ''}
              </option>
            ))}
          </select>
        </Field>
      )}
      <button className="primary" onClick={save}>
        {t('שמירה')}
      </button>
      {f.id && (
        <button className="danger" onClick={remove}>
          {t('מחיקה')}
        </button>
      )}
    </Sheet>
  )
}
