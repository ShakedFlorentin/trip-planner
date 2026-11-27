// A run asked to plan what it has just planned does not plan again (plan-trip/memo.ts). The plan a run gets back
// must be the plan it would have worked out: checked on every fixture. And a run reads the addresses it may look up
// from geo_cache at once, not one read for each (primed in plan-trip/geo.ts): the lookups must ask and answer as
// before. index.ts (a Deno entry, not runnable here) is read as text for how it uses the two.
// `node scripts/plan-skip-test.mjs`
import { build } from 'esbuild'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { engine, fixturesDir, load, root } from './plan-harness.mjs'

const dir = join(root, 'supabase/functions/plan-trip')
let failed = 0
const t = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed++ }
const bundle = async (file) => {
  const b = await build({ entryPoints: [join(dir, file)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
  return import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'))
}
const mods = await engine()
const { E, G } = mods
const M = await bundle('memo.ts')
// a plan as text, Maps written out, to compare two of them to the letter
const text = (o) => JSON.stringify(o, (_k, v) => (v instanceof Map ? [...v] : v instanceof Set ? [...v] : v))

// ---- the same input is planned once
const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.json')).sort()
let calls = 0
const plan = (d, u, f) => (calls++, E.plan(d, u, f))
let same = 0
let untouched = 0
let n = 0
for (const file of files) {
  const read = () => load(JSON.parse(readFileSync(join(fixturesDir, file), 'utf8')), mods)
  const a = read()
  const before = M.inputKey(a.days, a.units, a.fixed)
  const memo = new Map()
  calls = 0
  const first = M.planOnce(memo, 'T', a.days, a.units, a.fixed, plan)
  // the planner leaves what it was given as it was: the key of a run is the input as it came
  if (M.inputKey(a.days, a.units, a.fixed) === before) untouched++
  // the same trip read again: new objects, the same content
  const b = read()
  const second = M.planOnce(memo, 'T', b.days, b.units, b.fixed, plan)
  const fresh = E.plan(b.days, b.units, b.fixed)
  if (!first.reused && second.reused && calls === 1 && text(second.out) === text(fresh)) same++
  n++
}
t(n >= 10, `the fixtures were found (${n})`)
t(untouched === n, `the planner does not change its input (${untouched}/${n} fixtures)`)
t(same === n, `the same input a second time is not planned again, and the plan given back is the plan a new run gives (${same}/${n} fixtures)`)

// ---- anything that changed is planned again
{
  const read = () => load(JSON.parse(readFileSync(join(fixturesDir, 'real-japan.json'), 'utf8')), mods)
  const memo = new Map()
  const a = read()
  calls = 0
  M.planOnce(memo, 'T', a.days, a.units, a.fixed, plan)
  const tries = [
    ['a place fewer', (x) => x.units.pop()],
    ['a place with another length', (x) => (x.units[0].mins += 15)],
    ['a place on another day now', (x) => (x.units[0].current = (x.units[0].current ?? 0) + 1)],
    ['a place with no closing hour instead of one', (x) => (x.units.find((u) => u.closes != null).closes = null)],
    ['a day that ends earlier for one couple', (x) => { const p = [...x.days[2].at.values()][0]; p.end -= 30 }],
    ['a couple away for a day', (x) => x.days[3].at.delete([...x.days[3].at.keys()][0])],
    ['a booking moved', (x) => (x.fixed.length ? (x.fixed[0].start = (x.fixed[0].start ?? 600) + 15) : x.fixed.push({ day: 2, couples: [...x.days[1].at.keys()], point: null, start: 720, mins: 60, meal: false }))],
  ]
  let again = 0
  for (const [, change] of tries) {
    const b = read()
    change(b)
    const before = calls
    const r = M.planOnce(memo, 'T', b.days, b.units, b.fixed, plan)
    if (!r.reused && calls === before + 1 && text(r.out) === text(E.plan(b.days, b.units, b.fixed))) again++
    else console.log('   not planned again:', tries[again]?.[0])
  }
  t(again === tries.length, `a changed input is planned again (${tries.map(([w]) => w).join('; ')})`)
  // a number that is not finite and an empty value are not the same input
  const k = (v) => { const b = read(); b.units[0].closes = v; return M.inputKey(b.days, b.units, b.fixed) }
  t(new Set([k(null), k(Infinity), k(NaN), k(0)]).size === 4, 'no closing hour, an endless one and midnight are told apart')

  // each trip has its own, and the trips kept are few
  const m2 = new Map()
  const x = read()
  const y = read()
  y.units.pop()
  calls = 0
  M.planOnce(m2, 'A', x.days, x.units, x.fixed, plan)
  M.planOnce(m2, 'B', y.days, y.units, y.fixed, plan)
  const ra = M.planOnce(m2, 'A', x.days, x.units, x.fixed, plan)
  const rb = M.planOnce(m2, 'B', y.days, y.units, y.fixed, plan)
  t(ra.reused && rb.reused && calls === 2 && ra.out.placed.size !== undefined && text(ra.out) !== text(rb.out), 'two trips are kept apart: each gets its own plan back')
  const cheap = () => ({ placed: new Map(), unplanned: new Map(), issues: [], away: new Map(), only: new Map() })
  for (let i = 0; i < M.KEEP_TRIPS + 3; i++) M.planOnce(m2, 'trip' + i, x.days, x.units, x.fixed, cheap)
  t(m2.size === M.KEEP_TRIPS && !m2.has('A') && m2.has('trip' + (M.KEEP_TRIPS + 2)), `no more than ${M.KEEP_TRIPS} trips are kept, the oldest goes first`)
  const t0 = performance.now()
  for (let i = 0; i < 20; i++) M.inputKey(x.days, x.units, x.fixed)
  const ms = (performance.now() - t0) / 20
  t(ms < 20, `telling the input apart costs little beside planning (${ms.toFixed(1)} ms for ${x.units.length} places)`)
}

// ---- the run's addresses are read from the cache at once
{
  const now = Date.parse('2026-11-27T00:00:00Z')
  const TOKYO = { lat: 35.68, lng: 139.76 }
  const table = () => new Map([
    ['hotel a', { lat: 35.68, lng: 139.76, at: '2026-11-01T00:00:00.000Z' }],
    // a hotel of the same name in another city: not this one, the next way of writing it is tried
    ['hotel b', { lat: 34.7, lng: 135.5, at: '2026-11-01T00:00:00.000Z' }],
    ['1-2-3 ginza, chuo-ku, tokyo', { lat: 35.67, lng: 139.77, at: '2026-11-01T00:00:00.000Z' }],
    // not found two days ago: believed; not found a month ago: asked again
    ['new cafe, tokyo', { lat: null, lng: null, at: '2026-11-25T00:00:00.000Z' }],
    ['old miss, tokyo', { lat: null, lng: null, at: '2026-10-01T00:00:00.000Z' }],
  ])
  const net = new Map([['old miss, tokyo', { lat: 35.7, lng: 139.7 }], ['never seen, tokyo', null]])
  const world = (budget = 3) => {
    const rows = table()
    const log = { get: [], many: [], put: [], fetch: [] }
    const deps = {
      now,
      budget: { left: budget },
      get: async (q) => (log.get.push(q), rows.get(q) ?? null),
      put: async (q, p) => { log.put.push(q); rows.set(q, { lat: p?.lat ?? null, lng: p?.lng ?? null, at: new Date(now).toISOString() }) },
      fetch: async (q) => {
        log.fetch.push(q)
        if (/down/i.test(q)) throw new Error('timeout')
        return net.get(q.toLowerCase()) ?? null
      },
    }
    const readMany = async (keys) => (log.many.push(keys), keys.filter((k) => rows.has(k)).map((k) => ({ q: k, ...rows.get(k) })))
    return { rows, log, deps, readMany }
  }
  // what a run asks, in its order: hotels, places, a booking; one address twice
  const asks = [
    { queries: ['Hotel A', 'Hotel A, Tokyo'], near: TOKYO, maxKm: 40 },
    { queries: ['Hotel B', '1-2-3 Ginza, Chuo-ku, Tokyo', 'Hotel B, Tokyo'], near: TOKYO, maxKm: 40 },
    { address: '4-5-6 Shibuya, Tokyo 150-0002, Japan', name: 'New Cafe', city: 'Tokyo', near: TOKYO },
    { address: null, name: 'Old Miss', city: 'Tokyo', near: TOKYO },
    { address: null, name: 'Never Seen', city: 'Tokyo', near: TOKYO },
    { address: null, name: 'Old Miss', city: 'Tokyo', near: TOKYO },
    { address: 'Server Down St, Tokyo' },
    { address: null, name: 'Never Seen', city: 'Tokyo', near: TOKYO },
  ]
  const runAll = async (deps) => { const out = []; for (const x of asks) out.push(await G.locate(x, deps)); return out }

  // the keys said ahead are the keys locate asks for, in its order
  const cold = world(0)
  cold.rows.clear()
  await runAll(cold.deps)
  t(JSON.stringify(asks.flatMap((x) => G.cacheKeys(x))) === JSON.stringify(cold.log.get), `the keys read ahead are the keys the lookups ask for, in the same order (${cold.log.get.length})`)

  const before = world()
  const was = await runAll(before.deps)
  const after = world()
  const geo = await G.primed(after.deps, asks.flatMap((x) => G.cacheKeys(x)), after.readMany)
  const is = await runAll(geo)
  t(JSON.stringify(is) === JSON.stringify(was) && was[0]?.lat === 35.68 && was[1]?.lat === 35.67 && was[2] === null && was[3]?.lat === 35.7, 'every lookup answers as it did with one read for each')
  t(after.log.get.length === 0 && after.log.many.length === 1 && before.log.get.length > 10, `one read instead of ${before.log.get.length}`)
  t(new Set(after.log.many[0]).size === after.log.many[0].length, 'no address is asked for twice in it')
  t(JSON.stringify(after.log.fetch) === JSON.stringify(before.log.fetch.filter((q, i, a) => a.indexOf(q) === i)) && after.log.fetch.length <= 3, `the network is asked in the same order, within the run's count (${after.log.fetch.join(' | ')})`)
  t(geo.budget === after.deps.budget && after.deps.budget.left === 0, 'the lookups left are the run\'s own count')
  t(JSON.stringify(after.log.put) === JSON.stringify(before.log.put.filter((q, i, a) => a.indexOf(q) === i)), 'what was found or not found is written as before')
  t([...after.rows].every(([k, v]) => JSON.stringify(v) === JSON.stringify(before.rows.get(k))) && after.rows.size === before.rows.size, 'the table ends the same')

  // the read failed: every lookup reads by itself, as before
  for (const [why, bad] of [['fails', async () => { throw new Error('414') }], ['gives nothing back', async () => null]]) {
    const w = world()
    const r = await runAll(await G.primed(w.deps, asks.flatMap((x) => G.cacheKeys(x)), bad))
    t(JSON.stringify(r) === JSON.stringify(was) && w.log.get.length > 5, `the one read ${why}: the lookups read one by one and answer the same`)
  }
  // a long list goes in several reads, each key in one of them
  {
    const w = world()
    const keys = asks.flatMap((x) => G.cacheKeys(x))
    const r = await runAll(await G.primed(w.deps, keys, w.readMany, 80))
    const all = w.log.many.flat()
    t(w.log.many.length > 2 && all.length === new Set(keys).size && new Set(all).size === all.length && w.log.get.length === 0 && JSON.stringify(r) === JSON.stringify(was), `a list too long for one read goes in ${w.log.many.length}, each address in one of them`)
    t(w.log.many.every((c) => c.length === 1 || c.reduce((n, k) => n + encodeURIComponent(k).length + 9, 0) <= 80), 'no read is longer than its limit')
  }
  // a key the list cannot carry is read by itself
  {
    const w = world()
    w.rows.set('bar "moon", tokyo', { lat: 35.66, lng: 139.7, at: '2026-11-01T00:00:00.000Z' })
    const x = { queries: ['Bar "Moon", Tokyo'], near: TOKYO }
    const g = await G.primed(w.deps, [...G.cacheKeys(x), 'hotel a'], w.readMany)
    const p = await G.locate(x, g)
    const p2 = await G.locate(x, g)
    t(p?.lat === 35.66 && p2?.lat === 35.66 && !w.log.many.flat().some((k) => k.includes('"')) && w.log.get.length === 1, 'an address with a quote in it is left out of the one read and read by itself, once')
  }
  // a key nobody said ahead is still answered
  {
    const w = world()
    const g = await G.primed(w.deps, [], w.readMany)
    const p = await G.locate({ queries: ['Hotel A'], near: TOKYO }, g)
    t(p?.lat === 35.68 && w.log.many.length === 0 && w.log.get.length === 1, 'an address not read ahead is read when it is asked for')
  }
}

// ---- index.ts uses both
const src = readFileSync(join(dir, 'index.ts'), 'utf8')
t(/planOnce\(planMemo, tid, days, units, fixed, plan\)/.test(src), 'index.ts plans through planOnce')
t(/if \(dry\) out = plan\(days, units, fixed\)/.test(src), 'a dry run always plans')
t((src.match(/[^.\w]plan\(days, units, fixed\)/g) ?? []).length === 1, 'and nothing else in index.ts plans on its own')

t(/const geo = await primed\(\s*geoDeps\(admin\),/.test(src) && (src.match(/geoDeps\(admin\)/g) ?? []).length === 1, 'index.ts reads the run\'s addresses ahead, and looks nothing up past it')
t(/from\('geo_cache'\)\.select\('q,lat,lng,at'\)\.in\('q', keys\)/.test(src), 'in one read of geo_cache by its keys')
t((src.match(/await locate\((hotelAsk\(h\)|ask), geo\)/g) ?? []).length === 3 && (src.match(/locate\(/g) ?? []).length === 3, 'the three lookups ask what was read ahead for them')

console.log(failed ? `\n${failed} check(s) failed` : '\nok')
process.exit(failed ? 1 : 0)
