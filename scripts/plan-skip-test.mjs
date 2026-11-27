// A run asked to plan what it has just planned does not plan again (plan-trip/memo.ts). The plan a run gets back
// must be the plan it would have worked out: checked on every fixture. index.ts (a Deno entry, not runnable here) is
// read as text for how it uses it. `node scripts/plan-skip-test.mjs`
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
const { E } = mods
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

// ---- index.ts plans through it
const src = readFileSync(join(dir, 'index.ts'), 'utf8')
t(/planOnce\(planMemo, tid, days, units, fixed, plan\)/.test(src), 'index.ts plans through planOnce')
t(/if \(dry\) out = plan\(days, units, fixed\)/.test(src), 'a dry run always plans')
t((src.match(/[^.\w]plan\(days, units, fixed\)/g) ?? []).length === 1, 'and nothing else in index.ts plans on its own')

console.log(failed ? `\n${failed} check(s) failed` : '\nok')
process.exit(failed ? 1 : 0)
