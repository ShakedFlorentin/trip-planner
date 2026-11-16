import { CITY_HE, type Candidate, type DayInfo, type Place, type Trip } from './types'
import type { PlanItem } from './views/planUtils'

// What gets published is a snapshot built here from the plan, and it holds only the pieces below. Never put anything
// else in it: no bookings, files, confirmation numbers, hotels or addresses, expenses, member names, whose plan an
// item is, or notes people typed. Only places and plan items for everyone ("together", `who` empty) go in: a couple's
// own places and stops stay private.

export type SharedStop = { name: string; category: string; tip?: string; tip_en?: string; lat?: number; lng?: number }
export type SharedDay = { day: number; city: string | null; stops: SharedStop[] }
export type SharedSnapshot = { v: 1; name?: string; num_days: number; days: SharedDay[] }

// kinds of place that are shared; a hotel or an errand saved as a place never is
const SHARED_CATEGORIES = new Set(['sight', 'food', 'cafe', 'shopping', 'nightlife', 'experience'])
const TIP_MAX = 240
const NAME_MAX = 120
// the same caps the public page applies when it reads a snapshot (SharedPlan.clean), so the preview shows what is read
export const MAX_DAYS = 60
export const MAX_STOPS = 40

const round = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 1e5) / 1e5 : undefined)

/** The snapshot of this plan: for each day its city and its places in order, from places that have a card or a name. */
export function buildSnapshot(opts: {
  trip: Trip
  days: DayInfo[]
  items: PlanItem[]
  places: Place[]
  cards: Candidate[]
  withName: boolean
  withTips: boolean
  /** days the sender left out: they are not in the snapshot at all */
  skipDays?: ReadonlySet<number>
}): SharedSnapshot {
  const { trip, days, items, places, cards } = opts
  const out: SharedDay[] = []
  for (let d = 1; d <= trip.num_days; d++) {
    if (opts.skipDays?.has(d)) continue
    const stops: SharedStop[] = []
    const cityCounts = new Map<string, number>()
    const todays = items
      .filter((i) => i.day === d && i.place_id && !i.who)
      .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || a.sort - b.sort)
    for (const i of todays) {
      if (stops.length >= MAX_STOPS) break
      const p = places.find((x) => x.id === i.place_id)
      if (!p || p.who) continue
      const card = cards.find((c) => c.id === p.candidate_id)
      const category = card?.category ?? p.category
      if (!SHARED_CATEGORIES.has(category)) continue
      // track the city of this stop in Hebrew (p.city is already Hebrew; card.city is a city ID)
      // skip the day-trip pseudo-city so a day-trip stop does not influence the heading
      const stopCity = p.city?.trim() || (card?.city ? (CITY_HE[card.city] ?? null) : null)
      if (stopCity && stopCity !== CITY_HE['daytrip']) {
        cityCounts.set(stopCity, (cityCounts.get(stopCity) ?? 0) + 1)
      }
      const stop: SharedStop = { name: p.name.trim().slice(0, NAME_MAX), category }
      // only a card from the shared library has a tip we wrote; a tip a member typed on their own card stays private
      const tip = card?.library_id ? card.tip?.trim() : undefined
      if (opts.withTips && tip) {
        stop.tip = tip.slice(0, TIP_MAX)
        const en = card?.en?.tip?.trim()
        if (en) stop.tip_en = en.slice(0, TIP_MAX)
      }
      const lat = round(p.lat ?? card?.lat)
      const lng = round(p.lng ?? card?.lng)
      if (lat !== undefined && lng !== undefined) Object.assign(stop, { lat, lng })
      if (stop.name) stops.push(stop)
    }
    // label the day with the city most of its shared stops are in; fall back to the sleep city on tie or no data
    const dayCity = days.find((x) => x.day === d)?.city?.trim() || null
    let city = dayCity
    if (cityCounts.size > 0) {
      const sorted = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])
      // unique winner only: if the top two are tied, keep the sleep city
      if (sorted.length === 1 || sorted[0][1] > sorted[1][1]) {
        city = sorted[0][0] // already in Hebrew
      }
    }
    if (stops.length) out.push({ day: d, city: city ? (CITY_HE[city] ?? city) : city, stops })
  }
  const snap: SharedSnapshot = { v: 1, num_days: trip.num_days, days: out.slice(0, MAX_DAYS) }
  if (opts.withName && trip.name.trim()) snap.name = trip.name.trim().slice(0, NAME_MAX)
  return snap
}
