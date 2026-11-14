import { supabase } from '../supabase'
import { t } from '../i18n'
import { Sheet } from '../ui'

/** "Sign out" asked in our own sheet (not the browser's confirm). This phone only: other devices stay signed in. */
export default function SignOutSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={t('התנתקות')} onClose={onClose}>
      <p>{t('להתנתק מהטלפון הזה? כדי לחזור צריך שם וסיסמה.')}</p>
      <button className="danger" onClick={() => supabase.auth.signOut({ scope: 'local' })}>
        {t('התנתקות')}
      </button>
      <button className="link" onClick={onClose}>
        {t('ביטול')}
      </button>
    </Sheet>
  )
}
