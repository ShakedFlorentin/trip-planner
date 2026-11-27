// The planner's CPU time on a trip of the size that went over the edge function's limit (round 7, 27 Nov 2026):
// 20 days, two couples, 139 places, 112 of them already on a day and 27 new. A Supabase edge function gets about 2 s
// of CPU for one request; the planner once took 5.8 s on a trip like this one.
// The fixture is real-japan.json (already here, names as slugs) with 27 made-up places added to it, no day yet.
// Each measurement is a new process (a warm one would hide the first run's cost, and a request starts cold): the CPU
// time of the whole process around plan(), compile threads and memory clean-up included. Best of three.
// `node scripts/plan-cpu-test.mjs`; PLAN_DIR=<another copy of plan-trip> measures that code;
// PLAN_CPU_BUDGET=<ms> sets another budget (a slow machine), `--one` prints one measurement.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { engine, fixturesDir, load } from './plan-harness.mjs'

// the goal is 800 ms on the machine it was measured on, and the code as it stands takes about 1100 ms there on this
// fixture (the goal is not met yet); the code before round 7 took about 4000 ms. Twice the goal: a change that makes
// the planner half as slow again fails here, long before it reaches the limit
const BUDGET = Number(process.env.PLAN_CPU_BUDGET ?? 1600)

const fixture = (mods) => {
  const f = load(JSON.parse(readFileSync(join(fixturesDir, 'real-japan.json'), 'utf8')), mods)
  // 27 more places, spread over the trip's three cities the way the liked places are: sights, shops, restaurants and
  // cafés, some liked by one couple and some by both, with the hours such places keep. No dice: the same every run
  const mid = { tokyo: { lat: 35.69, lng: 139.72 }, kyoto: { lat: 35.005, lng: 135.765 }, osaka: { lat: 34.685, lng: 135.505 } }
  const kinds = [
    { category: 'sight', best: 'morning', mins: 90, opens: 540, closes: 1020 },
    { category: 'food', best: 'any', mins: 60, opens: 660, closes: 1320 },
    { category: 'shopping', best: 'afternoon', mins: 75, opens: 600, closes: 1200 },
    { category: 'sight', best: 'any', mins: 60, opens: null, closes: null },
    { category: 'cafe', best: 'afternoon', mins: 45, opens: 600, closes: 1080 },
    { category: 'food', best: 'evening', mins: 90, opens: 1020, closes: 1380 },
    { category: 'experience', best: 'midday', mins: 120, opens: 600, closes: 1080 },
    { category: 'nightlife', best: 'night', mins: 90, opens: 1080, closes: 1440 },
    { category: 'sight', best: 'evening', mins: 60, opens: 600, closes: 1320, outdoor: true },
  ]
  const who = [['S', 'A'], ['S'], ['A']]
  const cities = ['tokyo', 'kyoto', 'osaka']
  const more = Array.from({ length: 27 }, (_, i) => {
    const city = cities[i % 3]
    const a = i * 2.399963
    const r = 0.6 + (i % 7) * 0.7
    return {
      id: 'more-' + i, couples: who[(i >> 1) % 3], base: city, far: false,
      point: { lat: mid[city].lat + (r * Math.sin(a)) / 111, lng: mid[city].lng + (r * Math.cos(a)) / 91 },
      closedWeekdays: i % 5 === 0 ? [1] : [], closedDates: [], openDates: [], priority: 2.5 + (i % 6) * 0.5, current: null,
      ...kinds[i % kinds.length],
    }
  })
  return { days: f.days, units: [...f.units, ...more], fixed: f.fixed }
}

if (process.argv.includes('--one')) {
  const mods = await engine()
  const f = fixture(mods)
  const t0 = performance.now()
  const c0 = process.cpuUsage()
  const out = mods.E.plan(f.days, f.units, f.fixed)
  const c = process.cpuUsage(c0)
  console.log(JSON.stringify({ cpu: Math.round((c.user + c.system) / 1000), wall: Math.round(performance.now() - t0), units: f.units.length, days: f.days.length, placed: out.placed.size }))
  process.exit(0)
}

const runs = []
for (let k = 0; k < 3; k++) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--one'], { encoding: 'utf8', env: process.env })
  if (r.status !== 0) {
    console.log('FAIL  the planner did not run:\n' + (r.stderr || r.stdout))
    process.exit(1)
  }
  runs.push(JSON.parse(r.stdout.trim().split('\n').pop()))
}
const best = Math.min(...runs.map((r) => r.cpu))
const { units, days, placed } = runs[0]
const size = units === 139 && days === 20
const ok = size && best <= BUDGET && placed > 60
console.log(`${ok ? 'PASS' : 'FAIL'}  planner CPU on ${units} places and ${days} days: ${runs.map((r) => r.cpu).join(', ')} ms (best ${best}, wall ${Math.min(...runs.map((r) => r.wall))}), budget ${BUDGET} ms; ${placed} placed`)
if (!size) console.log('   - the fixture is not the size the test is about (139 places, 20 days)')
if (placed <= 60) console.log(`   - only ${placed} places planned: the run is not the full work`)
if (best > BUDGET) console.log(`   - ${best} ms of CPU is over the budget of ${BUDGET} ms: an edge function gets about 2000 ms for one request`)
console.log(ok ? '\nok' : '\nfailed')
process.exit(ok ? 0 : 1)
