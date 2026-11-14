import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, CloudDownload, LoaderCircle } from 'lucide-react'
import { Icon } from '../icons'
import { t } from '../i18n'
import { ago, useOnline } from '../offline'
import { currentDay } from '../lib'
import { daysToKeep, due, lastReady, prepare } from '../ready'
import type { Trip } from '../types'

/**
 * One line on Home during the trip (roadmap step 12, src/ready.ts): saves today and tomorrow on the phone whenever the
 * app is in front with a connection, and says whether they are saved. Tapping it saves again now.
 */
export default function ReadyLine({ trip }: { trip: Trip }) {
  const days = daysToKeep(trip.start_date, trip.num_days)
  const daysKey = days.join()
  const online = useOnline()
  const [saving, setSaving] = useState(false)
  const [last, setLast] = useState(() => lastReady(trip.id))

  const save = useCallback(
    async (now: boolean) => {
      if (!daysKey || !navigator.onLine || (!now && !due(trip.id, days))) return
      setSaving(true)
      await prepare(trip, days)
      setLast(lastReady(trip.id))
      setSaving(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- daysKey stands for days
    [trip.id, trip.start_date, daysKey],
  )

  useEffect(() => {
    // a moment after the screen is up, so the first screen's own loading goes first
    const first = setTimeout(() => void save(false), 3000)
    const again = () => document.visibilityState === 'visible' && void save(false)
    document.addEventListener('visibilitychange', again)
    window.addEventListener('online', again)
    return () => {
      clearTimeout(first)
      document.removeEventListener('visibilitychange', again)
      window.removeEventListener('online', again)
    }
  }, [save])

  if (!days.length) return null
  const today = currentDay(trip.start_date, trip.num_days)
  const fresh = last && last.data.days.join() === daysKey
  const what = days.length === 2 ? t('היום ומחר שמורים בטלפון, גם בלי קליטה') : today ? t('היום שמור בטלפון, גם בלי קליטה') : t('היום הראשון שמור בטלפון, גם בלי קליטה')
  const missed = fresh && last.data.missed > 0

  return (
    <button className="ready-line" onClick={() => void save(true)} disabled={saving || !online} aria-live="polite">
      <Icon as={saving ? LoaderCircle : fresh ? CircleCheck : CloudDownload} className={saving ? 'spin' : fresh ? 'ok' : ''} />
      <span className="ready-text">
        <span>{saving ? t('שומרים בטלפון את הימים הקרובים…') : fresh ? what : t('הימים הקרובים עוד לא שמורים בטלפון')}</span>
        <small className="muted">
          {saving
            ? t('תמונות, מפה ומסמכים, כדי שיעבדו גם בלי קליטה')
            : fresh
              ? [t('נשמר {ago}', { ago: ago(last.at) }), ...(online ? [missed ? t('חלק לא נשמר, נגעו לשמור שוב') : t('נגעו כדי לשמור שוב')] : [])].join(' · ')
              : online
                ? t('נגעו כדי לשמור עכשיו')
                : t('יישמרו כשתהיה קליטה')}
        </small>
      </span>
    </button>
  )
}
