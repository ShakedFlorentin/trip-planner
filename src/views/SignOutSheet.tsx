import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { t } from '../i18n'
import { Sheet } from '../ui'
import { flush, onOutbox, pending } from '../outbox'
import { disablePush } from '../push'

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * "Sign out" asked in our own sheet (not the browser's confirm). This phone only: other devices stay signed in.
 * Says how many changes were not sent yet (they stay on this phone for this account), tries to send them first when
 * there is a connection, and stops this phone's notifications for the account before leaving it.
 */
export default function SignOutSheet({ onClose }: { onClose: () => void }) {
  const [unsent, setUnsent] = useState(() => pending().length)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    const off = onOutbox(() => setUnsent(pending().length))
    return () => void off()
  }, [])

  const signOut = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    // send what waits while the account is still there, but never hold the sign-out for long
    if (navigator.onLine && pending().length) await Promise.race([flush().catch(() => {}), wait(6000)])
    // this phone must not keep getting this account's notifications
    await Promise.race([disablePush(true).catch(() => {}), wait(4000)])
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      setErr(t('לא הצלחנו להתנתק. נסו שוב.'))
      setBusy(false)
    }
  }

  return (
    <Sheet title={t('התנתקות')} onClose={onClose}>
      <p>{t('להתנתק מהטלפון הזה? כדי לחזור צריך שם וסיסמה.')}</p>
      {unsent > 0 && (
        <p className="msg" role="status">
          {unsent === 1 ? t('שינוי אחד עוד לא נשלח') : t('{n} שינויים עוד לא נשלחו', { n: unsent })}
          <br />
          {t('הם נשמרים בטלפון ויישלחו כשתתחברו שוב לחשבון הזה.')}
        </p>
      )}
      {err && (
        <p className="msg" role="alert">
          {err}
        </p>
      )}
      <button className="danger" onClick={signOut} disabled={busy} aria-busy={busy}>
        {busy ? t('מתנתקים…') : t('התנתקות')}
      </button>
      <button className="link" onClick={onClose} disabled={busy}>
        {t('ביטול')}
      </button>
    </Sheet>
  )
}
