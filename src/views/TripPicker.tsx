import { FormEvent, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { Field } from '../ui'
import { t } from '../i18n'
import { forgetInvite } from './Login'
import { Loading } from '../rings'
import { readCache } from '../lib'
import type { Trip } from '../types'
import SignOutSheet from './SignOutSheet'

// accounts this phone already joined to their invite's trip: someone who later leaves that trip isn't pulled back in
const JOINED_KEY = 'inviteJoined'

function joinedBefore(userId: string) {
  try {
    return (JSON.parse(localStorage.getItem(JOINED_KEY) ?? '[]') as string[]).includes(userId)
  } catch {
    return false
  }
}

function rememberJoined(userId: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(JOINED_KEY) ?? '[]') as string[]
    localStorage.setItem(JOINED_KEY, JSON.stringify([...ids, userId]))
  } catch {
    // worst case the next visit here joins the same trip again
  }
}

/** The server's own Hebrew messages, in the app's language; anything else gets a plain line instead of raw text. */
function failure(message: string) {
  if (!navigator.onLine || /failed to fetch|network|load failed/i.test(message)) return t('אין אינטרנט. נסו שוב כשיש קליטה.')
  if (message.includes('יותר מדי ניסיונות')) return t('יותר מדי ניסיונות, נסו שוב בעוד שעה') // he-only: the include() above matches the server's Hebrew text
  return t('לא הצלחנו. נסו שוב.')
}

/** Names of the trips this account is in: the saved copy at once, the server's answer when it comes. */
function useTripNames(ids: string[]) {
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(ids.map((id) => [id, readCache<Trip>('trip:' + id)?.data?.name ?? '']).filter(([, n]) => n)),
  )
  const key = ids.join(',')
  useEffect(() => {
    if (!ids.length) return
    let live = true
    Promise.resolve(supabase.from('trips').select('id, name').in('id', ids))
      .then(({ data }) => {
        if (live && data) setNames((old) => ({ ...old, ...Object.fromEntries(data.map((r) => [r.id as string, r.name as string])) }))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [key])
  return names
}

/**
 * Where a trip is chosen. For an account that is already in trips (it came here from "Switch trip") it lists them, with
 * a way back to the trip that was open; below, join with a code or create one.
 */
export default function TripPicker({ onPick, trips = [], backTo = null }: { onPick: (id: string) => void; trips?: string[]; backTo?: string | null }) {
  const names = useTripNames(trips)
  const nameOf = (id: string) => names[id] || t('טיול')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [tripName, setTripName] = useState(t('יפן'))
  const [start, setStart] = useState('')
  const [err, setErr] = useState('')
  // a request is running: a second tap must not send it again
  const [busy, setBusy] = useState<'' | 'join' | 'create'>('')
  // a new account came in through an invite: join that trip by itself before showing the picker
  const [auto, setAuto] = useState<'checking' | 'joining' | 'done'>('checking')
  const started = useRef(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      const user = s.session?.user
      const given = ((user?.user_metadata?.name as string | undefined) ?? '').trim()
      if (given) setName((n) => n || given)
      const shown = given || (user?.email ?? '').split('@')[0]
      if (!user || joinedBefore(user.id)) return setAuto('done')
      const { data, error } = await supabase.rpc('my_invite')
      const invite = (Array.isArray(data) ? data[0] : data) as { trip_id: string; join_code: string } | null
      // no invite is normal; a failed lookup is not: say so, and the manual picker below still works
      if (error) {
        setErr(t('לא הצלחנו לבדוק אם יש הזמנה. אפשר להצטרף עם קוד, או ליצור טיול.'))
        return setAuto('done')
      }
      if (!invite?.join_code) return setAuto('done')
      setAuto('joining')
      const joined = await supabase.rpc('join_trip', { code: invite.join_code, name: shown })
      if (joined.error || !joined.data) {
        // the code is ready in the join form: one tap to try again
        setCode(invite.join_code)
        setErr(t('לא הצלחנו לצרף אתכם לטיול. אפשר לנסות שוב עם הקוד.'))
        return setAuto('done')
      }
      rememberJoined(user.id)
      forgetInvite()
      onPick(joined.data as string)
    })()
  }, [])

  const join = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    setBusy('join')
    const { data, error } = await supabase.rpc('join_trip', { code, name })
    if (error) setErr(failure(error.message))
    else if (!data) setErr(t('קוד טיול שגוי'))
    else return onPick(data as string)
    setBusy('')
  }

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    setBusy('create')
    const { data, error } = await supabase.rpc('create_trip', {
      trip_name: tripName,
      name,
      start: start || null,
    })
    if (error) setErr(failure(error.message))
    else return onPick(data as string)
    setBusy('')
  }

  // the app's own loading look while checking, so people without an invite don't see a flash of anything else
  if (auto === 'checking') return <Loading />
  if (auto === 'joining') return <div className="center" role="status">{t('מצטרפים לטיול…')}</div>

  return (
    <div className="login">
      <h1>{trips.length ? t('מעבר לטיול אחר') : t('הצטרפות לטיול')}</h1>
      {trips.length > 0 && (
        <div className="card trip-list">
          {backTo && (
            <button className="primary" onClick={() => onPick(backTo)}>
              {t('חזרה אל {name}', { name: nameOf(backTo) })}
            </button>
          )}
          {trips.filter((id) => id !== backTo).length > 0 && <h3>{t('הטיולים שלכם')}</h3>}
          {trips
            .filter((id) => id !== backTo)
            .map((id) => (
              <button key={id} className="secondary" dir="auto" onClick={() => onPick(id)}>
                {nameOf(id)}
              </button>
            ))}
        </div>
      )}
      <div className="card">
        <Field label={t('איך קוראים לך?')}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('השם שיוצג לשאר המשתתפים')} />
        </Field>
      </div>

      <form onSubmit={join} className="card">
        <h3>{t('הצטרפות לטיול קיים')}</h3>
        <p className="muted small">{t('את הקוד מקבלים ממי שיצר את הטיול, הוא מופיע אצלו במסך הבית')}</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('קוד טיול')} dir="ltr" required />
        <button className="primary" disabled={!name.trim() || !!busy}>
          {busy === 'join' ? t('מצטרפים לטיול…') : t('הצטרפות')}
        </button>
      </form>

      <form onSubmit={create} className="card">
        <h3>{t('יצירת טיול חדש')}</h3>
        <p className="muted small">{t('נוצר מסלול בסיסי של טוקיו, קיוטו ואוסקה, אפשר לערוך אותו')}</p>
        <Field label={t('שם הטיול')}>
          <input value={tripName} onChange={(e) => setTripName(e.target.value)} required />
        </Field>
        <Field label={t('תאריך התחלה (אפשר להשלים אחר כך)')}>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <button className="secondary" disabled={!name.trim() || !!busy}>
          {busy === 'create' ? t('יוצרים טיול…') : t('יצירת טיול')}
        </button>
      </form>
      {err && (
        <p className="msg" role="alert">
          {err}
        </p>
      )}
      <button className="link" onClick={() => setSigningOut(true)}>
        {t('התנתקות')}
      </button>
      {signingOut && <SignOutSheet onClose={() => setSigningOut(false)} />}
    </div>
  )
}
