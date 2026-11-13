// Where to sleep before any hotel is booked: for each city stretch of the trip, the neighbourhood that puts the group
// closest to what it liked there (and to the trains and buses of its day trips), with up to two others and the numbers
// behind the choice. Plain code, no AI, no network: the same input always gives the same answer, and it is tested
// outside the edge runtime (scripts/stay-test.mjs, and the stay fixtures of scripts/plan-test.mjs).
//
// One area per stretch, for all of its nights: a day of Shinjuku places and a day of Shibuya places are still one Tokyo
// base, never a hotel change in between. The planner then uses the area's station as the base of an estimate, instead
// of the city's middle, and a trip with no stays and no hotels at all still plans, from the city written on each day.
import { AREAS, HUBS, areaOf, type Area } from '../_shared/areas.ts'
import { km, ride, type Day, type Point } from './plan.ts'
import type { Sleep } from './presence.ts'

/** A liked place: where it is (null: not known), its city id, how much it matters (the planner's priority), how long. */
export type StayPlace = { id: string; point: Point | null; city: string | null; weight: number; mins: number; parties?: string[] | null }

/** One area, as the app shows it: near of total places are within `within` minutes; hubs: day-trip lines it is next to. */
export type AreaPick = { key: string; near: number; total: number; within: number; hubs: string[] }

/** The recommendation for one stretch with no hotel: the best area and up to two others. */
export type StayRec = {
  party: string | null
  city: string // city id (cities.id)
  areas_city: string // the AREAS key (the city's Hebrew name), for the app to find the area's names and station
  check_in: string
  check_out: string
  nights: number
  /** places: scored on the liked places; central: nothing liked there yet, the city's usual base */
  basis: 'places' | 'central'
  best: AreaPick
  alternatives: AreaPick[]
}

export type StayCtx = {
  base: Record<string, Point> // city id → its middle
  nameEn: Record<string, string>
  nameHe: Record<string, string> // city id → Hebrew name (the AREAS key)
  places: StayPlace[]
}

// a place further than this from the city's middle is a day trip (as in index.ts: unit.far)
const FAR_KM = 25
// further than this from every city of the trip: not reached from any of them
const DAYTRIP_KM = 150
// a day trip's places fill this many minutes a day
const TRIP_DAY_MINS = 420
// the "within N minutes" of the reason: the first of these that holds most of the places
const WITHIN = [15, 20, 25, 30]
const WITHIN_SHARE = 0.6
// an alternative this much worse than the best is not worth showing
const ALT_LIMIT = 1.6

// ---------- the scoring

type Scored = { area: Area; cost: number }

/**
 * The best area of a city for the places given, and up to two others. A local place costs its weight times the minutes
 * from the area's station (the planner's own ride estimate); a day trip costs, per day it takes, twice (there and back)
 * the minutes from the area to the station its train or bus leaves from (HUBS), so sleeping by that station wins. A
 * day trip with no known line costs half its weight times the ride to it. Null when the city has no areas.
 */
export function recommendArea(areasCity: string, places: { point: Point; weight: number; mins: number; dayTrip: boolean }[]) {
  const all = AREAS[areasCity] ?? []
  const areas = all.filter((a) => a.stay !== false)
  if (!areas.length) return null
  const local = places.filter((p) => !p.dayTrip)
  const trips = places.filter((p) => p.dayTrip)
  const hubs = HUBS.filter((h) => h.city === areasCity)
  // day-trip places by the line that reaches them
  const byHub = new Map<string, { hub: (typeof hubs)[number]; weight: number; mins: number; n: number }>()
  const loose: typeof trips = []
  for (const p of trips) {
    const h = hubs.find((x) => km(p.point, x) <= x.km)
    if (!h) {
      loose.push(p)
      continue
    }
    const g = byHub.get(h.id) ?? { hub: h, weight: 0, mins: 0, n: 0 }
    g.weight += p.weight
    g.mins += p.mins
    g.n++
    byHub.set(h.id, g)
  }
  const at = (a: Area): Point => ({ lat: a.lat, lng: a.lng })
  const access = (a: Area, hub: (typeof hubs)[number]) => {
    const from = all.filter((x) => hub.areas.includes(x.key))
    return from.length ? Math.min(...from.map((x) => ride(at(a), at(x)))) : 0
  }

  if (!local.length && !byHub.size && !loose.length) {
    // nothing to go by: the city's usual base first, then the others in the table's order
    const order = [...areas].sort((x, y) => Number(!!y.pick) - Number(!!x.pick))
    const pick = (a: Area): AreaPick => ({ key: a.key, near: 0, total: 0, within: 0, hubs: [] })
    return { basis: 'central' as const, best: pick(order[0]), alternatives: order.slice(1, 3).map(pick) }
  }

  const scored: Scored[] = areas.map((a, i) => {
    let cost = 0
    for (const p of local) cost += p.weight * ride(at(a), p.point)
    for (const g of byHub.values()) {
      const days = Math.max(1, Math.round(g.mins / TRIP_DAY_MINS))
      cost += 2 * days * (g.weight / g.n) * access(a, g.hub)
    }
    for (const p of loose) cost += 0.5 * p.weight * ride(at(a), p.point)
    // the table's order breaks a tie (the busier, better-connected areas come first)
    return { area: a, cost: cost + i * 1e-6 }
  })
  scored.sort((x, y) => x.cost - y.cost)
  const best = scored[0]
  const minsTo = (a: Area) => local.map((p) => ride(at(a), p.point))
  const bestMins = minsTo(best.area)
  const within = WITHIN.find((t) => bestMins.filter((m) => m <= t).length >= WITHIN_SHARE * local.length) ?? WITHIN[WITHIN.length - 1]
  const pick = (s: Scored): AreaPick => ({
    key: s.area.key,
    near: minsTo(s.area).filter((m) => m <= within).length,
    total: local.length,
    within: local.length ? within : 0,
    hubs: [...byHub.values()].filter((g) => g.hub.areas.includes(s.area.key)).map((g) => g.hub.id),
  })
  const alternatives = scored.slice(1).filter((s) => s.cost <= best.cost * ALT_LIMIT + 1).slice(0, 2)
  return { basis: 'places' as const, best: pick(best), alternatives: alternatives.map(pick) }
}

/**
 * The liked places a stretch in `city` serves: those whose nearest city of the trip is this one, within a day trip of
 * it; a place more than 25 km from its middle is a day trip. Places of one party only count for that party's stretch.
 */
export function placesFor(city: string, party: string | null, tripCities: string[], ctx: StayCtx) {
  const out: { point: Point; weight: number; mins: number; dayTrip: boolean }[] = []
  const mid = ctx.base[city]
  if (!mid) return out
  for (const p of ctx.places) {
    if (!p.point) continue
    if (party && p.parties?.length && !p.parties.includes(party)) continue
    let nearest: string | null = null
    let nd = Infinity
    for (const c of tripCities) {
      const b = ctx.base[c]
      if (!b) continue
      const d = km(p.point, b)
      if (d < nd) {
        nd = d
        nearest = c
      }
    }
    if (nearest !== city || nd > DAYTRIP_KM) continue
    out.push({ point: p.point, weight: p.weight, mins: p.mins, dayTrip: nd > FAR_KM })
  }
  return out
}

const nightsOf = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

/** The recommendation for one stretch, or null when its city has no areas (or no Hebrew name to find them by). */
function recFor(party: string | null, city: string, checkIn: string, checkOut: string, tripCities: string[], ctx: StayCtx): StayRec | null {
  const areasCity = ctx.nameHe[city]
  if (!areasCity) return null
  const r = recommendArea(areasCity, placesFor(city, party, tripCities, ctx))
  if (!r) return null
  return { party, city, areas_city: areasCity, check_in: checkIn, check_out: checkOut, nights: nightsOf(checkIn, checkOut), ...r }
}

/** The area's station, the base of an estimate. */
export function areaPoint(areasCity: string, key: string): Point | null {
  const a = (AREAS[areasCity] ?? []).find((x) => x.key === key)
  return a ? { lat: a.lat, lng: a.lng } : null
}

// ---------- the stays table

/** One trip_stays row, with its hotel booking resolved by the caller (booked: a hotel booking stands behind it). */
export type StayRowIn = {
  party: string | null
  city: string
  lat: number | null
  lng: number | null
  area: string | null
  check_in: string
  check_out: string
  status: 'proposed' | 'confirmed'
  booked: boolean
  hotelPoint: Point | null
  hotelTitle: string | null
}

/**
 * The sleeps from the stays table, the way the planner always read them, with one change: a stay with no hotel and no
 * coordinates sleeps at the area a person wrote on it (when it is one of the city's), else at the recommended area's
 * station, instead of the city's middle. Back-to-back stays of one party in one city share one recommendation.
 */
export function sleepsFromStays(rows: StayRowIn[], ctx: StayCtx): { sleeps: Sleep[]; recs: StayRec[] } {
  const tripCities = [...new Set(rows.map((r) => r.city))]
  const open = (s: StayRowIn) => !s.booked && (s.lat == null || s.lng == null) && !areaOf(ctx.nameHe[s.city], s.area)
  // the stretches to recommend for: consecutive open stays of one party in one city
  const recOf = new Map<StayRowIn, StayRec | null>()
  const recs: StayRec[] = []
  const sorted = rows.filter(open).sort((a, b) => (a.party ?? '').localeCompare(b.party ?? '') || a.check_in.localeCompare(b.check_in))
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1].party === sorted[i].party && sorted[j + 1].city === sorted[i].city && sorted[j + 1].check_in === sorted[j].check_out) j++
    const rec = recFor(sorted[i].party, sorted[i].city, sorted[i].check_in, sorted[j].check_out, tripCities, ctx)
    if (rec) recs.push(rec)
    for (let k = i; k <= j; k++) recOf.set(sorted[k], rec)
    i = j + 1
  }
  const sleeps = rows.map((s): Sleep => {
    let point: Point
    if (s.lat != null && s.lng != null) point = { lat: s.lat, lng: s.lng }
    else if (s.booked) point = s.hotelPoint || ctx.base[s.city] || ctx.base.tokyo
    else {
      const typed = areaOf(ctx.nameHe[s.city], s.area)
      const rec = recOf.get(s)
      point =
        (typed && { lat: typed.lat, lng: typed.lng }) ||
        (rec && areaPoint(rec.areas_city, rec.best.key)) ||
        ctx.base[s.city] ||
        ctx.base.tokyo
    }
    return {
      party: s.party,
      checkIn: s.check_in,
      checkOut: s.check_out,
      city: s.city,
      point,
      label: (s.booked && s.hotelTitle) || s.area || ctx.nameEn[s.city] || s.city,
      key: s.booked ? s.hotelTitle! : `${s.city}|${s.area ?? ''}`,
      confirmed: s.status === 'confirmed',
      booked: s.booked,
    }
  })
  return { sleeps, recs }
}

// ---------- no stays and no hotels: the city written on each day

/** A city id from what day_info.city says ("טוקיו", "Tokyo", "טוקיו / יוקוהמה": the first one). */
export function cityIdOf(text: string | null | undefined, ctx: Pick<StayCtx, 'nameEn' | 'nameHe'>): string | null {
  const first = (text ?? '').split(' / ')[0].trim().toLowerCase()
  if (!first) return null
  const ids = [...new Set([...Object.keys(ctx.nameHe), ...Object.keys(ctx.nameEn)])]
  return (
    ids.find((id) => id === first || ctx.nameHe[id]?.toLowerCase() === first || ctx.nameEn[id]?.toLowerCase() === first) ??
    ids.find((id) => (ctx.nameHe[id] && first.includes(ctx.nameHe[id].toLowerCase())) || (ctx.nameEn[id] && first.includes(ctx.nameEn[id].toLowerCase()))) ??
    null
  )
}

type Run = { city: string; from: number; to: number } // nights from..to (night n: the night after day n)

/**
 * A run of one night in the middle of the trip, in a city a day trip away from a neighbouring run's city, joins that
 * run (the nearer of the two): a day trip instead of two hotel changes. Runs of the same city that end up side by
 * side become one. A one-night stop further than a day trip from both neighbours stays (nothing else makes sense).
 */
export function mergeShortRuns(runs: Run[], pointOf: (city: string) => Point | undefined): Run[] {
  const out = runs.map((r) => ({ ...r }))
  const join = () => {
    for (let i = 0; i + 1 < out.length; ) {
      if (out[i].city === out[i + 1].city) {
        out[i].to = out[i + 1].to
        out.splice(i + 1, 1)
      } else i++
    }
  }
  join()
  // a stop that has to stay (too far for a day trip from both sides) is not looked at again
  const kept = new Set<Run>()
  for (let guard = 0; guard < 100 && out.length > 1; guard++) {
    const i = out.findIndex((r) => r.to === r.from && !kept.has(r))
    if (i < 0) break
    const me = pointOf(out[i].city)
    const dist = (j: number) => {
      const o = j >= 0 && j < out.length ? pointOf(out[j].city) : undefined
      return me && o ? km(me, o) : Infinity
    }
    const dp = dist(i - 1)
    const dn = dist(i + 1)
    if (Math.min(dp, dn) > DAYTRIP_KM) {
      kept.add(out[i])
      continue
    }
    const to = dp <= dn ? i - 1 : i + 1
    if (to < i) out[to].to = out[i].to
    else out[to].from = out[i].from
    out.splice(i, 1)
    join()
  }
  return out
}

/**
 * The sleeps when the trip has no stays and no hotel bookings: each day's written city (a day with none takes the
 * day before it, else the day after) is where its night is spent; the last day is the morning of leaving. Each city
 * run is one stretch with one recommended area, and a one-night stop a day trip away from its neighbour joins it.
 */
export function sleepsFromDays(
  dayCities: (string | null)[], // index 0 = day 1: a city id or null
  numDays: number,
  dateOf: (day: number) => string,
  ctx: StayCtx,
): { sleeps: Sleep[]; recs: StayRec[] } {
  const filled: (string | null)[] = Array.from({ length: numDays }, (_, i) => dayCities[i] ?? null)
  for (let i = 1; i < numDays; i++) filled[i] ??= filled[i - 1]
  for (let i = numDays - 2; i >= 0; i--) filled[i] ??= filled[i + 1]
  if (!filled[0]) return { sleeps: [], recs: [] }
  // nights 1..numDays-1 (a one-day trip still gets its night)
  const lastNight = Math.max(1, numDays - 1)
  let runs: Run[] = []
  for (let n = 1; n <= lastNight; n++) {
    const c = filled[n - 1]!
    const prev = runs[runs.length - 1]
    if (prev && prev.city === c) prev.to = n
    else runs.push({ city: c, from: n, to: n })
  }
  runs = mergeShortRuns(runs, (c) => ctx.base[c])
  const tripCities = [...new Set(runs.map((r) => r.city))]
  const sleeps: Sleep[] = []
  const recs: StayRec[] = []
  for (const r of runs) {
    const checkIn = dateOf(r.from)
    const checkOut = dateOf(r.to + 1)
    const rec = recFor(null, r.city, checkIn, checkOut, tripCities, ctx)
    if (rec) recs.push(rec)
    sleeps.push({
      party: null,
      checkIn,
      checkOut,
      city: r.city,
      point: (rec && areaPoint(rec.areas_city, rec.best.key)) || ctx.base[r.city] || ctx.base.tokyo,
      label: ctx.nameEn[r.city] ?? r.city,
      key: `${r.city}|`,
      confirmed: false,
      booked: false,
    })
  }
  return { sleeps, recs }
}

// ---------- which city a place is planned from (shared with index.ts)

/** Each city's middle, from the hotels (or estimated bases) its days sleep at. */
export function basePoints(days: Day[]) {
  const sums = new Map<string, { lat: number; lng: number; n: number }>()
  for (const p of days.flatMap((d) => [...d.at.values()])) {
    const s = sums.get(p.base) ?? { lat: 0, lng: 0, n: 0 }
    s.lat += p.hotel.lat
    s.lng += p.hotel.lng
    s.n++
    sums.set(p.base, s)
  }
  return new Map([...sums].map(([b, s]) => [b, { lat: s.lat / s.n, lng: s.lng / s.n } as Point]))
}

/** The nearest city its couples sleep in, and whether it is a day trip from there (more than 25 km). */
export function baseFor(point: Point | null, city: string | null, bases: string[], basePt: Map<string, Point>, BASE: Record<string, Point>) {
  let base: string | null = null
  let dist = Infinity
  for (const b of bases) {
    const bp = basePt.get(b) ?? BASE[b]
    const dd = point ? km(point, bp) : city === b ? 0 : Infinity
    if (dd < dist) {
      dist = dd
      base = b
    }
  }
  return { base, far: dist > FAR_KM }
}
