// Shared by scripts/plan-test.mjs, scripts/plan-fixes-test.mjs and scripts/plan-metrics.mjs: bundles the planner's pure
// modules (plan.ts, presence.ts, stay.ts) with esbuild and turns a fixture into what plan(days, units, fixed) takes.
// PLAN_DIR points at another copy of supabase/functions/plan-trip (the code on main, for before/after numbers).
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const fixturesDir = join(root, 'scripts/plan-fixtures')

const bundleOf = async (file) => {
  const b = await build({ entryPoints: [file], bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18' })
  return import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'))
}

/** The planner's modules: E = plan.ts, P = presence.ts, S = stay.ts, G = geo.ts (null where the file does not exist). */
export async function engine(dir = process.env.PLAN_DIR ? resolve(process.env.PLAN_DIR) : join(root, 'supabase/functions/plan-trip')) {
  const opt = async (name) => (existsSync(join(dir, name)) ? bundleOf(join(dir, name)) : null)
  return { E: await bundleOf(join(dir, 'plan.ts')), P: await bundleOf(join(dir, 'presence.ts')), S: await bundleOf(join(dir, 'stay.ts')), G: await opt('geo.ts'), dir }
}

/** Sunset at a point on a date, minutes after midnight, Japan time: the harness's own sum, so it can check the engine's. */
export function sunsetMin(date, point, tz = 9) {
  const n = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(date.slice(0, 4) + '-01-01T00:00:00Z')) / 86400000) + 1
  const r = Math.PI / 180
  const decl = -23.44 * Math.cos(r * (360 / 365) * (n + 10))
  const b = r * (360 / 365) * (n - 81)
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  const cosH = (Math.sin(-0.833 * r) - Math.sin(point.lat * r) * Math.sin(decl * r)) / (Math.cos(point.lat * r) * Math.cos(decl * r))
  const h = Math.acos(Math.max(-1, Math.min(1, cosH))) / r
  return Math.round(720 - eot - 4 * (point.lng - 15 * tz) + h * 4)
}

const dateFrom =(startDate) => (d) => new Date(Date.parse(startDate + 'T00:00:00Z') + (d - 1) * 86400000).toISOString().slice(0, 10)

// a fixture's days carry `at` as an object (as the dry run's `input` does); the engine wants a Map
// a fixture with `presence` (stays, flights, day_info.who) gets its days from presence.ts, the way index.ts builds them;
// with `places` beside it, each place gets its base and day trip the way index.ts does (baseFor), and a place with no
// point sits at its city's middle, marked approx (index.ts does the same when the address can't be found)
// a fixture with `trip` starts one step earlier, like index.ts with no hotel: stays (trip_stays rows) or the city written
// on each day (dayCities) → stay.ts picks where to sleep → buildDays → each place's base and day trip (baseFor) → units
export function load(f, { P, S }) {
  if (f.trip) {
    const x = f.trip
    const dateOf = dateFrom(x.startDate)
    const base = Object.fromEntries(Object.entries(x.cities).map(([id, c]) => [id, { lat: c.lat, lng: c.lng }]))
    const ctx = {
      base,
      nameEn: Object.fromEntries(Object.entries(x.cities).map(([id, c]) => [id, c.en])),
      nameHe: Object.fromEntries(Object.entries(x.cities).map(([id, c]) => [id, c.he])),
      places: x.places.map((p) => ({ id: p.id, point: p.point ?? null, city: p.city, weight: p.priority ?? 3, mins: p.mins ?? 90, parties: p.couples ?? null })),
    }
    const r = x.stays
      ? S.sleepsFromStays(x.stays.map((s) => ({ party: null, lat: null, lng: null, area: null, status: 'proposed', booked: false, hotelPoint: null, hotelTitle: null, ...s })), ctx)
      : S.sleepsFromDays(Array.from({ length: x.numDays }, (_, i) => S.cityIdOf(x.dayCities?.[String(i + 1)], ctx)), x.numDays, dateOf, ctx)
    const days = P.buildDays({
      numDays: x.numDays, dateOf, sleeps: r.sleeps, couples: x.couples, flights: x.flights ?? [],
      dayWho: new Map(Object.entries(x.dayWho ?? {}).map(([d, w]) => [Number(d), w])), capOf: new Map(), past: () => false,
    })
    const basePt = S.basePoints(days)
    const units = []
    for (const p of x.places) {
      const couples = p.couples ?? x.couples
      const bases = [...new Set(days.flatMap((d) => couples.map((c) => d.at.get(c)?.base).filter(Boolean)))]
      const point = p.point ?? base[p.city] ?? null
      const { base: b, far } = S.baseFor(point, p.city, bases, basePt, base)
      if (!b) continue
      units.push({
        id: p.id, couples, base: b, far, point, mins: p.mins ?? 90, category: p.category ?? 'sight', best: p.best ?? 'any',
        opens: null, closes: null, closedWeekdays: [], closedDates: [], openDates: [], priority: p.priority ?? 3, current: null,
      })
    }
    return { ...f, days, units, fixed: f.fixed ?? [], sleeps: r.sleeps, recs: r.recs }
  }
  if (f.presence) {
    const x = f.presence
    const dateOf = dateFrom(x.startDate)
    const days = P.buildDays({
      numDays: x.numDays, dateOf, sleeps: x.sleeps, couples: x.couples, flights: x.flights ?? [], trains: x.trains ?? [],
      dayWho: new Map(Object.entries(x.dayWho ?? {}).map(([d, w]) => [Number(d), w])),
      capOf: new Map(Object.entries(x.capOf ?? {})), baby: new Set(x.baby ?? []), past: () => false,
    })
    if (!f.places) return { ...f, days }
    const cities = x.cities ?? {}
    const basePt = S.basePoints(days)
    const units = []
    const noBase = []
    for (const p of f.places) {
      const couples = p.couples ?? x.couples
      const bases = [...new Set(days.flatMap((d) => couples.map((c) => d.at.get(c)?.base).filter(Boolean)))]
      const point = p.point ?? cities[p.city] ?? null
      const { base: b, far } = S.baseFor(point, p.city, bases, basePt, cities)
      if (!b) { noBase.push(p.id); continue }
      units.push({
        id: p.id, couples, base: b, far, point, mins: p.mins ?? 90, category: p.category ?? 'sight', best: p.best ?? 'any',
        opens: p.opens ?? null, closes: p.closes ?? null, closedWeekdays: p.closedWeekdays ?? [], closedDates: p.closedDates ?? [],
        openDates: p.openDates ?? [], priority: p.priority ?? 3, current: null,
        ...(p.point ? {} : { approx: true }),
        ...(p.outdoor ? { outdoor: true } : {}), ...(p.adults ? { adults: true } : {}), ...(p.meal ? { meal: true } : {}), ...(p.booking ? { booking: true } : {}),
      })
    }
    return { ...f, days, units, fixed: f.fixed ?? [], noBase }
  }
  return { ...f, days: f.days.map((d) => ({ ...d, at: new Map(Object.entries(d.at)) })) }
}
