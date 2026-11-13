// Suggests how to split the open nights of a trip between cities. Plain code, no AI, no network: the same input
// always gives the same answer, and it is tested outside the edge runtime (scripts/split-test.mjs).
//
// A night is "open" for a party when no confirmed or locked stay (or a stay a person typed in) covers it. Only open
// nights get a city; the others stay as they are and still count (their city fills its places, and a move to or from
// them is a move). An alternative is a list of runs { city, nights, party }.
//
// What a night in a city is worth comes from two things. The places the group liked there (hours of visits), and a
// starting value per city (route-data.ts: the least and the ideal nights, more Tokyo on a first visit, less or nothing
// out of season) that fades as the group likes more places, so a trip with only flights still gets a sensible split.
// A split is scored on that, on hotel changes, on going back to a city already left, on travel between cities and on
// starting near the arrival and ending near the departure. A city close to another (up to 150 km) whose places are few
// is better served as a day trip than with nights of its own.
//
// The route must make sense, whatever the score says. These are rules, not costs (see `rules` below): one direction
// along the main line with each region once (only the way back to the departure airport may return), a base lasts at
// least as long as the ride to it deserves (three nights after a flight), an island sits at an end of the trip next
// to a city with an airport, about one base per three nights, and a far or unpicked city gets nights only once the
// nearer ones have their minimum. A split that breaks one is never returned; what people booked or typed is theirs
// and is never judged.
import { km } from './plan.ts'
export { CITY_ROUTE, type RouteInfo } from './route-data.ts'

/** A city nights can go to. The route fields are optional: a city without them takes no part in the route rules. */
export type SplitCity = {
  id: string
  lat: number
  lng: number
  region?: string | null
  air?: boolean | null
  hub?: boolean | null
  classic?: boolean | null
  min?: number | null
  ideal?: number | null
  minFirst?: number | null
  idealFirst?: number | null
  season?: number[] | null
}
/** A party's own stretch: first night and the morning they leave (YYYY-MM-DD), and the city of arrival/departure. */
export type SplitParty = {
  id: string
  from?: string | null
  to?: string | null
  arrival?: string | null
  departure?: string | null
  /** lands in the evening: the first night is best spent in the arrival city */
  arrivalLate?: boolean
  /** flies out before 13:00: the last night is best spent in the departure city */
  departureEarly?: boolean
}
export type SplitStay = { party: string | null; city: string; checkIn: string; checkOut: string; status: string; locked: boolean; source?: string | null }
export type SplitPlace = {
  id: string
  city?: string | null
  lat?: number | null
  lng?: number | null
  mins: number
  openDates?: string[]
  /** the parties that want it; empty = all */
  parties?: string[]
}
export type SplitInput = {
  startDate: string
  numDays: number
  parties: SplitParty[]
  stays: SplitStay[]
  cities: SplitCity[]
  places: SplitPlace[]
  /** false only when everyone who answered has been to Japan before; anything else counts as a first visit */
  firstVisit?: boolean
  /** the cities the members picked in the questionnaire */
  picked?: string[]
  /**
   * "We know how many nights in each city": these counts are kept exactly and only the order and dates are chosen.
   * Nights they leave over are filled the usual way (more in one of these cities, or one more city).
   */
  counts?: { city: string; nights: number }[]
}
export type SplitRow = { city: string; nights: number; party: string | null; checkIn: string; checkOut: string }
export type SplitReason = {
  kind: 'fewer_moves' | 'more_places' | 'balanced'
  /** hotel changes in the whole stretch, locked stays included */
  moves: number
  coveredPlaces: number
  totalPlaces: number
  dayTrips: { city: string; from: string; places: number }[]
  /** the split leans on the cities' starting values more than on what the group liked (few or no liked places yet) */
  typical: boolean
  /** cities in the split that nobody picked or liked (only the "more places" alternative may add one) */
  added: string[]
  /** cities in the split that are out of season on these dates (someone picked them or liked places there) */
  offSeason: string[]
  /** with given night counts: how many route rules the order still breaks (the counts themselves allow no better) */
  ruleBreaks?: number
}
export type Alternative = { rows: SplitRow[]; reason: SplitReason }

/** How many nights are open for a split (no confirmed, locked or typed-in stay on them), for the nights-per-city screen. */
export function openNights(inp: SplitInput) {
  return buildSlots(inp).slots.filter((s) => s.free).length
}

const DAY = 86400000
const HOURS_PER_NIGHT = 5.5 // hours of visits a day holds
const DAYTRIP_KM = 150
const DAYTRIP_VALUE = 0.7 // a place seen on a day trip is worth less than one next to the bed
// no hotel every night: a stop of one night costs this much (hours of places), whatever the profile, so it only wins
// when nothing else makes sense; the last night by the departure airport is the one stop that is fine. On a long trip
// (LONG_TRIP nights or more) a two-night stop costs a little too: three nights a base when the trip allows
const ONE_NIGHT = 8
const TWO_NIGHTS = 1.5
const LONG_TRIP = 9
// the starting value of a city, in hours a night: its minimum nights count for more than a liked place (a first trip
// without Kyoto is a worse trip), the nights up to the ideal for half, and a few nights past it for very little
const W_CORE = 1.6
const W_EXTRA = 0.5
const W_TAIL = 0.1
// liked places: the first third of a city's hours (what the group would see first) counts for more than the last
// third, so with more liked than the nights can hold, a new city's best places beat another city's leftovers
const LIKED_TIERS = [1.5, 1, 0.6]
const PICKED = 1.5 // a city the group picked in the questionnaire, against one that is in by default
const OFF_SEASON_NIGHT = 2 // a night in a city that is out of season and nobody asked for (an airport's city in winter)
// the starting values count in full with nothing liked, for half at this many liked places, and fade from there
const FADE_K = 15
// the main line, in order; a region not on it is an island reached by air
const LINE = ['kanto', 'chubu', 'kansai', 'chugoku', 'kyushu']
const SHORT_HOP = 100 // minutes: a base this close to the one before may last a single night (Hakone after Tokyo)
const FAR_KM = 500 // farther than this from every airport and booked city of the trip is a detour
const HUB_MINS = 90 // "near an airport"
const LATE_COST = 20 // a late landing or a morning flight with the bed in another city
const RETURN_NIGHTS = 2 // after an island, only this many nights by the departure airport may follow
const DEPART_DAY = 2 // hours counted per hour of travel to the airport on the day of the flight home (arrival: 1.5)
const FEWER_KEEPS = 0.8 // "fewer hotel changes" must still hold this share of what the best split holds
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)

/** Minutes between two cities, door to door: by train, or by plane for an island or a ride over 600 km when faster. */
export function travelMins(a: SplitCity, b: SplitCity) {
  if (a.id === b.id) return 0
  const d = km(a, b)
  const ground = Math.round(30 + d * 0.4)
  const flight = Math.round(150 + d * 0.1)
  if (a.air || b.air) return flight
  return d > 600 ? Math.min(ground, flight) : ground
}

// ---------- flights → a party's stretch

const JAPAN = /\b(HND|NRT|KIX|ITM|NGO|CTS|FUK|OKA|UKB|HIJ|KMQ)\b|Haneda|Narita|Kansai|Itami|Chubu|Centrair|Chitose|Fukuoka|Naha/i
const ROUTE = /→|->|⟶|—|–|\s-\s/
const AIRPORT_CITY: [RegExp, string][] = [
  [/\b(HND|NRT)\b|Haneda|Narita/i, 'tokyo'],
  [/\b(KIX|ITM)\b|Kansai|Itami/i, 'osaka'],
  [/\bNGO\b|Chubu|Centrair/i, 'nagoya'],
  [/\bCTS\b|Chitose/i, 'sapporo'],
  [/\bFUK\b|Fukuoka/i, 'fukuoka'],
  [/\bOKA\b|Naha/i, 'okinawa'],
  [/\bUKB\b/i, 'kobe'],
  [/\bHIJ\b/i, 'hiroshima'],
  [/\bKMQ\b/i, 'kanazawa'],
]
const cityOfAirport = (s: string) => AIRPORT_CITY.find(([re]) => re.test(s))?.[1] ?? null
// flight times are kept as the airport's own clock time
const hourOf = (ts: string) => Number(ts.slice(11, 13))
export type FlightLite = { who: string | null; title: string; starts_at: string | null; ends_at: string | null }

/** From the flights of a party: the night it lands and the morning it flies out, the airports' cities, and whether the landing is late or the flight home early. */
export function partyStretch(flights: FlightLite[], party: string, startDate: string, numDays: number): SplitParty {
  const out: SplitParty = { id: party }
  const last = addDays(startDate, numDays - 1)
  for (const f of flights) {
    if (f.who && f.who !== party) continue
    const [from, ...to] = f.title.split(ROUTE)
    const dest = to.join(' ')
    if (JAPAN.test(dest) && f.ends_at) {
      const d = f.ends_at.slice(0, 10)
      if (d >= startDate && d < last && (!out.from || d < out.from)) {
        out.from = d
        out.arrival = cityOfAirport(dest)
        out.arrivalLate = hourOf(f.ends_at) >= 18
      }
    } else if (JAPAN.test(from) && f.starts_at) {
      const d = f.starts_at.slice(0, 10)
      if (d > startDate && d <= last && (!out.to || d > out.to)) {
        out.to = d
        out.departure = cityOfAirport(from)
        out.departureEarly = hourOf(f.starts_at) < 13
      }
    }
  }
  return out
}

// ---------- the nights

type Occ = { party: string; fixed: string | null }
type Slot = { date: string; occ: Occ[]; free: boolean; main: string | null }

function buildSlots(inp: SplitInput) {
  const ids = inp.parties.length ? inp.parties.map((p) => p.id) : ['*']
  const range = new Map(inp.parties.map((p) => [p.id, p]))
  const tripFrom = inp.startDate
  const tripTo = addDays(inp.startDate, Math.max(1, inp.numDays - 1))
  // a stay a person made is fixed; only the planner's own earlier proposals can be replaced
  const fixed = inp.stays.filter((s) => !(s.source === 'auto' && s.status === 'proposed' && !s.locked))
  const slots: Slot[] = []
  for (let d = tripFrom; d < tripTo; d = addDays(d, 1)) {
    const occ: Occ[] = []
    for (const id of ids) {
      const r = range.get(id)
      const from = r?.from && r.from > tripFrom ? r.from : tripFrom
      const to = r?.to && r.to < tripTo ? r.to : tripTo
      if (d < from || d >= to) continue
      const st = fixed.find((s) => (s.party == null || s.party === id) && s.checkIn <= d && d < s.checkOut)
      occ.push({ party: id, fixed: st ? st.city : null })
    }
    if (!occ.length) continue
    const open = occ.filter((o) => !o.fixed)
    slots.push({ date: d, occ, free: open.length > 0, main: open.length ? null : occ[0].fixed })
  }
  return { ids, slots }
}

// ---------- scoring

type Profile = { kind: SplitReason['kind']; place: number; move: number; idle: number }
const PROFILES: Profile[] = [
  { kind: 'balanced', place: 1, move: 1, idle: 0.25 },
  { kind: 'fewer_moves', place: 1, move: 2.6, idle: 0.1 },
  { kind: 'more_places', place: 1.35, move: 0.45, idle: 0.1 },
]

type Bucket = { city: string; hours: number; ids: string[]; parties: string[]; dates: Set<string> | null }
/** A city's starting value in hours: its minimum nights, the nights up to the ideal, and a little past it. */
type Base = { core: number; extra: number; tail: number; wCore: number; wExtra: number }
type Run = { city: string; from: number; len: number; own: boolean }
type Assign = (string | null)[]

export function suggestSplit(inp: SplitInput): Alternative[] {
  const cities = new Map(inp.cities.map((c) => [c.id, c]))
  const { ids, slots } = buildSlots(inp)
  const freeIdx = slots.map((s, i) => (s.free ? i : -1)).filter((i) => i >= 0)
  if (!freeIdx.length || !cities.size) return []
  // whether a night comes right after the one before it (not when a party's dates leave a hole), and the day after it
  const follows = slots.map((s, i) => i > 0 && s.date === addDays(slots[i - 1].date, 1))
  const dayAfter = new Map(slots.map((s) => [s.date, addDays(s.date, 1)]))

  // each place belongs to the city whose middle is nearest
  const homeOf = (p: SplitPlace) => {
    if (p.lat != null && p.lng != null) {
      let best: string | null = null
      let bd = Infinity
      for (const c of cities.values()) {
        const d = km({ lat: p.lat, lng: p.lng }, c)
        if (d < bd) {
          bd = d
          best = c.id
        }
      }
      return bd <= 60 ? best : p.city && cities.has(p.city) ? p.city : null
    }
    return p.city && cities.has(p.city) ? p.city : null
  }
  const homes = inp.places.map((p) => ({ p, home: homeOf(p) })).filter((x): x is { p: SplitPlace; home: string } => !!x.home)
  const totalPlaces = homes.length
  const allIds = new Set(ids)

  // places of one city, grouped by who wants them and when they run: most are "anyone, any day" and count at once
  const bucketMap = new Map<string, Bucket>()
  for (const { p, home } of homes) {
    const parties = (p.parties ?? []).filter((x) => allIds.has(x))
    const wantsAll = !p.parties?.length || !parties.length
    const key = `${home}|${wantsAll ? '' : parties.sort().join(',')}|${(p.openDates ?? []).join(',')}`
    let b = bucketMap.get(key)
    if (!b) bucketMap.set(key, (b = { city: home, hours: 0, ids: [], parties: wantsAll ? [] : parties, dates: p.openDates?.length ? new Set(p.openDates) : null }))
    b.hours += p.mins / 60
    b.ids.push(p.id)
  }
  const buckets = [...bucketMap.values()]
  const demand = new Map<string, number>()
  for (const b of buckets) demand.set(b.city, (demand.get(b.city) ?? 0) + b.hours)

  /** What `hours` of a city's liked places are worth: thirds of all it has there, the first worth most. */
  const likedValue = (c: string, hours: number) => {
    const third = (demand.get(c) ?? 0) / 3
    if (third <= 0 || hours <= 0) return 0
    return LIKED_TIERS[0] * Math.min(hours, third) + LIKED_TIERS[1] * Math.min(Math.max(hours - third, 0), third) + LIKED_TIERS[2] * Math.max(hours - 2 * third, 0)
  }

  const mins = (a: string, b: string) => (a === b ? 0 : travelMins(cities.get(a)!, cities.get(b)!))
  const near = (a: string, b: string) => a !== b && km(cities.get(a)!, cities.get(b)!) <= DAYTRIP_KM

  // ---- the trip's frame: airports, the month, and whether this is a first visit
  const arrivals = new Set(inp.parties.map((p) => p.arrival).filter((c): c is string => !!c && cities.has(c)))
  const departures = new Set(inp.parties.map((p) => p.departure).filter((c): c is string => !!c && cities.has(c)))
  const lateArrivals = new Set(inp.parties.filter((p) => p.arrivalLate && p.arrival && cities.has(p.arrival)).map((p) => p.arrival!))
  const soleArrival = arrivals.size === 1 ? [...arrivals][0] : null
  const month = Number(slots[Math.floor(slots.length / 2)].date.slice(5, 7)) - 1
  const firstVisit = inp.firstVisit !== false
  const fade = FADE_K / (FADE_K + totalPlaces)
  const regionOf = (id: string) => cities.get(id)?.region ?? null
  const isAir = (id: string) => !!cities.get(id)?.air
  const nightsOf = (c: SplitCity) => ({
    min: Math.max(0, (firstVisit ? c.minFirst : null) ?? c.min ?? 0),
    ideal: Math.max(0, (firstVisit ? c.idealFirst : null) ?? c.ideal ?? 0),
  })
  const level = (id: string) => cities.get(id)?.season?.[month] ?? 2
  const oneNighter = (id: string) => {
    const n = nightsOf(cities.get(id)!)
    return n.min === 1 && n.ideal === 1
  }

  // ---- the cities a free night may go to
  // valued: the ones the group liked places in (the busiest 8) or picked; with fewer than two, the classic line too
  const pickedSet = new Set((inp.picked ?? []).filter((c) => cities.has(c)))
  const valued = new Set<string>()
  for (const [c] of [...demand].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8)) valued.add(c)
  for (const c of pickedSet) valued.add(c)
  // the classic line joins them when they are fewer than two, or when their ideal nights don't fill the trip
  const chosen = new Set(valued)
  const fills0 = [...valued].reduce((sum, c) => sum + Math.max(nightsOf(cities.get(c)!).ideal, Math.ceil((demand.get(c) ?? 0) / HOURS_PER_NIGHT)), 0)
  if ([...valued].filter((c) => demand.has(c) || nightsOf(cities.get(c)!).ideal > 0).length < 2 || fills0 < freeIdx.length) {
    for (const c of cities.values()) if (c.classic) valued.add(c.id)
  }
  // anchors: where people already sleep, and the airports' cities
  const anchors = new Set<string>([...arrivals, ...departures])
  for (const s of slots) for (const o of s.occ) if (o.fixed && cities.has(o.fixed)) anchors.add(o.fixed)

  // each valued city's starting value: out of season counts for half when someone picked it, for nothing otherwise
  const baseOf = new Map<string, Base>()
  const setBase = (id: string, factor: number) => {
    const n = nightsOf(cities.get(id)!)
    if (!n.ideal || factor <= 0) return
    const f = fade * factor * HOURS_PER_NIGHT
    // a city someone picked by name counts for more than one that is there by default
    const w = pickedSet.has(id) ? PICKED : 1
    baseOf.set(id, { core: Math.min(n.min, n.ideal) * f, extra: Math.max(0, n.ideal - n.min) * f, tail: Math.ceil(n.ideal / 2) * f, wCore: W_CORE * w, wExtra: W_EXTRA * w })
  }
  for (const id of valued) setBase(id, level(id) >= 2 ? 1 : level(id) === 1 || pickedSet.has(id) ? 0.5 : 0)
  // the nights a valued city must have before a far or unpicked city gets any
  const effMin = (id: string) => Math.round(nightsOf(cities.get(id)!).min * fade)

  // extras: in-season cities nobody picked or liked, worth a base of their own. Only "more places" may add one
  const extraSet = new Set<string>()
  {
    const options = [...cities.values()]
      .filter((c) => !valued.has(c.id) && nightsOf(c).min >= 1 && level(c.id) >= 1)
      .map((c) => ({ id: c.id, worth: nightsOf(c).min * W_CORE + (nightsOf(c).ideal - nightsOf(c).min) * W_EXTRA }))
      .sort((a, b) => b.worth - a.worth || (a.id < b.id ? -1 : 1))
      .slice(0, 4)
    for (const o of options) {
      extraSet.add(o.id)
      setBase(o.id, level(o.id) >= 2 ? 1 : 0.5)
    }
  }
  const maxExtras = freeIdx.length >= 16 ? 2 : 1
  // with nothing picked and nothing liked there is no choice of the group's to keep to: once the classic cities have
  // their ideal nights, every alternative may take one more city per three nights that are left
  const openChoice = !chosen.size
  const idealSum = [...valued].reduce((sum, c) => sum + nightsOf(cities.get(c)!).ideal, 0)
  const plainExtras = openChoice ? Math.min(maxExtras, Math.max(0, Math.floor((freeIdx.length - idealSum) / 3))) : 0

  // at most nine valued cities take part (the ones worth most), so the search stays small whatever was picked
  if (valued.size > 9) {
    const worthOf = (c: string) => (demand.get(c) ?? 0) + (baseOf.get(c)?.core ?? 0) * (baseOf.get(c)?.wCore ?? 0) + (baseOf.get(c)?.extra ?? 0) * (baseOf.get(c)?.wExtra ?? 0)
    for (const c of [...valued].sort((a, b) => worthOf(b) - worthOf(a) || (a < b ? -1 : 1)).slice(9)) {
      valued.delete(c)
      baseOf.delete(c)
    }
  }
  const candSet = new Set<string>([...valued, ...anchors])
  if (!candSet.size) candSet.add(inp.cities[0].id)
  const candList = [...candSet].sort()
  const extraList = [...extraSet].filter((c) => !candSet.has(c) && baseOf.has(c)).sort()

  // how far a city is from the trip's own ground: its airports and booked cities (with none, its most valued city)
  const topValued = [...valued].sort((a, b) => (baseOf.get(b)?.core ?? 0) + (demand.get(b) ?? 0) - (baseOf.get(a)?.core ?? 0) - (demand.get(a) ?? 0) || (a < b ? -1 : 1))[0]
  const mainland = [...valued].filter((c) => !isAir(c)).sort((a, b) => Number(!!cities.get(b)!.classic) - Number(!!cities.get(a)!.classic) || (a < b ? -1 : 1))[0]
  const landed = [...anchors].filter((c) => !isAir(c))
  const ground = landed.length ? landed : mainland ? [mainland] : topValued ? [topValued] : []
  const anchorKm = new Map<string, number>()
  for (const c of cities.values()) anchorKm.set(c.id, ground.length ? Math.min(...ground.map((g) => km(c, cities.get(g)!))) : 0)
  const isFar = (id: string) => isAir(id) || anchorKm.get(id)! > FAR_KM
  const hubs = [...cities.values()].filter((c) => c.hub && !c.air)
  const hubMins = new Map<string, number>()
  for (const c of cities.values()) hubMins.set(c.id, c.hub ? 0 : hubs.length ? Math.min(...hubs.map((h) => Math.round(30 + km(c, h) * 0.4))) : 0)
  // the valued cities that have a minimum, for the "nearer ones first" rule
  const required = [...valued].filter((y) => effMin(y) >= 1).map((y) => ({ id: y, min: effMin(y), km: anchorKm.get(y)!, classic: !!cities.get(y)!.classic, chosen: chosen.has(y) || !chosen.size }))
  const demanding = (x: string) => {
    if (arrivals.has(x) || departures.has(x)) return false
    const c = cities.get(x)!
    return extraSet.has(x) || (firstVisit && c.region != null && !c.classic) || isFar(x)
  }

  // ---- the route rules
  const cap = Math.max(1, Math.round(slots.length / 3))
  const depRegions = new Set([...departures].map(regionOf).filter((r): r is string => !!r))

  /** How many times a list of cities, in order, breaks "one direction along the line, each region once, islands at an end". */
  function lineBreaks(list: string[], lens?: number[]) {
    const R: string[] = []
    let lastNights = 0
    list.forEach((c, k) => {
      const r = regionOf(c)
      if (!r) return
      if (R[R.length - 1] !== r) {
        R.push(r)
        lastNights = 0
      }
      lastNights += lens?.[k] ?? 0
    })
    // the last stop may go back to the departure airport's region when the trip already stayed there (back to Tokyo
    // for the last days of a round trip), or for a night or two by the airport (past Osaka to Hiroshima, and back to
    // fly). Going past it and coming back for a long stay is not one of them: that is a detour
    const end = R[R.length - 1]
    const short = R.length >= 2 && depRegions.has(end) && lastNights <= RETURN_NIGHTS
    const home = R.length >= 2 && depRegions.has(end) && (short || R.indexOf(end) < R.length - 1)
    let v = 0
    // an island is the first or the last stop; only a night or two by the departure airport may follow it
    R.forEach((r, p) => {
      if (LINE.indexOf(r) < 0 && p !== 0 && p !== R.length - 1 && !(short && p === R.length - 2)) v++
    })
    if (home) R.pop()
    const seen = new Set<string>()
    const L: number[] = []
    R.forEach((r) => {
      if (seen.has(r)) {
        v++
        return
      }
      seen.add(r)
      const i = LINE.indexOf(r)
      if (i >= 0) L.push(i)
    })
    let up = 0
    let down = 0
    for (let i = 1; i < L.length; i++) L[i] > L[i - 1] ? up++ : down++
    return v + Math.min(up, down)
  }
  // what people booked or typed is theirs: the rules only count what a split adds to it
  const fixedSeq = slots.filter((s) => !s.free).map((s) => s.main!)
  const fixedRuns = fixedSeq.reduce<{ city: string; len: number }[]>((out, c) => {
    if (out.length && out[out.length - 1].city === c) out[out.length - 1].len++
    else out.push({ city: c, len: 1 })
    return out
  }, [])
  const fixedBreaks = lineBreaks(fixedRuns.map((r) => r.city), fixedRuns.map((r) => r.len))
  const fixedBases = fixedSeq.filter((c, i) => i === 0 || c !== fixedSeq[i - 1]).length

  /** The runs of nights in one city. `own`: the run holds a night a person booked or typed (it is not the split's choice). */
  function runsOf(seq: string[]) {
    const out: Run[] = []
    for (let i = 0; i < seq.length; i++) {
      const own = !slots[i].free || slots[i].occ.some((o) => o.fixed === seq[i])
      const last = out[out.length - 1]
      if (last && last.city === seq[i] && follows[i]) {
        last.len++
        if (own) last.own = true
      } else out.push({ city: seq[i], from: i, len: 1, own })
    }
    return out
  }

  /** The nights a base the split chose must last: by where it is and how far the ride to it was. */
  function needOf(city: string, prev: string | null, first: boolean, last: boolean) {
    if (last && departures.has(city)) return 1
    if (first && lateArrivals.has(city)) return 1
    if (isAir(city)) return 3
    const from = prev ?? (first && soleArrival && soleArrival !== city ? soleArrival : null)
    return from && cities.has(from) && mins(from, city) <= SHORT_HOP ? 1 : 2
  }

  /** How many route rules a full sequence of nights breaks. Zero for every split that is returned. */
  function rules(seq: string[]) {
    const runs = runsOf(seq)
    let v = Math.max(0, lineBreaks(runs.map((r) => r.city), runs.map((r) => r.len)) - fixedBreaks)
    // about one base per three nights (the night by the airport at either end doesn't count)
    let bases = runs.length
    const lastRun = runs[runs.length - 1]
    if (runs.length > 1 && lastRun.len <= 1 && departures.has(lastRun.city)) bases--
    if (runs.length > 1 && runs[0].len <= 1 && lateArrivals.has(runs[0].city)) bases--
    v += Math.max(0, bases - Math.max(cap, fixedBases))
    let nights: Map<string, number> | null = null
    for (let k = 0; k < runs.length; k++) {
      const r = runs[k]
      if (r.own) continue
      if (runs.length > 1) {
        // long enough for the ride to it
        if (r.len < needOf(r.city, k > 0 ? runs[k - 1].city : null, k === 0, k === runs.length - 1)) v++
        // an island: the stops around it are near an airport
        if (isAir(r.city) && hubs.length) {
          for (const nb of [runs[k - 1], runs[k + 1]]) if (nb && !isAir(nb.city) && hubMins.get(nb.city)! > HUB_MINS) v++
        }
      }
      // far, unpicked, or off the classic line on a first visit: only once the nearer valued cities have their minimum
      if (required.length && demanding(r.city)) {
        if (!nights) {
          nights = new Map()
          for (const c of seq) nights.set(c, (nights.get(c) ?? 0) + 1)
        }
        const x = cities.get(r.city)!
        const extra = extraSet.has(r.city)
        const offLine = firstVisit && x.region != null && !x.classic
        const far = isFar(r.city)
        const myKm = anchorKm.get(r.city)!
        for (const y of required) {
          if (y.id === r.city) continue
          // an extra waits for every valued city; a city the group chose waits only for others it chose
          if ((extra || (y.chosen && ((offLine && y.classic) || (far && y.km < myKm)))) && (nights.get(y.id) ?? 0) < y.min) {
            v++
            break
          }
        }
      }
    }
    return v
  }

  // each party's first and last night
  const ends = inp.parties.flatMap((p) => {
    const mine = slots.map((s, i) => ({ s, i })).filter(({ s }) => s.occ.some((o) => o.party === p.id))
    if (!mine.length) return []
    const fi = mine[0].i
    const li = mine[mine.length - 1].i
    return [{ p, fi, fo: slots[fi].occ.find((o) => o.party === p.id)!, li, lo: slots[li].occ.find((o) => o.party === p.id)! }]
  })

  type Eval = { score: number; moves: number; hours: number; hard: number; late: number; dt: { city: string; from: string; hours: number }[] }
  const cityOf = (assign: Assign, i: number, o: Occ) => o.fixed ?? assign[i]!
  const seqOf = (assign: Assign) => slots.map((s, i) => (s.free ? assign[i]! : s.main!))

  type Parts = { value: number; idle: number; moveCost: number; flat: number; moves: number; hours: number; hard: number; late: number; dt: Eval['dt'] }
  const scoreOf = (m: Parts, prof: Profile) => prof.place * m.value - prof.idle * m.idle - prof.move * m.moveCost - m.flat
  const evaluate = (assign: Assign, prof: Profile, detail = false): Eval => {
    const m = measure(assign, detail)
    return { score: scoreOf(m, prof), moves: m.moves, hours: m.hours, hard: m.hard, late: m.late, dt: m.dt }
  }

  /** Everything a split is scored on, measured once (the three profiles weigh the same numbers differently). */
  function measure(assign: Assign, detail = false): Parts {
    // nights per city, and for the picky places when each party is where
    const nights = new Map<string, number>()
    const where = new Map<string, { date: string; party: string }[]>()
    for (let i = 0; i < slots.length; i++) {
      const seen = new Set<string>()
      for (const o of slots[i].occ) {
        const c = cityOf(assign, i, o)
        seen.add(c)
        if (buckets.length) {
          let w = where.get(c)
          if (!w) where.set(c, (w = []))
          w.push({ date: slots[i].date, party: o.party })
        }
      }
      for (const c of seen) nights.set(c, (nights.get(c) ?? 0) + 1)
    }
    // hours of liked places each city can show with its nights
    const reach = new Map<string, number>()
    const lost = new Map<string, number>() // hours in cities no night reaches
    for (const b of buckets) {
      const n = nights.get(b.city) ?? 0
      let ok = n > 0
      if (ok && (b.dates || b.parties.length)) {
        ok = !!where.get(b.city)?.some((w) => (!b.parties.length || b.parties.includes(w.party)) && (!b.dates || b.dates.has(w.date) || b.dates.has(dayAfter.get(w.date)!)))
      }
      if (ok) reach.set(b.city, (reach.get(b.city) ?? 0) + b.hours)
      else lost.set(b.city, (lost.get(b.city) ?? 0) + b.hours)
    }
    // a city's nights hold its liked places first, then its starting value: the minimum, then up to the ideal
    let own = 0
    let ownHours = 0
    const usedLiked = new Map<string, number>()
    let base = 0
    const spare = new Map<string, number>()
    // what the nights don't hold may be a day trip from a city next door that has the time
    const left = new Map<string, { liked: number; core: number; extra: number }>()
    const leave = (c: string, k: 'liked' | 'core' | 'extra', h: number) => {
      if (h <= 1e-9) return
      let l = left.get(c)
      if (!l) left.set(c, (l = { liked: 0, core: 0, extra: 0 }))
      l[k] += h
    }
    for (const [c, n] of nights) {
      let room = n * HOURS_PER_NIGHT
      const liked = reach.get(c) ?? 0
      const used = Math.min(liked, room)
      own += likedValue(c, used)
      ownHours += used
      usedLiked.set(c, used)
      room -= used
      leave(c, 'liked', liked - used)
      const b = baseOf.get(c)
      if (b) {
        const core = Math.min(b.core, room)
        room -= core
        const extra = Math.min(b.extra, room)
        room -= extra
        base += b.wCore * core + b.wExtra * extra
        leave(c, 'core', b.core - core)
        leave(c, 'extra', b.extra - extra)
      }
      spare.set(c, room)
    }
    for (const [c, h] of lost) leave(c, 'liked', h)
    for (const [c, b] of baseOf) {
      // a city nobody picked counts only when the split sleeps there
      if (nights.has(c) || !valued.has(c)) continue
      leave(c, 'core', b.core)
      leave(c, 'extra', b.extra)
    }
    let trips = 0
    let baseTrips = 0
    const dt: Eval['dt'] = []
    const total = (l: { liked: number; core: number; extra: number }) => l.liked + l.core + l.extra
    for (const [c, l] of [...left].sort((a, b) => total(b[1]) - total(a[1]) || (a[0] < b[0] ? -1 : 1))) {
      let from: string | null = null
      let room = 0
      for (const [y, s] of spare) {
        if (!near(c, y)) continue
        const r = s - (2 * mins(c, y)) / 60
        if (r > room) {
          room = r
          from = y
        }
      }
      if (!from) continue
      const take = Math.min(total(l), room)
      if (take < 0.5) continue
      spare.set(from, spare.get(from)! - take - (2 * mins(c, from)) / 60)
      const liked = Math.min(l.liked, take)
      const core = Math.min(l.core, take - liked)
      const extra = take - liked - core
      // the liked hours a day trip adds come after the ones the city's own nights already hold
      const had = usedLiked.get(c) ?? 0
      trips += likedValue(c, had + liked) - likedValue(c, had)
      const b = baseOf.get(c)
      baseTrips += (b?.wCore ?? W_CORE) * core + (b?.wExtra ?? W_EXTRA) * extra
      if (liked >= 0.5) dt.push({ city: c, from, hours: liked })
    }
    // nights past the ideal are worth a little, then nothing
    let idle = 0
    for (const [c, s] of spare) {
      const tail = Math.max(0, Math.min(baseOf.get(c)?.tail ?? 0, s))
      base += W_TAIL * tail
      idle += Math.max(0, s - tail)
    }

    // hotel changes, going back, one-night stays, arrival and departure
    const seq = seqOf(assign)
    let moves = 0
    let moveCost = 0
    const runs = new Map<string, number>()
    let runLen = 0
    for (let i = 0; i < seq.length; i++) {
      if (i === 0 || seq[i] !== seq[i - 1]) {
        if (i > 0) {
          moves++
          moveCost += 3 + (1.5 * mins(seq[i - 1], seq[i])) / 60
          if (runLen === 1 && i - 1 > 0) moveCost += 1.5
        }
        runs.set(seq[i], (runs.get(seq[i]) ?? 0) + 1)
        runLen = 1
      } else runLen++
    }
    for (const n of runs.values()) if (n > 1) moveCost += 6 * (n - 1)
    const short = shortStops(seq)
    const stops = ONE_NIGHT * short.one.length + (slots.length >= LONG_TRIP ? TWO_NIGHTS * short.two : 0)
    let late = 0
    for (const { p, fi, fo, li, lo } of ends) {
      const fc = cityOf(assign, fi, fo)
      const lc = cityOf(assign, li, lo)
      if (p.arrival && cities.has(p.arrival)) {
        moveCost += (1.5 * mins(p.arrival, fc)) / 60
        if (p.arrivalLate && !fo.fixed && fc !== p.arrival) late += LATE_COST
      }
      if (p.departure && cities.has(p.departure)) {
        // a long ride on the day of the flight home is worse than one on the day of landing
        moveCost += (DEPART_DAY * mins(p.departure, lc)) / 60
        if (p.departureEarly && !lo.fixed && lc !== p.departure) late += LATE_COST
      }
    }
    // nights in a city that is out of season and that nobody picked or liked (an airport's city in winter)
    let cold = 0
    for (const [c, n] of nights) if (level(c) === 0 && !chosen.has(c)) cold += OFF_SEASON_NIGHT * n
    const hard = rules(seq)
    return {
      value: own + base + DAYTRIP_VALUE * (trips + baseTrips),
      idle,
      moveCost,
      flat: stops + late + cold + 1000 * hard,
      moves,
      hours: own + trips + base + baseTrips,
      hard,
      late,
      dt: detail ? dt : [],
    }
  }

  /**
   * The one-night stops the split chose (a person's own one-night stay is theirs, and the last night in the departure
   * city is fine), and how many two-night stops it has.
   */
  function shortStops(seq: string[]) {
    const runs = runsOf(seq)
    const one: number[] = []
    let two = 0
    runs.forEach((r, k) => {
      const chosen = slots.slice(r.from, r.from + r.len).some((s) => s.free)
      if (!chosen) return
      if (r.len === 2) two++
      if (r.len !== 1) return
      if (k === runs.length - 1 && runs.length > 1 && departures.has(r.city)) return
      // nor is the night by the airport after a late landing, or a place made for one night (a ryokan in Hakone)
      if (k === 0 && lateArrivals.has(r.city)) return
      if (oneNighter(r.city)) return
      one.push(k)
    })
    return { one, two, runs }
  }
  /**
   * The rule behind the cost, made sure: a one-night stop the search still left joins the neighbouring run whose city
   * is nearer, when that city is a day trip away (its places become a day trip instead of two hotel changes).
   */
  function consolidate(a: Assign) {
    for (let guard = 0; guard < 50; guard++) {
      const seq = seqOf(a)
      const { one, runs } = shortStops(seq)
      let done = false
      for (const k of one) {
        const r = runs[k]
        if (!slots[r.from].free) continue
        const options = [runs[k - 1], runs[k + 1]]
          .filter((x): x is Run => !!x && cities.has(x.city) && cities.has(r.city))
          .map((x) => ({ x, d: km(cities.get(x.city)!, cities.get(r.city)!) }))
          .filter((o) => o.d <= DAYTRIP_KM)
          .sort((p, q) => p.d - q.d)
        if (!options.length) continue
        a[r.from] = options[0].x.city
        done = true
        break
      }
      if (!done) return a
    }
    return a
  }

  // ---- the search
  // The open nights come in stretches (between booked stays, or the whole trip). For each stretch every sensible
  // list of bases is tried (the route rules cut most orders early), the nights are dealt out by what each is worth,
  // and the best lists are then tuned by moving a night at a time. A split always exists: the open nights join the
  // stay next to them, or with nothing booked the whole trip sleeps in one city.
  const F = freeIdx.length
  const blank = (): Assign => slots.map(() => null)

  const fallbackCity =
    (soleArrival && candSet.has(soleArrival) ? soleArrival : null) ??
    [...valued].filter((c) => !isFar(c)).sort((a, b) => Number(!!cities.get(b)!.classic) - Number(!!cities.get(a)!.classic) || (baseOf.get(b)?.core ?? 0) + (demand.get(b) ?? 0) - (baseOf.get(a)?.core ?? 0) - (demand.get(a) ?? 0) || (a < b ? -1 : 1))[0] ??
    candList[0]
  const joined = (() => {
    const a = blank()
    const here = (i: number) => (slots[i].free ? (slots[i].occ.find((o) => o.fixed)?.fixed ?? null) : slots[i].main)
    for (const i of freeIdx) {
      let c = here(i)
      for (let d = 1; !c && d < slots.length; d++) c = (i - d >= 0 ? here(i - d) : null) ?? (i + d < slots.length ? here(i + d) : null)
      a[i] = c && cities.has(c) ? c : fallbackCity
    }
    return a
  })()

  // with nothing booked the whole trip in one city must itself keep the rules: the first city that does
  const start = (() => {
    if (!rules(seqOf(joined))) return joined
    for (const c of [fallbackCity, ...candList]) {
      const a = blank()
      for (const i of freeIdx) a[i] = c
      if (!rules(seqOf(a))) return a
    }
    return joined
  })()

  // the stretches of open nights
  const gaps: { from: number; to: number }[] = []
  for (const i of freeIdx) {
    const g = gaps[gaps.length - 1]
    if (g && g.to === i - 1 && follows[i]) g.to = i
    else gaps.push({ from: i, to: i })
  }

  // what `hours` of a city's nights are worth, without the day trips and the picky places (for dealing out nights)
  const worth = (c: string, hours: number) => {
    const likedHours = Math.min(demand.get(c) ?? 0, hours)
    const liked = likedValue(c, likedHours)
    let room = hours - likedHours
    const b = baseOf.get(c)
    if (!b) return liked
    const core = Math.min(b.core, room)
    room -= core
    const extra = Math.min(b.extra, room)
    room -= extra
    return liked + b.wCore * core + b.wExtra * extra + W_TAIL * Math.min(b.tail, room)
  }

  /**
   * A list of bases the search bothers with: the main line runs east to west, so the cities go one way by longitude
   * (islands aside); the cities of the departure airport's region may come last whichever way the rest went. This
   * only trims the search (two orders per set of cities, not all of them); what is allowed is decided by `rules`.
   */
  function oneWay(list: string[]) {
    const line = list.filter((c) => !isAir(c) && regionOf(c))
    let cut = line.length
    while (cut > 0 && depRegions.has(regionOf(line[cut - 1])!)) cut--
    const mono = (xs: string[]) => {
      let dir = 0
      for (let i = 1; i < xs.length; i++) {
        const d = Math.sign(cities.get(xs[i])!.lng - cities.get(xs[i - 1])!.lng)
        if (!d) continue
        if (dir && d !== dir) return false
        dir = d
      }
      return true
    }
    return mono(line.slice(0, cut)) && mono(line.slice(cut))
  }

  /** Every list of bases that fits one stretch of open nights and keeps the route rules, as full assignments. */
  function fills(gap: { from: number; to: number }, cur: Assign): Assign[] {
    const L = gap.to - gap.from + 1
    const seq = seqOf(cur)
    const joins = (i: number, j: number) => i >= 0 && j < slots.length && follows[j]
    const before = joins(gap.from - 1, gap.from) ? seq[gap.from - 1] : null
    const after = joins(gap.to, gap.to + 1) ? seq[gap.to + 1] : null
    const atStart = gap.from === 0
    const atEnd = gap.to === slots.length - 1
    const head = seq.slice(0, gap.from)
    const elsewhere = new Map<string, number>()
    seq.forEach((c, i) => {
      if (i < gap.from || i > gap.to) elsewhere.set(c, (elsewhere.get(c) ?? 0) + 1)
    })
    // a city that is fine as a day trip (Nara, Nikko) gets a bed only when the group liked a night's worth of places
    // there, or already sleeps or lands there; otherwise its value comes as a day trip from the base next door
    const bedWorthy = (c: string) => {
      const n = nightsOf(cities.get(c)!)
      return !(n.min === 0 && n.ideal > 0) || anchors.has(c) || (demand.get(c) ?? 0) >= HOURS_PER_NIGHT
    }
    // and the search stays small: the booked and airport cities, the most valued of the rest up to eight, three extras
    const value = (c: string) => worth(c, 100)
    const byValue = (a: string, b: string) => value(b) - value(a) || (a < b ? -1 : 1)
    const main = candList.filter(bedWorthy).sort((a, b) => Number(anchors.has(b)) - Number(anchors.has(a)) || byValue(a, b)).slice(0, 8)
    const pool = [...main, ...extraList.filter(bedWorthy).sort(byValue).slice(0, 3)].sort()
    const maxLen = Math.min(6, L, Math.max(cap, fixedBases) + 2)
    const out: Assign[] = []

    const deal = (list: string[]) => {
      const n = list.length
      const alone = atStart && atEnd && n === 1
      const need = list.map((c, i) => {
        if (alone || (i === 0 && before === c) || (i === n - 1 && after === c)) return 1
        return needOf(c, i > 0 ? list[i - 1] : before, atStart && i === 0, atEnd && i === n - 1)
      })
      // too many bases for the nights, whatever comes after: nothing longer is tried
      if (need.reduce((s, x) => s + x, 0) > L) return 'over'
      // when the list holds a city that waits for others, those get their minimum first
      if (required.length && list.some(demanding)) {
        list.forEach((c, i) => {
          const y = required.find((r) => r.id === c)
          if (y) need[i] = Math.max(need[i], y.min - (elsewhere.get(c) ?? 0))
        })
      }
      let rest = L - need.reduce((s, x) => s + x, 0)
      if (rest < 0) return null
      const count = [...need]
      // the way back to the departure city (the same city a second time, last) stays as short as it may be
      const closes = n > 1 && list.indexOf(list[n - 1]) < n - 1
      const has = (i: number) => (elsewhere.get(list[i]) ?? 0) + list.reduce((s, c, k) => (c === list[i] ? s + count[k] : s), 0)
      while (rest > 0) {
        let best = 0
        let gain = -1
        for (let i = 0; i < (closes ? n - 1 : n); i++) {
          const h = has(i) * HOURS_PER_NIGHT
          const g = worth(list[i], h + HOURS_PER_NIGHT) - worth(list[i], h)
          if (g > gain + 1e-9 || (Math.abs(g - gain) <= 1e-9 && count[i] < count[best])) {
            gain = g
            best = i
          }
        }
        count[best]++
        rest--
      }
      return count
    }
    const place = (list: string[], count: number[]) => {
      const a = [...cur]
      let i = gap.from
      list.forEach((c, k) => {
        for (let x = 0; x < count[k]; x++) a[i++] = c
      })
      return a
    }
    const walk = (list: string[], extras: number) => {
      for (const c of pool) {
        const again = list.includes(c)
        // a city comes once; the departure city may close the trip a second time
        const closing = again && atEnd && departures.has(c) && list[list.length - 1] !== c
        if (again && !closing) continue
        const ex = extras + (extraSet.has(c) && !candSet.has(c) ? 1 : 0)
        if (ex > maxExtras) continue
        const next = [...list, c]
        if (lineBreaks([...head, ...next]) > fixedBreaks || !oneWay(next)) continue
        const count = deal(next)
        if (count === 'over') continue
        if (count) {
          const a = place(next, count)
          if (!rules(seqOf(a))) out.push(a)
        }
        if (!closing && next.length < maxLen && next.length < L) walk(next, ex)
      }
    }
    walk([], 0)
    return out
  }

  /** Moves one night at a time between the bases of a stretch while that improves the score. */
  function tune(start: Assign, prof: Profile) {
    let a = [...start]
    let best = evaluate(a, prof).score
    for (let round = 0; round < 40; round++) {
      let better: Assign | null = null
      let gain = 1e-9
      for (const g of gaps) {
        const list: string[] = []
        const count: number[] = []
        for (let i = g.from; i <= g.to; i++) {
          if (list.length && list[list.length - 1] === a[i]) count[count.length - 1]++
          else {
            list.push(a[i]!)
            count.push(1)
          }
        }
        for (let x = 0; x < list.length; x++) {
          for (let y = 0; y < list.length; y++) {
            if (x === y) continue
            const b = [...a]
            let i = g.from
            list.forEach((c, k) => {
              const n = count[k] + (k === x ? -1 : k === y ? 1 : 0)
              for (let z = 0; z < n; z++) b[i++] = c
            })
            const s = evaluate(b, prof).score
            if (s - best > gain) {
              gain = s - best
              better = b
            }
          }
        }
      }
      if (!better) break
      a = better
      best += gain
    }
    return a
  }

  /** The older, wider move: change any block of open nights to one city while that improves the score. */
  function climb(start: Assign, prof: Profile, pool: string[], rounds: number) {
    const a = [...start]
    let best = evaluate(a, prof).score
    for (let round = 0; round < rounds; round++) {
      let move: { i: number; j: number; c: string } | null = null
      let gain = 1e-9
      for (let i = 0; i < F; i++) {
        for (let j = i; j < F; j++) {
          for (const c of pool) {
            const save: Assign = []
            let changed = false
            for (let k = i; k <= j; k++) {
              save.push(a[freeIdx[k]])
              if (a[freeIdx[k]] !== c) changed = true
              a[freeIdx[k]] = c
            }
            if (changed) {
              const s = evaluate(a, prof).score
              if (s - best > gain) {
                gain = s - best
                move = { i, j, c }
              }
            }
            for (let k = i; k <= j; k++) a[freeIdx[k]] = save[k - i]
          }
        }
      }
      if (!move) break
      for (let k = move.i; k <= move.j; k++) a[freeIdx[k]] = move.c
      best += gain
    }
    return a
  }

  const sigOf = (a: Assign) => freeIdx.map((i) => a[i]).join('|')
  const extrasIn = (a: Assign) => [...new Set(freeIdx.map((i) => a[i]!).filter((c) => extraSet.has(c) && !candSet.has(c)))]
  // cities in a split that the group neither picked nor liked (the classic line that joined in, or an extra), and no airport's
  const addedIn = (a: Assign) => (openChoice ? [] : [...new Set(freeIdx.map((i) => a[i]!).filter((c) => !chosen.has(c) && !anchors.has(c)))].sort())

  // seeds: for one stretch, every list that fits; for several, each stretch in turn with the others at their best
  const balanced = PROFILES[0]
  // "we know the nights per city": only the order is chosen
  if (inp.counts?.length) return byCounts(inp.counts)
  const seeds = new Map<string, Assign>()
  const addSeed = (a: Assign) => {
    const s = sigOf(a)
    if (!seeds.has(s)) seeds.set(s, a)
  }
  addSeed(start)
  {
    let cur = start
    for (const g of gaps) {
      const all = fills(g, cur).map((a) => ({ a, v: evaluate(a, balanced).score, extras: extrasIn(a).length }))
      const byScore = (x: { a: Assign; v: number }, y: { a: Assign; v: number }) => y.v - x.v || (sigOf(x.a) < sigOf(y.a) ? -1 : 1)
      const options = all.filter((o) => o.extras <= plainExtras).sort(byScore)
      // "more places" may add a city nobody picked
      const wider = all.filter((o) => o.extras > plainExtras).sort(byScore)
      for (const o of gaps.length === 1 ? [...options, ...wider] : [...options.slice(0, 8), ...wider.slice(0, 8)]) addSeed(o.a)
      if (options.length && options[0].v > evaluate(cur, balanced).score) cur = options[0].a
    }
    addSeed(cur)
  }

  type Found = { assign: Assign; sig: string; ev: Record<string, Eval>; extras: string[] }
  const found = new Map<string, Found>()
  const keep = (a: Assign) => {
    const sig = sigOf(a)
    if (!found.has(sig) && !rules(seqOf(a))) found.set(sig, { assign: a, sig, ev: {}, extras: extrasIn(a) })
  }
  keep(start)
  const measured = [...seeds.values()].map((s) => ({ s, m: measure(s) }))
  for (const prof of PROFILES) {
    const ranked = measured
      .filter(({ s }) => prof.kind === 'more_places' || extrasIn(s).length <= plainExtras)
      .map(({ s, m }) => ({ s, v: scoreOf(m, prof) }))
      .sort((x, y) => y.v - x.v || (sigOf(x.s) < sigOf(y.s) ? -1 : 1))
      .slice(0, 4)
    for (const { s } of ranked) {
      const pool = [...candList, ...extrasIn(s)]
      // the wide move is for what one stretch at a time can't see: several stretches, or parties on different nights
      const tuned = gaps.length > 1 || ids.length > 1 ? climb(tune(s, prof), prof, pool, 2) : tune(s, prof)
      keep(tuned)
      keep(consolidate([...tuned]))
    }
  }
  // the same splits with one night moved across a change of city: a real second choice now that one-night stops are out
  for (const f of [...found.values()]) {
    const seq = seqOf(f.assign)
    for (let i = 0; i + 1 < slots.length; i++) {
      if (seq[i] === seq[i + 1] || !follows[i + 1]) continue
      for (const [to, city] of [[i, seq[i + 1]], [i + 1, seq[i]]] as const) {
        if (!slots[to].free) continue
        const a = [...f.assign]
        a[to] = city
        keep(consolidate(a))
      }
    }
  }
  const pool = [...found.values()]
  for (const f of pool) for (const p of PROFILES) f.ev[p.kind] = evaluate(f.assign, p, true)

  // choose: the best balanced one; one with fewer hotel changes and one that fills more hours, when there is one
  // that really is (not just the same nights in another order); a second best balanced one if those are missing.
  // Only "more places" may hold a city nobody picked.
  const shape = (f: Found) => {
    const runs: string[] = []
    let n = 0
    for (let k = 0; k < F; k++) {
      n++
      const c = f.assign[freeIdx[k]]
      if (k === F - 1 || f.assign[freeIdx[k + 1]] !== c || freeIdx[k + 1] !== freeIdx[k] + 1) {
        runs.push(c + ':' + n)
        n = 0
      }
    }
    return runs.sort().join()
  }
  // equal scores (the same route in either direction, with no flights to tell): the one that starts nearer Tokyo
  const startAt = (f: Found) => {
    const i = LINE.indexOf(regionOf(seqOf(f.assign)[0]) ?? '')
    return i < 0 ? LINE.length : i
  }
  const bal = (a: Found, b: Found) => {
    const d = b.ev.balanced.score - a.ev.balanced.score
    return Math.abs(d) > 1e-6 ? d : startAt(a) - startAt(b) || (a.sig < b.sig ? -1 : 1)
  }
  const sorted = [...pool].sort(bal)
  const plain = sorted.filter((f) => f.extras.length <= plainExtras)
  const picked: { f: Found; kind: SplitReason['kind'] }[] = []
  // a second or third choice differs from the ones before it, and is no worse on the nights by the airports
  const fresh = (x: Found) => !picked.some((p) => shape(p.f) === shape(x)) && x.ev.balanced.late <= best.ev.balanced.late
  // never empty-handed: with nothing that keeps every rule (it should not happen), the open nights join what is booked
  if (!plain.length) {
    const f: Found = { assign: start, sig: sigOf(start), ev: {}, extras: [] }
    for (const p of PROFILES) f.ev[p.kind] = evaluate(start, p, true)
    return [toAlternative(start, 'balanced', f.ev.balanced)]
  }
  const best = plain[0]
  picked.push({ f: best, kind: 'balanced' })
  const fewer = [...plain].sort((a, b) => a.ev.balanced.moves - b.ev.balanced.moves || bal(a, b)).find((x) => fresh(x) && x.ev.balanced.moves < best.ev.balanced.moves && x.ev.balanced.hours >= FEWER_KEEPS * best.ev.balanced.hours)
  if (fewer) picked.push({ f: fewer, kind: 'fewer_moves' })
  const more = [...sorted].sort((a, b) => b.ev.more_places.score - a.ev.more_places.score || bal(a, b)).find((x) => fresh(x) && x.ev.balanced.hours > best.ev.balanced.hours + 0.4)
  if (more) picked.push({ f: more, kind: 'more_places' })
  if (picked.length < 2) {
    // a second choice has to be a real one: nearly as much held, and not far behind on the whole
    const next = plain.find((x) => fresh(x) && x.ev.balanced.hours >= FEWER_KEEPS * best.ev.balanced.hours && x.ev.balanced.score >= best.ev.balanced.score - 0.2 * best.ev.balanced.hours)
    if (next) {
      const e = next.ev.balanced
      const b = best.ev.balanced
      picked.push({ f: next, kind: e.moves < b.moves ? 'fewer_moves' : e.hours > b.hours + 0.4 ? 'more_places' : 'balanced' })
    }
  }
  return picked.map(({ f, kind }) => toAlternative(f.assign, kind, f.ev.balanced))

  /**
   * The given counts, in every order (a city once; the order that keeps the route rules wins over one that doesn't),
   * scored like any split. Left-over nights go to one of the given cities or to one more city, whichever scores best.
   */
  function byCounts(given: { city: string; nights: number }[]): Alternative[] {
    const list = given.filter((g) => cities.has(g.city) && g.nights > 0)
    const sum = list.reduce((s, g) => s + g.nights, 0)
    if (!list.length || sum > F) return []
    const rest = F - sum
    const options: { city: string; nights: number }[][] = []
    if (!rest) options.push(list)
    else {
      for (let k = 0; k < list.length; k++) options.push(list.map((g, i) => (i === k ? { ...g, nights: g.nights + rest } : g)))
      // the rest the way the usual suggestion would split it: its other cities, in proportion to their nights there
      const free = suggestSplit({ ...inp, counts: undefined })[0]
      if (free) {
        const theirs = new Map<string, number>()
        for (const r of free.rows) if (!list.some((g) => g.city === r.city)) theirs.set(r.city, Math.max(theirs.get(r.city) ?? 0, r.nights))
        const total = [...theirs.values()].reduce((x, y) => x + y, 0)
        if (total) {
          const share = [...theirs].map(([city, n]) => ({ city, exact: (n / total) * rest }))
          const got = share.map((x) => ({ city: x.city, nights: Math.floor(x.exact), frac: x.exact - Math.floor(x.exact) }))
          let left = rest - got.reduce((x, y) => x + y.nights, 0)
          for (const g of [...got].sort((x, y) => y.frac - x.frac || (x.city < y.city ? -1 : 1))) if (left-- > 0) g.nights++
          const added = got.filter((g) => g.nights > 0).map(({ city, nights }) => ({ city, nights }))
          if (added.length && list.length + added.length <= 7) options.push([...list, ...added])
        }
      }
      if (list.length < 6) {
        for (const c of [...candList, ...extraList]) {
          if (list.some((g) => g.city === c) || level(c) === 0) continue
          options.push([...list, { city: c, nights: rest }])
        }
      }
    }
    const perms = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])))
    const tried: { a: Assign; hard: number; score: number; sig: string; ev: Eval }[] = []
    for (const opt of options) {
      for (const order of perms(opt)) {
        const a = blank()
        let k = 0
        for (const g of order) for (let n = 0; n < g.nights; n++) a[freeIdx[k++]] = g.city
        const ev = evaluate(a, balanced)
        tried.push({ a, hard: ev.hard, score: ev.score + 1000 * ev.hard, sig: sigOf(a), ev })
      }
    }
    // fewest broken rules first, then the score; the second choice is another order, not the same one shifted
    tried.sort((x, y) => x.hard - y.hard || y.score - x.score || (x.sig < y.sig ? -1 : 1))
    const out: typeof tried = []
    const orderOf = (a: Assign) => freeIdx.map((i) => a[i]).filter((c, k, xs) => !k || xs[k - 1] !== c).join('>')
    for (const t of tried) {
      if (out.some((o) => orderOf(o.a) === orderOf(t.a))) continue
      if (out.length && (t.hard > out[0].hard || t.ev.score < out[0].ev.score - 0.2 * Math.max(1, out[0].ev.hours))) break
      out.push(t)
      if (out.length === 2) break
    }
    return out.map((t) => {
      const ev = evaluate(t.a, balanced, true)
      const alt = toAlternative(t.a, 'balanced', ev)
      alt.reason.ruleBreaks = t.hard
      return alt
    })
  }

  // ---- the answer: runs of open nights, and what the alternative covers
  function toAlternative(assign: Assign, kind: SplitReason['kind'], ev: Eval): Alternative {
    const rows: SplitRow[] = []
    const open = (i: number) => slots[i].occ.filter((o) => !o.fixed).map((o) => o.party)
    let i = 0
    while (i < slots.length) {
      if (!slots[i].free) {
        i++
        continue
      }
      const who = open(i).join(',')
      const city = assign[i]!
      let j = i
      while (j + 1 < slots.length && slots[j + 1].free && assign[j + 1] === city && open(j + 1).join(',') === who && follows[j + 1]) j++
      const parties = open(i)
      const everyone = parties.length === ids.length || ids[0] === '*'
      for (const p of everyone ? [null] : parties) {
        rows.push({ city, nights: j - i + 1, party: p, checkIn: slots[i].date, checkOut: addDays(slots[j].date, 1) })
      }
      i = j + 1
    }
    // places: in the city of a night (as many as the nights hold), then on day trips
    const covered = coverCount(assign, ev)
    const inRows = [...new Set(rows.map((r) => r.city))]
    return {
      rows,
      reason: {
        kind,
        moves: ev.moves,
        coveredPlaces: covered.count,
        totalPlaces,
        dayTrips: covered.dayTrips,
        typical: baseOf.size > 0 && fade >= 0.5,
        added: addedIn(assign),
        offSeason: inRows.filter((c) => level(c) === 0).sort(),
      },
    }
  }

  function coverCount(assign: Assign, ev: Eval) {
    const nights = new Map<string, number>()
    for (let i = 0; i < slots.length; i++) {
      for (const c of new Set(slots[i].occ.map((o) => cityOf(assign, i, o)))) nights.set(c, (nights.get(c) ?? 0) + 1)
    }
    let count = 0
    const dayTrips: SplitReason['dayTrips'] = []
    const byCity = new Map<string, SplitPlace[]>()
    for (const { p, home } of homes) byCity.set(home, [...(byCity.get(home) ?? []), p])
    const dtLeft = new Map(ev.dt.map((d) => [d.city, d]))
    for (const [c, ps] of byCity) {
      const sorted = [...ps].sort((a, b) => a.mins - b.mins)
      let cap = (nights.get(c) ?? 0) * HOURS_PER_NIGHT
      let n = 0
      for (const p of sorted) {
        if (p.mins / 60 <= cap + 1e-9) {
          cap -= p.mins / 60
          n++
        }
      }
      count += n
      const d = dtLeft.get(c)
      if (d) {
        let h = d.hours
        let m = 0
        for (const p of sorted.slice(n)) {
          if (p.mins / 60 <= h + 1e-9) {
            h -= p.mins / 60
            m++
          }
        }
        if (m) {
          count += m
          dayTrips.push({ city: c, from: d.from, places: m })
        }
      }
    }
    return { count, dayTrips }
  }
}
