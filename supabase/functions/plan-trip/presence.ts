// Where each couple is on each day and the hours they have: built from where they sleep (a Sleep is one stay of one
// party in one city). Pure code, so it can be tested outside the edge runtime (scripts/plan-test.mjs, presence fixtures).
import { ride, type Day, type Point, type Presence } from './plan.ts'
import { JAPAN, ROUTE, AIRPORT_PT, japanAirportCode, flightDest } from './airports.ts'

/** One stay: a party (null = everyone) sleeps in a city from check-in until the morning of check-out. */
export type Sleep = {
  party: string | null
  checkIn: string // YYYY-MM-DD, first night
  checkOut: string // YYYY-MM-DD, the morning they leave
  city: string | null // null: not a known city, the couple is left out of those days
  point: Point
  label: string // the hotel's name: the booking's title, else the area, else the city
  key: string // two nights in a row with the same key are the same place (no move in between)
  confirmed: boolean
  booked: boolean // a hotel booking stands behind it; without one the day's times are estimates
}

export type FlightLite = { who: string | null; title: string; starts_at: string | null; ends_at: string | null }

/** A presence that also says which hotel it is and whether its times are an estimate (no booking yet). */
export type PresenceInfo = Presence & {
  label?: string
  estimate?: boolean
  /** set on the day a couple arrives in Japan: the airport they land at, the ride to the hotel, and the landing time */
  arrival?: { airport: string; ride_min: number; landing_min: number }
}

const mins = (t: string) => {
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
const at = (ts: string | null) => (ts ? { date: ts.slice(0, 10), min: mins(ts.slice(11, 16))! } : null)

export type PresenceInput = {
  numDays: number
  dateOf: (day: number) => string
  sleeps: Sleep[]
  couples: string[]
  /** day_info.who per day: a day written for one couple is not the everyone-stays'. */
  dayWho: Map<number, string | null>
  flights: FlightLite[]
  capOf: Map<string, number>
  /** a day that has passed takes no new plans */
  past: (day: number) => boolean
}

/** The days, each with the couples present, the hours they have, and where they sleep. */
export function buildDays(inp: PresenceInput): Day[] {
  const { dateOf, couples, dayWho, capOf } = inp
  // a confirmed stay wins over a proposed one; otherwise the first in the list, as before
  const sleeps = [...inp.sleeps].sort((a, b) => Number(b.confirmed) - Number(a.confirmed))
  const sleepOf = (c: string, date: string, day: number) =>
    sleeps.find(
      (h) =>
        h.checkIn <= date &&
        date < h.checkOut &&
        (h.party === c || (!h.party && (!dayWho.get(day) || dayWho.get(day) === c))),
    )
  const flightOf = (c: string, date: string, way: 'in' | 'out') =>
    inp.flights.find((f) => {
      if (f.who && f.who !== c) return false
      const [from] = f.title.split(ROUTE)
      // flightDest returns the destination half, or the full title when there is no route separator (e.g. "TLV-NRT", "טוקיו")
      if (way === 'in') return JAPAN.test(flightDest(f.title)) && f.ends_at?.slice(0, 10) === date
      return JAPAN.test(from) && f.starts_at?.slice(0, 10) === date
    })

  const days: Day[] = []
  for (let d = 1; d <= inp.numDays; d++) {
    const date = dateOf(d)
    const atMap = new Map<string, PresenceInfo>()
    for (const c of inp.past(d) ? [] : couples) {
      const tonight = sleepOf(c, date, d)
      const last = sleepOf(c, dateOf(d - 1), d - 1)
      if (!tonight && !last) continue
      let s = 9 * 60 + 30
      let e = 21 * 60 + 30
      let arrivalInfo: { airport: string; ride_min: number; landing_min: number } | undefined
      if (tonight && !last) {
        const f = flightOf(c, date, 'in')
        if (f) {
          // day start = landing + 60 (border control and bags) + ride to hotel + 20 (drop bags),
          // but never earlier than landing + 120
          const dest = flightDest(f.title)
          const code = japanAirportCode(dest)
          const airportPt = code ? AIRPORT_PT[code] : null
          const rideMin = ride(airportPt ?? null, tonight.point)
          const landMin = at(f.ends_at)!.min
          s = Math.max(s, landMin + Math.max(80 + rideMin, 120))
          arrivalInfo = { airport: code ?? 'JPN', ride_min: rideMin, landing_min: landMin }
        } else {
          s = Math.max(s, 15 * 60)
        }
      }
      if (!tonight && last) {
        const f = flightOf(c, date, 'out')
        e = Math.min(e, f ? at(f.starts_at)!.min - 210 : 12 * 60)
      }
      const h = (tonight ?? last)!
      if (tonight && last && tonight.key !== last.key) {
        s = Math.max(s, tonight.city !== last.city ? 14 * 60 : 12 * 60)
      }
      if (!h.city) continue
      const p: PresenceInfo = { base: h.city, hotel: h.point, start: s, end: Math.max(s, e), cap: capOf.get(c), label: h.label }
      if (!h.booked) p.estimate = true
      if (arrivalInfo) { p.landing = true; p.arrival = arrivalInfo }
      atMap.set(c, p)
    }
    days.push({ day: d, date, weekday: new Date(date + 'T12:00:00Z').getUTCDay(), at: atMap })
  }
  return days
}
