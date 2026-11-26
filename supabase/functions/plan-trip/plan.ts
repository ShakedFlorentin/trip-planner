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
}
/** What the final check found on a planned place: it should never happen, and the app shows it if it does. */
export type Issue = {
  /** the place; '' for an issue about a day (a meal nobody planned), which carries day and couple instead */
  id: string
  kind: 'overlap' | 'tight' | 'hours' | 'meals' | 'no_lunch' | 'no_dinner'
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
// a day with a meal slot nobody filled costs this much (the day's cost is in km and hours)
const MEAL_MISS = 10
// room kept on a day for a meal still to be placed there
const MEAL_ROOM = 70

/**
 * Which meals a couple needs that day: lunch when their day covers 13:00-13:30, dinner when it covers 19:00-19:30, and
 * only where something fixed leaves an hour free in the slot. A fixed meal in the slot covers it (one with no hour
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
    lunch: p.start <= 13 * 60 && p.end >= 13 * 60 + 30 && free(MEAL_AT.lunch.from, MEAL_AT.lunch.to + 60),
    dinner: p.start <= 19 * 60 && p.end >= 19 * 60 + 30 && free(MEAL_AT.dinner.from, MEAL_AT.dinner.to + 60),
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
  // lunch only on a day that starts by 13:00 (a day that starts at 14:00 has no lunch to plan), dinner on one that runs to 19:30
  const can = (s: 'lunch' | 'dinner') =>
    (s === 'lunch' ? start <= 13 * 60 : end >= 19 * 60 + 30) &&
    Math.max(u.opens ?? 0, start, MEAL_AT[s].from) <= Math.min((u.closes ?? 24 * 60) - u.mins, MEAL_AT[s].to, end - u.mins)
  const asked: MealSlot[] =
    u.best === 'morning' ? (start >= 10 * 60 + 45 ? ['lunch'] : ['breakfast'])
    : u.best === 'midday' || u.best === 'afternoon' ? ['lunch']
    : u.best === 'evening' || u.best === 'night' ? ['dinner']
    : ['lunch', 'dinner']
  const ok = asked.filter((s) => s === 'breakfast' || can(s))
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
// a place of two couples on a day one of them is not in the country
const ABSENT_COST = 4
// a day trip is worth its ride: at least an hour of places there, and at least this share of the ride there and back
const TRIP_MIN = 60
const TRIP_SHARE = 0.4
// at most this many of a kind a day, per couple (meals go by slot instead: one lunch, one dinner)
const PER_DAY: Record<string, number> = { food: 2, cafe: 2, nightlife: 2 }
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
export function plan(days: Day[], units: Unit[], fixed: Fixed[]): Outcome {
  // a day's load and a day's timetable depend only on which places are on it: worked out once for the whole run
  const memo: Memo = { loads: new Map(), tables: new Map() }
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
  const worth = (o: typeof fresh) => {
    let value = 0
    let missed = 0
    for (const [id, p] of o.placed) {
      const u = units.find((x) => x.id === id)!
      value += u.priority * (0.5 + u.mins / 120)
      if (p.missed) missed++
    }
    // a day left without a lunch or a dinner counts against a plan
    const noMeal = check(days, units, fixed, o.placed).filter((i) => i.kind === 'no_lunch' || i.kind === 'no_dinner').length
    return value - missed * 2 - noMeal * 3
  }
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
  let out = fill(kept && worth(fresh) <= worth(kept) * 1.02 ? kept : fresh)
  // and the same question the next run would ask, asked now: starting from this plan, is a plan worked out afresh
  // clearly better? Then that one is the plan, today and not on the next swipe. Nothing to ask when the plan came out
  // as it went in.
  for (let round = 0; round < 2; round++) {
    if (units.every((u) => (u.current ?? null) === (out.placed.get(u.id)?.day ?? null))) break
    const again = solve(false, from(out))
    if (worth(again) <= worth(out) * 1.02) break
    out = fill(again)
  }
  return { placed: out.placed, unplanned: out.unplanned, issues: check(days, units, fixed, out.placed), away: awayOf(days, units, out.placed) }
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
  // the couples sleeping in the same city as this couple that day
  const together = (d: Day, c: string) => [...d.at].filter(([, p]) => p.base === d.at.get(c)!.base).map(([o]) => o)

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
  const load = (day: number, c: string, extra?: Unit) => {
    const us = [...group(day, c)].map((id) => unitById.get(id)!)
    if (extra) us.push(extra)
    if (!us.length) return 0
    const key = day + '|' + c + '|' + us.map((u) => u.id).sort().join(',')
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
      m += u.mins + HOP + ride(here, pt(u))
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
    return spread + crowd + hours * hours * 0.35 + noMeal
  }
  const unitCost = (u: Unit, day: number | null) => {
    // leaving a place out costs its priority, more for a bigger one: a two-hour shrine is more of the trip than a
    // forty-minute café of the same priority, which the day would otherwise always pick for fitting more in
    // a meal left out costs more than a shop or a sight of the same priority: people eat every day
    if (day == null) return u.priority * 14 * (0.5 + (isMeal(u) ? Math.max(u.mins, 150) : u.mins) / 120)
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
  const fits = (u: Unit, day: number, keep = false) => {
    // a meal needs a slot of its own for each of its people: no two lunches, no two dinners
    if (isMeal(u) && [...slotsOn(day, u).values()].some((s) => s == null)) return false
    return whoOn(u, byDay.get(day)!).every((c) => {
      const d = byDay.get(day)!
      // room stays for the lunch and the dinner still to come, while a meal that could fill them waits
      const room = keep ? 0 : mealGaps(day, c, true, isMeal(u) ? u : undefined) * MEAL_ROOM
      if (load(day, c, u) + room > cap(day, c) + 15) return false
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
  const delta = (u: Unit, day: number | null, evicted?: Unit) => {
    const was = at.get(u.id) ?? null
    const touched = new Set<string>()
    for (const c of u.couples) {
      if (was != null) touched.add(was + '|' + c)
      if (day != null) touched.add(day + '|' + c)
    }
    if (evicted) for (const c of evicted.couples) touched.add(at.get(evicted.id) + '|' + c)
    const cost = () =>
      [...touched].reduce((s, k) => {
        const [dd, c] = k.split('|')
        return s + groupCost(Number(dd), c)
      }, 0)
    const before = cost() + unitCost(u, was) + (evicted ? unitCost(evicted, at.get(evicted.id) ?? null) : 0)
    const evDay = evicted ? at.get(evicted.id) ?? null : null
    if (evicted) put(evicted, null)
    put(u, day)
    const after = cost() + unitCost(u, day) + (evicted ? unitCost(evicted, null) : 0)
    put(u, was)
    if (evicted) put(evicted, evDay)
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
        let best: { day: number | null; ev?: Unit; dl: number } = { day: was, dl: -0.01 }
        const tries: (number | null)[] = [null, ...options.get(u.id)!]
        for (const day of tries) {
          if (day === was) continue
          if (homeOnly && day != null && isAway(byDay.get(day)!, u)) continue
          // a place on a day in its own city stays there once the own city's places are settled: the other city's
          // places that arrived since must not push it off (a day crowded only by what fills its leftover room)
          if (!homeOnly && was != null && !isAway(byDay.get(was)!, u)) continue
          if (day == null || fitsWithout(u, day, null)) {
            if (day != null && blockedAway(u, day)) continue
            const dl = delta(u, day)
            if (dl < best.dl) best = { day, dl }
          } else {
            // the day is full: try taking off one less wanted place to make room
            for (const c of whoOn(u, byDay.get(day)!)) {
              // a copy: trying a swap takes places off the day and puts them back, which would re-run a live Set
              for (const id of [...group(day, c)]) {
                const v = unitById.get(id)!
                // a place of the day's own city may take the room of a higher one from another city, never the reverse
                const awayV = isAway(byDay.get(day)!, v)
                const awayU = isAway(byDay.get(day)!, u)
                if (awayU && !awayV) continue
                // a meal is not taken off for a sight or a shop; a meal may take the room of one a little above it
                if (isMeal(v) && !isMeal(u)) continue
                const above = isMeal(u) && !isMeal(v) ? 1 : 0
                if ((v.priority > u.priority + above && !(awayV && !awayU)) || !fitsWithout(u, day, v)) continue
                const dl = delta(u, day, v)
                if (dl < best.dl) best = { day, ev: v, dl }
              }
            }
          }
        }
        if (best.day !== was) {
          if (best.ev) put(best.ev, null)
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
      if (mins >= TRIP_MIN && mins >= TRIP_SHARE * 2 * there) continue
      for (const u of far) {
        thin.add(u.id)
        if (mins >= TRIP_MIN) maybe.set(u.id, d.day)
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

  function fitsWithout(u: Unit, day: number, v: Unit | null) {
    const vDay = v ? at.get(v.id) ?? null : null
    const uDay = at.get(u.id) ?? null
    if (v) put(v, null)
    put(u, null)
    const ok = fits(u, day)
    put(u, uDay)
    if (v) put(v, vDay)
    return ok
  }

  // a day's times, worked out once for each set of places the day is tried with
  const tables = memo.tables
  const timesOf = (day: number) => {
    const ids = live.filter((u) => at.get(u.id) === day)
    if (!ids.length) return new Map<string, Placed>()
    const key = day + '|' + ids.map((u) => u.id).join(',')
    let t = tables.get(key)
    if (!t) tables.set(key, (t = timetable(byDay.get(day)!, ids, fixed.filter((f) => f.day === day))))
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
        if (day === was || !fitsWithout(u, day, null)) continue
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
function timetable(d: Day, units: Unit[], fixed: Fixed[]): Map<string, Placed> {
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
      const own = w != null && w >= m.from && w <= m.to ? w : m.want
      const start = Math.max(...who.get(u.id)!.map((c) => d.at.get(c)!.start))
      want.set(u.id, Math.max(m.from, Math.min(Math.max(own, u.opens ?? 0, start), m.to, floor15(Math.min(closesOf(u, d), endOf(u)) - u.mins))))
    } else want.set(u.id, w ?? (u.category === 'cafe' ? 15 * 60 : u.category === 'nightlife' ? 20 * 60 : null))
  }
  const fixedBusy = new Map<string, [number, number][]>(couples.map((c) => [c, []]))
  for (const f of fixed) if (f.start != null) for (const c of f.couples) fixedBusy.get(c)?.push([f.start, f.start + f.mins])

  // walks an order of places, gives each a start, and says what the day costs to follow
  const walk = (order: Unit[]) => {
    const clock = new Map(couples.map((c) => [c, d.at.get(c)!.start]))
    const where = new Map<string, Point | null>(couples.map((c) => [c, d.at.get(c)!.hotel]))
    const busy = new Map(couples.map((c) => [c, [...fixedBusy.get(c)!]]))
    const meal = new Map<string, number>()
    const starts = new Map<string, number>()
    // still at the hotel: a place that is best early in the morning may be the reason to leave before the usual hour
    const fresh = new Set(couples)
    const line = new Map<string, Point[]>(couples.map((c) => [c, []]))
    const nightDone = new Set<string>()
    let cost = 0
    for (const u of order) {
      const cs = who.get(u.id)!
      const arrive = Math.max(...cs.map((c) => (fresh.has(c) ? startFor(u, d.at.get(c)!) : clock.get(c)!) + ride(where.get(c)!, pt(u))))
      let t = arrive
      const w = want.get(u.id)
      // an evening place waits for the evening (a sunset view for the sunset); a daytime one waits only when its hour is close
      if (w != null && w > t && (w >= 17 * 60 || u.best === 'evening' || u.best === 'night' || isMeal(u) || w - t < 120)) t = w
      // and never starts before the part of the day its card asks for
      t = Math.max(t, Math.min(NOT_BEFORE[u.best] ?? 0, w ?? 24 * 60), u.opens ?? 0)
      // a full meal waits until the last one has settled (a café or dessert stop doesn't count)
      if (isMeal(u)) for (const c of cs) if (meal.has(c)) t = Math.max(t, meal.get(c)! + MEAL_GAP)
      for (let guard = 0; guard < 6; guard++) {
        const clash = cs.flatMap((c) => busy.get(c)!).find(([a, b]) => t < b && t + u.mins > a)
        // a full meal not within MEAL_GAP of a fixed one (before or after it): it goes after that meal has settled
        const near = isMeal(u) ? cs.flatMap((c) => fixedMeals.get(c) ?? []).find((x) => Math.abs(t - x) < MEAL_GAP) : undefined
        if (!clash && near == null) break
        t = Math.max(clash ? clash[1] + 15 : t, near != null ? near + MEAL_GAP : t)
      }
      // to the quarter hour, never back into the visit before it (a 50-minute stop ends at :20, the next starts at :30)
      let s = round15(t)
      if (cs.some((c) => !fresh.has(c) && s < clock.get(c)!)) s += 15
      starts.set(u.id, s)
      // minutes on the way, counted once per couple that makes the trip
      for (const c of cs) cost += ride(where.get(c)!, pt(u))
      cost += Math.max(0, s - arrive) * IDLE_W
      if (w != null && w < 17 * 60) {
        cost += Math.max(0, s - w - 30) * LW
        if (s - w > 120) cost += MISSED_COST
      }
      const slot = slots.get(u.id)
      if ((slot === 'lunch' || slot === 'dinner') && (s < MEAL_AT[slot].from || s > MEAL_AT[slot].to)) cost += MEAL_OFF_COST
      if (isLate(d, u, s, endOf(u))) cost += CLOSED_COST
      // after a night place (a bar) nothing else comes that day
      if (cs.some((c) => nightDone.has(c))) cost += 60
      for (const c of cs) {
        fresh.delete(c)
        clock.set(c, s + u.mins)
        where.set(c, pt(u))
        busy.get(c)!.push([s, s + u.mins])
        if (isMeal(u)) meal.set(c, s)
        if (pt(u)) line.get(c)!.push(pt(u)!)
        if (u.best === 'night') nightDone.add(c)
      }
    }
    for (const c of couples) {
      cost += outAndBack(line.get(c)!) * BACK_COST
      if (line.get(c)!.length) cost += ride(where.get(c)!, d.at.get(c)!.hotel) * HOME_W
    }
    return { starts, cost }
  }
  // places in the order of their hour, each place that wants none where it adds least
  const insertInto = (us: Unit[], before: Unit[]) => {
    const order = us.filter((u) => want.get(u.id) != null).sort((a, b) => want.get(a.id)! - want.get(b.id)! || b.couples.length - a.couples.length)
    for (const u of us.filter((x) => want.get(x.id) == null).sort((a, b) => b.mins - a.mins)) {
      let best = 0
      let bestCost = Infinity
      for (let i = 0; i <= order.length; i++) {
        const c = walk([...before, ...order.slice(0, i), u, ...order.slice(i)]).cost
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
  const improve = (start: Unit[]) => {
    let order = start
    let cost = walk(order).cost
    const n = order.length
    for (let pass = 0; pass < 8; pass++) {
      let better = false
      const attempt = (next: Unit[]) => {
        const c = walk(next).cost
        if (c < cost - 0.01) {
          order = next
          cost = c
          better = true
        }
      }
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue
          const moved = [...order]
          const [u] = moved.splice(i, 1)
          moved.splice(j, 0, u)
          attempt(moved)
          if (j > i) {
            const swapped = [...order]
            ;[swapped[i], swapped[j]] = [swapped[j], swapped[i]]
            attempt(swapped)
            if (j - i > 1 && n <= 14) attempt([...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)])
          }
        }
      }
      if (!better) break
    }
    return { order, cost }
  }
  // the two starting orders: every place by its hour; or what everyone does together first, then each couple's own
  const groups: Unit[] = []
  const sets = new Map<string, Unit[]>()
  for (const u of units) sets.set([...u.couples].sort().join('+'), [...(sets.get([...u.couples].sort().join('+')) ?? []), u])
  for (const [, us] of [...sets].sort((a, b) => b[1][0].couples.length - a[1][0].couples.length)) groups.push(...insertInto(us, groups))
  const a = improve(insertInto(units, []))
  const b = improve(groups)
  const best = b.cost < a.cost - 0.01 ? b : a
  const { starts } = walk(best.order)
  const out = new Map<string, Placed>()
  const sorted = [...best.order].sort((x, y) => starts.get(x.id)! - starts.get(y.id)!)
  sorted.forEach((u, i) => {
    const s = starts.get(u.id)!
    const w = want.get(u.id) ?? null
    out.set(u.id, { day: d.day, start: s, order: i, late: isLate(d, u, s, endOf(u)), missed: w != null && w < 17 * 60 && s - w > 120 })
  })
  return out
}

export const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
