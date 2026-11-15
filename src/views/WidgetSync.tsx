import { useEffect, useState } from 'react'
import { useTripTable, cityLabel, currentDay, dayDate } from '../lib'
import { lang } from '../i18n'
import { dayEntries, ymd, type PlanItem } from './planUtils'
import type { Booking, DayInfo, Member, Trip } from '../types'
import { buildSnapshot } from '../widgetSnapshot'
import { clearWidgetData, pushWidgetData } from '../widgetData'

/**
 * Keeps the iOS widgets in step with the plan: whenever the day, the plan, a booking or a tick changes, the widgets get
 * today's (and tomorrow's) stops. Renders nothing. Only mounted in the iOS app (App.tsx), where the tables it reads are
 * the ones Home already loads, so it adds no requests. Signing out or leaving the trip takes the trip off the widgets.
 */
export default function WidgetSync({ trip, members, userId }: { trip: Trip; members: Member[]; userId: string }) {
  const { rows: days } = useTripTable<DayInfo>('day_info', trip.id, 'day')
  const { rows: items } = useTripTable<PlanItem>('itinerary_items', trip.id, 'sort')
  const { rows: bookings } = useTripTable<Booking>('bookings', trip.id, 'starts_at')
  // Tokyo's date changes at its midnight even if the app stays open
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const id = setInterval(bump, 5 * 60000)
    document.addEventListener('visibilitychange', bump)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', bump)
    }
  }, [])
  useEffect(() => () => void clearWidgetData(), [trip.id])

  const myCouple = members.find((m) => m.user_id === userId)?.couple ?? null
  useEffect(() => {
    const date = (d: number) => dayDate(trip.start_date, d)
    const snap = buildSnapshot({
      lang,
      trip,
      today: currentDay(trip.start_date, trip.num_days),
      stopsOf: (d) => {
        const dt = date(d)
        return dt ? dayEntries(items, bookings, d, ymd(dt), 'mine', myCouple).map((e) => ({ time: e.time, title: e.title, done: e.done })) : []
      },
      cityOf: (d) => {
        const c = days.find((x) => x.day === d)?.city?.split(' / ')[0]
        return c ? cityLabel(c) : null
      },
    })
    void pushWidgetData(snap)
  }, [trip, days, items, bookings, myCouple, tick])
  return null
}
