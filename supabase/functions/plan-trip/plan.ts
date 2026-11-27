// The trip planner's core: which day each matched place goes on, and roughly when. Pure code (no I/O), so it can
// be run and tested outside the edge runtime.

export type Point = { lat: number; lng: number }
export type BestTime = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'any'

/**
 * Where one couple is on one day and the hours they have for plans (minutes after midnight); cap: how much of a day
 * they want filled, from the pace they chose (DAY_CAP when nobody said)
 */
export type Presence = {
  base: string
  hotel: Point
  start: number
  end: number
  cap?: number
  landing?: true
  /** on a plain day (no landing, no move): the earliest they would leave the hotel for a place that is best early */
  early?: number
  /** the day they fly home: end is when they must be back at the hotel for the bags, so a stop ends a ride before it */
  depart?: true
  /** the couple travels with a baby */
  baby?: true
}

export type Day = {
  day: number
  date: string // YYYY-MM-DD
  weekday: number // 0 = Sunday
  at: Map<string, Presence> // couple → presence; a couple not in Japan that day is missing
}

/**
 * Something already fixed on a day: a booking, or a plan item a person put or moved there. meal: a full meal (a booked
 * table, or a meal people put in or ticked as eaten); the planner's own meals keep MEAL_GAP from it.
 */
export type Fixed = { day: number; couples: string[]; point: Point | null; start: number | null; mins: number; meal?: boolean }

/** The starts of each couple's fixed full meals on one day. */
function fixedMealsOf(fixed: Fixed[], day: number) {
  const m = new Map<string, number[]>()
  for (const f of fixed) if (f.meal && f.day === day && f.start != null) for (const c of f.couples) m.set(c, [...(m.get(c) ?? []), f.start])
  return m
}

/** A matched place the planner may put on a day. */
export type Unit = {
  id: string
  couples: string[]
  base: string
  far: boolean // a day trip: more than 25 km from where its couples sleep
  point: Point | null
  mins: number
  category: string
  best: BestTime
  opens: number | null
  closes: number | null
  closedWeekdays: number[]
  closedDates: string[]
  openDates: string[] // runs only on these dates (a market, an event); empty = no such limit
  priority: number
  current: number | null // the day it is on now, if any
  /** a nightlife place that serves a full meal (an izakaya, a food alley): it can be the day's dinner */
  meal?: boolean
  /** out in the open (a garden, a shrine path, a lake): the visit is over by dusk */
  outdoor?: boolean
  /** not a place for a baby: adults only, no strollers, stairs only, smoke (from the card) */
  adults?: boolean
  /** the place has to be booked ahead and no booking for it is in the trip yet */
  booking?: boolean
  /**
   * point is not where the place is but its city's middle (no coordinates, and its address was not found): good
   * enough to say which city's days it belongs to, never used to measure a ride or to say what it is near
   */
  approx?: boolean
}

// late: the day's timetable only reaches it after it closes (or after the day's hours)
// missed: it wants a time of day (a morning café, cakes that sell out) and the day only reaches it hours after
export type Placed = { day: number; start: number; order: number; late?: boolean; missed?: boolean }
export type Outcome = {
  placed: Map<string, Placed>
  unplanned: Map<string, 'closed' | 'no_day' | 'full'>
  issues: Issue[]
  /** placed places that sit outside the city their people sleep in that day (not day trips): id → the place's city */
  away: Map<string, string>
  /**
   * places planned for fewer couples than liked them: id → the couples it is planned for (an adults-only place two
   * couples liked goes to the couple without the baby)
   */
  only: Map<string, string[]>
}
/** What the final check found on a planned place: it should never happen, and the app shows it if it does. */
export type Issue = {
  /** the place; '' for an issue about a day (a meal nobody planned), which carries day and couple instead */
  id: string
  // booking: the place takes no walk-ins and nobody has booked it yet; baby: a place not for a baby (adults only, no
  // strollers, smoke) is planned for the couple that has one, because only they liked it
  kind: 'overlap' | 'tight' | 'hours' | 'meals' | 'no_lunch' | 'no_dinner' | 'booking' | 'baby'
  day?: number
  couple?: string
}

/**
 * A full meal: a restaurant, or a nightlife place whose card says it serves one. A café never is, and neither is a
 * food stop of under 40 minutes (a mochi stand, an omelette stall): a snack on the way.
 */
export const isMeal = (u: Unit) => (u.category === 'food' && u.mins >= 40) || (u.category === 'nightlife' && !!u.meal)
export type MealSlot = 'breakfast' | 'lunch' | 'dinner'
// a meal starts inside its slot; `want` is the hour a meal with no hour of its own gets
const MEAL_AT = {
  lunch: { from: 11 * 60, to: 14 * 60 + 45, want: 12 * 60 + 15 },
  dinner: { from: 17 * 60 + 15, to: 21 * 60, want: 18 * 60 + 30 },
} as const
// a day that runs at least to this hour has a dinner in it (the slot opens at 17:15)
const DINNER_DAY = 18 * 60 + 30
// a day with a meal slot nobody filled costs this much (the day's cost is in km and hours)
const MEAL_MISS = 10
// the hour a lunch whose card says "afternoon" asks for
const LATE_LUNCH = 13 * 60 + 15
// a morning meal this long can be the day's lunch
const LONG_MEAL = 60
// a day that starts by this hour has a lunch in it. Up to 13:00 it is a lunch like any day's; after that (a couple that
// reaches the new city in the early afternoon and has not eaten) it is a late lunch, the first stop of the day, and it
// still starts by the end of the lunch hours (14:45): kitchens take the last lunch orders about then, and the dinner
// three hours later (MEAL_GAP) is still at its usual hour. 14:15 leaves half an hour to get to the table
const LUNCH_DAY = 14 * 60 + 15
const LUNCH_PLAIN = 13 * 60
// room kept on a day for a meal still to be placed there
const MEAL_ROOM = 70
// a meal counts this much, at most, toward the pace of the day: sitting down to eat is the day's rest, not its load
const MEAL_PACE = 45

/**
 * Which meals a couple needs that day: lunch when their day covers 13:00-13:30 or starts by 14:15 (a late lunch, the
 * first stop of the day they arrive), dinner when it runs to 18:30 (an early dinner still fits: the evening they fly
 * home), and only where something fixed leaves an hour free in the slot. A fixed meal in the slot covers it (one with no hour
 * covers dinner first). Short landing and departure days so need one meal or none.
 */
export function mealNeeds(p: Presence, fx: Fixed[]) {
  const free = (from: number, to: number) => {
    let t = Math.max(from, p.start)
    const end = Math.min(to, p.end)
    for (const f of fx.filter((x) => x.start != null).sort((a, b) => a.start! - b.start!)) {
      if (Math.min(f.start!, end) - t >= 60) return true
      t = Math.max(t, f.start! + f.mins)
    }
    return end - t >= 60
  }
  const need = {
    lunch: p.start <= LUNCH_DAY && p.end >= 13 * 60 + 30 && free(MEAL_AT.lunch.from, MEAL_AT.lunch.to + 60),
    dinner: p.start <= 19 * 60 && p.end >= DINNER_DAY && free(MEAL_AT.dinner.from, MEAL_AT.dinner.to + 60),
  }
  for (const f of fx) {
    if (!f.meal) continue
    if (f.start == null) need[need.dinner ? 'dinner' : 'lunch'] = false
    else if (f.start >= MEAL_AT.lunch.from - 30 && f.start <= MEAL_AT.lunch.to + 30) need.lunch = false
    else if (f.start >= MEAL_AT.dinner.from - 30 && f.start <= MEAL_AT.dinner.to + 30) need.dinner = false
  }
  return need
}

/** The couples of a place that are there on a day. */
export const whoOn = (u: Unit, d: Day) => u.couples.filter((c) => d.at.has(c))

/** The slots a meal could take on a day: the hour its card asks for, inside its opening hours and its people's day. */
function slotsFor(u: Unit, d: Day): MealSlot[] {
  const who = whoOn(u, d)
  const start = Math.max(...who.map((c) => d.at.get(c)!.start))
  const end = Math.min(...who.map((c) => d.at.get(c)!.end))
  // lunch only on a day that starts by 14:15 (a day that starts at 15:30 has no lunch to plan), dinner on one that runs
  // to 18:30. On a day that starts after 13:00 the lunch is the first stop, so the ride from the hotel counts: a
  // table they can't reach by the end of the lunch hours is not that day's lunch
  const reach = start > LUNCH_PLAIN ? round15(Math.max(...who.map((c) => d.at.get(c)!.start + ride(d.at.get(c)!.hotel, pt(u))))) : start
  const can = (s: 'lunch' | 'dinner') =>
    (s === 'lunch' ? start <= LUNCH_DAY : end >= DINNER_DAY) &&
    Math.max(u.opens ?? 0, s === 'lunch' ? reach : start, MEAL_AT[s].from) <= Math.min((u.closes ?? 24 * 60) - u.mins, MEAL_AT[s].to, end - u.mins)
  // a nightlife place that serves a meal (an izakaya) is a dinner, never a lunch
  if (u.category === 'nightlife') return can('dinner') ? ['dinner'] : []
  const asked: MealSlot[] =
    u.best === 'morning'
      ? start >= 10 * 60 + 45 ? ['lunch']
        // a long morning meal that is still open at lunchtime (a market's food crawl) is the day's early lunch when
        // the day has no other; a short one stays a breakfast
        : u.mins >= LONG_MEAL ? ['lunch', 'breakfast'] : ['breakfast']
    : u.best === 'midday' || u.best === 'afternoon' ? ['lunch']
    : u.best === 'evening' || u.best === 'night' ? ['dinner']
    : ['lunch', 'dinner']
  const ok = asked.filter((s) => s === 'breakfast' || can(s))
  // on a day that starts after 13:00 a lunch restaurant is the dinner, as on any day with no lunch hours of its own,
  // or the late lunch when the day already has a dinner: of two such restaurants one is each, and a place that can
  // only be a lunch (a market that closes at 18:00) takes the late lunch first
  if (start > LUNCH_PLAIN && ok.length && !ok.includes('dinner') && can('dinner')) ok.unshift('dinner')
  // the hour the card asks for is outside its opening hours that day: the hours decide
  return ok.length ? ok : (['lunch', 'dinner'] as const).filter(can)
}

/**
 * Each meal's slot on one day: a couple has at most one breakfast, one lunch and one dinner, and a fixed meal takes
 * its slot first. null: no slot left for it (the day already has that meal for one of its people).
 */
export function mealSlots(d: Day, meals: Unit[], fixed: Fixed[]): Map<string, MealSlot | null> {
  const taken = new Map<string, Set<MealSlot>>()
  for (const [c, p] of d.at) {
    const need = mealNeeds(p, [])
    const after = mealNeeds(p, fixed.filter((f) => f.day === d.day && f.meal && f.couples.includes(c)))
    taken.set(c, new Set((['lunch', 'dinner'] as const).filter((s) => need[s] && !after[s])))
  }
  const opts = new Map(meals.map((u) => [u.id, slotsFor(u, d)]))
  const out = new Map<string, MealSlot | null>()
  const order = [...meals].sort((a, b) => opts.get(a.id)!.length - opts.get(b.id)!.length || b.priority - a.priority || (a.id < b.id ? -1 : 1))
  for (const u of order) {
    const who = whoOn(u, d)
    const slot = opts.get(u.id)!.find((s) => who.every((c) => !taken.get(c)!.has(s))) ?? null
    out.set(u.id, slot)
    if (slot) for (const c of who) taken.get(c)!.add(slot)
  }
  return out
}

// a day's plans add up to at most this much, whatever the window; a baby and December daylight set the pace
const DAY_CAP = 510
// a couple's own plans on a day both couples are in the same city: the day is mostly together
const APART_CAP = 180
// what a place with no known point counts as in a day's spread (km): about what a place across town adds
const UNKNOWN_KM = 4
// minutes lost at each place on top of the ride to it (finding the door, the queue, the lift)
const HOP = 5
// the ride back to the hotel after a day in town counts toward the day only past this much (a day trip's counts whole)
const HOME_FREE = 30
// a day trip starts by this time and its places sit this close together
const TRIP_START = 11 * 60
const TRIP_SPREAD = 20
// a place in another city this close to where a couple sleeps can go on that day too (Tokyo from Yokohama)
const NEAR_KM = 30
// a place in another city than where the day's people sleep costs this much more than one in their own city: the own
// city's places come first, and the other city's only fill what they leave (or a day with none of its own)
// how much of a usual day the landing day holds
const LANDING_SHARE = 0.6
const AWAY_COST = 3
// and a day with any place in another city costs this much once, however many
const AWAY_DAY = 8
// a place of two couples on a day one of them is not in the country
const ABSENT_COST = 4
// a day trip is worth its ride: at least an hour of places there, and at least this share of the ride there and back
const TRIP_MIN = 60
const TRIP_SHARE = 0.4
// a day trip of a single place: at least this long there
const TRIP_ALONE = 120
// at most this many of a kind a day, per couple (meals go by slot instead: one lunch, one dinner)
const PER_DAY: Record<string, number> = { food: 2, cafe: 2, nightlife: 2 }
// how much a place counts: once for each couple that liked it, and a little more for one they share (the day together
// is worth more than each couple's own stop of the same stars)
const weightOf = (u: Unit) => u.couples.length * (u.couples.length > 1 ? 1.5 : 1)
// what PER_DAY counts a place as: a restaurant meal is counted by its slot, a snack as food
const kindOf = (u: Unit) => (u.category === 'food' && isMeal(u) ? 'meal' : u.category)

export function km(a: Point, b: Point) {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371
}

/** Minutes of travel between two places: walking, city trains with a transfer, or an express train further out. */
export function ride(a: Point | null, b: Point | null) {
  if (!a || !b) return 25
  const d = km(a, b)
  return Math.min(150, Math.round(d < 1.2 ? d * 15 : Math.min(12 + d * 3.2, 30 + d * 0.9)))
}

/**
 * Sunset at a point on a date, in minutes after midnight (tz: hours ahead of UTC, Japan by default). The sun's
 * declination and the equation of time from the day of the year: good to a few minutes, no table to keep.
 */
export function sunset(date: string, point: Point, tz = 9) {
  const n = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(date.slice(0, 4) + '-01-01T00:00:00Z')) / 86400000) + 1
  const r = Math.PI / 180
  const decl = -23.44 * Math.cos(r * (360 / 365) * (n + 10))
  const b = r * (360 / 365) * (n - 81)
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  const cosH = (Math.sin(-0.833 * r) - Math.sin(point.lat * r) * Math.sin(decl * r)) / (Math.cos(point.lat * r) * Math.cos(decl * r))
  const h = Math.acos(Math.max(-1, Math.min(1, cosH))) / r
  return Math.round(720 - eot - 4 * (point.lng - 15 * tz) + h * 4)
}
// an outdoor place may run this long after sunset (the light lasts a little)
const DUSK_SLACK = 20
const dusks = new Map<string, number>()
/** Sunset where a place is (or where the day's people sleep) on that day. */
function duskOf(d: Day, u: Unit) {
  const p = u.point ?? [...d.at.values()][0]?.hotel
  if (!p) return 17 * 60
  const k = d.date + '|' + p.lat.toFixed(1) + '|' + p.lng.toFixed(1)
  let v = dusks.get(k)
  if (v == null) dusks.set(k, (v = sunset(d.date, p)))
  return v
}
/** When a visit has to be over on a day: closing time, and dusk for a place out in the open. */
const closesOf = (u: Unit, d: Day) => Math.min(u.closes ?? 24 * 60, u.outdoor ? duskOf(d, u) + DUSK_SLACK : 24 * 60)
/** A morning place that is open early: its people may leave the hotel before the day's usual start for it. */
const opensEarly = (u: Unit) => u.best === 'morning' && u.opens != null && u.opens <= 8 * 60 + 30
/** When a couple's day is over for a place: on the day they fly, the ride back to the hotel for the bags comes off. */
const endFor = (u: Unit, p: Presence) => (p.depart ? p.end - ride(u.approx ? null : u.point, p.hotel) + 15 : p.end)
/** When a couple's day can start for a place. */
const startFor = (u: Unit, p: Presence) => (opensEarly(u) && p.early != null ? Math.min(p.early, p.start) : p.start)

/**
 * The plan: each unit on the day that keeps the days compact and balanced, then a rough time for each. A place the
 * day's timetable can't fit before it closes is barred from that day and the days are worked out again.
 */
export function plan(days: Day[], liked: Unit[], fixed: Fixed[]): Outcome {
  // who travels with a baby (nobody, when the trip does not say: then nothing below changes anything)
  const withBaby = new Set(days.flatMap((d) => [...d.at].filter(([, p]) => p.baby).map(([c]) => c)))
  // a place that is not for a baby, liked by a couple with one and a couple without: it is the other couple's plan
  const only = new Map<string, string[]>()
  const units = liked.map((u) => {
    if (!u.adults || !u.couples.some((c) => withBaby.has(c))) return u
    const free = u.couples.filter((c) => !withBaby.has(c))
    if (!free.length) return u
    only.set(u.id, free)
    return { ...u, couples: free }
  })
  // a day's load and a day's timetable depend only on which places are on it: worked out once for the whole run
  const memo: Memo = { loads: new Map(), tables: new Map() }
  const worth = (o: { placed: Map<string, Placed> }) => {
    let value = 0
    let missed = 0
    for (const [id, p] of o.placed) {
      const u = units.find((x) => x.id === id)!
      value += weightOf(u) * u.priority * (0.5 + u.mins / 120)
      if (p.missed) missed++
    }
    // what a plan is worth: each placed place by its stars and its length, once for each couple that liked it
    // a day left without a lunch or a dinner counts against a plan
    const noMeal = check(days, units, fixed, o.placed).filter((i) => i.kind === 'no_lunch' || i.kind === 'no_dinner').length
    return value - missed * 2 - noMeal * 3
  }
  const solve = (settle: boolean, us = units) => {
    const barred = new Map<string, Set<number>>()
    const dropped = new Set<string>()
    const run = () => arrange(days, dropped.size ? us.filter((u) => !dropped.has(u.id)) : us, fixed, barred, settle, memo)
    let out = run()
    for (let round = 0; round < 10 && out.late.length; round++) {
      for (const { id, day } of out.late) {
        // when the plan as it stands is kept, a place that was fine on its day is not the one to go: the least wanted
        // of the places just added to that day is (it is what made the day too long)
        let goes = id
        if (settle && us.find((u) => u.id === id)!.current === day) {
          const added = us.filter((v) => v.current !== day && out.placed.get(v.id)?.day === day && !barred.get(v.id)?.has(day))
          if (added.length) goes = added.sort((a, b) => a.priority - b.priority)[0].id
        }
        // three days tried and late on each: better left for the people to place than put where it is closed, and the
        // days are worked out without it so the times of the rest are real
        if (goes === id && (barred.get(id)?.size ?? 0) >= 3) dropped.add(id)
        else barred.set(goes, new Set([...(barred.get(goes) ?? []), day]))
      }
      out = run()
    }
    for (const { id } of out.late) {
      out.placed.delete(id)
      out.unplanned.set(id, 'full')
    }
    for (const id of dropped) out.unplanned.set(id, 'full')
    return out
  }
  // the plan worked out afresh, and the plan as it stands with only new places added to it: the fresh one replaces
  // what people already see only when it is clearly better, so the plan settles instead of shifting on every run
  const fresh = solve(false)
  const kept = units.some((u) => u.current != null) ? solve(true) : null
  const from = (o: typeof fresh) => units.map((u) => ({ ...u, current: o.placed.get(u.id)?.day ?? null }))
  // a place taken off for being late leaves room behind it: fill that room now, with the plan as it stands kept, so
  // the next run finds nothing left to add (the plan must not grow by itself from one run to the next)
  const fill = (o: typeof fresh) => {
    for (let round = 0; round < 4; round++) {
      const again = solve(true, from(o))
      const same = again.placed.size === o.placed.size && [...again.placed].every(([id, p]) => o.placed.get(id)?.day === p.day)
      if (same) break
      o = again
    }
    return o
  }
  let first = kept && worth(fresh) <= worth(kept) * 1.02 ? kept : fresh
  // both of those start from the plan as it stands, and a plan can stand in its own way: a place both couples liked
  // sits on a day that no longer takes it, and every day it could move to is held by what is already there. So the
  // days are also worked out from nothing, as if no plan existed, and that plan is the one when it is clearly better
  if (kept) {
    const scratch = solve(false, units.map((u) => ({ ...u, current: null })))
    if (worth(scratch) > worth(first) * 1.02) first = scratch
  }
  let out = fill(first)
  // and the same question the next run would ask, asked now: starting from this plan, is a plan worked out afresh
  // clearly better? Then that one is the plan, today and not on the next swipe. Nothing to ask when the plan came out
  // as it went in.
  for (let round = 0; round < 2; round++) {
    if (units.every((u) => (u.current ?? null) === (out.placed.get(u.id)?.day ?? null))) break
    const again = solve(false, from(out))
    if (worth(again) <= worth(out) * 1.02) break
    out = fill(again)
  }
  const issues = check(days, units, fixed, out.placed)
  for (const u of units) {
    if (!out.placed.has(u.id)) continue
    if (u.booking) issues.push({ id: u.id, kind: 'booking' })
    // only the couple with the baby liked it: it stays in the plan (it is their choice), said out loud
    if (u.adults && u.couples.some((c) => withBaby.has(c))) issues.push({ id: u.id, kind: 'baby' })
  }
  for (const id of [...only.keys()]) if (!out.placed.has(id)) only.delete(id)
  return { placed: out.placed, unplanned: out.unplanned, issues, away: awayOf(days, units, out.placed), only }
}

/** Is this place in another city than where one of its couples sleeps on that day? A day trip is on purpose: never. */
export function isAway(d: Day, u: Unit) {
  return !u.far && u.couples.some((c) => {
    const p = d.at.get(c)
    return !!p && p.base !== u.base
  })
}

/** The placed places that are away from the day's city, with the city they are in (the app says so on the item). */
export function awayOf(days: Day[], units: Unit[], placed: Map<string, Placed>) {
  const byDay = new Map(days.map((d) => [d.day, d]))
  const away = new Map<string, string>()
  for (const u of units) {
    const p = placed.get(u.id)
    const d = p && byDay.get(p.day)
    if (d && isAway(d, u)) away.set(u.id, u.base)
  }
  return away
}

/**
 * The last word before the plan is written: walk each couple's day in time order and flag what a person couldn't
 * follow: two plans at once (with each other or with something fixed), not enough time to get from one to the next,
 * outside opening hours, or two full meals too close together.
 */
export function check(days: Day[], units: Unit[], fixed: Fixed[], placed: Map<string, Placed>): Issue[] {
  const byId = new Map(units.map((u) => [u.id, u]))
  const issues: Issue[] = []
  const flag = (id: string, kind: Issue['kind']) => {
    if (!issues.some((x) => x.id === id && x.kind === kind)) issues.push({ id, kind })
  }
  for (const d of days) {
    for (const c of d.at.keys()) {
      const mine = [...placed]
        .filter(([id, p]) => p.day === d.day && byId.get(id)!.couples.includes(c))
        .map(([id, p]) => ({ id, u: byId.get(id)!, s: p.start }))
        .sort((x, y) => x.s - y.s)
      const busy = fixed.filter((f) => f.day === d.day && f.start != null && f.couples.includes(c))
      const fixedMeals = fixedMealsOf(fixed, d.day).get(c) ?? []
      let lastMeal: number | null = null
      mine.forEach(({ id, u, s }, i) => {
        const prev = mine[i - 1]
        if (prev && prev.s + prev.u.mins > s) flag(id, 'overlap')
        // ten minutes of slack: the times are rounded to a quarter of an hour
        else if (prev && prev.s + prev.u.mins + ride(pt(prev.u), pt(u)) > s + 10) flag(id, 'tight')
        if (busy.some((f) => s < f.start! + f.mins && s + u.mins > f.start!)) flag(id, 'overlap')
        if ((u.opens != null && s < u.opens) || (u.closes != null && s + u.mins > u.closes)) flag(id, 'hours')
        if (isMeal(u)) {
          if ((lastMeal != null && s - lastMeal < MEAL_GAP) || fixedMeals.some((f) => Math.abs(s - f) < MEAL_GAP)) flag(id, 'meals')
          lastMeal = s
        }
      })
      // a lunch and a dinner every day the hours allow: a slot with no meal in it is said out loud
      const need = mealNeeds(d.at.get(c)!, fixed.filter((f) => f.day === d.day && f.couples.includes(c)))
      for (const slot of ['lunch', 'dinner'] as const) {
        if (!need[slot] || mine.some(({ u, s }) => isMeal(u) && s >= MEAL_AT[slot].from && s <= MEAL_AT[slot].to)) continue
        issues.push({ id: '', kind: slot === 'lunch' ? 'no_lunch' : 'no_dinner', day: d.day, couple: c })
      }
    }
  }
  return issues
}

type Memo = { loads: Map<string, number>; tables: Map<string, Map<string, Placed>> }
function arrange(days: Day[], units: Unit[], fixed: Fixed[], barred: Map<string, Set<number>>, settle = false, memo: Memo = { loads: new Map(), tables: new Map() }) {
  const byDay = new Map(days.map((d) => [d.day, d]))
  const fixedMins = new Map<string, number>()
  const fixedPts = new Map<string, Point[]>()
  for (const f of fixed) {
    for (const c of f.couples) {
      const k = f.day + '|' + c
      fixedMins.set(k, (fixedMins.get(k) ?? 0) + f.mins)
      if (f.point) fixedPts.set(k, [...(fixedPts.get(k) ?? []), f.point])
    }
  }
  const cap = (day: number, c: string) => {
    const p = byDay.get(day)?.at.get(c)
    if (!p) return 0
    // the day they land is a lighter day, whatever hour the flight came in
    return Math.max(0, Math.min((p.cap ?? DAY_CAP) * (p.landing ? LANDING_SHARE : 1), p.end - p.start) - (fixedMins.get(day + '|' + c) ?? 0))
  }
  // the couples in the same city as this couple that day, with hours to spend there (a couple that flies out in the
  // morning is not company for the day: the ones who stay plan it as their own)
  const together = (d: Day, c: string) => [...d.at].filter(([o, p]) => p.base === d.at.get(c)!.base && (o === c || p.end > p.start)).map(([o]) => o)

  const unplanned = new Map<string, 'closed' | 'no_day' | 'full'>()
  const options = new Map<string, number[]>()
  for (const u of units) {
    let anyDay = false
    const ok = days.filter((d) => {
      // a place both couples liked may be planned for the couple that is there on a day the other is not in the country
      // (only when no day with everyone can take it: see below)
      const here = whoOn(u, d)
      const there = here.length > 0 && here.every((c) => {
        const p = d.at.get(c)!
        // a day trip needs a day that starts in the morning, with time for the ride there and back
        if (u.far) return !!u.point && km(p.hotel, u.point) <= 150 && p.start <= TRIP_START && p.end - p.start >= 2 * ride(p.hotel, u.point) + u.mins
        // on the landing day: places more than 40 min from the hotel are saved for a later day
        const eligible = p.base === u.base || (!!u.point && km(p.hotel, u.point) <= NEAR_KM)
        return eligible && !(p.landing && u.point && ride(p.hotel, u.point) > 40)
      })
      if (!there) return false
      anyDay = true
      if (u.closedWeekdays.includes(d.weekday) || u.closedDates.includes(d.date) || barred.get(u.id)?.has(d.day)) return false
      if (u.openDates.length && !u.openDates.includes(d.date)) return false
      // open for the whole visit inside the hours everyone has that day (and in daylight, for a place out in the open)
      const start = Math.max(...here.map((c) => startFor(u, d.at.get(c)!)), u.opens ?? 0)
      const end = Math.min(...here.map((c) => endFor(u, d.at.get(c)!)), closesOf(u, d))
      return end - start >= u.mins
    })
    // the days with everyone come first: a day without one of its couples only when there is no day with them all
    const all = ok.filter((d) => whoOn(u, d).length === u.couples.length)
    if (ok.length) options.set(u.id, (all.length ? all : ok).map((d) => d.day))
    else unplanned.set(u.id, anyDay ? 'closed' : 'no_day')
  }
  const live = units.filter((u) => options.has(u.id))
  const unitById = new Map(units.map((u) => [u.id, u]))

  // state: the day of each unit (or null) and the units on each day/couple
  const at = new Map<string, number | null>()
  const groups = new Map<string, Set<string>>()
  const mealCands = new Map<string, Unit[]>()
  for (const u of live) if (isMeal(u)) for (const day of options.get(u.id)!) for (const c of whoOn(u, byDay.get(day)!)) mealCands.set(day + '|' + c, [...(mealCands.get(day + '|' + c) ?? []), u])
  const group = (day: number, c: string) => {
    const k = day + '|' + c
    let g = groups.get(k)
    if (!g) groups.set(k, (g = new Set()))
    return g
  }
  // the day's plans plus the rides between them: from the hotel to the nearest place, on to the nearest after it, and
  // back (a day in three corners of the city is a longer day than one in a single neighbourhood)
  const loads = memo.loads
  const load = (day: number, c: string, extra?: Unit, rest = false) => {
    const us = [...group(day, c)].map((id) => unitById.get(id)!)
    if (extra) us.push(extra)
    if (!us.length) return 0
    const key = (rest ? 'r' : '') + day + '|' + c + '|' + us.map((u) => u.id).sort().join(',')
    const hit = loads.get(key)
    if (hit != null) return hit
    const hotel = byDay.get(day)!.at.get(c)!.hotel
    let m = 0
    let here: Point = hotel
    const left = [...us]
    while (left.length) {
      let best = 0
      for (let i = 1; i < left.length; i++) if (ride(here, pt(left[i])) < ride(here, pt(left[best]))) best = i
      const [u] = left.splice(best, 1)
      m += (rest && isMeal(u) ? Math.min(u.mins, MEAL_PACE) : u.mins) + HOP + ride(here, pt(u))
      here = pt(u) ?? here
    }
    const back = ride(here, hotel)
    m += us.some((u) => u.far) ? back : Math.max(0, back - HOME_FREE)
    loads.set(key, m)
    return m
  }
  const apartLoad = (day: number, c: string) => {
    const d = byDay.get(day)!
    const others = together(d, c).length
    let m = 0
    for (const id of group(day, c)) {
      const u = unitById.get(id)!
      // a meal is not time apart: each couple eats somewhere
      if (u.couples.length < others && !isMeal(u)) m += u.mins
    }
    return m
  }
  // meals: the slots each couple needs filled on each day, the meals that could fill them, and who has which now
  const needOf = new Map<string, { lunch: boolean; dinner: boolean }>()
  for (const d of days) for (const [c, p] of d.at) needOf.set(d.day + '|' + c, mealNeeds(p, fixed.filter((f) => f.day === d.day && f.couples.includes(c))))
  const slotsOn = (day: number, extra?: Unit) => {
    const d = byDay.get(day)!
    const meals = new Map<string, Unit>()
    for (const c of d.at.keys()) for (const id of group(day, c)) if (isMeal(unitById.get(id)!)) meals.set(id, unitById.get(id)!)
    if (extra) meals.set(extra.id, extra)
    return mealSlots(d, [...meals.values()], fixed)
  }
  /** The needed meal slots of a couple's day that nothing fills: all of them, or only those a meal still unplaced could. */
  const mealGaps = (day: number, c: string, fillable: boolean, extra?: Unit) => {
    const need = needOf.get(day + '|' + c)
    if (!need || (!need.lunch && !need.dinner)) return 0
    const slots = slotsOn(day, extra)
    const d = byDay.get(day)!
    let n = 0
    for (const s of ['lunch', 'dinner'] as const) {
      if (!need[s]) continue
      if ([...slots].some(([id, sl]) => sl === s && unitById.get(id)!.couples.includes(c))) continue
      if (fillable && !(mealCands.get(day + '|' + c) ?? []).some((w) => w !== extra && at.get(w.id) == null && slotsFor(w, d).includes(s))) continue
      n++
    }
    return n
  }

  /** Cost of one couple's day: spread around its middle (km), crowding, and a long day weighs more than two short ones. */
  const groupCost = (day: number, c: string) => {
    const ids = [...group(day, c)]
    // a missing lunch or dinner costs the day, an empty day too
    const noMeal = mealGaps(day, c, false) * MEAL_MISS
    if (!ids.length) return noMeal
    const d = byDay.get(day)!
    const pres = d.at.get(c)!
    const pts = (far: boolean) =>
      ids.map((id) => unitById.get(id)!).filter((u) => u.far === far && pt(u)).map((u) => u.point!)
    const fx = fixedPts.get(day + '|' + c) ?? []
    // the hotel pulls the middle a little: a day near where you sleep beats one across town
    const spreadOf = (ps: Point[], around: Point[], pull: number) => {
      if (!ps.length) return 0
      const all = [...ps, ...around]
      const w = all.length + pull
      const mid = {
        lat: (all.reduce((s, p) => s + p.lat, 0) + pres.hotel.lat * pull) / w,
        lng: (all.reduce((s, p) => s + p.lng, 0) + pres.hotel.lng * pull) / w,
      }
      return ps.reduce((s, p) => s + km(p, mid), 0)
    }
    // a day trip's places are measured among themselves; its ride is already in the day's load
    const spread = spreadOf(pts(false), fx, 0.5) + spreadOf(pts(true), [], 0)
    const hours = load(day, c) / 60
    const capH = Math.max(1, cap(day, c) / 60)
    const crowd = Math.max(0, hours - capH * 0.8) * 4
    // going into another city is a trip of its own: its places come on one day, not one a day
    const awayDay = ids.some((id) => !unitById.get(id)!.far && pres.base !== unitById.get(id)!.base) ? AWAY_DAY : 0
    // a place whose point is not known adds nothing to the spread it can't be measured in: it is charged a usual
    // one instead, so of two places alike the one that is known to be near is the one planned
    const unknown = ids.filter((id) => unitById.get(id)!.approx).length * UNKNOWN_KM
    return spread + unknown + crowd + hours * hours * 0.35 + noMeal + awayDay
  }
  const unitCost = (u: Unit, day: number | null) => {
    // leaving a place out costs its priority, more for a bigger one: a two-hour shrine is more of the trip than a
    // forty-minute café of the same priority, which the day would otherwise always pick for fitting more in
    // a meal left out costs more than a shop or a sight of the same priority: people eat every day
    // and a place two couples liked is two couples' loss (its hours are counted on each couple's day too)
    if (day == null) return weightOf(u) * u.priority * 14 * (0.5 + (isMeal(u) ? Math.max(u.mins, 150) : u.mins) / 120)
    let cost = 0
    const d = byDay.get(day)!
    if (isAway(d, u)) {
      // the away penalty grows with the ride, so nearer parts of the next city come before far ones
      const awayPres = u.couples.map((c) => d.at.get(c)).find((p) => p && p.base !== u.base)
      cost += AWAY_COST + (awayPres && u.point ? ride(awayPres.hotel, u.point) / 30 : 0)
    }
    // a couple's own place fits best on a day the other couple is elsewhere
    const here = whoOn(u, d)
    if (here.length < together(d, here[0]).length && !isMeal(u)) cost += 2
    // a day one of its couples is not in the country: only when no day with everyone will do
    cost += (u.couples.length - here.length) * ABSENT_COST
    if (u.current != null && u.current !== day) cost += 1.5
    // a day that leaves little of the place's opening hours (a market that closes at 14:30 on an arrival day): only
    // if no roomier day will do
    const from = Math.max(u.opens ?? 0, ...here.map((c) => startFor(u, d.at.get(c)!)))
    if (closesOf(u, d) - from < u.mins + 90) cost += 2
    return cost
  }
  // keep: a place already on that day in the plan as it stands; no room is held back from it for a meal still to come
  // rest: a meal counts as the sit-down it is (MEAL_PACE) toward the day's pace: for the plan as it stands, and for a
  // place going into a day's free hours
  const fits = (u: Unit, day: number, keep = false, rest = keep) => {
    // a meal needs a slot of its own for each of its people: no two lunches, no two dinners
    if (isMeal(u) && [...slotsOn(day, u).values()].some((s) => s == null)) return false
    return whoOn(u, byDay.get(day)!).every((c) => {
      const d = byDay.get(day)!
      // room stays for the lunch and the dinner still to come, while a meal that could fill them waits
      const room = keep ? 0 : mealGaps(day, c, true, isMeal(u) ? u : undefined) * MEAL_ROOM
      if (load(day, c, u, rest) + room > cap(day, c) + 15) return false
      if (!isMeal(u) && u.couples.length < together(d, c).length && apartLoad(day, c) + u.mins > APART_CAP) return false
      let same = 0
      for (const id of group(day, c)) {
        const v = unitById.get(id)!
        if (kindOf(v) === kindOf(u)) same++
        // a day trip fills the day: no places back in town, and its places sit near each other
        if (u.far !== v.far) return false
        if (u.far && v.far && u.point && v.point && km(u.point, v.point) > TRIP_SPREAD) return false
      }
      return same < (PER_DAY[kindOf(u)] ?? 99)
    })
  }
  // an away place waits while a place of the day's own city that could take the room is still unplaced: the city's
  // own places are placed first, the other city's only fill what they leave (or a day with none of its own)
  const blockedAway = (u: Unit, day: number) => {
    const d = byDay.get(day)!
    if (!isAway(d, u)) return false
    return live.some(
      (w) =>
        w !== u &&
        at.get(w.id) == null &&
        !isAway(d, w) &&
        !w.far &&
        w.couples.some((c) => u.couples.includes(c)) &&
        options.get(w.id)!.includes(day) &&
        fits(w, day),
    )
  }
  const put = (u: Unit, day: number | null) => {
    const was = at.get(u.id)
    if (was != null) for (const c of whoOn(u, byDay.get(was)!)) group(was, c).delete(u.id)
    at.set(u.id, day)
    if (day != null) for (const c of whoOn(u, byDay.get(day)!)) group(day, c).add(u.id)
  }
  // the change in total cost if u moved to day (and, optionally, evicted went off the plan)
  const delta = (u: Unit, day: number | null, evicted: Unit[] = []) => {
    const was = at.get(u.id) ?? null
    const touched = new Set<string>()
    for (const c of u.couples) {
      if (was != null) touched.add(was + '|' + c)
      if (day != null) touched.add(day + '|' + c)
    }
    const evDays = evicted.map((v) => at.get(v.id) ?? null)
    evicted.forEach((v, i) => {
      for (const c of v.couples) touched.add(evDays[i] + '|' + c)
    })
    const cost = () =>
      [...touched].reduce((s, k) => {
        const [dd, c] = k.split('|')
        return s + groupCost(Number(dd), c)
      }, 0)
    const before = cost() + unitCost(u, was) + evicted.reduce((s, v, i) => s + unitCost(v, evDays[i]), 0)
    for (const v of evicted) put(v, null)
    put(u, day)
    const after = cost() + unitCost(u, day) + evicted.reduce((s, v) => s + unitCost(v, null), 0)
    put(u, was)
    evicted.forEach((v, i) => put(v, evDays[i]))
    return after - before
  }

  // the plan as it stands first: each place stays on the day it is on while that day still takes it, so running the
  // planner again on its own plan changes nothing (it runs after every swipe; the days must not shift each time)
  // meals first, the ones more people share before a couple's own (a shared dinner fills everyone's slot; a couple's own
  // meal placed first would leave the others with none), then by how much each is wanted
  const order = [...live].sort(
    (a, b) =>
      Number(isMeal(b)) - Number(isMeal(a)) ||
      (isMeal(a) ? b.couples.length - a.couples.length : 0) ||
      b.priority - a.priority ||
      // of two alike, the one whose point is known is placed first
      Number(!!a.approx) - Number(!!b.approx) ||
      options.get(a.id)!.length - options.get(b.id)!.length,
  )
  for (const u of order) at.set(u.id, null)
  for (const u of order) if (u.current != null && options.get(u.id)!.includes(u.current) && fits(u, u.current, true)) put(u, u.current)
  // then the rest, greedy: the most wanted first, each where it adds least. First round: places of another city wait
  // while the day's own city has places that could take the room; second round: they fill what is left
  const greedy = (round: number) => {
    for (const u of order) {
      if (at.get(u.id) != null) continue
      let best: number | null = null
      let bestD = 0
      for (const day of options.get(u.id)!) {
        if (!fits(u, day) || (round === 0 && blockedAway(u, day))) continue
        const dl = delta(u, day)
        if (dl < bestD) {
          bestD = dl
          best = day
        }
      }
      put(u, best)
    }
  }
  // then improve: move single places, or swap a place in for a less wanted one on a full day (not when settling:
  // then the plan stays as it stands and only new places are added). homeOnly: no move onto a day in another city
  // than the place's own, so the own city's places settle before the other city's fill what they leave
  const improve = (homeOnly: boolean) => {
    for (let pass = 0; !settle && pass < 40; pass++) {
      let improved = false
      for (const u of order) {
        const was = at.get(u.id) ?? null
        let best: { day: number | null; ev?: Unit[]; dl: number } = { day: was, dl: -0.01 }
        const tries: (number | null)[] = [null, ...options.get(u.id)!]
        for (const day of tries) {
          if (day === was) continue
          if (homeOnly && day != null && isAway(byDay.get(day)!, u)) continue
          // a place on a day in its own city stays there once the own city's places are settled: the other city's
          // places that arrived since must not push it off (a day crowded only by what fills its leftover room)
          // (a meal may still go: a day in reach of it with no lunch or dinner needs it more than a day that has one)
          if (!homeOnly && was != null && !isAway(byDay.get(was)!, u) && !isMeal(u)) continue
          if (day == null || fitsWithout(u, day, [])) {
            if (day != null && blockedAway(u, day)) continue
            const dl = delta(u, day)
            if (dl < best.dl) best = { day, dl }
          } else {
            // the day is full: try taking off one less wanted place to make room
            const here = whoOn(u, byDay.get(day)!)
            const may = (v: Unit) => {
              // a place of the day's own city may take the room of a higher one from another city, never the reverse
              const awayV = isAway(byDay.get(day)!, v)
              const awayU = isAway(byDay.get(day)!, u)
              if (awayU && !awayV) return false
              // a meal is not taken off for a sight or a shop; a meal may take the room of one a little above it
              if (isMeal(v) && !isMeal(u)) return false
              const above = isMeal(u) && !isMeal(v) ? 1 : 0
              // what both couples liked may take the room of what one of them liked, whatever its stars (the cost
              // of leaving each out, which counts both, still has to say the day is better for it)
              const fewer = v.couples.length < u.couples.length
              return !(v.priority > u.priority + above && !(awayV && !awayU) && !fewer)
            }
            let one = false
            for (const c of here) {
              // a copy: trying a swap takes places off the day and puts them back, which would re-run a live Set
              for (const id of [...group(day, c)]) {
                const v = unitById.get(id)!
                if (!may(v) || !fitsWithout(u, day, [v])) continue
                one = true
                const dl = delta(u, day, [v])
                if (dl < best.dl) best = { day, ev: [v], dl }
              }
            }
            // a place two couples liked on a day each couple has filled with its own: no one place makes the room, so
            // one own place of each couple is tried together (what both liked comes before what one of them liked)
            if (!one && here.length === 2) {
              const own = (c: string) => [...group(day, c)].map((id) => unitById.get(id)!).filter((v) => whoOn(v, byDay.get(day)!).length === 1 && may(v))
              for (const v of own(here[0])) {
                for (const w of own(here[1])) {
                  if (!fitsWithout(u, day, [v, w])) continue
                  const dl = delta(u, day, [v, w])
                  if (dl < best.dl) best = { day, ev: [v, w], dl }
                }
              }
            }
          }
        }
        if (best.day !== was) {
          for (const v of best.ev ?? []) put(v, null)
          put(u, best.day)
          improved = true
        }
      }
      if (!improved) break
    }
  }
  greedy(0)
  improve(true)
  greedy(1)
  improve(false)

  // everything the plan costs as it stands
  const total = () => {
    let s = 0
    for (const d of days) for (const c of d.at.keys()) s += groupCost(d.day, c)
    for (const u of live) s += unitCost(u, at.get(u.id) ?? null)
    return s
  }
  // day trips left out: places are placed one at a time, and one far place rarely beats a day in town, so a group of
  // far places near each other is tried as a whole: it takes a day (the town places on it go where they fit on other
  // days) when the plan as a whole is better for it
  const tryTrips = () => {
    const left = order.filter((u) => u.far && u.point && at.get(u.id) == null)
    const clusters: Unit[][] = []
    for (const u of left) {
      const g = clusters.find((cl) => cl.every((v) => km(v.point!, u.point!) <= TRIP_SPREAD))
      if (g) g.push(u)
      else clusters.push([u])
    }
    const value = (cl: Unit[]) => cl.reduce((s, u) => s + u.priority * u.mins, 0)
    for (const cl of clusters.sort((a, b) => value(b) - value(a))) {
      if (cl.length < 2) continue
      let best: { day: number; cost: number } | null = null
      const base = total()
      const attempt = (day: number, keep: boolean) => {
        const d = byDay.get(day)!
        const cs = [...new Set(cl.flatMap((u) => whoOn(u, d)))]
        const snap = new Map(live.map((u) => [u.id, at.get(u.id) ?? null]))
        const out = live.filter((u) => at.get(u.id) === day && whoOn(u, d).some((c) => cs.includes(c)))
        // a day that already holds a day trip is not taken
        if (out.some((u) => u.far)) return
        for (const u of out) put(u, null)
        for (const u of cl) if (options.get(u.id)!.includes(day) && fits(u, day)) put(u, day)
        const on = cl.filter((u) => at.get(u.id) === day)
        if (on.length >= 2) {
          for (const u of order) {
            if (!out.includes(u)) continue
            let to: number | null = null
            let toD = 0
            for (const x of options.get(u.id)!) {
              if (x === day || !fits(u, x)) continue
              const dl = delta(u, x)
              if (dl < toD) {
                toD = dl
                to = x
              }
            }
            put(u, to)
          }
          const cost = total()
          if (cost < base - 0.01 && (!best || cost < best.cost)) best = { day, cost }
          if (keep) return
        }
        for (const u of live) if ((at.get(u.id) ?? null) !== snap.get(u.id)) put(u, null)
        for (const u of live) if (snap.get(u.id) != null && at.get(u.id) == null) put(u, snap.get(u.id)!)
      }
      for (const day of new Set(cl.flatMap((u) => options.get(u.id)!))) attempt(day, false)
      if (best) attempt((best as { day: number }).day, true)
    }
  }
  if (!settle) tryTrips()
  // a couple's day in another city than they sleep in, with no lunch or no dinner: places are moved one at a time,
  // so the day never moves as a whole to the day a meal they liked is open there (a market closed on Sunday, the day
  // put on Sunday). Tried here: the whole day on another of their days in the same hotel, with the meals that can
  // then join it, kept when the plan as a whole is better for it
  const mealDay = () => {
    for (const d of days) {
      for (const [c, p] of d.at) {
        const mine = [...group(d.day, c)].map((id) => unitById.get(id)!)
        if (!mine.some((u) => isAway(d, u)) || !mine.every((u) => whoOn(u, d).length === 1) || !mealGaps(d.day, c, false)) continue
        for (const t of days) {
          const q = t.at.get(c)
          if (t.day === d.day || !q || q.base !== p.base) continue
          const snap = new Map(live.map((u) => [u.id, at.get(u.id) ?? null]))
          const base = total()
          for (const u of mine) put(u, null)
          let ok = true
          for (const u of mine) {
            if (options.get(u.id)!.includes(t.day) && fits(u, t.day)) put(u, t.day)
            else ok = false
          }
          if (ok) {
            for (const m of order) {
              if (!isMeal(m) || at.get(m.id) === t.day || !options.get(m.id)!.includes(t.day) || whoOn(m, t).length !== m.couples.length) continue
              if (fitsWithout(m, t.day, []) && delta(m, t.day) < 0) put(m, t.day)
            }
          }
          if (ok && total() < base - 0.01) break
          for (const u of live) if ((at.get(u.id) ?? null) !== snap.get(u.id)) put(u, null)
          for (const u of live) if (snap.get(u.id) != null && at.get(u.id) == null) put(u, snap.get(u.id)!)
        }
      }
    }
  }
  // a day trip that is not worth its ride (a fifteen-minute stall two hours away, alone) comes off, and the day goes
  // back to the places in town
  const thin = new Set<string>()
  // the ones with an hour of places but a long ride for it: they come off only if the day then goes to something else
  const maybe = new Map<string, number>()
  for (const d of days) {
    for (const [c, p] of d.at) {
      const far = [...group(d.day, c)].map((id) => unitById.get(id)!).filter((u) => u.far)
      if (!far.length) continue
      const mins = far.reduce((s, u) => s + u.mins, 0)
      const there = Math.min(...far.map((u) => ride(p.hotel, u.point)))
      // one place out there is a day trip only when it is most of a day by itself (a castle); an hour and a half at a
      // lake and the ride back is not what the day is for
      const content = far.length >= 2 || mins >= TRIP_ALONE
      if (content && mins >= TRIP_MIN && mins >= TRIP_SHARE * 2 * there) continue
      for (const u of far) {
        thin.add(u.id)
        if (content && mins >= TRIP_MIN) maybe.set(u.id, d.day)
      }
    }
  }
  if (thin.size) {
    for (const id of thin) put(unitById.get(id)!, null)
    for (const u of order) {
      // only places in town: a day trip put here now would not have been asked whether it is worth its ride
      if (u.far || at.get(u.id) != null) continue
      let best: number | null = null
      let bestD = 0
      for (const day of options.get(u.id)!) {
        if (!fits(u, day)) continue
        const dl = delta(u, day)
        if (dl < bestD) {
          bestD = dl
          best = day
        }
      }
      put(u, best)
    }
    // nothing else took the day: a long ride for an hour or two there is still better than a day with nothing
    for (const [id, day] of maybe) {
      const u = unitById.get(id)!
      if (whoOn(u, byDay.get(day)!).every((c) => [...group(day, c)].every((x) => maybe.get(x) === day)) && fits(u, day)) {
        put(u, day)
        thin.delete(id)
      }
    }
  }
  if (!settle) mealDay()

  function fitsWithout(u: Unit, day: number, vs: Unit[]) {
    const vDays = vs.map((v) => at.get(v.id) ?? null)
    const uDay = at.get(u.id) ?? null
    for (const v of vs) put(v, null)
    put(u, null)
    const ok = fits(u, day)
    put(u, uDay)
    vs.forEach((v, i) => put(v, vDays[i]))
    return ok
  }

  // a day's times, worked out once for each set of places the day is tried with
  const tables = memo.tables
  const timesOf = (day: number) => {
    const ids = live.filter((u) => at.get(u.id) === day)
    if (!ids.length) return new Map<string, Placed>()
    const key = day + '|' + ids.map((u) => u.id).join(',')
    let t = tables.get(key)
    if (!t) {
      const d = byDay.get(day)!
      const fx = fixed.filter((f) => f.day === day)
      t = timetable(d, ids, fx)
      // the order that costs least has a ride back across town in it: the day is timed again with that ride costing
      // more than a place reached past its hour, and that order is the day's when it has fewer such rides, nothing
      // more after closing and no meal out of its slot (a morning café in the afternoon, not the same streets twice)
      const sum = (x: Map<string, Placed>) => {
        let back = 0
        let late = 0
        let meals = 0
        for (const c of d.at.keys()) {
          const line = ids.filter((u) => u.couples.includes(c) && pt(u)).sort((a, b) => x.get(a.id)!.start - x.get(b.id)!.start)
          back += outAndBack(line.map((u) => u.point!))
        }
        for (const u of ids) {
          const p = x.get(u.id)!
          if (p.late) late++
          if (isMeal(u) && (['lunch', 'dinner'] as const).some((s) => p.start >= MEAL_AT[s].from && p.start <= MEAL_AT[s].to)) meals++
        }
        return { back, late, meals }
      }
      const a = sum(t)
      if (a.back) {
        const hard = timetable(d, ids, fx, BACK_HARD)
        const b = sum(hard)
        if (b.back < a.back && b.late <= a.late && b.meals >= a.meals) t = hard
      }
      tables.set(key, t)
    }
    return t
  }
  const missedOn = (day: number) => {
    let late = 0
    let missed = 0
    for (const p of timesOf(day).values()) {
      if (p.late) late++
      if (p.missed) missed++
    }
    return { late, missed }
  }

  // repair: a place reached hours past its hour moves on its own to a day where it is on time, when that day has
  // room and neither day ends up with more places late or past their hour (nothing else moves, nothing drops)
  for (let round = 0; !settle && round < 2; round++) {
    let moved = false
    for (const u of order) {
      const was = at.get(u.id)
      if (was == null || !timesOf(was).get(u.id)?.missed) continue
      const before = missedOn(was)
      for (const day of options.get(u.id)!) {
        if (day === was || !fitsWithout(u, day, [])) continue
        const there = missedOn(day)
        put(u, day)
        const p = timesOf(day).get(u.id)!
        const a = missedOn(was)
        const b = missedOn(day)
        if (!p.missed && !p.late && a.late <= before.late && b.late <= there.late && a.missed + b.missed < before.missed + there.missed) {
          moved = true
          break
        }
        put(u, was)
      }
    }
    if (!moved) break
  }

  // a couple with no lunch on a day that has a long morning meal they share with the other couple (a market's food
  // crawl), left a morning stop because the other couple has a lunch of their own that day: what they share is the
  // lunch of both, and the one couple's own lunch goes to another day that takes it, or waits (a meal two couples
  // share fills two lunches; nobody eats twice while the others have none)
  const lunchOf = (day: number, c: string) => [...slotsOn(day)].find(([id, sl]) => sl === 'lunch' && unitById.get(id)!.couples.includes(c))?.[0]
  const shareLunch = (d: Day, c: string) => {
    const slots = slotsOn(d.day)
    const shared = [...slots].find(([id, sl]) => sl === 'breakfast' && unitById.get(id)!.couples.includes(c) && slotsFor(unitById.get(id)!, d).includes('lunch'))
    if (!shared) return false
    const m = unitById.get(shared[0])!
    const inWay = [...slots].filter(([id, sl]) => sl === 'lunch' && unitById.get(id)!.couples.some((x) => m.couples.includes(x))).map(([id]) => unitById.get(id)!)
    if (inWay.length !== 1 || inWay[0].couples.length >= m.couples.length) return false
    const own = inWay[0]
    put(own, null)
    if (slotsOn(d.day).get(m.id) !== 'lunch') {
      put(own, d.day)
      return false
    }
    let best: number | null = null
    let bestD = Infinity
    for (const day of options.get(own.id)!) {
      if (day === d.day || !fits(own, day, false, true)) continue
      const dl = delta(own, day)
      if (dl < bestD) {
        bestD = dl
        best = day
      }
    }
    if (best != null) put(own, best)
    return true
  }
  for (const d of days) {
    for (const c of d.at.keys()) {
      if (!needOf.get(d.day + '|' + c)?.lunch || lunchOf(d.day, c)) continue
      if (shareLunch(d, c)) continue
      // or their lunch is on another day that has such a shared morning meal: the lunch comes here, and the shared
      // meal is their lunch there
      for (const t of days) {
        const id = t.day === d.day || !t.at.has(c) ? undefined : lunchOf(t.day, c)
        const l = id ? unitById.get(id)! : null
        if (!l || l.couples.length > 1 || !options.get(l.id)!.includes(d.day) || !fitsWithout(l, d.day, [])) continue
        put(l, d.day)
        if (lunchOf(d.day, c) === l.id && shareLunch(t, c)) break
        put(l, t.day)
      }
    }
  }

  // free hours: a place left out goes into a day that has the hours for it, when the day's times say so: it is on
  // time there, nothing else on the day turns late or leaves its hour, no meal leaves its slot, and nobody goes back
  // to a part of town they had left. The day's pace still holds, with a meal counted as the sit-down it is
  const inSlot = (start: number) => (['lunch', 'dinner'] as const).some((s) => start >= MEAL_AT[s].from && start <= MEAL_AT[s].to)
  const dayState = (day: number) => {
    const d = byDay.get(day)!
    const t = timesOf(day)
    let bad = 0
    let late = 0
    let meals = 0
    let back = 0
    for (const [id, p] of t) {
      if (p.late || p.missed) bad++
      if (p.late) late++
      const u = unitById.get(id)!
      if (isMeal(u) && inSlot(p.start)) meals += whoOn(u, d).length
    }
    for (const c of d.at.keys()) {
      const line = [...t].filter(([id]) => unitById.get(id)!.couples.includes(c) && pt(unitById.get(id)!)).sort((a, b) => a[1].start - b[1].start)
      back += outAndBack(line.map(([id]) => unitById.get(id)!.point!))
    }
    return { bad, late, meals, back }
  }
  // a ride out and back: the day's line leaves a part of town and comes back to it (a tea house 12 km south between a
  // lunch and a dinner in the centre; a street next to the first stop, planned after a stop across town). No day keeps
  // one. The stops that make it: the ones out there (far) and the ones near each other on either side of them (near).
  // The day's lunch and dinner are not among them: a meal stays (its slot decides where it goes); a breakfast may go.
  // Tried in this order, until the day has no such ride:
  // 1. one of them moves on its own to a day that takes it with no such ride there, nothing late, no meal out of its
  //    slot and no more places past their hour than before: the place of the fewest people first, the far one before
  //    the two near each other
  // 2. one of them changes places with a stop of another day (a department store in the north for a shopping street
  //    next to the lunch), on the same terms for both days
  // 3. the fewest, least wanted of them wait: what one couple liked before what everyone there shares (it counts
  //    once, not for each couple), a short stop before a long one. The hours they leave are filled below
  const lineOf = (day: number, c: string) =>
    [...timesOf(day)]
      .filter(([id]) => unitById.get(id)!.couples.includes(c) && pt(unitById.get(id)!))
      .sort((a, b) => a[1].start - b[1].start)
      .map(([id]) => unitById.get(id)!)
  const detours = (day: number) => {
    const far = new Set<Unit>()
    const near = new Set<Unit>()
    let knot = 0
    for (const c of byDay.get(day)!.at.keys()) {
      const line = lineOf(day, c)
      const mine = new Set<Unit>()
      for (let i = 2; i < line.length; i++)
        for (let j = 0; j < i - 1; j++) {
          if (km(line[i].point!, line[j].point!) > BACK_NEAR) continue
          const out = line.slice(j + 1, i).filter((q) => km(q.point!, line[j].point!) >= BACK_FAR)
          if (!out.length) continue
          for (const q of out) far.add(q), mine.add(q)
          near.add(line[i]).add(line[j])
          mine.add(line[i]).add(line[j])
        }
      knot += mine.size
    }
    return { far, near, knot }
  }
  // how tied up a day is: the rides back, then how many stops are part of one (a day with one of two far stops gone
  // is on its way, though the ride back is still there)
  const ridesOf = (day: number) => ({ ...dayState(day), knot: detours(day).knot })
  type Rides = ReturnType<typeof ridesOf>
  const eased = (a: Rides, b: Rides) => a.back < b.back || (a.back === b.back && a.knot < b.knot)
  const kept = (a: Rides, b: Rides) => a.back < b.back || (a.back === b.back && a.knot <= b.knot)
  const isSlotMeal = (u: Unit, day: number) => isMeal(u) && inSlot(timesOf(day).get(u.id)?.start ?? -1)
  const lossOf = (u: Unit) => unitCost(u, null)
  for (const d of days) {
    for (let round = 0; round < 8; round++) {
      const here = ridesOf(d.day)
      if (!here.back) break
      const { far, near } = detours(d.day)
      const cands = [...far, ...[...near].filter((u) => !far.has(u))]
        .filter((u) => !isSlotMeal(u, d.day))
        .sort((a, b) => whoOn(a, d).length - whoOn(b, d).length || Number(far.has(b)) - Number(far.has(a)) || a.priority - b.priority || (a.id < b.id ? -1 : 1))
      const others = (u: Unit) => options.get(u.id)!.filter((day) => day !== d.day && !(isAway(byDay.get(day)!, u) && blockedAway(u, day)))
      // 1. one moves; off the day first, to see that the ride really is its doing
      let done = false
      for (const u of cands) {
        put(u, null)
        const left = ridesOf(d.day)
        let best: number | null = null
        let bestD = Infinity
        if (eased(left, here) && left.late <= here.late && left.meals >= here.meals) {
          for (const day of others(u)) {
            if (!fits(u, day, false, true)) continue
            const before = ridesOf(day)
            const dl = delta(u, day)
            put(u, day)
            const p = timesOf(day).get(u.id)!
            const after = ridesOf(day)
            put(u, null)
            if (p.late || after.late > before.late || !kept(after, before) || after.meals < before.meals || left.bad + after.bad > here.bad + before.bad) continue
            if (dl < bestD) {
              bestD = dl
              best = day
            }
          }
        }
        put(u, best ?? d.day)
        if (best != null) {
          done = true
          break
        }
      }
      if (done) continue
      // 2. one changes places with a stop of another day
      let swap: { u: Unit; v: Unit; day: number; cost: number } | null = null
      for (const u of cands) {
        if (u.far) continue
        for (const day of others(u)) {
          const before = ridesOf(day)
          const there = live.filter((v) => at.get(v.id) === day && !v.far && options.get(v.id)!.includes(d.day) && !isSlotMeal(v, day))
          for (const v of there) {
            put(u, null)
            put(v, null)
            let ok = fits(u, day, false, true)
            if (ok) {
              put(u, day)
              ok = fits(v, d.day, false, true)
            }
            if (ok) {
              put(v, d.day)
              const a = ridesOf(d.day)
              const b = ridesOf(day)
              ok =
                eased(a, here) && kept(b, before) && a.late <= here.late && b.late <= before.late && a.meals >= here.meals && b.meals >= before.meals && a.bad + b.bad <= here.bad + before.bad
              if (ok) {
                const cost = total()
                if (!swap || cost < swap.cost) swap = { u, v, day, cost }
              }
            }
            put(u, d.day)
            put(v, day)
          }
        }
        if (swap) break
      }
      if (swap) {
        put(swap.u, swap.day)
        put(swap.v, d.day)
        continue
      }
      // 3. the fewest, least wanted that undo the ride wait: one, two or three of them
      let drop: { us: Unit[]; loss: number } | null = null
      let part: { us: Unit[]; left: Rides; loss: number } | null = null
      const attempt = (us: Unit[]) => {
        for (const u of us) put(u, null)
        const left = ridesOf(d.day)
        for (const u of us) put(u, d.day)
        if (left.late > here.late || left.meals < here.meals) return
        const loss = us.reduce((s, u) => s + lossOf(u), 0)
        if (!left.back && (!drop || loss < drop.loss)) drop = { us, loss }
        if (us.length === 1 && eased(left, here) && (!part || eased(left, part.left) || (!eased(part.left, left) && loss < part.loss))) part = { us, left, loss }
      }
      for (let i = 0; i < cands.length; i++) {
        attempt([cands[i]])
        for (let j = i + 1; j < cands.length; j++) {
          attempt([cands[i], cands[j]])
          for (let k = j + 1; k < cands.length; k++) attempt([cands[i], cands[j], cands[k]])
        }
      }
      const goes = (drop as { us: Unit[] } | null)?.us ?? (part as { us: Unit[] } | null)?.us
      if (!goes) break
      for (const u of goes) put(u, null)
    }
  }

  // meals: people eat every day. A lunch or dinner the day's hours cover is not left empty while a meal place they
  // liked in that city could take it: a stop that is not a meal gives way before a meal does (the day's pace holds
  // for sights and shops, not against a lunch).
  // eating: the needed slots of the day that a meal is timed in, and the couples that need a meal and have none
  const eating = (day: number) => {
    const d = byDay.get(day)!
    const t = timesOf(day)
    let filled = 0
    let none = 0
    const open: { c: string; s: 'lunch' | 'dinner' }[] = []
    for (const c of d.at.keys()) {
      const need = needOf.get(day + '|' + c)
      if (!need || (!need.lunch && !need.dinner)) continue
      const has = (s: 'lunch' | 'dinner') =>
        [...t].some(([id, p]) => isMeal(unitById.get(id)!) && unitById.get(id)!.couples.includes(c) && p.start >= MEAL_AT[s].from && p.start <= MEAL_AT[s].to)
      for (const s of ['lunch', 'dinner'] as const) {
        if (!need[s]) continue
        if (has(s)) filled++
        else open.push({ c, s })
      }
      if (!has('lunch') && !has('dinner')) none++
    }
    return { filled, none, open, ...ridesOf(day) }
  }
  const stopsOf = (day: number) => live.filter((v) => at.get(v.id) === day && !isMeal(v) && !v.far)
  const sets = (vs: Unit[], n: number): Unit[][] => (n === 0 ? [[]] : n === 1 ? vs.map((v) => [v]) : vs.flatMap((v, i) => vs.slice(i + 1).map((w) => [v, w])))
  // 1. an empty slot on a day: a meal they liked that is not planned takes it, or the meal already on the day comes
  //    back into it (a lunch pushed to 15:30 by a bar that has to be reached before it closes). With nothing taken off
  //    when that works; else with one stop off, else two: the ones that cost least to leave out. Never at the price of
  //    a place reached after closing, a ride back across town or another place past its hour
  const fillMeals = () => {
    for (const d of days) {
      for (let round = 0; round < 6; round++) {
        const here = eating(d.day)
        if (!here.open.length) break
        const waiting = live.filter(
          (w) =>
            isMeal(w) && at.get(w.id) == null && !w.far && options.get(w.id)!.includes(d.day) && !isAway(d, w) && here.open.some((g) => w.couples.includes(g.c) && slotsFor(w, d).includes(g.s)),
        )
        let best: { off: Unit[]; w: Unit | null; gain: number; loss: number } | null = null
        const stops = stopsOf(d.day)
        for (let n = 0; n <= 2 && !best; n++) {
          if (!n && !waiting.length) continue
          for (const off of sets(stops, n)) {
            for (const v of off) put(v, null)
            const lost = off.reduce((x, v) => x + lossOf(v), 0)
            const attempt = (w: Unit | null) => {
              if (w) {
                if (!fits(w, d.day, false, true)) return
                put(w, d.day)
              }
              const a = eating(d.day)
              if (w) put(w, null)
              if (a.filled <= here.filled || a.late > here.late || a.back > here.back || a.bad > here.bad) return
              const gain = a.filled - here.filled
              const loss = lost - (w ? lossOf(w) : 0)
              if (!best || gain > best.gain || (gain === best.gain && loss < best.loss)) best = { off, w, gain, loss }
            }
            if (n) attempt(null)
            for (const w of waiting) attempt(w)
            for (const v of off) put(v, d.day)
          }
        }
        const b = best as { off: Unit[]; w: Unit | null } | null
        if (!b) break
        for (const v of b.off) put(v, null)
        if (b.w) put(b.w, d.day)
      }
    }
  }
  fillMeals()
  // 2. a couple's day with no meal at all, while another of their days in that city has two: one of the two comes
  //    here (again with up to two stops off), when fewer days are left with no meal, no fewer slots are filled, and
  //    neither day gets a late place, a ride back or more places past their hour
  for (const d of days) {
    for (let round = 0; round < 4; round++) {
      const here = eating(d.day)
      if (!here.none) break
      const hungry = new Set(here.open.map((g) => g.c))
      let best: { off: Unit[]; m: Unit; less: number; loss: number } | null = null
      const stops = stopsOf(d.day)
      const meals = live.filter((m) => {
        const t = at.get(m.id)
        return isMeal(m) && t != null && t !== d.day && !m.far && options.get(m.id)!.includes(d.day) && !isAway(d, m) && whoOn(m, d).some((c) => hungry.has(c))
      })
      for (let n = 0; n <= 2 && !best; n++) {
        for (const off of sets(stops, n)) {
          for (const v of off) put(v, null)
          const loss = off.reduce((x, v) => x + lossOf(v), 0)
          for (const m of meals) {
            const t = at.get(m.id)!
            const there = eating(t)
            put(m, null)
            if (fits(m, d.day, false, true)) {
              put(m, d.day)
              const a = eating(d.day)
              const b = eating(t)
              const less = here.none + there.none - a.none - b.none
              const ok =
                less > 0 && a.filled + b.filled >= here.filled + there.filled && a.late <= here.late && b.late <= there.late && a.back <= here.back && b.back <= there.back && a.bad + b.bad <= here.bad + there.bad
              if (ok && (!best || less > best.less || (less === best.less && loss < best.loss))) best = { off, m, less, loss }
            }
            put(m, t)
          }
          for (const v of off) put(v, d.day)
        }
      }
      const b = best as { off: Unit[]; m: Unit } | null
      if (!b) break
      for (const v of b.off) put(v, null)
      put(b.m, d.day)
    }
  }
  fillMeals()

  for (const u of order) {
    if (at.get(u.id) != null || u.far || !pt(u)) continue
    let best: number | null = null
    let bestD = Infinity
    for (const day of options.get(u.id)!) {
      if (isAway(byDay.get(day)!, u) || !fits(u, day, false, true)) continue
      const before = dayState(day)
      const dl = delta(u, day)
      put(u, day)
      const p = timesOf(day).get(u.id)!
      const after = dayState(day)
      put(u, null)
      if (p.late || p.missed || after.bad > before.bad || after.back > before.back || after.meals < before.meals + (isMeal(u) ? whoOn(u, byDay.get(day)!).length : 0)) continue
      if (dl < bestD) {
        bestD = dl
        best = day
      }
    }
    if (best != null) put(u, best)
  }

  const placed = new Map<string, Placed>()
  const late: { id: string; day: number }[] = []
  for (const u of live) {
    const day = at.get(u.id)
    if (day == null) unplanned.set(u.id, thin.has(u.id) ? 'no_day' : 'full')
  }
  for (const d of days) {
    const ids = live.filter((u) => at.get(u.id) === d.day)
    if (!ids.length) continue
    const times = timesOf(d.day)
    for (const [id, p] of times) {
      placed.set(id, p)
      if (p.late) late.push({ id, day: d.day })
    }
  }
  return { placed, unplanned, late }
}

const SLOT: Record<BestTime, number | null> = {
  morning: 9 * 60 + 30,
  midday: 12 * 60,
  afternoon: 14 * 60 + 30,
  evening: 18 * 60,
  night: 20 * 60,
  any: null,
}
const round15 = (m: number) => Math.round(m / 15) * 15
const floor15 = (m: number) => Math.floor(m / 15) * 15
// the whole visit has to end by closing time (it used to be enough to arrive an hour before)
const stay = (u: Unit) => u.mins
// two full meals for the same people at least this far apart (start to start)
const MEAL_GAP = 180
// what a day's order costs, in minutes of travel: one minute of a timed place reached past its hour, one minute of
// waiting about, the ride home at the end of the day (it counts a little: the day should end near the hotel)
const LW = 0.5
const IDLE_W = 0.1
const HOME_W = 0.3
// a timed place reached two hours past its hour; a meal outside its slot; a place reached after it closes; going back
// to an area the day has already left
const MISSED_COST = 150
const MEAL_OFF_COST = 300
const CLOSED_COST = 1000
const BACK_COST = 20
// and what it costs when the day is timed again to undo one: more than a place reached past its hour, less than
// a place reached after it closes
const BACK_HARD = 450
// a place with no known point between two places that are known (not a meal: its slot decides where it goes)
const UNKNOWN_MID = 60
/** The point to measure rides from. */
const pt = (u: Unit) => (u.approx ? null : u.point)
/** Would this start leave the place after it closes, or begin after its people's day is over? */
const isLate = (d: Day, u: Unit, s: number, end: number) => s + stay(u) > closesOf(u, d) || s + stay(u) > end
/**
 * The time of day a place asks for on a day. "Morning" for a place that opens at noon means as soon as it opens, and
 * for one open from early morning 9:00, not the day's 9:30. "Evening" for a sight, a view or a market is that date's
 * dusk, half an hour before the sun sets (16:00 in December, not a flat 18:00); a dinner or a bar keeps the evening.
 * Never an hour that would end the visit after closing, after dark for a place out in the open, or after the day.
 */
const wantOn = (u: Unit, d: Day, end: number) => {
  let s = SLOT[u.best]
  if (s == null) return null
  if (u.best === 'evening' && !isMeal(u) && u.category !== 'nightlife') s = Math.max(15 * 60 + 30, Math.min(18 * 60, duskOf(d, u) - 30))
  if (opensEarly(u)) s = 9 * 60
  s = Math.max(s, u.opens ?? 0)
  const last = floor15(Math.min(closesOf(u, d), end) - u.mins)
  return last >= (u.opens ?? 0) ? Math.min(s, last) : s
}

// the earliest a place is worth starting, by the hour its card asks for: an afternoon place is not a 10:30 place
const NOT_BEFORE: Partial<Record<BestTime, number>> = { midday: 11 * 60, afternoon: 12 * 60 + 30 }
// a stop within this many km of an earlier one, after a stop this far from it, is an out-and-back
const BACK_NEAR = 1.5
const BACK_FAR = 4
/** How many times a line of stops returns to an area it has already left. */
export function outAndBack(pts: Point[]) {
  let n = 0
  for (let i = 2; i < pts.length; i++) {
    let hit = false
    for (let j = 0; j < i - 1 && !hit; j++)
      if (km(pts[i], pts[j]) <= BACK_NEAR) for (let q = j + 1; q < i; q++) if (km(pts[q], pts[j]) >= BACK_FAR) { hit = true; break }
    if (hit) n++
  }
  return n
}

/**
 * Rough times for one day. The order follows the map inside the hours the cards ask for: every order is walked with a
 * clock per couple (the ride from wherever each couple is), and costed by what a person would mind (a place reached
 * after it closes, a meal outside its hour, a timed place hours late, minutes on trains, going back to an area already
 * left, waiting about). Two starting orders (by the hour each place wants; shared places first) are each improved by
 * moving one place, swapping two, or reversing a stretch, until nothing gets better; the cheaper one is the day.
 */
function timetable(d: Day, units: Unit[], fixed: Fixed[], backCost = BACK_COST): Map<string, Placed> {
  const couples = [...d.at.keys()]
  const who = new Map(units.map((u) => [u.id, whoOn(u, d)]))
  const endOf = (u: Unit) => Math.min(...who.get(u.id)!.map((c) => endFor(u, d.at.get(c)!)))
  const want = new Map<string, number | null>()
  const slots = mealSlots(d, units.filter(isMeal), fixed)
  const fixedMeals = fixedMealsOf(fixed, d.day)
  // a meal's hour is its slot's: the hour its card asks for when that is inside the slot, else 12:15 or 18:30
  for (const u of units) {
    const w = wantOn(u, d, endOf(u))
    const slot = isMeal(u) ? slots.get(u.id) : null
    if (slot === 'lunch' || slot === 'dinner') {
      const m = MEAL_AT[slot]
      // an "afternoon" lunch is a late lunch (13:15), not one held back to 14:30 while the day goes on without it
      const own = slot === 'lunch' && u.best === 'afternoon' ? LATE_LUNCH : w != null && w >= m.from && w <= m.to ? w : m.want
      const start = Math.max(...who.get(u.id)!.map((c) => d.at.get(c)!.start))
      want.set(u.id, Math.max(m.from, Math.min(Math.max(own, u.opens ?? 0, start), m.to, floor15(Math.min(closesOf(u, d), endOf(u)) - u.mins))))
    } else want.set(u.id, w ?? (u.category === 'cafe' ? 15 * 60 : u.category === 'nightlife' ? 20 * 60 : null))
  }
  // Everything a walk reads, worked out once and held by index (a day is walked thousands of times): the couples of
  // each place, the rides between any two of them and to and from each hotel, the hours. The sums are the same ones,
  // added in the same order.
  const n = units.length
  const nc = couples.length
  const pres = couples.map((c) => d.at.get(c)!)
  const cix = new Map(couples.map((c, i) => [c, i]))
  const csOf = units.map((u) => who.get(u.id)!.map((c) => cix.get(c)!))
  const pts = units.map(pt)
  const mealU = units.map(isMeal)
  const endU = units.map(endOf)
  const closeU = units.map((u) => closesOf(u, d))
  const wantU = units.map((u) => want.get(u.id) ?? null)
  const minsU = units.map((u) => u.mins)
  const stayU = units.map(stay)
  const rideH = pres.map((p) => pts.map((q) => ride(p.hotel, q)))
  const rideHome = pres.map((p) => pts.map((q) => ride(q, p.hotel)))
  const rideU = pts.map((a) => pts.map((b) => ride(a, b)))
  const kmU = pts.map((a) => pts.map((b) => (a && b ? km(a, b) : 0)))
  const startU = pres.map((p) => units.map((u) => startFor(u, p)))
  // waits for its hour whatever the gap: an evening place, a meal
  const waitsU = units.map((u, i) => wantU[i] != null && (wantU[i]! >= 17 * 60 || u.best === 'evening' || u.best === 'night' || mealU[i]))
  const floorU = units.map((u, i) => [Math.min(NOT_BEFORE[u.best] ?? 0, wantU[i] ?? 24 * 60), u.opens ?? 0])
  const slotU = units.map((u) => { const sl = slots.get(u.id); return sl === 'lunch' || sl === 'dinner' ? MEAL_AT[sl] : null })
  const fixedNear = units.map((u, i) => (mealU[i] ? who.get(u.id)!.flatMap((c) => fixedMeals.get(c) ?? []) : []))
  const nightU = units.map((u) => u.best === 'night')
  // the hours something fixed holds, per couple, as from, to, from, to…; a walk adds its own after them
  const fixedBusy: number[][] = couples.map(() => [])
  for (const f of fixed) if (f.start != null) for (const c of f.couples) if (cix.has(c)) fixedBusy[cix.get(c)!].push(f.start, f.start + f.mins)
  const busy = fixedBusy.map((b) => [...b])
  const clock = new Float64Array(nc)
  const last = new Int32Array(nc)
  const fresh = new Uint8Array(nc)
  const mealAt = new Float64Array(nc)
  const nightDone = new Uint8Array(nc)
  const blind = new Int32Array(nc)
  const line = couples.map(() => new Int32Array(n))
  const lineN = new Int32Array(nc)
  const starts = new Float64Array(n)
  const backOf = (L: Int32Array, len: number) => {
    let back = 0
    for (let i = 2; i < len; i++) {
      let hit = false
      for (let j = 0; j < i - 1 && !hit; j++)
        if (kmU[L[i]][L[j]] <= BACK_NEAR) for (let q = j + 1; q < i; q++) if (kmU[L[q]][L[j]] >= BACK_FAR) { hit = true; break }
      if (hit) back++
    }
    return back
  }

  // walks an order of places (by index), gives each a start (in `starts`), and says what the day costs to follow.
  // Nothing in the cost is ever negative, so a walk that has reached `bound` can only end at or above it: it stops
  // there and says Infinity (the caller only wanted to know whether it comes in under)
  const walk = (order: number[], bound = Infinity) => {
    for (let c = 0; c < nc; c++) {
      clock[c] = pres[c].start
      last[c] = -1
      // still at the hotel: a place that is best early in the morning may be the reason to leave before the usual hour
      fresh[c] = 1
      mealAt[c] = -1
      nightDone[c] = 0
      // places with no known point since the last known one, per couple: the next known place closes them in
      blind[c] = 0
      lineN[c] = 0
      busy[c].length = fixedBusy[c].length
    }
    let cost = 0
    for (let k = 0; k < order.length; k++) {
      const i = order[k]
      const cs = csOf[i]
      const mins = minsU[i]
      let arrive = -Infinity
      for (let x = 0; x < cs.length; x++) {
        const c = cs[x]
        const a = (fresh[c] ? startU[c][i] : clock[c]) + (last[c] < 0 ? rideH[c][i] : rideU[last[c]][i])
        if (a > arrive) arrive = a
      }
      let t = arrive
      const w = wantU[i]
      // an evening place waits for the evening (a sunset view for the sunset); a daytime one waits only when its hour is close
      if (w != null && w > t && (waitsU[i] || w - t < 120)) t = w
      // and never starts before the part of the day its card asks for
      t = Math.max(t, floorU[i][0], floorU[i][1])
      // a full meal waits until the last one has settled (a café or dessert stop doesn't count)
      if (mealU[i]) for (let x = 0; x < cs.length; x++) if (mealAt[cs[x]] >= 0) t = Math.max(t, mealAt[cs[x]] + MEAL_GAP)
      for (let guard = 0; guard < 6; guard++) {
        let clashEnd = -1
        for (let x = 0; x < cs.length && clashEnd < 0; x++) {
          const b = busy[cs[x]]
          for (let y = 0; y < b.length; y += 2) if (t < b[y + 1] && t + mins > b[y]) { clashEnd = b[y + 1]; break }
        }
        // a full meal not within MEAL_GAP of a fixed one (before or after it): it goes after that meal has settled
        let near = -1
        const fm = fixedNear[i]
        for (let y = 0; y < fm.length; y++) if (Math.abs(t - fm[y]) < MEAL_GAP) { near = fm[y]; break }
        if (clashEnd < 0 && near < 0) break
        t = Math.max(clashEnd >= 0 ? clashEnd + 15 : t, near >= 0 ? near + MEAL_GAP : t)
      }
      // to the quarter hour, never back into the visit before it (a 50-minute stop ends at :20, the next starts at :30)
      let s = round15(t)
      for (let x = 0; x < cs.length; x++) if (!fresh[cs[x]] && s < clock[cs[x]]) { s += 15; break }
      starts[i] = s
      // minutes on the way, counted once per couple that makes the trip
      for (let x = 0; x < cs.length; x++) cost += last[cs[x]] < 0 ? rideH[cs[x]][i] : rideU[last[cs[x]]][i]
      cost += Math.max(0, s - arrive) * IDLE_W
      if (w != null && w < 17 * 60) {
        cost += Math.max(0, s - w - 30) * LW
        if (s - w > 120) cost += MISSED_COST
      }
      const slot = slotU[i]
      if (slot && (s < slot.from || s > slot.to)) cost += MEAL_OFF_COST
      if (s + stayU[i] > closeU[i] || s + stayU[i] > endU[i]) cost += CLOSED_COST
      // after a night place (a bar) nothing else comes that day
      for (let x = 0; x < cs.length; x++) if (nightDone[cs[x]]) { cost += 60; break }
      for (let x = 0; x < cs.length; x++) {
        const c = cs[x]
        fresh[c] = 0
        clock[c] = s + mins
        last[c] = i
        busy[c].push(s, s + mins)
        if (mealU[i]) mealAt[c] = s
        if (pts[i]) {
          cost += blind[c] * UNKNOWN_MID
          blind[c] = 0
          line[c][lineN[c]++] = i
        } else if (!mealU[i] && lineN[c]) blind[c]++
        if (nightU[i]) nightDone[c] = 1
      }
      if (cost >= bound) return Infinity
    }
    for (let c = 0; c < nc; c++) {
      cost += backOf(line[c], lineN[c]) * backCost
      if (lineN[c]) cost += rideHome[c][last[c]] * HOME_W
    }
    return cost
  }
  // places in the order of their hour, each place that wants none where it adds least
  const insertInto = (us: number[], before: number[]) => {
    const order = us.filter((i) => wantU[i] != null).sort((a, b) => wantU[a]! - wantU[b]! || units[b].couples.length - units[a].couples.length)
    for (const u of us.filter((i) => wantU[i] == null).sort((a, b) => minsU[b] - minsU[a])) {
      let best = 0
      let bestCost = Infinity
      for (let i = 0; i <= order.length; i++) {
        const c = walk([...before, ...order.slice(0, i), u, ...order.slice(i)], bestCost)
        if (c < bestCost) {
          bestCost = c
          best = i
        }
      }
      order.splice(best, 0, u)
    }
    return order
  }
  // improve an order: move one place, swap two, reverse a stretch; the first change that makes the day cheaper is kept
  const improve = (start: number[]) => {
    let order = start
    let cost = walk(order)
    const len = order.length
    for (let pass = 0; pass < 8; pass++) {
      let better = false
      const attempt = (next: number[]) => {
        const c = walk(next, cost - 0.01)
        if (c < cost - 0.01) {
          order = next
          cost = c
          better = true
        }
      }
      for (let i = 0; i < len; i++) {
        for (let j = 0; j < len; j++) {
          if (i === j) continue
          const moved = [...order]
          const [u] = moved.splice(i, 1)
          moved.splice(j, 0, u)
          attempt(moved)
          if (j > i) {
            const swapped = [...order]
            ;[swapped[i], swapped[j]] = [swapped[j], swapped[i]]
            attempt(swapped)
            if (j - i > 1 && len <= 14) attempt([...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)])
          }
        }
      }
      if (!better) break
    }
    return { order, cost }
  }
  // the two starting orders: every place by its hour; or what everyone does together first, then each couple's own
  const groups: number[] = []
  const sets = new Map<string, number[]>()
  units.forEach((u, i) => { const k = [...u.couples].sort().join('+'); sets.set(k, [...(sets.get(k) ?? []), i]) })
  for (const [, us] of [...sets].sort((a, b) => units[b[1][0]].couples.length - units[a[1][0]].couples.length)) groups.push(...insertInto(us, groups))
  const a = improve(insertInto(units.map((_, i) => i), []))
  const b = improve(groups)
  const best = b.cost < a.cost - 0.01 ? b : a
  walk(best.order)
  const out = new Map<string, Placed>()
  const sorted = [...best.order].sort((x, y) => starts[x] - starts[y])
  sorted.forEach((x, i) => {
    const u = units[x]
    const s = starts[x]
    const w = wantU[x]
    out.set(u.id, { day: d.day, start: s, order: i, late: isLate(d, u, s, endU[x]), missed: w != null && w < 17 * 60 && s - w > 120 })
  })
  return out
}

export const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
