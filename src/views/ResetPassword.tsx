import { FormEvent, useState } from 'react'
import { supabase } from '../supabase'
import { t } from '../i18n'
import { ToogoLogo } from './Login'

// the marker only rides along in the reset link; the screen opens on the sign-in library's PASSWORD_RECOVERY event,
// never on the address alone. Taken out of the address bar at load so a copied or forwarded address carries nothing.
if (/[?&]reset=1\b/.test(location.search)) {
  const url = new URL(location.href)
  url.searchParams.delete('reset')
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
}

/** "Choose a new password": shown after the reset link signed the person in. */
export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (password.length < 8) return setMsg(t('הסיסמה צריכה לפחות 8 תווים.'))
    if (password !== again) return setMsg(t('הסיסמאות לא זהות.'))
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (!error) {
      // older sessions of this account (other devices) end; this one stays
      await supabase.auth.signOut({ scope: 'others' }).catch(() => {})
      return onDone()
    }
    if (error.name === 'AuthRetryableFetchError' || !navigator.onLine) setMsg(t('אין אינטרנט. נסו שוב כשיש קליטה.'))
    else if (error.code === 'weak_password') setMsg(t('הסיסמה חלשה מדי. לפחות 8 תווים, עדיף עם אותיות ומספרים.'))
    else setMsg(t('לא הצלחנו לשמור את הסיסמה. נסו שוב.'))
  }

  return (
    <div className="login">
      <ToogoLogo />
      <form onSubmit={submit} className="card">
        <h3>{t('בחירת סיסמה חדשה')}</h3>
        <input
          type="password"
          placeholder={t('סיסמה חדשה (לפחות 8 תווים)')}
          aria-label={t('סיסמה חדשה')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          dir="ltr"
        />
        <input
          type="password"
          placeholder={t('הסיסמה שוב')}
          aria-label={t('הסיסמה שוב')}
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          autoComplete="new-password"
          required
          dir="ltr"
        />
        <button className="primary" disabled={busy}>
          {busy ? t('שומר…') : t('שמירת הסיסמה')}
        </button>
        {msg && (
          <p className="msg" role="alert">
            {msg}
          </p>
        )}
      </form>
      <button className="link" onClick={onDone}>
        {t('לא עכשיו')}
      </button>
    </div>
  )
}
