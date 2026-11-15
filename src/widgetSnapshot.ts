// The small snapshot the iOS widgets draw (ios/App/ToogoWidget/WidgetModel.swift reads exactly this). Pure: no app
// imports, so a node test can run it. Only what a widget shows leaves the page: no ids, members, money or notes.

export type WidgetStop = { time: string | null; title: string; done: boolean }
export type WidgetDay = { date: string; city: string | null; stops: WidgetStop[] }
export type WidgetSnapshot = {
  v: 1
  lang: 'he' | 'en'
  trip: string
  start: string | null
  numDays: number
  days: WidgetDay[]
}

const MAX_STOPS = 12
const MAX_TITLE = 48

const clip = (s: string) => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > MAX_TITLE ? t.slice(0, MAX_TITLE - 1) + '…' : t
}

/** Tokyo's calendar date (YYYY-MM-DD) n days after `ymd`. */
function addDays(ymd: string, n: number) {
  return new Date(Date.parse(ymd + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
}

/**
 * Today's and tomorrow's stops (tomorrow's so the widget can roll over at midnight on its own) while the trip is on;
 * no days before or after it (the widget counts down or says it is over from start and numDays).
 * `stopsOf(day)` is the app's own timeline for a trip day (what Home shows as "next"), `cityOf(day)` its city.
 */
export function buildSnapshot(input: {
  lang: 'he' | 'en'
  trip: { name: string; start_date: string | null; num_days: number }
  today: number | null
  stopsOf: (day: number) => WidgetStop[]
  cityOf: (day: number) => string | null
}): WidgetSnapshot {
  const { trip, today } = input
  const days: WidgetDay[] = []
  if (trip.start_date && today) {
    for (const d of [today, today + 1]) {
      if (d > trip.num_days) break
      days.push({
        date: addDays(trip.start_date, d - 1),
        city: input.cityOf(d),
        stops: input
          .stopsOf(d)
          .filter((s) => s.title.trim())
          .slice(0, MAX_STOPS)
          .map((s) => ({ time: s.time && /^\d\d:\d\d/.test(s.time) ? s.time.slice(0, 5) : null, title: clip(s.title), done: s.done })),
      })
    }
  } else if (trip.start_date) {
    // before the trip: the first city, for "N days to the flight · Tokyo"
    const city = input.cityOf(1)
    if (city) days.push({ date: trip.start_date, city, stops: [] })
  }
  return { v: 1, lang: input.lang, trip: clip(trip.name), start: trip.start_date, numDays: trip.num_days, days }
}
