import { FormEvent, useState } from 'react'
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { t } from '../i18n'

// Accounts are created for the group up front; each logs in with just their name, in Hebrew or English.
const ACCOUNTS: Record<string, string> = {
  שקד: 'shaked', // he-only
  shaked: 'shaked',
  מאור: 'maor', // he-only
  maor: 'maor',
  אלמוג: 'almog', // he-only
  almog: 'almog',
  שניר: 'snir', // he-only
  snir: 'snir',
}

/**
 * The account's email for what was typed, or null when no one in the group has that name. A full name works
 * ("שקד פלורנטין"), and so do capitals, stray spaces and niqqud; an email address is taken as it is.
 */
export function toEmail(typed: string) {
  const n = typed.trim().toLowerCase()
  if (n.includes('@')) return n
  const first = n.normalize('NFKD').replace(/[֑-ׇ]/g, '').split(/\s+/)[0] // he-only
  return ACCOUNTS[first] ? `${ACCOUNTS[first]}@japantrip.app` : null
}


// an invite link opens the app with ?invite=CODE; the code is kept until the new account is in, because the
// email-confirmation link brings people back without the query string
const INVITE_KEY = 'invite'

const inviteInUrl = () => new URLSearchParams(location.search).get('invite')?.trim() || null

function savedInvite() {
  try {
    return localStorage.getItem(INVITE_KEY)
  } catch {
    return null
  }
}

/** The invite did its job (the account exists and is signed in): forget it here and in the address bar. */
export function forgetInvite() {
  try {
    localStorage.removeItem(INVITE_KEY)
  } catch {
    // nothing kept
  }
  dropInviteFromUrl()
}

function dropInviteFromUrl() {
  const url = new URL(location.href)
  if (!url.searchParams.has('invite')) return
  url.searchParams.delete('invite')
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
}

/** A failed sign-up in words a person can act on, from the sign-up function's answer. */
async function signupFailure(error: unknown) {
  if (!navigator.onLine || error instanceof FunctionsFetchError) return t('אין אינטרנט. נסו שוב כשיש קליטה.')
  const res = error instanceof FunctionsHttpError ? (error.context as Response) : null
  const code = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : null
  if (res?.status === 429) return t('יותר מדי ניסיונות. חכו דקה ונסו שוב.')
  if (code === 'email_exists') return t('האימייל הזה כבר רשום. אפשר להתחבר.')
  if (code === 'invite_invalid') return t('ההזמנה לא בתוקף: כבר השתמשו בה או שעברו 30 יום. בקשו קישור חדש.')
  if (code === 'weak_password') return t('הסיסמה חלשה מדי. לפחות 8 תווים, עדיף עם אותיות ומספרים.')
  if (code === 'bad_request') return t('האימייל לא תקין.')
  return t('ההרשמה לא הצליחה. נסו שוב.')
}

export default function Login() {
  const [invite] = useState(() => {
    const code = inviteInUrl()
    if (code)
      try {
        localStorage.setItem(INVITE_KEY, code)
      } catch {
        // the link still works while this page stays open
      }
    return code ?? savedInvite()
  })
  const [mode, setMode] = useState<'login' | 'signup'>(() => (inviteInUrl() ? 'signup' : 'login'))
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const switchTo = (m: 'login' | 'signup') => {
    setMode(m)
    setMsg('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    const email = toEmail(name)
    if (!email) {
      setMsg(t('לא מכירים את השם. אפשר שקד, מאור, אלמוג, שניר או אימייל.'))
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (!error) return forgetInvite()
    // tell apart the cases a person can act on: no signal, too many tries, and a wrong password
    if (error.name === 'AuthRetryableFetchError' || !navigator.onLine) setMsg(t('אין אינטרנט. נסו שוב כשיש קליטה.'))
    else if (error.status === 429) setMsg(t('יותר מדי ניסיונות. חכו דקה ונסו שוב.'))
    else if (error.code === 'email_not_confirmed') setMsg(t('צריך לאשר קודם את המייל ששלחנו.'))
    else if (email.endsWith('@japantrip.app')) setMsg(t('הסיסמה לא נכונה.'))
    else setMsg(t('אימייל או סיסמה לא נכונים.'))
  }

  const signUp = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (!invite) return
    if (password.length < 8) return setMsg(t('הסיסמה צריכה לפחות 8 תווים.'))
    const address = email.trim().toLowerCase()
    setBusy(true)
    // the account is made by the sign-up function, already confirmed: the project's mail can't reach invited friends
    const { error } = await supabase.functions.invoke('sign-up', { body: { invite, email: address, password, name: displayName.trim() } })
    if (error) {
      setBusy(false)
      return setMsg(await signupFailure(error))
    }
    // the app's sign-in listener takes it from here (trip picker joins the invited trip)
    const { error: login } = await supabase.auth.signInWithPassword({ email: address, password })
    setBusy(false)
    if (!login) return forgetInvite()
    // made but not signed in (the signal dropped in between): the account is there, so log in with it
    dropInviteFromUrl()
    setName(address)
    setMode('login')
    setMsg(t('החשבון נוצר. אפשר להתחבר עם האימייל והסיסמה.'))
  }

  return (
    <div className="login">
      <h1 className="login-logo">
        {/* the Toogo stacked logo (brand/toogo/kit/masters/toogo-stacked.svg): red rings, the name in the text colour */}
        <svg viewBox="60 50 420 343" role="img" aria-label="Toogo">
          <path
            className="logo-rings"
            transform="translate(142 0)"
            d="M24 142A48 48 0 1 1 120 142A48 48 0 1 1 24 142ZM44 142A28 28 0 1 0 100 142A28 28 0 1 0 44 142ZM136 114A48 48 0 1 1 232 114A48 48 0 1 1 136 114ZM156 114A28 28 0 1 0 212 114A28 28 0 1 0 156 114Z"
          />
          <path
            fill="currentColor"
            transform="translate(76.86 199.44) scale(0.74)"
            d="M20 44H40V126A30 30 0 0 0 70 156V176A50 50 0 0 1 20 126ZM4 78H70V98H4ZM82 126A50 50 0 1 1 182 126A50 50 0 1 1 82 126ZM102 126A30 30 0 1 0 162 126A30 30 0 1 0 102 126ZM194 112A50 50 0 1 1 294 112A50 50 0 1 1 194 112ZM214 112A30 30 0 1 0 274 112A30 30 0 1 0 214 112ZM306 126A50 50 0 1 1 406 126A50 50 0 1 1 306 126ZM326 126A30 30 0 1 0 386 126A30 30 0 1 0 326 126ZM386 76H406V190A50 50 0 0 1 356 240H326V220H356A30 30 0 0 0 386 190ZM418 126A50 50 0 1 1 518 126A50 50 0 1 1 418 126ZM438 126A30 30 0 1 0 498 126A30 30 0 1 0 438 126Z"
          />
        </svg>
      </h1>
      <p className="muted">
        {mode === 'signup' ? t('הוזמנתם לטיול. יוצרים חשבון ומצטרפים.') : t('מסלול, הזמנות והוצאות במקום אחד')}
      </p>
      {mode === 'signup' ? (
        <form onSubmit={signUp} className="card">
          <input
            placeholder={t('השם שיוצג לשאר המשתתפים')}
            aria-label={t('שם')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            maxLength={40}
            required
          />
          <input
            type="email"
            placeholder={t('אימייל')}
            aria-label={t('אימייל')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            required
            dir="ltr"
          />
          <input
            type="password"
            placeholder={t('סיסמה (לפחות 8 תווים)')}
            aria-label={t('סיסמה')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            dir="ltr"
          />
          <button className="primary" disabled={busy}>
            {busy ? t('יוצרים חשבון…') : t('יצירת חשבון')}
          </button>
          {msg && (
            <p className="msg" role="alert">
              {msg}
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={submit} className="card">
          <input
            placeholder={t('שם או אימייל')}
            aria-label={t('שם או אימייל')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            required
          />
          <input
            type="password"
            placeholder={t('סיסמה')}
            aria-label={t('סיסמה')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            dir="ltr"
          />
          <button className="primary" disabled={busy}>
            {busy ? t('מתחברים…') : t('התחברות')}
          </button>
          {msg && (
            <p className="msg" role="alert">
              {msg}
            </p>
          )}
        </form>
      )}
      {invite &&
        (mode === 'signup' ? (
          <button className="link" onClick={() => switchTo('login')}>
            {t('כבר יש חשבון? התחברות')}
          </button>
        ) : (
          <button className="link" onClick={() => switchTo('signup')}>
            {t('קיבלתם הזמנה? יצירת חשבון')}
          </button>
        ))}
    </div>
  )
}
