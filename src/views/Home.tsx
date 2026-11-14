import { useEffect, useState, type ReactNode } from 'react'
import ReadyLine from './Ready'
import {
  BedDouble,
  Check,
  ChevronLeft,
  Clock,
  Copy,
  Languages,
  Layers,
  ListChecks,
  Navigation,
  Share2,
  ShieldAlert,
  Ticket,
  UserPlus,
  Wallet,
} from 'lucide-react'
import { supabase } from '../supabase'
import QuickFab from './QuickFab'
import { requestAdd } from '../quickAdd'
import {
  BOOKING_KINDS,
  BOOKING_TABS,
  itemDone,
  CITY_HE,
  TOGETHER,
  type Booking,
  type Candidate,
  type ChecklistItem,
  type DayInfo,
  type ItineraryItem,
  type Member,
  type Swipe,
  type Trip,
} from '../types'
import { cityLabel, couplesOf, currentDay, dayDate, dayParts, errorText, fmtDay, fmtDayLong, mutate, useTripTable } from '../lib'
import { locale, t } from '../i18n'
import { cityColor, cityPhoto } from '../cities'
import { BOOKING_ICON, Icon } from '../icons'
import type { MoreTab } from './More'
import { useStays } from '../stays'
import { dayEntries, fmtUntil, hotelFor, nightLines, stayInJapan, minutesOf, navUrl, ymd, type Entry, type PlanItem } from './planUtils'
import ReviewCard from './Review'
import { EveningRate } from './Places'
import { appUrl } from '../native'
import { RingsIcon } from '../rings'
import '../styles/plan.css'

type Props = {
  trip: Trip
  members: Member[]
  me: string
  userId: string
  onOpenDay: (d: number) => void
  /** open one of the menu's screens (money, lists, emergency, translate) over Home */
  onOpenMore: (sub: MoreTab) => void
  onOpenPlaces: () => void
  /** the trip has no dates yet: open settings, where they are picked */
  onOpenSettings: () => void
}

export default function Home({ trip, members, userId, onOpenDay, onOpenMore, onOpenPlaces, onOpenSettings }: Props) {
  const { rows: days } = useTripTable<DayInfo>('day_info', trip.id, 'day')
  const { rows: items } = useTripTable<PlanItem>('itinerary_items', trip.id, 'sort')
  const { rows: bookings } = useTripTable<Booking>('bookings', trip.id, 'starts_at')
  const { stays, cities: stayCities } = useStays(trip.id)
  const { rows: todos } = useTripTable<ChecklistItem>('checklist_items', trip.id)
  const { rows: candidates } = useTripTable<Candidate>('candidates', trip.id)
  const { rows: swipes } = useTripTable<Swipe>('swipes', trip.id)
  const now = useNow()

  const today = currentDay(trip.start_date, trip.num_days)
  // count on Tokyo's calendar, not the phone's: abroad the local date can differ from Japan's
  const tokyoDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
  const daysLeft = trip.start_date ? Math.round((Date.parse(trip.start_date) - Date.parse(tokyoDate)) / 86400000) : null
  const tokyoTime = now.toLocaleTimeString(locale, { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
  const couples = couplesOf(members)
  const myCouple = members.find((m) => m.user_id === userId)?.couple ?? null
  const todayInfo = days.find((d) => d.day === today)
  const entries = today ? dayEntries(items, bookings, today, ymd(dayDate(trip.start_date, today)!), 'mine', myCouple) : []
  const nowHM = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  // the next thing still ahead today; untimed items wait their turn after the timed ones
  const next = entries.find((e) => !e.done && e.time && e.time >= nowHM) ?? entries.find((e) => !e.done && !e.time)
  const rest = entries.filter((e) => e !== next && e.item && !e.done)
  const todayBookings = entries.filter((e) => e.booking)
  const tonight = today
    ? hotelFor(nightLines(todayInfo?.hotel ?? null, bookings, ymd(dayDate(trip.start_date, today)!), couples, stays, stayCities), myCouple)
    : []
  const cities = runs(days, 'city')
  const destinations = Object.entries(
    candidates.reduce<Record<string, number>>((acc, c) => ((acc[c.city] = (acc[c.city] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1])
  const together = runs(days, 'who')
  // the hero's city: today's during the trip, else the route's first
  const firstRun = cities.find((c) => c.value)
  const heroCity = (today ? todayInfo?.city : firstRun?.value)?.split(' / ')[0] ?? ''
  const heroFrom = firstRun?.from ?? 1
  const heroPhoto = heroCity ? cityPhoto(heroCity) : null

  return (
    <div className="stack">
      {/* the top of Home is a large photo tile, Apple Music style (19): before the trip the first city, its country and the
          countdown; during the trip the day's city and date. A city with no photo gets its plain colour tile */}
      {heroCity ? (
        <button className={'city-tile hero-tile c' + cityColor(heroCity) + (heroPhoto ? ' has-photo' : '')} onClick={() => onOpenDay(today ?? heroFrom)}>
          {heroPhoto && <img src={heroPhoto} alt="" draggable={false} />}
          <span className="hero-kicker small">{today ? t('היום') : t('יפן')}</span>
          <b>{cityLabel(heroCity)}</b>
          <span className="hero-line">
            {today
              ? fmtDayLong(dayDate(trip.start_date, today))
              : daysLeft !== null && daysLeft > 0
                ? t('עוד {days}', { days: daysLabel(daysLeft) })
                : daysLeft !== null
                  ? t('הטיול הסתיים')
                  : ''}
          </span>
          <span className="hero-clock small">
            <Icon as={Clock} /> {t('עכשיו ביפן: {time}', { time: tokyoTime })}
          </span>
        </button>
      ) : (
        <section className="hero card">
          {daysLeft !== null && daysLeft > 0 ? (
            <>
              <div className="big">{daysLabel(daysLeft)}</div>
              <div className="muted">{t('להמראה')}</div>
            </>
          ) : today ? (
            // during the trip with no city set for the day: which day it is, not "the trip is over"
            <div className="big">{t('יום {n} מתוך {total}', { n: today, total: trip.num_days })}</div>
          ) : daysLeft !== null ? (
            <div className="big">{t('הטיול הסתיים')}</div>
          ) : (
            <>
              <div className="muted">{t('עוד אין תאריך יציאה')}</div>
              <button className="link" onClick={onOpenSettings}>
                {t('קבעו תאריך התחלה')}
              </button>
            </>
          )}
          <div className="clock">
            <Icon as={Clock} /> {t('עכשיו ביפן: {time}', { time: tokyoTime })}
          </div>
        </section>
      )}

      <ReadyLine trip={trip} />

      <ReviewCard tripId={trip.id} userId={userId} />

      {today && (
        <>
          <NextCard next={next} nowHM={nowHM} hasPlan={entries.length > 0} leftCount={rest.length} onOpenDay={() => onOpenDay(today)} />

          {nowHM >= '18:00' && <EveningRate trip={trip} userId={userId} />}

          {tonight.length > 0 && (
            <section className="card">
              <h3>
                <Icon as={BedDouble} /> {t('הלילה במלון')}
              </h3>
              {tonight.map((t) => (
                <div key={t}>{t}</div>
              ))}
            </section>
          )}

          {todayBookings.length > 0 && (
            <section className="card">
              <h3>{t('ההזמנות להיום')}</h3>
              {todayBookings.map((e) => (
                <TodayRow key={e.key} e={e} past={!!e.time && e.time < nowHM} />
              ))}
            </section>
          )}

          {rest.length > 0 && (
            <section className="card">
              <h3>{t('שאר היום')}</h3>
              {rest.map((e) => (
                <TodayRow key={e.key} e={e} past={!!e.time && e.time < nowHM} />
              ))}
              <button className="link" onClick={() => onOpenDay(today)}>
                {t('לתוכנית המלאה')} <Icon as={ChevronLeft} className="flip-ltr" />
              </button>
            </section>
          )}
        </>
      )}

      {!today && daysLeft !== null && daysLeft > 0 && (
        <BeforeTrip
          days={days}
          numDays={trip.num_days}
          start={trip.start_date}
          couples={couples}
          myCouple={myCouple}
          bookings={bookings}
          todos={todos}
          open={() => onOpenMore('lists')}
          swipesLeft={candidates.filter((c) => !swipes.some((s) => s.user_id === userId && s.candidate_id === c.id)).length}
        />
      )}

      <div className="shortcuts">
        <button className="secondary" onClick={() => onOpenMore('info')}>
          <Icon as={ShieldAlert} /> {t('חירום')}
        </button>
        <button className="secondary" onClick={() => onOpenMore('say')}>
          <Icon as={Languages} /> {t('תרגום')}
        </button>
        <button className="secondary" onClick={() => onOpenMore('money')}>
          <Icon as={Wallet} /> {t('הוצאות')}
        </button>
      </div>

      {together.some((run) => run.value) && (
        <section className="card">
          <h3>{t('ביחד ולחוד')}</h3>
          <div className="route">
            {together.map((run) => (
              <button key={run.from} className={'route-stop' + (run.value ? ' apart' : ' together')} onClick={() => onOpenDay(run.from)}>
                {/* the rings get a column of their own, so every name and date starts at the same line */}
                <span className="route-ic">{run.value ? <RingsIcon one /> : <RingsIcon />}</span>
                <b>{run.value ? t('רק {who}', { who: t(run.value) }) : t(TOGETHER)}</b>
                <span className="muted small">
                  {fmtDay(dayDate(trip.start_date, run.from))}
                  {run.to !== run.from && ` – ${fmtDay(dayDate(trip.start_date, run.to))}`} · {daysLabel(run.to - run.from + 1)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {cities.some((c) => c.value) ? (
        <section>
          <h3 className="shelf-title">{t('המסלול')}</h3>
          <div className="city-grid">
            {cities.map((c, i) => (
              <CityTile
                key={c.from}
                // a city already on the route earlier: "חזרה לטוקיו" (15)
                name={cities.slice(0, i).some((p) => p.value === c.value) && c.value ? t('חזרה ל{city}', { city: cityLabel(c.value) }) : cityLabel(c.value) || '—'}
                slug={c.value}
                onClick={() => onOpenDay(c.from)}
              >
                {c.from === c.to ? (
                  fmtDay(dayDate(trip.start_date, c.from)) || t('יום {day}', { day: c.from })
                ) : trip.start_date ? (
                  <bdi dir="ltr">
                    {dayParts(dayDate(trip.start_date, c.from))!.date}–{dayParts(dayDate(trip.start_date, c.to))!.date}
                  </bdi>
                ) : (
                  <>
                    {t('ימים')} <bdi dir="ltr">{c.from}–{c.to}</bdi>
                  </>
                )}
              </CityTile>
            ))}
          </div>
        </section>
      ) : (
        destinations.length > 0 && (
          // no day has a city yet: show where the swipe deck's places are instead
          <section>
            <h3 className="shelf-title">{t('היעדים')}</h3>
            <div className="city-grid">
              {destinations.map(([city, n]) => (
                <CityTile key={city} name={cityLabel(CITY_HE[city] ?? city)} slug={city} onClick={onOpenPlaces}>
                  {n === 1 ? t('מקום אחד') : t('{n} מקומות', { n })}
                </CityTile>
              ))}
            </div>
          </section>
        )
      )}

      <section className="card">
        <h3>{t('משתתפים')}</h3>
        <div className="chips">
          {members.map((m) => (
            <span key={m.user_id} className="chip">
              {m.display_name}
              {m.user_id === userId && ` ${t('(אני)')}`}
            </span>
          ))}
        </div>
        <InviteFriend trip={trip} />
      </section>

      {/* a tap adds a place (as on Places); press and drag for the wheel: expense, list item or booking */}
      <QuickFab label={t('הוספת מקום')} onTap={() => requestAdd('place')} />
    </div>
  )
}

/**
 * New people join by invitation only: each tap makes a one-time link (good for 30 days) that opens a sign-up and
 * leads into this trip. Someone who already has an account joins with the trip code instead.
 */
function InviteFriend({ trip }: { trip: Trip }) {
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)

  const send = async (url: string) => {
    const text = `${t('הצטרפו לתכנון הטיול שלנו ב-Toogo')}\n${url}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return setNote('')
      } catch (e) {
        // cancelled: the link stays on screen to send later
        if ((e as Error).name === 'AbortError') return
        // otherwise (Safari wants a fresh tap after the wait for the server) copy it instead
      }
    }
    copy(text, t('הקישור הועתק, אפשר להדביק בהודעה'))
  }

  const copy = (text: string, done: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => setNote(done))
      .catch(() => setNote(t('אפשר להעתיק את הקישור מכאן')))

  const invite = async () => {
    setNote('')
    // the link needs the code the server makes: an invite saved offline would come back without one
    if (!navigator.onLine) return setNote(t('אין אינטרנט. נסו שוב כשיש קליטה.'))
    setBusy(true)
    const { data, error } = await supabase.from('invites').insert({ trip_id: trip.id }).select('code').single()
    setBusy(false)
    const code = (data as { code?: string } | null)?.code
    if (error?.message.includes('invite limit reached')) return setNote(t('שלחתם 10 הזמנות השבוע. אפשר להזמין עוד בשבוע הבא.'))
    if (error || !code) return setNote(error ? errorText(error.message) : t('אין אינטרנט. נסו שוב כשיש קליטה.'))
    const url = `${appUrl()}?invite=${encodeURIComponent(code)}`
    setLink(url)
    send(url)
  }

  return (
    <div className="invite">
      <button className="secondary" onClick={invite} disabled={busy}>
        <Icon as={UserPlus} /> {busy ? t('יוצרים קישור…') : link ? t('הזמנת חבר נוסף') : t('הזמנת חבר')}
      </button>
      <p className="muted small">{t('קישור לאדם אחד, בתוקף 30 יום')}</p>
      {link && (
        <div className="row nowrap invite-link">
          <input readOnly value={link} dir="ltr" aria-label={t('קישור ההזמנה')} onFocus={(e) => e.target.select()} />
          <button className="icon" onClick={() => send(link)} aria-label={t('שליחת הקישור')}>
            <Icon as={Share2} />
          </button>
        </div>
      )}
      {note && (
        <p className="small" role="status">
          {note}
        </p>
      )}
      <p className="muted small">
        {t('למי שכבר יש חשבון: קוד הטיול')}{' '}
        <button
          className="invite-code"
          onClick={() => {
            copy(trip.join_code, t('הקוד הועתק'))
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          aria-label={t('העתקת קוד הטיול')}
        >
          <span className="code" dir="ltr">
            {trip.join_code}
          </span>
          <Icon as={copied ? Check : Copy} />
        </button>
      </p>
    </div>
  )
}

/** A Music Search-style tile: the destination's photo washed in one colour, or plain colour until it has one. */
function CityTile(props: { name: string; slug?: string; onClick: () => void; children: ReactNode }) {
  const photo = cityPhoto(props.slug ?? props.name)
  return (
    <button className={'city-tile c' + cityColor(props.slug ?? props.name) + (photo ? ' has-photo' : '')} onClick={props.onClick}>
      {photo && <img src={photo} alt="" loading="lazy" draggable={false} />}
      <b dir="auto">{props.name}</b>
      <span className="small">{props.children}</span>
    </button>
  )
}

/** Hero for trip days: what is next, how long until it, and a one-tap route there. */
function NextCard(props: { next?: Entry; nowHM: string; hasPlan: boolean; leftCount: number; onOpenDay: () => void }) {
  const { next, nowHM } = props
  if (!next)
    return (
      <section className="card">
        <h3>{!props.hasPlan ? t('אין עדיין תוכנית להיום') : props.leftCount ? t('אין עוד פעילויות עם שעה') : t('סיימתם להיום')}</h3>
        <p className="muted">
          {props.hasPlan
            ? props.leftCount
              ? (props.leftCount === 1 ? t('נשארה פעילות אחת שלא סומנה.') : t('נשארו {n} פעילויות שלא סומנו.', { n: props.leftCount }))
              : t('אין עוד פעילויות להיום.')
            : t('אפשר להוסיף מקום מלשונית מקומות, או לכתוב פעילות בתוכנית.')}
        </p>
        <button className="link" onClick={props.onOpenDay}>
          {t('לתוכנית של היום')} <Icon as={ChevronLeft} className="flip-ltr" />
        </button>
      </section>
    )
  const i = next.item
  return (
    <section className="card next-card">
      <div className="next-label">{t('הבא')}{next.time && ` · ${fmtUntil(minutesOf(next.time) - minutesOf(nowHM))}`}</div>
      {next.time && <div className="next-time">{next.time}</div>}
      <div className="next-title">
        <Icon as={next.icon} /> {next.title}
      </div>
      {next.sub && <div className="muted">{next.sub}</div>}
      {next.location && (
        <a className="primary" href={navUrl(next.location)} target="_blank" rel="noreferrer">
          <Icon as={Navigation} /> {t('ניווט')}
        </a>
      )}
      {i && (
        <button className="secondary" onClick={() => mutate(supabase.from('itinerary_items').update({ done: true }).eq('id', i.id))}>
          <Icon as={Check} /> {t('בוצע')}
        </button>
      )}
    </section>
  )
}

function TodayRow({ e, past }: { e: Entry; past: boolean }) {
  return (
    <div className={'today-row' + (past ? ' past' : '')}>
      <span className="time">{e.time ?? '—'}</span>
      <span>
        <Icon as={e.icon} /> {e.title}
      </span>
    </div>
  )
}

/** A few things worth doing before the flight: lists, what's still unbooked, cards left to swipe. */
function BeforeTrip(props: {
  days: DayInfo[]
  numDays: number
  start: string | null
  couples: string[]
  myCouple: string | null
  bookings: Booking[]
  todos: ChecklistItem[]
  swipesLeft: number
  open: () => void
}) {
  const { bookings, couples, days } = props
  const todo = props.todos.filter((t) => t.list === 'todo')
  const left = todo.filter((t) => !itemDone(t, props.myCouple)).length
  const counts = ['flight', 'hotel', 'restaurant', 'activity'].map((k) => ({ k, n: bookings.filter((b) => b.kind === k).length }))
  // only the kinds that have bookings: "0 מסעדות" says nothing
  const shown = counts.filter((c) => c.n > 0)
  const mine = props.myCouple

  // each couple needs a roof for its own nights in Japan: from landing to the night before its flight out. Without
  // both flights, fall back to the trip's days minus the other couple's days alone (and not the last day)
  const missing = [...couples]
    .sort((a, b) => Number(b === mine) - Number(a === mine))
    .map((c) => {
      const stay = stayInJapan(bookings, c)
      const nights = Array.from({ length: Math.max(props.numDays - (stay ? 0 : 1), 0) }, (_, i) => i + 1)
        .map((day) => ({ day, date: props.start ? ymd(dayDate(props.start, day)!) : '', info: days.find((d) => d.day === day) }))
        .filter(({ date, info }) => (stay ? date >= stay.from && date < stay.to : !info?.who || info.who === c))
      const uncovered = nights.filter(
        ({ date, info }) => !hotelFor(nightLines(info?.hotel ?? null, bookings, date, couples), c).length,
      )
      return { c, n: uncovered.length, of: nights.length }
    })
    .filter((m) => m.n > 0)
  const noFlight = couples.filter((c) => !bookings.some((b) => b.kind === 'flight' && (!b.who || b.who === c)))
  const gaps = [
    ...noFlight.map((c) => t('אין טיסה ל{who}', { who: t(c) })),
    ...(missing.length ? [t('חסרה לינה: {list}', { list: missing.map((m) => t('{who} {n} מתוך {of} לילות', { who: t(m.c), n: m.n, of: m.of })).join(' · ') })] : []),
  ]

  if (!todo.length && !bookings.length && !gaps.length && !props.swipesLeft) return null
  return (
    <section className="card">
      <h3>{t('לפני הטיול')}</h3>
      {todo.length > 0 && (
        <button className="todo-row" onClick={props.open}>
          <span className="tile neutral"><Icon as={ListChecks} /></span>
          <span className="todo-grow">
            <b>
              {!left
                ? t('הכל מוכן לטיסה ✓')
                : left === 1
                  ? t('לפני הטיסה: נותרה משימה אחת מתוך {total}', { total: todo.length })
                  : t('לפני הטיסה: נותרו {n} מתוך {total} משימות', { n: left, total: todo.length })}
            </b>
            {left > 0 && (
              <span className="bar thin">
                <span style={{ width: `${((todo.length - left) / todo.length) * 100}%` }} />
              </span>
            )}
          </span>
        </button>
      )}
      <div className="todo-row">
        <span className="tile neutral"><Icon as={Ticket} /></span>
        <span>
          {shown.length ? (
            <b className="count-chips">
              {shown.map(({ k, n }) => (
                <span key={k} className="count-chip">
                  <Icon as={BOOKING_ICON[k]} /> {n} {n === 1 ? (k === 'activity' ? t('אטרקציה') : BOOKING_KINDS[k]) : BOOKING_TABS[k]}
                </span>
              ))}
            </b>
          ) : (
            <b>{t('עוד אין הזמנות')}</b>
          )}
          <span className="muted small">{gaps.length ? gaps.join(' · ') : shown.length ? t('טיסות ולינה סגורות') : t('אפשר להוסיף מאישור הזמנה, בלשונית הזמנות.')}</span>
        </span>
      </div>
      {props.swipesLeft > 0 && (
        <div className="todo-row">
          <span className="tile neutral"><Icon as={Layers} /></span>
          <span>
            <b>{props.swipesLeft === 1 ? t('עוד מקום אחד בגילוי') : t('עוד {n} מקומות בגילוי', { n: props.swipesLeft })}</b>
            <span className="muted small">{t('כל לייק או דילוג משנה את המאצ׳ים')}</span>
          </span>
        </div>
      )}
    </section>
  )
}


/** "יום אחד" / "יומיים" / "5 ימים" */
function daysLabel(n: number) {
  return n === 1 ? t('יום אחד') : n === 2 ? t('יומיים') : t('{n} ימים', { n })
}

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function byTime(a: ItineraryItem, b: ItineraryItem) {
  return (a.time || '99').localeCompare(b.time || '99') || a.sort - b.sort
}

/** Consecutive days sharing the same value, e.g. the city or who is there. */
function runs(days: DayInfo[], key: 'city' | 'who') {
  const out: { value: string; from: number; to: number }[] = []
  for (const d of [...days].sort((a, b) => a.day - b.day)) {
    const last = out[out.length - 1]
    const value = d[key] ?? ''
    if (last && last.value === value && last.to === d.day - 1) last.to = d.day
    else out.push({ value, from: d.day, to: d.day })
  }
  return out
}
