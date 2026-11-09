import { useEffect, useState } from 'react'
import { Check, Download, Link as LinkIcon, Mail, Map as MapIcon, Paperclip, Plane, Wand2 } from 'lucide-react'
import { supabase } from '../supabase'
import { BOOKING_KINDS, BOOKING_TABS, type Booking, type Member, type Trip } from '../types'
import { aiError, couplesOf, errorText, normName, fmtDateTime, fromInputDateTime, mapsUrl, mutate, replan, safeUrl, toInputDateTime, useTripTable } from '../lib'
import { Empty, Field, LoadNote, Sheet, Tabs, useRemembered } from '../ui'
import { BOOKING_ICON, Icon } from '../icons'
import { isEn, locale, t } from '../i18n'
import { isNative, openExternal } from '../native'
import { RingsIcon } from '../rings'
import { WhoChips, shows, validWho, type Who } from '../who'
import QuickFab from './QuickFab'
import { useQuickAdd } from '../quickAdd'

type Props = { trip: Trip; members: Member[]; userId: string }

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
  const count = (k: string) => shown.filter((b) => kindOf(b) === k).length
  const tabs = Object.keys(BOOKING_TABS).filter((k, i) => i < 4 || rows.some((b) => kindOf(b) === k))
  const [tab, pick] = useRemembered('bookingsTab', 'flight')
  const current = tabs.includes(tab) ? tab : 'flight'
  useQuickAdd('booking', () => setEdit({ kind: current, who: myCouple }))
  // by date, then whose; bookings with no date go last
  const items = shown
    .filter((b) => kindOf(b) === current)
    .sort((a, b) => (a.starts_at ?? '~').localeCompare(b.starts_at ?? '~') || (a.who ?? '').localeCompare(b.who ?? ''))

  return (
    <div className="stack">
      <Tabs
        label={t('סוג הזמנה')}
        tabs={Object.fromEntries(tabs.map((k) => [k, { label: BOOKING_TABS[k], icon: BOOKING_ICON[k] }]))}
        current={current}
        counts={Object.fromEntries(tabs.map((k) => [k, count(k)]))}
        onPick={pick}
      />
      <button className="secondary" onClick={() => setImporting(true)}>
        <Icon as={Mail} /> {t('הוספה מאישור הזמנה')}
      </button>
      {couples.length > 1 && <WhoChips couples={couples} mine={myCouple} value={whose} onChange={setWhose} />}
      {error && <LoadNote onRetry={reload} />}
      {!loading && !error && items.length === 0 && (
        <Empty>
          {isEn && current === 'other'
            ? t('אין הזמנות אחרות')
            : t('אין {kind}', { kind: isEn ? BOOKING_TABS[current].toLowerCase() : BOOKING_TABS[current] })}
          {whose !== 'all' && ' ' + t('בסינון הזה')}. {t('אפשר להוסיף מאישור הזמנה או ידנית.')}
        </Empty>
      )}
      {/* the promo video's booking rows: a red tile with the kind's icon, the name in bold over one quiet line, and the
          confirmation code in a small mono chip on the far side. A tap opens the booking (the boarding pass for flights) */}
      <div className="stack bk-list">
        {items.map((b) => (
          <div key={b.id} className="bk-row" role="button" tabIndex={0} onClick={() => setOpenId(b.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(b.id)}>
            <span className="bk-ic" aria-hidden="true">
              <Icon as={BOOKING_ICON[b.kind] ?? BOOKING_ICON.other} />
            </span>
            <div className="bk-body">
              <div className="bk-title" dir="auto">
                {bookingTitle(b)}
              </div>
              <div className="bk-sub">
                <span className="bk-line">{bookingLine(b)}</span>
                {/* whose it is, while the list shows everyone's */}
                {couples.length > 1 && whose === 'all' && b.who && <span className="who-pill">{t(b.who)}</span>}
              </div>
            </div>
            {b.file_path && <DocSaver path={b.file_path} />}
            {b.confirmation ? (
              <span className="bk-code" dir="ltr">
                {b.confirmation}
              </span>
            ) : (
              // no code yet: a way to add it (39)
              <button
                className="link bk-add"
                onClick={(e) => {
                  e.stopPropagation()
                  setFocusConf(true)
                  setEdit(b)
                }}
              >
                + {t('הוספה')}
              </button>
            )}
          </div>
        ))}
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
      <QuickFab label={t('הזמנה חדשה')} onTap={() => setEdit({ kind: current, who: myCouple })} />
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

// Booking documents are saved in Cache Storage so they open with no network (underground, in the air). The key is
// only a unique URL-shaped name: nothing is ever fetched from it. Paths are uuids, so a saved copy never goes stale.
const docKey = (path: string) => new URL('__doc/' + path.split('/').map(encodeURIComponent).join('/'), document.baseURI).href

// Booking documents are PDFs or photos. Anything else is refused on upload, and a saved copy opens under one of these
// types or as a plain download: a file opened from a blob: URL runs on the app's own origin, so an SVG or HTML file
// typed as itself could run script with the viewer's session.
const DOC_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
const DOC_ACCEPT = DOC_TYPES.join(',')
const isDocType = (type: string) => DOC_TYPES.includes(type)

async function savedDoc(path: string) {
  try {
    return (await (await caches.open('docs')).match(docKey(path))) ?? null
  } catch {
    return null
  }
}

async function saveDoc(path: string) {
  try {
    const { data } = await supabase.storage.from('docs').createSignedUrl(path, 600)
    if (!data) return false
    const res = await fetch(data.signedUrl)
    if (!res.ok) return false
    await (await caches.open('docs')).put(docKey(path), res)
    return true
  } catch {
    return false
  }
}

async function openFile(path: string) {
  // iOS app: online, the signed link opens in the Safari sheet. The copy kept on the phone is a blob, which that
  // sheet cannot show, so offline the app still says it cannot open it (not built yet).
  if (isNative) {
    const { data } = navigator.onLine ? await supabase.storage.from('docs').createSignedUrl(path, 600) : { data: null }
    if (data) return openExternal(data.signedUrl)
    return alert(navigator.onLine ? t('אי אפשר לפתוח את הקובץ') : t('אין חיבור, והמסמך לא שמור לאופליין'))
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
    alert(navigator.onLine ? t('אי אפשר לפתוח את הקובץ') : t('אין חיבור, והמסמך לא שמור לאופליין'))
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
      if (res.error) setReadNote(await aiError(res.error, t('לא הצלחתי לקרוא את הקובץ. אפשר למלא ידנית.')))
      data = res.data
    } catch {
      setReadNote(t('לא הצלחתי לקרוא את הקובץ. אפשר למלא ידנית.'))
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
        alert(t('העלאת הקובץ נכשלה: {msg}', { msg: 'PDF, JPG, PNG' }))
        setBusy(false)
        return
      }
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const path = `${tripId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('docs').upload(path, file, { contentType: file.type })
      if (error) {
        alert(t('העלאת הקובץ נכשלה: {msg}', { msg: error.message }))
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
    if (error?.code === '23505') alert(t('כבר יש הזמנה כזו: אותו מספר אישור באותה שעה, או אותו שם, שעה וזוג.'))
    else if (error) alert(t('שגיאה: {msg}', { msg: error.message }))
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
    if (!f.id || !confirm(t('למחוק את ההזמנה?'))) return
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

/** Same stored time, whatever the timestamp's formatting ("…T07:00:00Z" vs "…07:00:00+00:00"). */
function sameTime(a: string | null, b: string | null) {
  return a === b || (!!a && !!b && Date.parse(a) === Date.parse(b))
}

/** A local time from the reader as a stored timestamp; a bare date gets `time`. */
function wallClock(v: string | null, time: string) {
  if (!v) return null
  const m = v.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/)
  return m ? fromInputDateTime(`${m[1]}T${m[2] ?? time}`) : null
}

/** Paste a confirmation email or attach its PDF/screenshot; Claude reads it and the bookings are added. */
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

  const run = async () => {
    if (!text.trim() && !file) return
    setBusy(true)
    setErr('')
    const payload: { text: string; trip_id: string; file?: { data: string; media_type: string } } = { text, trip_id: props.trip.id }
    try {
      if (file) payload.file = { data: await toBase64(file), media_type: file.type }
    } catch {
      setErr(t('לא הצלחתי לקרוא את הקובץ. אפשר לנסות קובץ אחר או להדביק את הטקסט.'))
      setBusy(false)
      return
    }
    const { data, error } = await supabase.functions.invoke('parse-booking', { body: payload })
    if (error || !data?.bookings) {
      setErr(await aiError(error, t('לא הצלחתי לקרוא את האישור. אפשר לנסות שוב או להוסיף ידנית.')))
      setBusy(false)
      return
    }
    // times come back as local wall-clock "YYYY-MM-DDTHH:mm", sometimes as a bare date
    const bookings = (data.bookings as Extracted[]).map((b) => ({
      ...b,
      starts_at: wallClock(b.starts_at, b.kind === 'hotel' ? '15:00' : '00:00'),
      ends_at: wallClock(b.ends_at, b.kind === 'hotel' ? '11:00' : '00:00'),
      who: who || null,
    }))
    if (!bookings.length) {
      setErr(t('לא מצאתי הזמנה בטקסט הזה.'))
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
    // another couple's booking with the same title and time is theirs, not a duplicate (unless it is the same code)
    const isDup = (b: (typeof bookings)[number], list: { kind: string; title: string; starts_at: string | null; confirmation: string | null; who: string | null }[]) =>
      list.some(
        (h) =>
          h.kind === b.kind &&
          sameTime(h.starts_at, b.starts_at) &&
          ((!!b.confirmation && h.confirmation === b.confirmation) ||
            (normName(h.title) === normName(b.title) && (h.who ?? null) === (b.who ?? null))),
      )
    // the parser can also repeat itself within one reply
    const fresh: typeof bookings = []
    for (const b of bookings) if (!isDup(b, have ?? []) && !isDup(b, fresh)) fresh.push(b)
    const skipped = bookings.length - fresh.length
    if (!fresh.length) {
      setErr(skipped > 1 ? t('כל ההזמנות באישור הזה כבר קיימות.') : t('ההזמנה הזו כבר קיימת.'))
      setBusy(false)
      return
    }

    // keep the original confirmation with the booking
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
        fresh.map((b) => ({ trip_id: trip.id, ...b, file_path: filePath })),
      ),
    )
    if (ok) {
      setSkipped(skipped)
      setDocLost(lost)
      setDone(fresh.map((b) => ({ kind: b.kind, title: b.title })))
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

  return (
    <Sheet title={t('הוספה מאישור הזמנה')} onClose={onClose}>
      <p className="muted small">
        {t('מדביקים את מייל האישור (Booking, Agoda, חברת תעופה…) או מצרפים PDF / צילום מסך, וההזמנה נוספת לבד.')}
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
        {busy ? t('קורא את האישור…') : t('קריאה והוספה')}
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
function bookingLine(b: Booking) {
  if (!b.starts_at) return BOOKING_KINDS[b.kind] ?? BOOKING_KINDS.other
  const f = b.kind === 'flight' ? flightParts(b) : null
  // kept left to right, or Hebrew turns "TLV → MUC" around
  if (f) return [`\u2066${f.from} → ${f.to}\u2069`, dayMonth(b.starts_at)].join(' · ')
  if (b.kind === 'hotel' && b.ends_at) {
    const n = Math.round((Date.parse(b.ends_at.slice(0, 10)) - Date.parse(b.starts_at.slice(0, 10))) / 86400000)
    const nights = n === 1 ? t('לילה אחד') : n > 1 ? t('{n} לילות', { n }) : ''
    return [dayMonth(b.starts_at), nights, hm(b.starts_at) && t('צ׳ק-אין {time}', { time: hm(b.starts_at) })].filter(Boolean).join(' · ')
  }
  return [dayMonth(b.starts_at), hm(b.starts_at)].filter(Boolean).join(' · ')
}

/** "12.12": the row's short date (the sheet has the weekday). */
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString(locale, { timeZone: 'UTC', day: 'numeric', month: 'numeric' })

/**
 * A booking opened from its row: the boarding pass for a flight (35), else its kind and dates; whose it is, the
 * confirmation code, the map, link and document, and its notes. "עריכה" in the title row opens the form.
 */
function BookingSheet({ b, who, onClose, onEdit }: { b: Booking; who?: string | null; onClose: () => void; onEdit: (focusConfirmation: boolean) => void }) {
  const pass = b.kind === 'flight' && flightParts(b)
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
            <b className="code" dir="ltr">
              {b.confirmation}
            </b>
          </div>
        ) : (
          <div className="small muted no-conf">
            {t('אין מספר אישור')}
            <button className="link" onClick={() => onEdit(true)}>
              + {t('הוספה')}
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

const hm = (iso: string) => (iso.slice(11, 16) === '00:00' ? '' : iso.slice(11, 16))
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

/**
 * Write each hotel on the trip nights it covers (needs the trip start date). A couple's hotel becomes its own line,
 * "couple: hotel", so the two couples' hotels sit side by side on nights they stay apart.
 */
