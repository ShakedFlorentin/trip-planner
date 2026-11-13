import { FormEvent, useState } from 'react'
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { t } from '../i18n'
import LoginCarousel from './LoginCarousel'
import { openExternal, privacyUrl } from '../native'

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

export const inviteInUrl = () => new URLSearchParams(location.search).get('invite')?.trim() || null

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

/** The Toogo stacked logo: red rings, the name in the text colour (brand/toogo/kit/masters/toogo-stacked.svg). */
export function ToogoLogo() {
  return (
    <h1 className="login-logo">
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
  )
}

/** Google's "G", in its own colours (Google's sign-in branding asks for the mark as is). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

/**
 * "Continue with Google": the way in for anyone, invite or not (app_settings features.google_signin; the database
 * lets a Google account in without an invite only while it is on). Google brings them back to this page signed in.
 * Not in the iOS app yet: it needs the app's own link back from the browser.
 */
function GoogleButton({ onError }: { onError: (msg: string) => void }) {
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
    if (error) {
      setBusy(false)
      onError(navigator.onLine ? t('ההתחברות עם Google לא הצליחה. נסו שוב.') : t('אין אינטרנט. נסו שוב כשיש קליטה.'))
    }
  }
  return (
    <button type="button" className="google-btn" onClick={go} disabled={busy}>
      <GoogleMark /> <span>{busy ? t('עוברים ל-Google…') : t('המשך עם Google')}</span>
    </button>
  )
}

export default function Login({ onGuest, google = false }: { onGuest?: () => void; google?: boolean } = {}) {
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
      <ToogoLogo />
      <p className="muted">
        {mode === 'signup' ? t('הוזמנתם לטיול. יוצרים חשבון ומצטרפים.') : t('מסלול, הזמנות והוצאות במקום אחד')}
      </p>
      <LoginCarousel />
      {google && mode === 'login' && (
        <>
          <GoogleButton onError={setMsg} />
          <p className="small muted login-or">{t('או עם שם או אימייל וסיסמה')}</p>
        </>
      )}
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
      {onGuest && !invite && (
        <button className="link" onClick={onGuest}>
          {t('אין לכם חשבון? מתחילים בלי')}
        </button>
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
      <p className="small muted login-legal">
        {t('בהמשך אתם מסכימים ל')}
        <button type="button" className="link" onClick={() => openExternal(privacyUrl())}>
          {t('תנאי השימוש ומדיניות הפרטיות')}
        </button>
      </p>
    </div>
  )
}
