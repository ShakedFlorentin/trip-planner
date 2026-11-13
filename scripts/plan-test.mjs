// Regression harness for the trip planner's engine (supabase/functions/plan-trip/plan.ts).
// Bundles plan.ts with esbuild, runs each scripts/plan-fixtures/*.json through plan(days, units, fixed) the way
// index.ts does, and checks the engine's rules plus the fixture's own `expect`. `node scripts/plan-test.mjs [name…]`.
import { build } from 'esbuild'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'scripts/plan-fixtures')
const bundle = await build({
  entryPoints: [join(root, 'supabase/functions/plan-trip/plan.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18',
})
const PB = await build({
  entryPoints: [join(root, 'supabase/functions/plan-trip/presence.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18',
})
const SB = await build({
  entryPoints: [join(root, 'supabase/functions/plan-trip/stay.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18',
})
const S = await import('data:text/javascript;base64,' + Buffer.from(SB.outputFiles[0].text).toString('base64'))
const P = await import('data:text/javascript;base64,' + Buffer.from(PB.outputFiles[0].text).toString('base64'))
const E = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))

// a fixture's days carry `at` as an object (as the dry run's `input` does); the engine wants a Map
// a fixture with `presence` (stays, flights, day_info.who) gets its days from presence.ts, the way index.ts builds them
// a fixture with `trip` starts one step earlier, like index.ts with no hotel: stays (trip_stays rows) or the city written
// on each day (dayCities) → stay.ts picks where to sleep → buildDays → each place's base and day trip (baseFor) → units
const load = (f) => {
  if (f.trip) {
    const x = f.trip
    const dateOf = (d) => new Date(Date.parse(x.startDate + 'T00:00:00Z') + (d - 1) * 86400000).toISOString().slice(0, 10)
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
    const dateOf = (d) => new Date(Date.parse(x.startDate + 'T00:00:00Z') + (d - 1) * 86400000).toISOString().slice(0, 10)
    const days = P.buildDays({
      numDays: x.numDays, dateOf, sleeps: x.sleeps, couples: x.couples, flights: x.flights ?? [],
      dayWho: new Map(Object.entries(x.dayWho ?? {}).map(([d, w]) => [Number(d), w])),
      capOf: new Map(Object.entries(x.capOf ?? {})), past: () => false,
    })
    return { ...f, days }
  }
  return { ...f, days: f.days.map((d) => ({ ...d, at: new Map(Object.entries(d.at)) })) }
}
const NEAR_KM = 30 // mirrors plan.ts
const rules = (f, out) => {
  const errs = []
  const byId = new Map(f.units.map((u) => [u.id, u]))
  const dayOf = new Map(f.days.map((d) => [d.day, d]))
  for (const [id, p] of out.placed) {
    const u = byId.get(id)
    const d = dayOf.get(p.day)
    if (!u) { errs.push(`${id}: placed but not a unit`); continue }
    if (!d) { errs.push(`${id}: on day ${p.day}, which does not exist`); continue }
    for (const c of u.couples) {
      const pr = d.at.get(c)
      if (!pr) { errs.push(`${id}: on day ${p.day} but ${c} is not present`); continue }
      const near = u.point && E.km(pr.hotel, u.point) <= (u.far ? 150 : NEAR_KM)
      if (!u.far && pr.base !== u.base && !near) errs.push(`${id}: on day ${p.day}, ${c} is in ${pr.base}, place is ${u.base}`)
      if (u.far && !near) errs.push(`${id}: day trip on day ${p.day} too far from ${c}'s hotel`)
    }
    if (u.closedWeekdays.includes(d.weekday)) errs.push(`${id}: on day ${p.day}, closed that weekday (${d.weekday})`)
    if (u.closedDates.includes(d.date)) errs.push(`${id}: on day ${p.day}, closed ${d.date}`)
    if (u.openDates.length && !u.openDates.includes(d.date)) errs.push(`${id}: on day ${p.day}, runs only ${u.openDates.join(',')}`)
  }
  for (const id of out.placed.keys()) if (out.unplanned.has(id)) errs.push(`${id}: both placed and unplanned`)
  // never silently: a place outside the city its couples sleep in that day (and not a day trip) is in out.away, with its city,
  // and nothing else is
  for (const [id, p] of out.placed) {
    const u = byId.get(id)
    const d = dayOf.get(p.day)
    const isAway = !u.far && u.couples.some((c) => d.at.get(c) && d.at.get(c).base !== u.base)
    if (isAway && out.away.get(id) !== u.base) errs.push(`${id}: away on day ${p.day} but labelled ${out.away.get(id) ?? 'nothing'}, expected ${u.base}`)
    if (!isAway && out.away.has(id)) errs.push(`${id}: labelled away but sits in its own city on day ${p.day}`)
  }
  for (const id of out.away.keys()) if (!out.placed.has(id)) errs.push(`${id}: labelled away but not placed`)
  // own city first: a place left out for lack of room must not have a day (in its own city) that holds another city's place
  for (const [id, why] of out.unplanned) {
    const u = byId.get(id)
    if (why !== 'full' || u.far) continue
    for (const d of f.days) {
      if (!u.couples.every((c) => d.at.get(c)?.base === u.base)) continue
      const taker = [...out.placed].find(([o, p]) => p.day === d.day && out.away.has(o) && byId.get(o).couples.some((c) => u.couples.includes(c)))
      if (taker) errs.push(`${id}: left out ('full') although day ${d.day}, in its city, holds ${taker[0]} from ${out.away.get(taker[0])}`)
    }
  }
  return errs
}

const expectations = (f, out, run) => {
  const x = f.expect ?? {}
  const errs = []
  const dayOfId = (id) => out.placed.get(id)?.day
  for (const k of x.noIssueKinds ?? []) for (const i of out.issues) if (i.kind === k) errs.push(`issue ${k}: ${i.id}`)
  for (const d of x.emptyDays ?? []) for (const [id, p] of out.placed) if (p.day === d) errs.push(`${id}: placed on day ${d}, expected none`)
  // mealGap: no couple has two full meals (planned, or fixed with meal: true) less than `mealGap` minutes apart on a day
  if (x.mealGap) {
    const byId = new Map(f.units.map((u) => [u.id, u]))
    const meals = new Map()
    const add = (day, c, t, what) => meals.set(day + '|' + c, [...(meals.get(day + '|' + c) ?? []), [t, what]])
    for (const fx of f.fixed ?? []) if (fx.meal && fx.start != null) for (const c of fx.couples) add(fx.day, c, fx.start, 'fixed meal')
    for (const [id, p] of out.placed) {
      const u = byId.get(id)
      if (u.category === 'food') for (const c of u.couples) add(p.day, c, p.start, id)
    }
    for (const [k, ms] of meals) {
      ms.sort((a, b) => a[0] - b[0])
      for (let i = 1; i < ms.length; i++)
        if (ms[i][0] - ms[i - 1][0] < x.mealGap) errs.push(`${k}: ${ms[i - 1][1]} at ${ms[i - 1][0]} and ${ms[i][1]} at ${ms[i][0]}, under ${x.mealGap} min apart`)
    }
  }
  for (const [id, days] of Object.entries(x.onlyDays ?? {})) {
    const d = dayOfId(id)
    if (d != null && !days.includes(d)) errs.push(`${id}: on day ${d}, allowed ${days.join(',')}`)
    if (d == null && x.requirePlaced) errs.push(`${id}: not placed`)
  }
  for (const [id, why] of Object.entries(x.unplanned ?? {})) {
    if (out.placed.has(id)) errs.push(`${id}: placed, expected unplanned (${why})`)
    else if (out.unplanned.get(id) !== why) errs.push(`${id}: unplanned as ${out.unplanned.get(id)}, expected ${why}`)
  }
  // away: id → the city it is labelled with, for the places a fixture expects to be reported
  for (const [id, city] of Object.entries(x.away ?? {})) {
    if (out.away.get(id) !== city) errs.push(`${id}: away label ${out.away.get(id) ?? 'none'}, expected ${city}`)
  }
  // noAwayOnDays: days that must hold only places of their own city
  for (const d of x.noAwayOnDays ?? []) for (const [id, p] of out.placed) if (p.day === d && out.away.has(id)) errs.push(`${id}: away (${out.away.get(id)}) on day ${d}, expected none`)
  if (x.awayMin != null && out.away.size < x.awayMin) errs.push(`only ${out.away.size} away, expected at least ${x.awayMin}`)
  if (x.placedMin != null && out.placed.size < x.placedMin) errs.push(`only ${out.placed.size} placed, expected at least ${x.placedMin}`)
  if (x.fillBefore) {
    const { days, first, then } = x.fillBefore
    const firstIn = first.filter((id) => days.includes(dayOfId(id)))
    for (const id of first) if (!days.includes(dayOfId(id))) errs.push(`${id}: expected on days ${days.join(',')}, is ${dayOfId(id) ?? 'unplanned'}`)
    if (firstIn.length < first.length)
      for (const id of then) if (days.includes(dayOfId(id))) errs.push(`${id}: on day ${dayOfId(id)} before the places for that base were placed`)
  }
  // presence: per day and couple, where they sleep (null = not there), the hours and whether the times are estimates
  for (const [day, byCouple] of Object.entries(x.presence ?? {})) {
    for (const [c, want] of Object.entries(byCouple)) {
      const got = run.days.find((d) => d.day === Number(day))?.at.get(c)
      if (want === null) { if (got) errs.push(`day ${day}: ${c} present, expected not`); continue }
      if (!got) { errs.push(`day ${day}: ${c} missing`); continue }
      if (want.base && got.base !== want.base) errs.push(`day ${day}: ${c} in ${got.base}, expected ${want.base}`)
      if (want.start != null && got.start !== want.start) errs.push(`day ${day}: ${c} starts ${got.start}, expected ${want.start}`)
      if (want.end != null && got.end !== want.end) errs.push(`day ${day}: ${c} ends ${got.end}, expected ${want.end}`)
      if (!!got.estimate !== !!want.estimate) errs.push(`day ${day}: ${c} estimate ${!!got.estimate}, expected ${!!want.estimate}`)
    }
  }
  if (x.estimateDays) {
    const got = run.days.filter((d) => [...d.at.values()].some((p) => p.estimate)).map((d) => d.day)
    if (got.join() !== x.estimateDays.join()) errs.push(`estimate days ${got.join(',') || '-'}, expected ${x.estimateDays.join(',') || '-'}`)
  }
  // recommend: city id → the area recommended for its stretch (every stretch of that city, one area each)
  for (const [city, key] of Object.entries(x.recommend ?? {})) {
    const got = (run.recs ?? []).filter((r) => r.city === city)
    if (!got.length) errs.push(`no recommendation for ${city}`)
    for (const r of got) if (r.best.key !== key) errs.push(`${city}: recommended ${r.best.key}, expected ${key} (others: ${r.alternatives.map((a) => a.key).join(', ')})`)
  }
  // dayTrips: ids that must be day trips (far), placed, each on a day of day-trip places only (nothing back in town);
  // dayTripDays: on at most this many days. notFar: ids that must not be day trips
  if (x.dayTrips) {
    const byId = new Map(run.units.map((u) => [u.id, u]))
    for (const id of x.dayTrips) if (!byId.get(id)?.far) errs.push(`${id}: expected a day trip`)
    for (const id of x.dayTrips) if (!out.placed.has(id)) errs.push(`${id}: day trip not placed`)
    const ds = new Set(x.dayTrips.map((id) => out.placed.get(id)?.day).filter((d) => d != null))
    for (const d of ds) for (const [id, p] of out.placed) if (p.day === d && !byId.get(id).far) errs.push(`${id}: in town on day ${d}, a day-trip day`)
    if (x.dayTripDays != null && ds.size > x.dayTripDays) errs.push(`day trip spread over days ${[...ds].join(',')}, expected at most ${x.dayTripDays}`)
  }
  for (const id of x.notFar ?? []) if (run.units.find((u) => u.id === id)?.far) errs.push(`${id}: a day trip, expected in town`)
  // oneBase: every city's nights are one stretch at one point (no hotel change inside a city)
  if (x.oneBase) {
    const byCity = new Map()
    for (const sl of run.sleeps ?? []) byCity.set(sl.city, [...(byCity.get(sl.city) ?? []), sl])
    for (const [c, ss] of byCity) {
      const pts = new Set(ss.map((sl) => `${sl.point.lat},${sl.point.lng}|${sl.key}`))
      if (pts.size > 1) errs.push(`${c}: ${pts.size} different bases (${[...pts].join(' / ')})`)
    }
    for (const d of run.days) for (const [c, p] of d.at) {
      const prev = run.days.find((y) => y.day === d.day - 1)?.at.get(c)
      if (prev && prev.base === p.base && (prev.hotel.lat !== p.hotel.lat || prev.hotel.lng !== p.hotel.lng)) errs.push(`day ${d.day}: ${c} changes hotel inside ${p.base}`)
    }
  }
  if (x.stable) {
    // second run: each unit's current is the day the first run gave it (index.ts: autoByPlace)
    const again = E.plan(run.days, f.units.map((u) => ({ ...u, current: out.placed.get(u.id)?.day ?? null })), f.fixed)
    for (const u of f.units) {
      const a = out.placed.get(u.id)?.day ?? null
      const b = again.placed.get(u.id)?.day ?? null
      if (a !== b) errs.push(`${u.id}: moved from day ${a ?? '-'} to ${b ?? '-'} on re-run`)
    }
  }
  return errs
}

const only = process.argv.slice(2)
const files = readdirSync(dir).filter((n) => n.endsWith('.json') && (!only.length || only.includes(n.replace(/\.json$/, '')))).sort()
let failed = 0
for (const file of files) {
  const f = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  const run = load(f)
  let errs
  let out
  try {
    out = E.plan(run.days, run.units, run.fixed)
    errs = [...rules(run, out), ...expectations(run, out, run)]
  } catch (e) {
    errs = ['threw: ' + (e.stack ?? e)]
  }
  const known = f.knownFailing === true
  const status = !errs.length ? (known ? 'PASS (known failing, now passes: drop the flag)' : 'PASS') : known ? 'FAIL (known)' : 'FAIL'
  if (errs.length && !known) failed++
  console.log(`${status}  ${f.name ?? file}${out ? `  [${out.placed.size}/${run.units.length} placed]` : ''}`)
  for (const r of run.recs ?? []) console.log(`     where to sleep in ${r.city} (${r.check_in}→${r.check_out}): ${r.best.key} [${r.best.near}/${r.best.total} within ${r.best.within} min${r.best.hubs.length ? ', near ' + r.best.hubs.join('+') : ''}]; others: ${r.alternatives.map((a) => `${a.key} [${a.near}/${a.total}${a.hubs.length ? ', ' + a.hubs.join('+') : ''}]`).join(', ') || '-'}`)
  for (const e of errs) console.log('   - ' + e)
  if (out && process.env.VERBOSE) {
    for (const [id, p] of [...out.placed].sort((a, b) => a[1].day - b[1].day || a[1].start - b[1].start)) console.log(`     day ${p.day} ${E.hhmm(p.start)} ${id}`)
    for (const [id, r] of out.unplanned) console.log(`     unplanned ${id}: ${r}`)
    for (const [id, c] of out.away) console.log(`     away ${id}: in ${c}`)
  }
}
console.log(failed ? `\n${failed} fixture(s) failed` : '\nok')
process.exit(failed ? 1 : 0)
