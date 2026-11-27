import { useEffect, useMemo, useRef, useState } from 'react'
import { Switch, SwitchThumb } from '@ui-sdk/react/switch'
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue } from '@ui-sdk/react/select'
import { Check, ChevronLeft, ChevronsUpDown, LoaderCircle } from 'lucide-react'
import { supabase } from '../supabase'
import type { Trip } from '../types'
import { dayDate, errorText, fmtDay, mutate } from '../lib'
import { ymd } from './planUtils'
import { creditsGivenText } from '../screenLogic'
import { isEn, lang, locale, setLang, t } from '../i18n'
import { Field, Sheet } from '../ui'
import { Icon } from '../icons'
import { Avatar } from '../avatar'
import '../styles/settings.css'
import { countingOn, setCounting } from '../track'
import { usePassStatus } from '../pass'
import PassSheet from './Pass'
import { openExternal, privacyUrl } from '../native'
import { disablePush, enablePush, pushState, type PushState } from '../push'
import SignOutSheet from './SignOutSheet'

/**
 * Settings (62, 63), as the iPhone Settings app: my profile on top (avatar, my name), then "the trip, seen by
 * everyone", "on this phone" (language, appearance, notifications), credits and trip pass while they are on,
 * privacy, and sign out. No save button: a name saves when its field loses focus or the sheet closes, the dates
 * when the calendar says "סיום".
 */
export default function Settings(props: { trip: Trip; me: string; userId: string; onClose: () => void }) {
  const { trip } = props
  const [name, setName] = useState(trip.name)
  const [myName, setMyName] = useState(props.me)
  const [saved, setSaved] = useState<'' | 'trip' | 'me' | 'dates'>('')
  const [dates, setDates] = useState(false)
  const [wallet, setWallet] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
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
      <div className="set">
        <div className="group set-profile">
          <label className="group-row">
            <Avatar name={myName || props.me} size="l" look="accent" decorative />
            <span className="set-profile-text">
              <input aria-label={t('השם שלי')} value={myName} onChange={(e) => setMyName(e.target.value)} onBlur={saveMyName} onKeyDown={done} enterKeyHint="done" dir="auto" />
              <span className="set-foot-in">{saved === 'me' ? '✓ ' + t('נשמר') : t('זה השם שהאחרים רואים. ההתחברות נשארת עם השם המקורי.')}</span>
            </span>
          </label>
        </div>

        <div className="group-label">{t('הטיול · נראה לכל מי שבטיול')}</div>
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

        <PhoneGroup />

        <TripAccess tripId={trip.id} onWallet={() => setWallet(true)} />

        <div className="group">
          <CountingRow />
          <button className="group-row" onClick={() => openExternal(privacyUrl())}>
            <span className="k">{t('פרטיות ותנאי שימוש')}</span>
            <Icon as={ChevronLeft} className="chev flip-ltr" />
          </button>
        </div>
        <p className="group-foot">{t('אנחנו סופרים אילו מסכים נפתחים, איפה נתקעים וכמה זמן מסתכלים על כל כרטיס, כדי לשפר את האפליקציה ואת סדר הכרטיסים. לא אוספים שמות, מיילים או מה שאתם כותבים. דוחות שגיאה נחתכים קצר, ולעיתים נדירות עשויים לכלול קצת טקסט מהמסך. בלי כלים חיצוניים. אפשר לכבות את זה למעלה.')}</p>

        <div className="group">
          <button className="group-row danger" onClick={() => setSigningOut(true)}>
            {t('התנתקות')}
          </button>
        </div>
      </div>
      {signingOut && <SignOutSheet onClose={() => setSigningOut(false)} />}

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

/** "On this phone": language, appearance, and notifications (src/push.ts: a switch, or why there can't be one here). */
function PhoneGroup() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void pushState().then(setState)
  }, [])
  const showPush = !!state && state !== 'unsupported'
  const on = state === 'on'
  const stuck = state === 'home-screen' || state === 'blocked'
  const toggle = async () => {
    if (busy || stuck) return
    setBusy(true)
    setState(on ? await disablePush() : await enablePush('settings'))
    setBusy(false)
  }
  return (
    <>
      <div className="group-label">{t('בטלפון הזה')}</div>
      <div className="group">
        <LangRow />
        <ThemeRow />
        {showPush && (
          <label className="group-row">
            <span className="k">{t('מאצ׳ים בטיול')}</span>
            <SwitchWord on={on} />
            <Switch className="switch" checked={on} readOnly={stuck || busy} onCheckedChange={toggle}>
              <SwitchThumb className="switch-thumb" />
            </Switch>
          </label>
        )}
      </div>
      {showPush && (
        <p className="group-foot">
          {state === 'home-screen'
            ? t('באייפון, התראות עובדות רק כשפותחים את Toogo מהמסך הראשי: בספארי, שיתוף ואז "הוספה למסך הבית".')
            : state === 'blocked'
              ? t('ההתראות חסומות בהגדרות הטלפון. אפשר לפתוח אותן שם, תחת Toogo.')
              : t('התראה כשמישהו מהטיול אוהב מקום שגם אתם אהבתם. רק בטלפון הזה.')}
        </p>
      )}
    </>
  )
}

/** The state in words beside a switch, so it is not only the colour and the knob. The switch itself carries the state for screen readers. */
function SwitchWord({ on }: { on: boolean }) {
  return <span className="switch-word" aria-hidden="true">{on ? t('מופעל') : t('כבוי')}</span>
}

/** "Help improve Toogo": usage counting on this device (src/track.ts), on unless turned off. */
function CountingRow() {
  const [on, setOn] = useState(countingOn)
  return (
    <label className="group-row">
      <span className="k">{t('עזרה בשיפור Toogo')}</span>
      <SwitchWord on={on} />
      <Switch
        className="switch"
        checked={on}
        onCheckedChange={(next) => {
          setCounting(next)
          setOn(next)
        }}
      >
        <SwitchThumb className="switch-thumb" />
      </Switch>
    </label>
  )
}

/** "12 בדצמבר – 31 בדצמבר 2026": written by the app, the same whatever language the phone is set to. */
function rangeLabel(start: string, numDays: number) {
  const a = dayDate(start, 1)!
  const b = dayDate(start, numDays)!
  // short months in English ("12 Dec"): the long ones ran into the "Dates" label on a phone; Hebrew fits as is
  const dm = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: isEn ? 'short' : 'long' })
  return `${dm(a)} – ${dm(b)} ${b.getFullYear()}`
}

function daysCount(n: number) {
  return n === 1 ? t('יום אחד') : t('{n} ימים', { n })
}

/**
 * Credits and the trip pass, as one group. Each row is there only while its feature is on: the trip pass row while
 * src/pass.ts has a status, the credits row while my_credits says enabled. Nothing shows when both are off.
 */
function TripAccess({ tripId, onWallet }: { tripId: string; onWallet: () => void }) {
  const status = usePassStatus(tripId)
  const [open, setOpen] = useState(false)
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
  if (!status && balance === null) return null
  return (
    <>
      <div className="group">
        {balance !== null && (
          <button className="group-row" onClick={onWallet}>
            <span className="k">{t('ארנק קרדיטים')}</span>
            <span className="v">{unlimited ? t('ללא הגבלה') : balance}</span>
            <Icon as={ChevronLeft} className="chev flip-ltr" />
          </button>
        )}
        {status && (
          <button className="group-row" onClick={() => setOpen(true)}>
            <span className="k">{t('כרטיס לטיול')}</span>
            <span className="v">{status.pass ? t('פעיל') : status.left > 0 ? t('{left} מתוך {n} מקומות חדשים בחינם', { left: status.left, n: status.free }) : t('נוצלו {n} המקומות בחינם', { n: status.free })}</span>
            <Icon as={ChevronLeft} className="chev flip-ltr" />
          </button>
        )}
      </div>
      {open && status && <PassSheet tripId={tripId} status={status} onClose={() => setOpen(false)} />}
    </>
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
  const [done, setDone] = useState(false)
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
    setDone(false)
    if (tap.current?.amount !== give) tap.current = { amount: give, op: crypto.randomUUID() }
    const { data, error } = await supabase.rpc('give_to_trip', { p_trip: tripId, p_amount: give, p_op_id: tap.current.op })
    if (error) setMsg(errorText(error.message))
    else if (!(data as { ok?: boolean } | null)?.ok) setMsg(t('אין לך מספיק קרדיטים'))
    else {
      setMsg(creditsGivenText(give))
      setDone(true)
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
      <button className={'secondary' + (sending ? ' moving' : '')} disabled={sending || w.paid < 1 || give > w.paid} onClick={send}>
        {sending ? <><Icon as={LoaderCircle} className="spin" /> {t('מעבירים…')}</> : t('העברה לטיול')}
      </button>
      {msg && (
        <p className={'msg' + (done ? ' ok' : '')} role={done ? 'status' : 'alert'}>
          {done && <Icon as={Check} />} {msg}
        </p>
      )}
    </section>
  )
}

const THEMES = [
  { value: 'auto', label: isEn ? t('מערכת') : t('כמו בטלפון') },
  { value: 'light', label: t('בהיר') },
  { value: 'dark', label: t('כהה') },
]

/** A settings row that is a Select: the label at the start, the chosen value and the up-down mark at the end. */
function SelectRow(props: { label: string; value: string; items: { value: string; label: string; lang?: string }[]; onPick: (v: string) => void }) {
  return (
    <Select value={props.value} items={props.items} onValueChange={(v) => typeof v === 'string' && v !== props.value && props.onPick(v)}>
      <SelectTrigger className="group-row set-select">
        <span className="k">{props.label}</span>
        <span className="v">
          <SelectValue />
        </span>
        <Icon as={ChevronsUpDown} className="chev" />
      </SelectTrigger>
      <SelectContent className="set-select-list">
        {props.items.map((i) => (
          <SelectItem key={i.value} value={i.value} lang={i.lang}>
            <span>{i.label}</span>
            <SelectItemIndicator>
              <Icon as={Check} />
            </SelectItemIndicator>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Light, dark, or following the phone. Kept on this phone only and applied at once: html[data-theme] switches the
 * dark styles (see themeOverride in vite.config.ts), and index.html applies it again before the next load paints.
 */
export function ThemeRow() {
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
  return <SelectRow label={t('מראה')} value={theme} items={THEMES} onPick={pick} />
}

/** Hebrew or English for the whole app, on this phone. Each option is written in its own language. */
export function LangRow() {
  return <SelectRow label={t('שפה')} value={lang} items={[...LANGS]} onPick={(v) => v !== lang && setLang(v as typeof lang)} />
}
const LANGS = [
  { value: 'he', label: 'עברית', lang: 'he' }, // he-only
  { value: 'en', label: 'English', lang: 'en' },
] as const
