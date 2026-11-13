import { useEffect, useState } from 'react'
import { Infinity as InfinityIcon, Library, Users } from 'lucide-react'
import { Sheet } from '../ui'
import { Icon } from '../icons'
import { t } from '../i18n'
import { buyPass, passPrice, type PassStatus } from '../pass'
import { track } from '../track'

/**
 * The trip pass offer (src/pass.ts): opens when a trip has used its free new places and someone tries to add another,
 * or from Settings. Says what the pass gives and what stays free, with one button to buy and one to close.
 */
export default function PassSheet({ tripId, status, onClose }: { tripId: string; status: PassStatus | null; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const free = status?.free ?? 10
  const used = status ? status.used >= status.free : true
  useEffect(() => track('pass_offer', { used: status?.used ?? null, has: !!status?.pass }), [])

  const buy = async () => {
    track('pass_buy_tap')
    setBusy(true)
    const r = await buyPass(tripId)
    setBusy(false)
    if (r === 'soon') setNote(t('התשלום ייפתח בקרוב. בינתיים אפשר להוסיף מקומות שכבר יש ב-Toogo, בחיפוש לפי שם.'))
  }

  if (status?.pass)
    return (
      <Sheet title={t('כרטיס לטיול')} onClose={onClose}>
        <div className="stack pass">
          <p className="pass-lead">{t('לטיול הזה יש כרטיס: מקומות חדשים בלי הגבלה, לכל מי שבטיול.')}</p>
        </div>
      </Sheet>
    )

  return (
    <Sheet title={t('כרטיס לטיול')} onClose={onClose}>
      <div className="stack pass">
        <p className="pass-lead">
          {used
            ? t('הוספתם את {n} המקומות החדשים שחינם לטיול הזה.', { n: free })
            : t('נשארו {left} מתוך {n} מקומות חדשים בחינם לטיול הזה.', { left: status?.left ?? 0, n: free })}
        </p>
        <ul className="pass-lines">
          <li>
            <Icon as={InfinityIcon} /> <span>{t('מקומות חדשים בלי הגבלה, מכל קישור או שם')}</span>
          </li>
          <li>
            <Icon as={Users} /> <span>{t('לכל מי שבטיול, בתשלום אחד. לא מנוי')}</span>
          </li>
          <li>
            <Icon as={Library} /> <span>{t('מקומות שכבר יש ב-Toogo נשארים בחינם, תמיד')}</span>
          </li>
        </ul>
        <button className="primary" onClick={buy} disabled={busy}>
          {t('כרטיס לטיול ב-{price}', { price: passPrice() })}
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
