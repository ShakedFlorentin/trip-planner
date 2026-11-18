import { useRef } from 'react'
import { DrawerClose } from '@ui-sdk/react/drawer'
import { locale, t } from '../i18n'
import { dayDate } from '../lib'
import { Sheet } from '../ui'
import type { Trip } from '../types'
import { ymd } from './planUtils'
import '../styles/plan.css'

/**
 * The days the planner will move, by the same rule as plan-trip/index.ts (fixedItems): a day on or before today's date
 * in Japan is kept as it is. Ticked stops and hand-added ones also stay, and bookings and expenses are never touched;
 * the sheet says so in a line instead of drawing it.
 */
export function replanDays(trip: Pick<Trip, 'start_date' | 'num_days'>) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
  return Array.from({ length: trip.num_days }, (_, i) => i + 1).map((day) => {
    const date = dayDate(trip.start_date, day)
    const iso = date ? ymd(date) : null
    // a trip with no dates yet has nothing in the past
    return { day, date, stays: iso != null && iso <= today, today: iso === today }
  })
}

type Cell = ReturnType<typeof replanDays>[number] | null

export function ReplanSheet({ trip, onClose }: { trip: Trip; onClose: (go: boolean) => void }) {
  const all = replanDays(trip)
  const moving = all.filter((d) => !d.stays).length
  // one block per month, each starting under its weekday (Sunday first); a trip with no dates is one plain block
  const months: { key: string; label: string; cells: Cell[] }[] = []
  for (const d of all) {
    const key = d.date ? `${d.date.getFullYear()}-${d.date.getMonth()}` : 'none'
    let m = months.find((x) => x.key === key)
    if (!m) {
      m = {
        key,
        label: d.date ? d.date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : '',
        cells: d.date ? Array<Cell>(d.date.getDay()).fill(null) : [],
      }
      months.push(m)
    }
    m.cells.push(d)
  }
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 0, 4 + i).toLocaleDateString(locale, { weekday: 'narrow' }))
  const dated = !!trip.start_date
  const go = useRef(false)
  return (
    <Sheet title={t('סידור מחדש של הימים')} closeLabel={t('ביטול')} onClose={() => onClose(go.current)}>
      <div className="stack">
        <p className="muted">{t('הימים שיזוזו מסומנים באדום. כל השאר נשאר כמו שהוא.')}</p>
        {months.map((m) => (
          <section key={m.key} className="rp-month" aria-label={m.label || undefined}>
            {m.label && <h3 className="rp-month-name">{m.label}</h3>}
            {dated && (
              <div className="rp-grid rp-weekdays" aria-hidden="true">
                {weekdays.map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>
            )}
            <div className="rp-grid">
              {m.cells.map((c, i) =>
                c ? (
                  <span
                    key={c.day}
                    className="rp-day"
                    data-state={c.stays ? 'stays' : 'moves'}
                    data-today={c.today ? '' : undefined}
                    aria-label={`${c.date ? c.date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) : t('יום {day}', { day: c.day })}, ${c.stays ? t('נשאר') : t('יסודר מחדש')}`}
                  >
                    {c.date ? c.date.getDate() : c.day}
                  </span>
                ) : (
                  <span key={'b' + i} aria-hidden="true" />
                ),
              )}
            </div>
          </section>
        ))}
        <p className="rp-legend muted small">
          <span className="rp-key" data-state="stays" aria-hidden="true" /> {t('נשאר')}
          <span className="rp-key" data-state="moves" aria-hidden="true" /> {t('יסודר מחדש')}
          {all.some((d) => d.today) && (
            <>
              <span className="rp-key" data-state="stays" data-today="" aria-hidden="true" /> {t('היום')}
            </>
          )}
        </p>
        <p className="muted small">{t('ימים שעברו, היום, מקומות שסימנתם וכאלה שהוספתם בעצמכם נשארים. הזמנות והוצאות לא משתנות.')}</p>
        {moving === 0 ? (
          <p className="muted" role="status">{t('אין ימים שאפשר לסדר מחדש. הטיול הסתיים.')}</p>
        ) : (
          <DrawerClose className="primary" onClick={() => (go.current = true)}>
            {moving === 1 ? t('סדר מחדש יום אחד') : t('סדר מחדש {n} ימים', { n: moving })}
          </DrawerClose>
        )}
      </div>
    </Sheet>
  )
}
