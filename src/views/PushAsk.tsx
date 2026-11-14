import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { Sheet } from '../ui'
import { Icon } from '../icons'
import { t } from '../i18n'
import { enablePush, markPushAsked } from '../push'
import { track } from '../track'

/**
 * The offer to turn notifications on (src/push.ts), at a moment that shows what they are for: after liking places on a
 * shared trip, or right after a match. Says exactly what will be sent, so the phone's own question that follows the
 * tap is an easy yes.
 */
export default function PushAsk({ from, onClose }: { from: 'likes' | 'match'; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  useEffect(() => {
    markPushAsked()
    track('push_ask', { from })
  }, [from])

  const turnOn = async () => {
    setBusy(true)
    const r = await enablePush(from)
    setBusy(false)
    if (r === 'on') return onClose()
    setNote(r === 'blocked' ? t('ההתראות חסומות בהגדרות הטלפון. אפשר לפתוח אותן שם, תחת Toogo.') : t('לא הצלחתי להפעיל התראות. אפשר לנסות שוב מההגדרות.'))
  }

  return (
    <Sheet title={t('התראות על מאצ׳ים')} onClose={onClose}>
      <div className="stack pass">
        <p className="pass-lead">
          <Icon as={BellRing} /> {from === 'match' ? t('את המאצ׳ הזה ראיתם כאן. על הבא אפשר לקבל התראה.') : t('רוצים לדעת כשיש מאצ׳?')}
        </p>
        <p>{t('כשמישהו מהטיול יאהב מקום שגם אתם אהבתם, תקבלו התראה, עם היום בתוכנית שהמקום נכנס אליו.')}</p>
        <p className="small muted">{t('רק על מאצ׳ים, בלי פרסומות. אפשר לכבות בהגדרות.')}</p>
        <button className="primary" onClick={turnOn} disabled={busy}>
          {t('להפעיל התראות')}
        </button>
        {note && (
          <p className="small muted" role="status">
            {note}
          </p>
        )}
        <button className="link" onClick={onClose}>
          {t('לא עכשיו')}
        </button>
      </div>
    </Sheet>
  )
}
