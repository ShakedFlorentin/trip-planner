import { useEffect, useState } from 'react'
import { t } from './i18n'
import { discardFailed, failedChanges, onOutbox, pending, retryFailed } from './outbox'
import { Sheet } from './ui'

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** "לפני 3 שעות" for a timestamp. */
export function ago(at: number) {
  const min = Math.max(1, Math.round((Date.now() - at) / 60000))
  if (min < 60) return min === 1 ? t('לפני דקה') : t('לפני {n} דקות', { n: min })
  const h = Math.round(min / 60)
  if (h < 24) return h === 1 ? t('לפני שעה') : h === 2 ? t('לפני שעתיים') : t('לפני {n} שעות', { n: h })
  const d = Math.round(h / 24)
  return d === 1 ? t('לפני יום') : d === 2 ? t('לפני יומיים') : t('לפני {n} ימים', { n: d })
}

/** How many changes made offline are still waiting to be sent, and how many the server refused. */
function useWaiting() {
  const count = () => {
    const all = pending()
    return { waiting: all.filter((p) => !p.failed).length, failed: all.filter((p) => p.failed).length }
  }
  const [n, setN] = useState(count)
  useEffect(() => {
    const off = onOutbox(() => setN(count()))
    return () => {
      off()
    }
  }, [])
  return n
}

const TABLE_LABEL: Record<string, () => string> = {
  expenses: () => t('הוצאה או החזר'),
  itinerary_items: () => t('פריט בתוכנית'),
  places: () => t('מקום'),
  checklist_items: () => t('משימה ברשימה'),
  bookings: () => t('הזמנה'),
  swipes: () => t('החלקה על כרטיס'),
}

/** What a refused change was, in a few words: "Added: Expense or repayment · Ramen". */
function describe(p: ReturnType<typeof failedChanges>[number]) {
  const what = (TABLE_LABEL[p.table] ?? (() => t('שינוי')))()
  let name = ''
  try {
    const b = p.body ? JSON.parse(p.body) : null
    const row = Array.isArray(b) ? b[0] : b
    name = String(row?.title ?? row?.name ?? '')
  } catch {
    // no readable name
  }
  const label = name ? `${what} · ${name}` : what
  return p.method === 'POST' ? t('הוספה: {what}', { what: label }) : p.method === 'PATCH' ? t('עדכון: {what}', { what: label }) : t('מחיקה: {what}', { what: label })
}

function FailedSheet({ onClose }: { onClose: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const off = onOutbox(() => tick((n) => n + 1))
    return () => {
      off()
    }
  }, [])
  const list = failedChanges()
  useEffect(() => {
    if (!list.length) onClose()
  }, [list.length, onClose])
  return (
    <Sheet title={t('שינויים שלא נשמרו')} onClose={onClose} closeLabel={t('סגירה')}>
      <p className="muted small">{t('השרת לא קיבל את השינויים האלה. אפשר לנסות שוב או לוותר עליהם.')}</p>
      <div className="stack">
        {list.map((p) => (
          <div key={p.id} className="card">
            <b>{describe(p)}</b>
            <div className="muted small">{ago(p.at)}</div>
            <div className="row" style={{ gap: 12, marginTop: 8 }}>
              <button className="link" onClick={() => retryFailed(p.id)}>
                {t('לנסות שוב')}
              </button>
              <button className="link" onClick={() => discardFailed(p.id)}>
                {t('לוותר')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/**
 * Slim bar under the top bar while there is no connection, while what's shown is a saved copy (`since` = when that
 * copy was taken), or while changes made offline wait to be sent.
 */
export function OfflineBanner({ since }: { since: number | null }) {
  const online = useOnline()
  const { waiting, failed } = useWaiting()
  const [showFailed, setShowFailed] = useState(false)
  const [, tick] = useState(0)
  // keep "לפני 3 שעות" honest while the screen stays open
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])
  if (online && since == null && !waiting && !failed) return null
  const parts: string[] = []
  if (!online || since != null) parts.push(online ? t('השרת לא עונה') : t('אין אינטרנט'))
  if (since != null) parts.push(t('עדכון אחרון {ago}', { ago: ago(since) }))
  if (waiting)
    parts.push(
      online
        ? waiting === 1 ? t('שולח שינוי אחד…') : t('שולח {n} שינויים…', { n: waiting })
        : waiting === 1 ? t('שינוי אחד יישלח כשתהיה קליטה') : t('{n} שינויים יישלחו כשתהיה קליטה', { n: waiting }),
    )
  const lead = parts.join(' · ')
  return (
    <>
    <div role="status" className="net-bar small" data-state={failed > 0 ? 'failed' : 'waiting'}>
      {lead && <span>{lead}</span>}
      {failed > 0 && (
        <>
          {lead && <span aria-hidden="true">·</span>}
          <button className="link" onClick={() => setShowFailed(true)}>
            {failed === 1 ? t('שינוי אחד לא נשמר') : t('{n} שינויים לא נשמרו', { n: failed })}
          </button>
        </>
      )}
    </div>
    {showFailed && <FailedSheet onClose={() => setShowFailed(false)} />}
    </>
  )
}
