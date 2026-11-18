import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, Copy, Download, Link as LinkIcon, LogOut, Mail, Map as MapIcon, Paperclip, Plane, Plus, Wand2 } from 'lucide-react'
import { Timeline, TimelineConnector, TimelineDescription, TimelineItem, TimelineMarker, TimelineTime, TimelineTitle } from '@ui-sdk/react/timeline'
import { supabase } from '../supabase'
import { BOOKING_KINDS, BOOKING_TABS, type Booking, type Member, type Trip } from '../types'
import { aiError, couplesOf, errorText, normName, fmtDateTime, fromInputDateTime, mapsUrl, mutate, replan, safeUrl, toInputDateTime, useTripTable } from '../lib'
import { EmptyState, Field, LoadNote, Sheet, Skeleton, useRemembered } from '../ui'
import { BOOKING_ICON, Icon } from '../icons'
import { isEn, locale, t } from '../i18n'
import { isNative, openExternal } from '../native'
import { RingsIcon } from '../rings'
import { shows, validWho, type Who } from '../who'
import { dateDropped, readFlags, sameTime, type ImportFlag } from './importReview'
import UnderlineTabs from './UnderlineTabs'
import WhoTextMenu from './WhoTextMenu'
import { takeBookingKind, useQuickAdd } from '../quickAdd'
import { DOC_ACCEPT, isDocType, saveDoc, savedDoc } from '../docs'
import { askDelete, say } from '../toast'
import '../styles/redesign.css'
import '../styles/bookings.css'

type Props = { trip: Trip; members: Member[]; userId: string }

/** One line on the day timeline: a booking on its day, or a hotel's check-out on the day it ends. */
type Entry = { key: string; day: string; time: string; b: Booking; checkout?: boolean }

export default function Bookings({ trip, members, userId }: Props) {
  const tripId = trip.id
  const [importing, setImporting] = useState(false)
  const { rows, loading, error, reload } = useTripTable<Booking>('bookings', tripId, 'starts_at')
  const [edit, setEdit] = useState<Partial<Booking> | null>(null)
  const couples = couplesOf(members)
  const myCouple = members.find((m) => m.user_id === userId)?.couple ?? null
  // the same "whose" filter as Plan and Places (7)
  const [savedWho, setWhose] = useRemembered('bookingsWho', 'all')
  const whose: Who = savedWho === 'all' ? 'all' : validWho(savedWho, couples, myCouple)
  const shown = rows.filter((b) => shows(b.who, whose, myCouple))
  // the form opens at the confirmation field when "+ הוספה" was tapped on a booking without one (39)
  const [focusConf, setFocusConf] = useState(false)
  // the booking open in its sheet (by id, so it shows live edits)
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = openId ? rows.find((b) => b.id === openId) : undefined
  const kindOf = (b: Booking) => (BOOKING_TABS[b.kind] ? b.kind : 'other')
  // "all" first, then the first four kinds always and the rest once they have bookings
  const kinds = Object.keys(BOOKING_TABS).filter((k, i) => i < 4 || rows.some((b) => kindOf(b) === k))
  const [tab, pick] = useRemembered('bookingsTab', 'all')
  const current = tab === 'all' || kinds.includes(tab) ? tab : 'all'
  useQuickAdd('booking', () => {
    // asked for a kind (Plan's "We booked hotels"): the form and the tab open on it
    const kind = takeBookingKind()
    if (kind && BOOKING_TABS[kind]) pick(kind)
    setEdit({ kind: kind ?? (current === 'all' ? 'flight' : current), who: myCouple })
  })
  const items = shown.filter((b) => current === 'all' || kindOf(b) === current)
  const days = dayGroups(items)

  return (
    <div className="stack bk-screen">
      <div className="lt-bar">
        {couples.length > 1 ? (
          <WhoTextMenu label={t('של מי')} couples={couples} mine={myCouple} value={whose} onChange={setWhose} />
        ) : (
          <span />
        )}
        <button className="icon-btn accent" aria-label={t('הזמנה חדשה')} onClick={() => setEdit({ kind: current === 'all' ? 'flight' : current, who: myCouple })}>
          <Plus size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <UnderlineTabs
        label={t('סוג הזמנה')}
        tabs={[['all', t('הכל')], ...kinds.map((k): [string, string] => [k, BOOKING_TABS[k]])]}
        value={current}
        onChange={pick}
      />
      {error && <LoadNote onRetry={reload} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={BOOKING_ICON[current] ?? BOOKING_ICON.other}
          title={
            current === 'all'
              ? t('עוד אין הזמנות')
              : (isEn && current === 'other'
                  ? t('אין הזמנות אחרות')
                  : t('אין {kind}', { kind: isEn ? BOOKING_TABS[current].toLowerCase() : BOOKING_TABS[current] })) + (whose !== 'all' ? ' ' + t('בסינון הזה') : '')
          }
          line={t('אפשר להוסיף מאישור הזמנה או ידנית.')}
        />
      )}
      {loading && !items.length && <Skeleton rows={3} />}
      {/* every booking in date order across kinds, under its day, as Plan's day rows do (node, time over the title,
          the confirmation code at the end), but each booking is its own card: two flights on one day are two trips, so no rail joins them. A hotel is on its check-in day and again, quietly,
          on its check-out day. */}
      {days.map(([day, entries]) => (
        <section key={day} className="tl-day-block">
          <h3 className="tl-day">{day === '~' ? t('ללא תאריך') : dayHead(day)}</h3>
          {entries.map((e) => (
            <div key={e.key} className="tl-card">
              {!e.checkout && !!e.b.who && couples.length > 1 && whose === 'all' && (
                <span className="who-pill tl-who">
                  <RingsIcon one /> {t(e.b.who)}
                </span>
              )}
              <Timeline className="pt tl" aria-label={e.checkout ? t('צ׳ק-אאוט: {name}', { name: e.b.title }) : bookingTitle(e.b)}>
              <TimelineItem className="pt-item" data-done={e.checkout ? '' : undefined}>
                <TimelineConnector className="pt-line" />
                <TimelineMarker className={'pt-node pt-dot' + (e.checkout ? ' quiet' : '')}>
                  <Icon as={e.checkout ? LogOut : (BOOKING_ICON[e.b.kind] ?? BOOKING_ICON.other)} />
                </TimelineMarker>
                <div className="pt-content">
                  {/* one real button for the row (Space and Enter open it); the code buttons sit beside it, not inside */}
                  <button className="pt-main tl-main" onClick={() => setOpenId(e.b.id)}>
                    {e.time && <TimelineTime className="pt-time" dateTime={e.time}>{e.time}</TimelineTime>}
                    <TimelineTitle className="pt-title" dir="auto">
                      {e.checkout ? t('צ׳ק-אאוט: {name}', { name: e.b.title }) : bookingTitle(e.b)}
                    </TimelineTitle>
                    <TimelineDescription className="pt-sub tl-sub">
                      {e.checkout ? checkoutLine(e.b) : bookingLine(e.b, true)}
                    </TimelineDescription>
                  </button>
                  <span className="tl-end">
                    {!e.checkout && e.b.file_path && <DocSaver path={e.b.file_path} />}
                    {!e.checkout &&
                      (e.b.confirmation ? (
                        <span className="tl-code">
                          <span className="bk-code" dir="ltr">{e.b.confirmation}</span>
                          <CopyCode code={e.b.confirmation} />
                        </span>
                      ) : (
                        <button
                          className="link tl-add"
                          aria-label={t('הוספת קוד אישור להזמנה: {name}', { name: bookingTitle(e.b) })}
                          onClick={() => {
                            setFocusConf(true)
                            setEdit(e.b)
                          }}
                        >
                          + {isEn ? t('קוד') : t('קוד אישור')}
                        </button>
                      ))}
                  </span>
                </div>
              </TimelineItem>
              </Timeline>
            </div>
          ))}
        </section>
      ))}
      {/* the email import: a grouped-list row at the foot */}
      <div className="group">
        <button className="group-row tl-import" onClick={() => setImporting(true)}>
          <Icon as={Mail} size={18} />
          <span className="k">{t('הוספה מאישור הזמנה')}</span>
          <Icon as={ChevronLeft} className="chev flip-ltr" size={18} />
        </button>
      </div>
      {opened && (
        <BookingSheet
          b={opened}
          who={couples.length > 1 ? opened.who : undefined}
          onClose={() => setOpenId(null)}
          onEdit={(conf) => {
            setOpenId(null)
            setFocusConf(conf)
            setEdit(opened)
          }}
        />
      )}
      {edit && (
        <BookingForm
          trip={trip}
          couples={couples}
          booking={edit}
          focusConfirmation={focusConf}
          onClose={() => {
            setEdit(null)
            setFocusConf(false)
          }}
          onImport={() => {
            setEdit(null)
            setImporting(true)
          }}
        />
      )}
      {importing && <ImportSheet trip={trip} couples={couples} myCouple={myCouple} onClose={() => setImporting(false)} />}
    </div>
  )
}

/** The bookings by day, in date order: a hotel again on its check-out day; undated ones last under "~". */
function dayGroups(list: Booking[]): [string, Entry[]][] {
  const entries: Entry[] = []
  for (const b of list) {
    entries.push({ key: b.id, day: b.starts_at ? b.starts_at.slice(0, 10) : '~', time: hm(b.starts_at), b })
    if (b.kind === 'hotel' && b.starts_at && b.ends_at && b.ends_at.slice(0, 10) > b.starts_at.slice(0, 10))
      entries.push({ key: b.id + ':out', day: b.ends_at.slice(0, 10), time: hm(b.ends_at), b, checkout: true })
  }
  // a whole-day item (no time) first, then by time, then whose
  entries.sort(
    (a, b) =>
      Number(a.day === '~') - Number(b.day === '~') ||
      a.day.localeCompare(b.day) ||
      a.time.localeCompare(b.time) ||
      Number(!!a.checkout) - Number(!!b.checkout) ||
      (a.b.who ?? '').localeCompare(b.b.who ?? ''),
  )
  const out = new Map<string, Entry[]>()
  for (const e of entries) out.set(e.day, [...(out.get(e.day) ?? []), e])
  return [...out]
}

/** "Fri 11.12": the day header. The stored times are wall-clock, read as UTC like everywhere on this screen. */
function dayHead(day: string) {
  const d = new Date(day + 'T00:00:00Z')
  return `${d.toLocaleDateString(locale, { timeZone: 'UTC', weekday: 'short' })} ${d.getUTCDate()}.${d.getUTCMonth() + 1}`
}

/** The code's copy button, 44px to tap; the tick shows for a moment. */
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="icon-btn"
      aria-label={t('העתקת מספר האישור: {code}', { code })}
      onClick={() =>
        navigator.clipboard
          .writeText(code)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
            say(t('הקוד הועתק'))
          })
          .catch(() => say(t('אפשר להעתיק את הקוד מכאן'), { error: true }))
      }
    >
      <Icon as={copied ? Check : Copy} size={18} />
    </button>
  )
}

async function openFile(path: string) {
  // iOS app: online, the signed link opens in the Safari sheet. The copy kept on the phone is a blob, which that
  // sheet cannot show, so offline the app still says it cannot open it (not built yet).
  if (isNative) {
    const { data } = navigator.onLine ? await supabase.storage.from('docs').createSignedUrl(path, 600) : { data: null }
    if (data) return openExternal(data.signedUrl)
    return void say(navigator.onLine ? t('אי אפשר לפתוח את הקובץ') : t('אין חיבור, והמסמך לא שמור לאופליין'), { error: true })
  }
  // open the tab synchronously so mobile popup blockers allow it
  const win = window.open('', '_blank')
  const go = (href: string) => (win ? (win.location.href = href) : (location.href = href))
  const saved = await savedDoc(path)
  if (saved) {
    const raw = await saved.blob()
    const href = URL.createObjectURL(new Blob([raw], { type: isDocType(raw.type) ? raw.type : 'application/octet-stream' }))
    go(href)
    setTimeout(() => URL.revokeObjectURL(href), 10 * 60 * 1000)
    return
  }
  const { data, error } = await supabase.storage.from('docs').createSignedUrl(path, 600)
  if (error || !data) {
    win?.close()
    say(navigator.onLine ? t('אי אפשר לפתוח את הקובץ') : t('אין חיבור, והמסמך לא שמור לאופליין'), { error: true })
  } else go(data.signedUrl)
}

/** Keeps a booking's document on the phone (the list mounts one per booking, so documents are there offline). */
function DocSaver({ path }: { path: string }) {
  useEffect(() => {
    let live = true
    savedDoc(path).then((hit) => {
      if (live && !hit && navigator.onLine) void saveDoc(path)
    })
    return () => {
      live = false
    }
  }, [path])
  return null
}

/** A booking's document: open it, and keep a copy on the phone (saved automatically when online). */
function DocButtons({ path }: { path: string }) {
  const [saved, setSaved] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    setSaved(await saveDoc(path))
    setBusy(false)
  }

  useEffect(() => {
    let live = true
    savedDoc(path).then(async (hit) => {
      if (!live) return
      setSaved(!!hit)
      // a few small PDFs per trip, so saving without asking is cheap and the document is there when it's needed
      if (!hit && navigator.onLine) {
        const ok = await saveDoc(path)
        if (live) setSaved(ok)
      }
    })
    return () => {
      live = false
    }
  }, [path])

  return (
    <>
      <button className="pill" onClick={() => openFile(path)}>
        <Icon as={Paperclip} /> {t('מסמך')}
        {/* saved on the phone: a tick inside the button rather than a line of its own that pushed the row onto two lines */}
        {saved && <Icon as={Check} label={t('שמור בטלפון, נפתח גם בלי אינטרנט')} />}
      </button>
      {saved ? null : (
        saved === false && (
          <button className="pill" disabled={busy} onClick={save}>
            {busy ? (
              t('שומר…')
            ) : (
              <>
                <Icon as={Download} /> {t('שמירה לאופליין')}
              </>
            )}
          </button>
        )
      )}
    </>
  )
}

/** Remove a stored document unless another booking in the trip still points at it (one confirmation can feed several). */
async function removeDocIfUnused(tripId: string, path: string, exceptId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('trip_id', tripId)
    .eq('file_path', path)
    .neq('id', exceptId)
    .limit(1)
  // if we can't tell, keep the file: an orphan is better than a broken attachment
  if (error || (data?.length ?? 0) > 0) return
  await supabase.storage.from('docs').remove([path])
}

function BookingForm(props: {
  trip: Trip
  couples: string[]
  booking: Partial<Booking>
  focusConfirmation?: boolean
  onClose: () => void
  onImport: () => void
}) {
  const tripId = props.trip.id
  const [f, setF] = useState<Partial<Booking>>(props.booking)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [readNote, setReadNote] = useState('')

  /** Claude reads the attached confirmation and fills the form; the file stays attached. */
  const readFile = async () => {
    if (!file) return
    setReading(true)
    setReadNote('')
    let data: { bookings?: Extracted[] } | null = null
    try {
      const res = await supabase.functions.invoke('parse-booking', {
        body: { text: '', file: { data: await toBase64(file), media_type: file.type }, trip_id: props.trip.id },
      })
      if (res.error) setReadNote(await aiError(res.error, t('לא הצלחנו לקרוא את הקובץ. אפשר למלא ידנית.')))
      data = res.data
    } catch {
      setReadNote(t('לא הצלחנו לקרוא את הקובץ. אפשר למלא ידנית.'))
    }
    setReading(false)
    const found = data?.bookings ?? []
    if (!found.length) {
      if (data) setReadNote(t('לא מצאתי הזמנה בקובץ הזה. אפשר למלא ידנית.'))
      return
    }
    const b = found[0]
    setF((prev) => ({
      ...prev,
      kind: BOOKING_KINDS[b.kind] ? b.kind : prev.kind,
      title: b.title || prev.title,
      starts_at: wallClock(b.starts_at, b.kind === 'hotel' ? '15:00' : '00:00') ?? prev.starts_at,
      ends_at: wallClock(b.ends_at, b.kind === 'hotel' ? '11:00' : '00:00') ?? prev.ends_at,
      confirmation: b.confirmation || prev.confirmation,
      location: b.location || prev.location,
      url: safeUrl(b.url) ?? prev.url,
      notes: prev.notes || b.notes,
    }))
    setReadNote(
      found.length > 1
        ? t('מילאתי את הראשונה מתוך {n} ההזמנות בקובץ. בדקו ושמרו, או הוסיפו את כולן דרך "הוספה מאישור הזמנה".', { n: found.length })
        : t('מילאתי את הפרטים מהקובץ. בדקו ושמרו.'),
    )
  }
  const set = (k: keyof Booking) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.title?.trim()) return
    setBusy(true)
    let filePath = f.file_path ?? null
    if (file) {
      if (!isDocType(file.type)) {
        say(t('העלאת הקובץ נכשלה: {msg}', { msg: 'PDF, JPG, PNG' }), { error: true })
        setBusy(false)
        return
      }
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const path = `${tripId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('docs').upload(path, file, { contentType: file.type })
      if (error) {
        say(t('העלאת הקובץ נכשלה: {msg}', { msg: error.message }), { error: true })
        setBusy(false)
        return
      }
      filePath = path
    }
    const row = {
      trip_id: tripId,
      kind: f.kind ?? 'other',
      title: f.title.trim(),
      starts_at: f.starts_at || null,
      ends_at: f.ends_at || null,
      confirmation: f.confirmation || null,
      location: f.location || null,
      url: f.url || null,
      notes: f.notes || null,
      file_path: filePath,
      who: f.who || null,
    }
    const { error } = await (f.id ? supabase.from('bookings').update(row).eq('id', f.id) : supabase.from('bookings').insert(row))
    const ok = !error
    if (error?.code === '23505') say(t('כבר יש הזמנה כזו: אותו מספר אישור באותה שעה, או אותו שם, שעה וזוג.'), { error: true })
    else if (error) say(t('שגיאה: {msg}', { msg: error.message }), { error: true })
    if (ok) {
      // the old attachment goes only once the row points at the new one
      if (file && f.file_path && f.id) await removeDocIfUnused(tripId, f.file_path, f.id)
    } else if (file && filePath) {
      await supabase.storage.from('docs').remove([filePath])
    }
    setBusy(false)
    if (ok) props.onClose()
  }

  const remove = async () => {
    if (!f.id || !(await askDelete(t('למחוק את ההזמנה?')))) return
    if (!(await mutate(supabase.from('bookings').delete().eq('id', f.id)))) return
    // the database announces new and changed bookings to the planner, not deleted ones
    replan(tripId)
    if (f.file_path) await removeDocIfUnused(tripId, f.file_path, f.id)
    props.onClose()
  }

  return (
    <Sheet title={f.id ? t('עריכת הזמנה') : t('הזמנה חדשה')} onClose={props.onClose}>
      {!f.id && (
        <button className="secondary" onClick={props.onImport}>
          <Icon as={Mail} /> {t('יש אישור הזמנה? מוסיפים אוטומטית מקובץ או ממייל')}
        </button>
      )}
      <Field label={t('סוג')}>
        <select value={f.kind} onChange={set('kind')}>
          {Object.entries(BOOKING_KINDS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      {props.couples.length > 1 && <WhoField value={f.who ?? ''} couples={props.couples} onChange={(who) => setF({ ...f, who })} />}
      <Field label={t('כותרת')}>
        <input value={f.title ?? ''} onChange={set('title')} placeholder={t('למשל: אל על TLV → NRT')} />
      </Field>
      <Field label={t('התחלה / צ׳ק-אין / המראה')}>
        <input
          type="datetime-local"
          value={toInputDateTime(f.starts_at ?? null)}
          onChange={(e) => setF({ ...f, starts_at: fromInputDateTime(e.target.value) })}
        />
      </Field>
      <Field label={t('סיום / צ׳ק-אאוט / נחיתה')}>
        <input
          type="datetime-local"
          value={toInputDateTime(f.ends_at ?? null)}
          onChange={(e) => setF({ ...f, ends_at: fromInputDateTime(e.target.value) })}
        />
      </Field>
      <Field label={t('מספר אישור')}>
        <input value={f.confirmation ?? ''} onChange={set('confirmation')} dir="ltr" autoFocus={props.focusConfirmation} />
      </Field>
      <Field label={t('כתובת / מיקום')}>
        <input value={f.location ?? ''} onChange={set('location')} dir="auto" />
      </Field>
      <Field label={t('קישור')}>
        <input type="url" value={f.url ?? ''} onChange={set('url')} dir="ltr" />
      </Field>
      <Field label={t('הערות')}>
        <textarea value={f.notes ?? ''} onChange={set('notes')} rows={3} />
      </Field>
      <Field label={f.file_path ? t('החלפת מסמך (PDF / תמונה)') : t('מסמך מצורף (PDF / תמונה)')}>
        <input type="file" accept={DOC_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      {file && (
        <button className="secondary" onClick={readFile} disabled={reading}>
          <Icon as={Wand2} /> {reading ? t('קורא את הקובץ…') : t('קריאת הקובץ ומילוי הפרטים')}
        </button>
      )}
      {readNote && (
        <p className="small" role="status">
          {readNote}
        </p>
      )}
      <button className="primary" onClick={save} disabled={busy || !f.title?.trim()}>
        {busy ? t('שומר…') : t('שמירה')}
      </button>
      {f.id && (
        <button className="danger" onClick={remove}>
          {t('מחיקה')}
        </button>
      )}
    </Sheet>
  )
}

type Extracted = Pick<Booking, 'kind' | 'title' | 'starts_at' | 'ends_at' | 'confirmation' | 'location' | 'url' | 'notes'>

/** A local time from the reader as a stored timestamp; a bare date gets `time`. */
function wallClock(v: string | null, time: string) {
  if (!v) return null
  const m = v.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/)
  return m ? fromInputDateTime(`${m[1]}T${m[2] ?? time}`) : null
}

/** Paste a confirmation email or attach its PDF/screenshot; Claude reads it and the bookings are added. */
type ParsedBooking = Extracted & { who: string | null }

/** The site a link leads to, in plain text ("booking.com"), so a look-alike address stands out. */
function hostOf(u: string | null | undefined) {
  const href = safeUrl(u)
  try {
    return href ? new URL(href).hostname.replace(/^www\./, '') : ''
  } catch {
    return ''
  }
}

/** A booking more than 3 days before the trip starts or after it ends is probably not this trip's. */
function outsideTrip(trip: Trip, b: Extracted) {
  if (!trip.start_date) return false
  const day = (v: string | null) => (v ? Date.parse(v.slice(0, 10)) : null)
  const first = Date.parse(trip.start_date) - 3 * 86400000
  const last = Date.parse(trip.start_date) + (trip.num_days - 1 + 3) * 86400000
  return [day(b.starts_at), day(b.ends_at)].some((d) => d != null && (d < first || d > last))
}

function ImportSheet(props: { trip: Trip; couples: string[]; myCouple: string | null; onClose: () => void }) {
  const { trip, onClose } = props
  // a confirmation usually covers one couple, so start from the importer's
  const [who, setWho] = useState(props.myCouple ?? '')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ kind: string; title: string }[] | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [docLost, setDocLost] = useState(false)
  const [err, setErr] = useState('')
  // what the reader found, shown for a check before anything is saved; a confirmation can be a forged forward
  const [review, setReview] = useState<{ b: ParsedBooking; ticked: boolean; outside: boolean; flags: ImportFlag[] }[] | null>(null)

  const run = async () => {
    if (!text.trim() && !file) return
    setBusy(true)
    setErr('')
    const payload: { text: string; trip_id: string; file?: { data: string; media_type: string } } = { text, trip_id: props.trip.id }
    try {
      if (file) payload.file = { data: await toBase64(file), media_type: file.type }
    } catch {
      setErr(t('לא הצלחנו לקרוא את הקובץ. אפשר לנסות קובץ אחר או להדביק את הטקסט.'))
      setBusy(false)
      return
    }
    const { data, error } = await supabase.functions.invoke('parse-booking', { body: payload })
    if (error || !data?.bookings) {
      setErr(await aiError(error, t('לא הצלחנו לקרוא את האישור. אפשר לנסות שוב או להוסיף ידנית.')))
      setBusy(false)
      return
    }
    // times come back as local wall-clock "YYYY-MM-DDTHH:mm", sometimes as a bare date
    // the reader also returns `flags` for review (it has already emptied a date it refused); they are kept beside
    // the booking for the check step and stripped before the insert, or the insert would be refused
    const bookings = (data.bookings as (Extracted & { flags?: unknown })[]).map(({ flags: raw, ...b }) => {
      const flags = readFlags(raw)
      return {
      b: {
        ...b,
        // the server's English fallback "Booking" is replaced by a placeholder in the app's language
        title: flags.includes('no_title') ? t('הזמנה ללא שם') : b.title,
        starts_at: wallClock(b.starts_at, b.kind === 'hotel' ? '15:00' : '00:00'),
        ends_at: wallClock(b.ends_at, b.kind === 'hotel' ? '11:00' : '00:00'),
        who: who || null,
      },
      flags,
      }
    })
    if (!bookings.length) {
      setErr(t('לא מצאנו הזמנה בטקסט הזה.'))
      setBusy(false)
      return
    }

    // the same confirmation imported by two people (or twice) adds nothing the second time
    const { data: have, error: haveErr } = await supabase
      .from('bookings')
      .select('kind, title, starts_at, confirmation, who')
      .eq('trip_id', trip.id)
    if (haveErr) {
      setErr(errorText(haveErr.message))
      setBusy(false)
      return
    }
    // another couple's booking with the same title and time is theirs, not a duplicate (unless it is the same code);
    // a booking with no time is never the same as another one with no time (a round trip with no dates keeps both legs)
    const isDup = (b: ParsedBooking, list: { kind: string; title: string; starts_at: string | null; confirmation: string | null; who: string | null }[]) =>
      list.some(
        (h) =>
          h.kind === b.kind &&
          sameTime(h.starts_at, b.starts_at) &&
          ((!!b.confirmation && h.confirmation === b.confirmation) ||
            (normName(h.title) === normName(b.title) && (h.who ?? null) === (b.who ?? null))),
      )
    // the parser can also repeat itself within one reply
    const fresh: typeof bookings = []
    for (const x of bookings) if (!isDup(x.b, have ?? []) && !isDup(x.b, fresh.map((f) => f.b))) fresh.push(x)
    const skipped = bookings.length - fresh.length
    if (!fresh.length) {
      setErr(skipped > 1 ? t('כל ההזמנות באישור הזה כבר קיימות.') : t('ההזמנה הזו כבר קיימת.'))
      setBusy(false)
      return
    }

    setSkipped(skipped)
    // a row whose date the reader refused starts unticked, like one outside the trip
    setReview(fresh.map(({ b, flags }) => {
      const outside = outsideTrip(trip, b) || dateDropped(flags)
      return { b, flags, ticked: !outside, outside }
    }))
    setBusy(false)
  }

  /** Saves only the ticked bookings, with the original confirmation kept beside them. */
  const save = async () => {
    const chosen = (review ?? []).filter((r) => r.ticked).map((r) => r.b)
    if (!chosen.length) return
    setBusy(true)
    let filePath: string | null = null
    let lost = false
    if (file && !isDocType(file.type)) lost = true
    else if (file) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      filePath = `${trip.id}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from('docs').upload(filePath, file, { contentType: file.type })
      if (up.error) {
        filePath = null
        lost = true
      }
    }
    const ok = await mutate(
      supabase.from('bookings').insert(
        chosen.map((b) => ({ trip_id: trip.id, ...b, url: safeUrl(b.url) ?? null, file_path: filePath })),
      ),
    )
    if (ok) {
      setDocLost(lost)
      setDone(chosen.map((b) => ({ kind: b.kind, title: b.title })))
    }
    setBusy(false)
  }

  if (done) {
    return (
      <Sheet title={done.length > 1 ? t('נוספו {n} הזמנות', { n: done.length }) : t('ההזמנה נוספה')} onClose={onClose}>
        {done.map((d, n) => (
          <div key={n} dir="auto">
            <Icon as={BOOKING_ICON[d.kind] ?? BOOKING_ICON.other} /> {d.title}
          </div>
        ))}
        {docLost && <p className="msg">{t('המסמך לא נשמר וההזמנות נוספו בלעדיו. אפשר לצרף אותו בעריכת ההזמנה.')}</p>}
        {skipped > 0 && <p className="small">{skipped === 1 ? t('הזמנה אחת כבר הייתה קיימת ולא נוספה שוב.') : t('{n} הזמנות כבר היו קיימות ולא נוספו שוב.', { n: skipped })}</p>}
        <p className="muted small">{t('לחיצה על הזמנה פותחת אותה לעריכה. מלונות מופיעים גם בלילות שלהם במסלול.')}</p>
        <button className="primary" onClick={onClose}>
          {t('סגירה')}
        </button>
      </Sheet>
    )
  }

  if (review) {
    const n = review.filter((r) => r.ticked).length
    return (
      <Sheet
        title={t('בדיקה לפני שמירה')}
        onClose={onClose}
        closeLabel={t('ביטול')}
        action={{ label: n === 1 ? t('שמירת הזמנה אחת') : t('שמירת {n} הזמנות', { n }), onClick: save, disabled: busy || n === 0 }}
      >
        <p className="muted small">{t('מייל שהועבר יכול להיות מזויף. סמנו רק הזמנות שאתם מכירים, ובדקו לאן הקישור מוביל.')}</p>
        {err && <p className="msg">{err}</p>}
        <div className="group imp-list">
          {review.map((r, i) => {
            const host = hostOf(r.b.url)
            // kept left to right, or Hebrew turns the range around
            const dates = [fmtDateTime(r.b.starts_at), r.b.ends_at && fmtDateTime(r.b.ends_at)].filter(Boolean).join(' – ')
            return (
              <label key={i} className="group-row imp-row">
                <input
                  type="checkbox"
                  checked={r.ticked}
                  onChange={(e) => setReview(review.map((x, j) => (j === i ? { ...x, ticked: e.target.checked } : x)))}
                />
                <span className="k">
                  <span className="imp-title" dir="auto">
                    {r.b.title}
                  </span>
                  <span className="imp-sub">{[BOOKING_KINDS[r.b.kind] ?? BOOKING_KINDS.other, dates && `\u2066${dates}\u2069`, r.b.confirmation && `\u2066${r.b.confirmation}\u2069`].filter(Boolean).join(' · ')}</span>
                  {host && (
                    <span className="imp-sub">
                      {t('קישור:')} <bdi dir="ltr">{host}</bdi>
                    </span>
                  )}
                  {r.outside && !dateDropped(r.flags) && (
                    <span className="imp-sub imp-warn">
                      <Icon as={AlertTriangle} /> {t('מחוץ לתאריכי הטיול')}
                    </span>
                  )}
                  {dateDropped(r.flags) && (
                    <span className="imp-sub imp-warn">
                      <Icon as={AlertTriangle} /> {r.flags.some((f) => f === 'bad_start' || f === 'bad_end' || f === 'end_before_start') ? t('התאריך לא ברור, לא נשמר תאריך') : t('התאריך מחוץ לטיול, לא נשמר תאריך')}
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title={t('הוספה מאישור הזמנה')} onClose={onClose}>
      <p className="muted small">
        {t('מדביקים את מייל האישור (Booking, Agoda, חברת תעופה…) או מצרפים PDF / צילום מסך, ואנחנו נראה לכם מה מצאנו לפני ששומרים.')}
      </p>
      {props.couples.length > 1 && <WhoField value={who} couples={props.couples} onChange={setWho} />}
      <Field label={t('טקסט האישור')}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} dir="auto" placeholder={t('להדביק כאן…')} />
      </Field>
      <Field label={t('או קובץ')}>
        <input type="file" accept={DOC_ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      {err && <p className="msg">{err}</p>}
      <button className="primary" onClick={run} disabled={busy || (!text.trim() && !file)}>
        {busy ? t('קוראים את האישור…') : t('קריאה ובדיקה')}
      </button>
    </Sheet>
  )
}

/** A booking's name in its row: a flight with a readable title is its airline and number, the rest their own title. */
function bookingTitle(b: Booking) {
  const f = b.kind === 'flight' ? flightParts(b) : null
  return f ? [f.airline, f.number].filter(Boolean).join(' ') || b.title : b.title
}

/** The quiet line under a booking's name: the route and day of a flight, the nights of a hotel, else its day and hour. */
function bookingLine(b: Booking, underDay = false) {
  if (!b.starts_at) return BOOKING_KINDS[b.kind] ?? BOOKING_KINDS.other
  const f = b.kind === 'flight' ? flightParts(b) : null
  // kept left to right, or Hebrew turns "TLV → MUC" around
  if (f) {
    const route = `\u2066${f.from}\u00a0→\u00a0${f.to}\u2069`
    // under its day: the route, then the times on their own line (the day is already the header)
    return underDay ? [route, flightTimes(b) && `\u2066${flightTimes(b)}\u2069`].filter(Boolean).join('\n') : [route, dayMonth(b.starts_at), flightTimes(b)].filter(Boolean).join(' · ')
  }
  if (b.kind === 'hotel' && b.ends_at) {
    const n = nightsOf(b)
    const nights = n === 1 ? t('לילה אחד') : n > 1 ? t('{n} לילות', { n }) : ''
    // the range first, so both ends of the stay read at once: "12–14.12 · 2 nights"
    const range = '\u2066' + hotelRange(b) + '\u2069'
    const times = [hm(b.starts_at) && t('צ׳ק-אין {time}', { time: hm(b.starts_at) }), hm(b.ends_at) && t('צ׳ק-אאוט {time}', { time: hm(b.ends_at) })].filter(Boolean).join(underDay ? '\n' : ' · ')
    // on the timeline: the stay (range and nights), then check-in and check-out each on its own line
    return underDay ? [[range, nights].filter(Boolean).join(' · '), times].filter(Boolean).join('\n') : [range, nights, times].filter(Boolean).join(' · ')
  }
  return [!underDay && dayMonth(b.starts_at), !underDay && hm(b.starts_at)].filter(Boolean).join(' · ') || BOOKING_KINDS[b.kind] || BOOKING_KINDS.other
}

const nightsOf = (b: Booking) =>
  b.starts_at && b.ends_at ? Math.round((Date.parse(b.ends_at.slice(0, 10)) - Date.parse(b.starts_at.slice(0, 10))) / 86400000) : 0

/** "12–14.12" (same month) or "28.12–2.1": the stay as a range. */
function hotelRange(b: Booking) {
  if (!b.starts_at || !b.ends_at) return ''
  const a = new Date(b.starts_at)
  const z = new Date(b.ends_at)
  if (a.getUTCMonth() === z.getUTCMonth()) return `${a.getUTCDate()}\u2013${dayMonth(b.ends_at)}`
  return `${dayMonth(b.starts_at)}\u2013${dayMonth(b.ends_at)}`
}

/** The quiet line on a hotel's check-out day. */
function checkoutLine(b: Booking) {
  const n = nightsOf(b)
  return [hm(b.ends_at) && t('צ׳ק-אאוט {time}', { time: hm(b.ends_at) }), n === 1 ? t('לילה אחד') : n > 1 ? t('{n} לילות', { n }) : ''].filter(Boolean).join(' · ') || t('צ׳ק-אאוט')
}

/** "12.12": the row's short date (the sheet has the weekday). */
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString(locale, { timeZone: 'UTC', day: 'numeric', month: 'numeric' })

/**
 * A booking opened from its row: the boarding pass for a flight (35), else its kind and dates; whose it is, the
 * confirmation code, the map, link and document, and its notes. "עריכה" in the title row opens the form.
 */
function BookingSheet({ b, who, onClose, onEdit }: { b: Booking; who?: string | null; onClose: () => void; onEdit: (focusConfirmation: boolean) => void }) {
  const pass = b.kind === 'flight' && flightParts(b)
  const [copied, setCopied] = useState(false)
  const copyCode = () =>
    navigator.clipboard
      .writeText(b.confirmation ?? '')
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
        say(t('הקוד הועתק'))
      })
      .catch(() => say(t('אפשר להעתיק את הקוד מכאן'), { error: true }))
  return (
    <Sheet title={bookingTitle(b)} onClose={onClose} action={{ label: t('עריכה'), onClick: () => onEdit(false) }}>
      <div className="bk-sheet">
        {pass ? (
          <div className="card booking">
            <BoardingPass b={b} who={who} />
          </div>
        ) : (
          <div className="bk-sheet-head">
            <span className="bk-ic" aria-hidden="true">
              <Icon as={BOOKING_ICON[b.kind] ?? BOOKING_ICON.other} />
            </span>
            <div>
              <div className="muted small">{BOOKING_KINDS[b.kind] ?? BOOKING_KINDS.other}</div>
              {b.starts_at && (
                <div>
                  {/* a word between the two, not an arrow inside the text (37) */}
                  {b.ends_at ? t('{from} עד {to}', { from: fmtDateTime(b.starts_at), to: fmtDateTime(b.ends_at) }) : fmtDateTime(b.starts_at)}
                </div>
              )}
              {who !== undefined && <div className={'who-tag' + (who ? ' apart' : '')}>{who ? t(who) : <WhoAll />}</div>}
            </div>
          </div>
        )}
        {b.confirmation ? (
          <div className="bk-conf">
            <span className="muted small">{t('מספר אישור')}</span>
            <button className="code" dir="ltr" onClick={copyCode} aria-label={t('העתקת מספר האישור: {code}', { code: b.confirmation })}>
              {b.confirmation}
              <Icon as={copied ? Check : Copy} />
            </button>
          </div>
        ) : (
          <div className="small muted no-conf">
            {t('אין מספר אישור')}
            <button className="link" onClick={() => onEdit(true)}>
              + {t('קוד אישור')}
            </button>
          </div>
        )}
        {(b.location || safeUrl(b.url) || b.file_path) && (
          <div className="row">
            {b.location && (
              <a className="pill" href={mapsUrl(b.location)} target="_blank" rel="noreferrer">
                <Icon as={MapIcon} /> {t('מפה')}
              </a>
            )}
            {safeUrl(b.url) && (
              <a className="pill" href={safeUrl(b.url)} target="_blank" rel="noreferrer">
                <Icon as={LinkIcon} /> {t('קישור')}
              </a>
            )}
            {b.file_path && <DocButtons path={b.file_path} />}
          </div>
        )}
        {b.notes && (
          <p className="notes" dir="auto">
            {b.notes}
          </p>
        )}
      </div>
    </Sheet>
  )
}

function WhoAll() {
  return (
    <>
      <RingsIcon /> {t('ביחד')}
    </>
  )
}

/** A flight's two airports, number and times, read from its title ("Lufthansa LH714 MUC → HND") and its dates. */
function flightParts(b: Booking) {
  const m = b.title.match(/\b([A-Z]{3})\s*(?:→|->|–|-|to)\s*([A-Z]{3})\b/)
  if (!m || !b.starts_at) return null
  const num = b.title.match(/\b([A-Z0-9]{2})\s?(\d{2,4})\b/)
  const airline = b.title.slice(0, b.title.indexOf(m[0])).replace(num?.[0] ?? '', '').trim()
  return { from: m[1], to: m[2], number: num ? num[1] + num[2] : '', airline }
}

/** The one place a time of day is read from a stored time: a whole-day marker (00:00) is no time and shows nothing. */
const hm = (iso: string | null | undefined) => (!iso || iso.slice(11, 16) === '00:00' ? '' : iso.slice(11, 16))
/** "23:40 → 06:15" (left to right) for a flight, just the departure when the arrival is not known. */
const flightTimes = (b: Booking) => {
  const from = hm(b.starts_at)
  if (!from) return ''
  const to = hm(b.ends_at)
  return `\u2066${from}${to ? `\u00a0→\u00a0${to}` : ''}\u2069`
}
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(locale, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'numeric' })

/**
 * A flight as a boarding pass (35): departure on the start side with its big code, time and date, arrival on the
 * other with "+1" in orange when it lands the next day, a dashed line with the plane pointing to the destination.
 */
function BoardingPass({ b, who }: { b: Booking; who?: string | null }) {
  const f = flightParts(b)!
  const next = b.ends_at && b.ends_at.slice(0, 10) > b.starts_at!.slice(0, 10)
  return (
    <div className="pass">
      <div className="pass-top small">
        <b dir="ltr">{[f.airline, f.number].filter(Boolean).join(' ')}</b>
        {who !== undefined && <span className={'who-tag' + (who ? ' apart' : '')}>{who ? t(who) : <WhoAll />}</span>}
      </div>
      <div className="pass-row">
        <div className="pass-end">
          <span className="pass-code">{f.from}</span>
          <span className="pass-time">{hm(b.starts_at!)}</span>
          <span className="muted small">{shortDate(b.starts_at!)}</span>
        </div>
        <div className="pass-line" aria-hidden="true">
          <span className="pass-dash" />
          <Plane className="pass-plane" size={18} strokeWidth={1.9} />
          <span className="pass-dash" />
        </div>
        <div className="pass-end to">
          <span className="pass-code">{f.to}</span>
          <span className="pass-time">
            {b.ends_at ? hm(b.ends_at) : ''}
            {next && <sup className="pass-plus">+1</sup>}
          </span>
          <span className="muted small">{b.ends_at ? shortDate(b.ends_at) : ''}</span>
        </div>
      </div>
    </div>
  )
}

function WhoField(props: { value: string; couples: string[]; onChange: (who: string) => void }) {
  return (
    <Field label={t('של מי')}>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">{t('ביחד')}</option>
        {props.couples.map((c) => (
          <option key={c} value={c}>
            {t(c)}
          </option>
        ))}
      </select>
    </Field>
  )
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}
