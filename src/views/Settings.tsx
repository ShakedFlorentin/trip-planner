import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Moon, Sun, SunMoon } from 'lucide-react'
import { supabase } from '../supabase'
import type { Trip } from '../types'
import { dayDate, fmtDay, mutate } from '../lib'
import { ymd } from './planUtils'
import { lang, locale, setLang, t } from '../i18n'
import { Field, Sheet } from '../ui'
import { Icon } from '../icons'
import { countingOn, setCounting } from '../track'
import { openExternal, privacyUrl } from '../native'

/**
 * Settings (62, 63): only what is saved, as iOS grouped rows. "הטיול" (its name and dates, seen by everyone in the
 * trip) and "אני" (my name, language, theme), and the credits wallet while credits are on. No save button: a name
 * saves when its field loses focus or the sheet closes, the dates when the calendar says "סיום".
 */
export default function Settings(props: { trip: Trip; me: string; userId: string; onClose: () => void }) {
  const { trip } = props
  const [name, setName] = useState(trip.name)
  const [myName, setMyName] = useState(props.me)
  const [saved, setSaved] = useState<'' | 'trip' | 'me' | 'dates'>('')
  const [dates, setDates] = useState(false)
  const [wallet, setWallet] = useState(false)
  const flash = (k: 'trip' | 'me' | 'dates') => {
    setSaved(k)
    setTimeout(() => setSaved((s) => (s === k ? '' : s)), 1600)
  }
  const saveName = async () => {
    const v = name.trim()
    if (!v || v === trip.name) return setName(trip.name)
    if (await mutate(supabase.from('trips').update({ name: v }).eq('id', trip.id))) flash('trip')
  }
  const saveMyName = async () => {
    const v = myName.trim()
    if (!v || v === props.me) return setMyName(props.me)
    if (await mutate(supabase.from('members').update({ display_name: v }).eq('trip_id', trip.id).eq('user_id', props.userId))) flash('me')
  }
  // closing the sheet with a field still focused saves it too: today a changed name was lost on "סגירה"
  const latest = useRef({ saveName, saveMyName })
  latest.current = { saveName, saveMyName }
  const close = () => {
    void latest.current.saveName()
    void latest.current.saveMyName()
    props.onClose()
  }
  const done = (e: { key: string; currentTarget: HTMLInputElement }) => e.key === 'Enter' && e.currentTarget.blur()

  return (
    <Sheet title={t('הגדרות')} onClose={close}>
      <div className="group-label">{t('הטיול')}</div>
      <div className="group">
        <label className="group-row">
          <span className="k">{t('שם הטיול')}</span>
          {saved === 'trip' && <span className="saved">✓ {t('נשמר')}</span>}
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={done} enterKeyHint="done" dir="auto" />
        </label>
        <button className="group-row" onClick={() => setDates(true)}>
          <span className="k">{t('תאריכים')}</span>
          {saved === 'dates' && <span className="saved">✓ {t('נשמר')}</span>}
          <span className="v">
            {trip.start_date ? rangeLabel(trip.start_date, trip.num_days) : t('לבחירה')}
            {trip.start_date && <small>{daysCount(trip.num_days)}</small>}
          </span>
          <Icon as={ChevronLeft} className="chev flip-ltr" />
        </button>
      </div>
      <p className="group-foot">{t('השינוי כאן נראה אצל כל מי שבטיול.')}</p>

      <div className="group-label">{t('אני')}</div>
      <div className="group">
        <label className="group-row">
          <span className="k">{t('השם שלי')}</span>
          {saved === 'me' && <span className="saved">✓ {t('נשמר')}</span>}
          <input value={myName} onChange={(e) => setMyName(e.target.value)} onBlur={saveMyName} onKeyDown={done} enterKeyHint="done" dir="auto" />
        </label>
        <LangPicker />
        <ThemePicker />
      </div>
      <p className="group-foot">{t('זה השם שהאחרים רואים. ההתחברות נשארת עם השם המקורי.')}</p>

      <div className="group-label">{t('פרטיות')}</div>
      <div className="group">
        <CountingRow />
        <button className="group-row" onClick={() => openExternal(privacyUrl())}>
          <span className="k">{t('פרטיות ותנאי שימוש')}</span>
          <Icon as={ChevronLeft} className="chev flip-ltr" />
        </button>
      </div>
      <p className="group-foot">{t('אנחנו סופרים אילו מסכים נפתחים ואיפה נתקעים, כדי לשפר את האפליקציה. בלי מה שאתם כותבים, ובלי כלים חיצוניים.')}</p>

      <WalletRow tripId={trip.id} onOpen={() => setWallet(true)} />

      {dates && (
        <DateRangeSheet
          start={trip.start_date}
          numDays={trip.num_days}
          onClose={() => setDates(false)}
          onDone={async (start, numDays) => {
            setDates(false)
            if (start === trip.start_date && numDays === trip.num_days) return
            if (await mutate(supabase.from('trips').update({ start_date: start, num_days: numDays }).eq('id', trip.id))) flash('dates')
          }}
        />
      )}
      {wallet && (
        <Sheet title={t('ארנק קרדיטים')} onClose={() => setWallet(false)}>
          <CreditWallet tripId={trip.id} />
        </Sheet>
      )}
    </Sheet>
  )
}

/** "Help improve Toogo": usage counting on this device (src/track.ts), on unless turned off. */
function CountingRow() {
  const [on, setOn] = useState(countingOn)
  return (
    <button
      className="group-row"
      role="switch"
      aria-checked={on}
      onClick={() => {
        setCounting(!on)
        setOn(!on)
      }}
    >
      <span className="k">{t('עזרה בשיפור Toogo')}</span>
      <span className={'switch' + (on ? ' on' : '')} aria-hidden="true" />
    </button>
  )
}

/** "12 בדצמבר – 31 בדצמבר 2026": written by the app, the same whatever language the phone is set to. */
function rangeLabel(start: string, numDays: number) {
  const a = dayDate(start, 1)!
  const b = dayDate(start, numDays)!
  const dm = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
  return `${dm(a)} – ${dm(b)} ${b.getFullYear()}`
}

function daysCount(n: number) {
  return n === 1 ? t('יום אחד') : t('{n} ימים', { n })
}

/** The credits row: shown only while credits are on (my_credits says enabled); opens the wallet on its own page. */
function WalletRow({ tripId, onOpen }: { tripId: string; onOpen: () => void }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [unlimited, setUnlimited] = useState(false)
  useEffect(() => {
    void supabase.rpc('my_credits', { p_trip: tripId }).then(({ data, error }) => {
      const d = data as { enabled?: boolean; unlimited?: boolean; balance?: number } | null
      if (error || !d?.enabled) return
      setUnlimited(!!d.unlimited)
      setBalance(d.balance ?? 0)
    })
  }, [tripId])
  if (balance === null) return null
  return (
    <div className="group">
      <button className="group-row" onClick={onOpen}>
        <span className="k">{t('ארנק קרדיטים')}</span>
        <span className="v">{unlimited ? t('ללא הגבלה') : balance}</span>
        <Icon as={ChevronLeft} className="chev flip-ltr" />
      </button>
    </div>
  )
}

const MAX_DAYS = 60

/**
 * Pick the trip's dates on a calendar, like Airbnb: the first tap is the departure day, the second the return. The
 * week starts on Sunday (on the right in Hebrew, the left in English). "סיום" saves; the number of days follows from
 * the two dates.
 */
export function DateRangeSheet(props: { start: string | null; numDays: number; onClose: () => void; onDone: (start: string, numDays: number) => void }) {
  const [from, setFrom] = useState<string | null>(props.start)
  const [to, setTo] = useState<string | null>(props.start ? ymd(dayDate(props.start, props.numDays)!) : null)
  const months = useMemo(() => {
    const base = props.start ? new Date(props.start + 'T12:00:00') : new Date()
    const first = new Date(Math.min(base.getTime(), Date.now()))
    return Array.from({ length: 14 }, (_, i) => new Date(first.getFullYear(), first.getMonth() + i, 1, 12))
  }, [props.start])
  const firstMonth = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // open on the trip's month
    document.getElementById('cal-' + (props.start ?? '').slice(0, 7))?.scrollIntoView({ block: 'start' })
  }, [props.start])
  const days = from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1 : 0
  const tap = (d: string) => {
    if (!from || to || d < from) {
      setFrom(d)
      setTo(null)
    } else if (Math.round((Date.parse(d) - Date.parse(from)) / 86400000) + 1 > MAX_DAYS) {
      setFrom(d)
      setTo(null)
    } else setTo(d)
  }
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 1 + i, 12).toLocaleDateString(locale, { weekday: 'narrow' }))
  const at = (s: string) => new Date(s + 'T12:00:00')
  return (
    <Sheet
      title={t('תאריכי הטיול')}
      onClose={props.onClose}
      closeLabel={t('ביטול')}
      action={{ label: t('סיום'), disabled: !from || !to, onClick: () => from && to && props.onDone(from, days) }}
      tall
    >
      <div className="cal-week" aria-hidden="true">
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="cal-months">
        {months.map((m, mi) => {
          const key = ymd(m).slice(0, 7)
          const lead = m.getDay()
          const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
          return (
            <div key={key} id={'cal-' + key} className="cal-month" ref={mi === 0 ? firstMonth : undefined}>
              <h4>{m.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</h4>
              <div className="cal-grid">
                {Array.from({ length: lead }, (_, i) => (
                  <span key={'x' + i} />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const d = ymd(new Date(m.getFullYear(), m.getMonth(), i + 1, 12))
                  const end = d === from || d === to
                  const inside = !!from && !!to && d > from && d < to
                  return (
                    <button
                      key={d}
                      className={'cal-day' + (end ? ' end' : '') + (inside ? ' in' : '') + (d === from && to ? ' first' : '') + (d === to ? ' last' : '')}
                      onClick={() => tap(d)}
                      aria-pressed={end}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="cal-summary">
        {from ? (
          <>
            <span>
              {t('יציאה:')} <b>{fmtDay(at(from))}</b>
            </span>
            <span>
              {t('חזרה:')} <b>{to ? fmtDay(at(to)) : '—'}</b>
            </span>
            {to && <span className="muted">{daysCount(days)}</span>}
          </>
        ) : (
          <span className="muted">{t('בחרו את יום היציאה')}</span>
        )}
      </div>
    </Sheet>
  )
}

/**
 * AI credits: the user's own and the trip's, and a way to give some to the trip. Shown only while credits are on
 * (my_credits says enabled); a new search costs credits, a repeat of one already done is free.
 */
export function CreditWallet({ tripId }: { tripId: string }) {
  type Wallet = { enabled?: boolean; unlimited?: boolean; balance: number; free: number; paid: number; trip_balance: number | null }
  const [w, setW] = useState<Wallet | null>(null)
  const [give, setGive] = useState(1)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  // one id per tap of a given amount: a double tap (or a retry) sends the same id, so credits move once
  const tap = useRef<{ amount: number; op: string } | null>(null)
  const load = async () => {
    const { data, error } = await supabase.rpc('my_credits', { p_trip: tripId })
    const d = data as Wallet | null
    setW(error || !d || !d.enabled ? null : d)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])
  if (!w) return null
  if (w.unlimited) {
    return (
      <section>
        <h3>{t('ארנק קרדיטים')}</h3>
        <p className="muted small">{t('בטיול הזה אין הגבלה: החיפושים, ההזמנות והתרגומים שלך לא עולים קרדיטים.')}</p>
      </section>
    )
  }
  const send = async () => {
    if (sending) return
    setSending(true)
    setMsg('')
    if (tap.current?.amount !== give) tap.current = { amount: give, op: crypto.randomUUID() }
    const { data, error } = await supabase.rpc('give_to_trip', { p_trip: tripId, p_amount: give, p_op_id: tap.current.op })
    if (error) setMsg(error.message)
    else if (!(data as { ok?: boolean } | null)?.ok) setMsg(t('אין לך מספיק קרדיטים'))
    else {
      setMsg(t('הועברו {n} קרדיטים לטיול', { n: give }))
      tap.current = null
    }
    await load()
    setSending(false)
  }
  return (
    <section>
      <h3>{t('ארנק קרדיטים')}</h3>
      <p className="muted small">
        {t('הקרדיטים שלי: {n} (מתוכם {free} חינם להיום)', { n: w.balance, free: w.free })} · {t('קרדיטים של הטיול: {n}', { n: w.trip_balance ?? 0 })}
      </p>
      <p className="muted small">
        {t('חיפוש מקום חדש, קריאת הזמנה ותרגום עולים קרדיטים. קודם משתמשים בקרדיטים של הטיול, ואז באישיים. כל יום מתווספים קרדיטים חינם. מקום שכבר חיפשו בעבר, ותכנון המסלול, בחינם.')}
      </p>
      <p className="muted small">{t('אפשר להעביר לטיול רק קרדיטים שלא ניתנו חינם: {n}.', { n: w.paid })}</p>
      <Field label={t('להעביר לטיול')}>
        <input type="number" min={1} max={Math.max(w.paid, 1)} value={give} onChange={(e) => setGive(Math.max(1, Math.floor(+e.target.value || 1)))} />
      </Field>
      <button className="secondary" disabled={sending || w.paid < 1 || give > w.paid} onClick={send}>
        {t('העברה לטיול')}
      </button>
      {msg && <p className="msg">{msg}</p>}
    </section>
  )
}

const THEMES = [
  { id: 'auto', label: t('כמו בטלפון'), icon: SunMoon },
  { id: 'light', label: t('בהיר'), icon: Sun },
  { id: 'dark', label: t('כהה'), icon: Moon },
] as const

/**
 * Light, dark, or following the phone. Kept on this phone only and applied at once: html[data-theme] switches the
 * dark styles (see themeOverride in vite.config.ts), and index.html applies it again before the next load paints.
 */
export function ThemePicker() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') ?? 'auto'
    } catch {
      return 'auto'
    }
  })
  const pick = (t: string) => {
    setTheme(t)
    if (t === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
    try {
      if (t === 'auto') localStorage.removeItem('theme')
      else localStorage.setItem('theme', t)
    } catch {
      // private browsing: the choice holds until the app closes
    }
  }
  return (
    <div className="group-block">
      <span id="theme-label">{t('מראה')}</span>
      <div className="segmented theme-picker" role="radiogroup" aria-labelledby="theme-label">
        {THEMES.map((t) => (
          <button key={t.id} role="radio" aria-checked={theme === t.id} className={theme === t.id ? 'on' : ''} onClick={() => pick(t.id)}>
            <Icon as={t.icon} /> {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Hebrew or English for the whole app, on this phone. Each option is written in its own language. */
export function LangPicker() {
  return (
    <div className="group-block">
      <span id="lang-label">שפה · Language</span> {/* he-only: each language names itself */}
      <div className="segmented" role="radiogroup" aria-labelledby="lang-label">
        {LANGS.map((l) => (
          <button key={l.id} role="radio" lang={l.id} aria-checked={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => l.id !== lang && setLang(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
const LANGS = [
  { id: 'he', label: 'עברית' }, // he-only
  { id: 'en', label: 'English' },
] as const

