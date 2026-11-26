// What a plan is like to follow, in numbers, for every fixture that has places: `node scripts/plan-metrics.mjs [name…]`.
// PLAN_DIR=<a copy of supabase/functions/plan-trip from another commit> gives the same numbers for that code
// (before/after). JSON=1 prints one JSON line per fixture instead of the table.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { engine, fixturesDir, load, sunsetMin } from './plan-harness.mjs'

const mods = await engine()
const { E } = mods
const LUNCH = [11 * 60, 14 * 60 + 45]
const DINNER = [17 * 60 + 15, 21 * 60]
const isMeal = (u) => u.category === 'food' || (u.category === 'nightlife' && u.meal)

/** The numbers for one plan. `who` of a place on a day: its couples that are in Japan that day (out.only when the planner says). */
export function measure(run, out) {
  const byId = new Map(run.units.map((u) => [u.id, u]))
  const fixed = run.fixed ?? []
  const m = { placed: out.placed.size, units: run.units.length, coupleDays: 0, emptyDays: 0, mealSlots: 0, mealsFilled: 0, twoInSlot: 0, km: 0, maxKm: 0, outAndBack: 0, afterClosing: 0, afterDark: 0, pastDayEnd: 0, foodUnplanned: 0, away: out.away.size }
  for (const [id] of out.unplanned) if (isMeal(byId.get(id) ?? {})) m.foodUnplanned++
  for (const d of run.days) {
    for (const [c, p] of d.at) {
      if (p.end - p.start < 120) continue
      const busy = fixed.filter((f) => f.day === d.day && f.couples.includes(c))
      const whole = busy.some((f) => f.mins >= 600)
      const mine = [...out.placed]
        .filter(([id, x]) => x.day === d.day && (out.only?.get(id) ?? byId.get(id).couples).includes(c))
        .map(([id, x]) => ({ u: byId.get(id), s: x.start }))
        .sort((a, b) => a.s - b.s)
      m.coupleDays++
      if (!mine.length && !busy.length) m.emptyDays++
      if (!whole) {
        const mealStarts = [...mine.filter((x) => isMeal(x.u)).map((x) => x.s), ...busy.filter((f) => f.meal && f.start != null).map((f) => f.start)]
        for (const [slot, need] of [[LUNCH, p.start <= 13 * 60 && p.end >= 13 * 60 + 30], [DINNER, p.start <= 19 * 60 && p.end >= 19 * 60 + 30]]) {
          if (!need) continue
          m.mealSlots++
          const n = mealStarts.filter((s) => s >= slot[0] && s <= slot[1]).length
          if (n) m.mealsFilled++
          if (n > 1) m.twoInSlot++
        }
      }
      // the day's line on the map: hotel → each place with a known point, in time order → hotel
      const pts = mine.filter((x) => x.u.point && !x.u.approx).map((x) => x.u.point)
      let k = 0
      let at = p.hotel
      for (const q of [...pts, p.hotel]) { k += E.km(at, q); at = q }
      if (pts.length) { m.km += k; m.maxKm = Math.max(m.maxKm, k) }
      // out and back: a stop within 1.5 km of an earlier one, with a stop 4 km or more from it in between
      for (let i = 2; i < pts.length; i++) {
        let hit = false
        for (let j = 0; j < i - 1 && !hit; j++) if (E.km(pts[i], pts[j]) <= 1.5) for (let q = j + 1; q < i; q++) if (E.km(pts[q], pts[j]) >= 4) { hit = true; break }
        if (hit) m.outAndBack++
      }
    }
    const dusk = [...d.at.values()][0] ? sunsetMin(d.date, [...d.at.values()][0].hotel) : null
    for (const [id, x] of out.placed) {
      if (x.day !== d.day) continue
      const u = byId.get(id)
      if ((u.closes != null && x.start + u.mins > u.closes) || (u.opens != null && x.start < u.opens)) m.afterClosing++
      if (u.outdoor && dusk != null && x.start + u.mins > dusk + 30) m.afterDark++
      const who = (out.only?.get(id) ?? u.couples).filter((c) => d.at.has(c))
      if (who.length && x.start + u.mins > Math.min(...who.map((c) => d.at.get(c).end))) m.pastDayEnd++
    }
  }
  m.km = Math.round(m.km)
  m.maxKm = Math.round(m.maxKm)
  return m
}

if (process.argv[1].endsWith('plan-metrics.mjs')) {
  const only = process.argv.slice(2)
  const files = readdirSync(fixturesDir).filter((n) => n.endsWith('.json') && (!only.length || only.includes(n.replace(/\.json$/, '')))).sort()
  const cols = ['placed', 'coupleDays', 'emptyDays', 'mealSlots', 'mealsFilled', 'twoInSlot', 'km', 'maxKm', 'outAndBack', 'afterClosing', 'afterDark', 'pastDayEnd', 'foodUnplanned', 'away']
  if (!process.env.JSON) console.log(['fixture'.padEnd(34), ...cols].join(' | '))
  for (const file of files) {
    const f = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8'))
    const run = load(f, mods)
    if (!run.units?.length) continue
    const t = Date.now()
    const m = measure(run, E.plan(run.days, run.units, run.fixed))
    if (process.env.JSON) console.log(JSON.stringify({ fixture: f.name ?? file, ...m, ms: Date.now() - t }))
    else console.log([(f.name ?? file).padEnd(34), ...cols.map((k) => String(k === 'placed' ? `${m.placed}/${m.units}` : m[k]).padStart(k.length))].join(' | '))
  }
}
