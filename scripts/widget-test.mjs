// Tests for the widget snapshot (src/widgetSnapshot.ts): `node scripts/widget-test.mjs`.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({ entryPoints: [join(root, 'src/widgetSnapshot.ts')], bundle: true, write: false, format: 'esm', platform: 'node' })
const { buildSnapshot } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

const trip = { name: 'Japan', start_date: '2026-12-01', num_days: 3 }
const stops = (d) => [
  { time: '09:30:00', title: '  Senso-ji  ', done: true },
  { time: null, title: 'Ramen', done: false },
  { time: '12:00', title: '', done: false },
]
const base = { lang: 'en', trip, stopsOf: stops, cityOf: (d) => (d === 1 ? 'Tokyo' : null) }
let n = 0
const ok = (name, fn) => (fn(), n++, console.log('ok -', name))

ok('during the trip: today and tomorrow, empty titles dropped, times cut to HH:MM', () => {
  const s = buildSnapshot({ ...base, today: 1 })
  assert.deepEqual(s.days.map((d) => d.date), ['2026-12-01', '2026-12-02'])
  assert.deepEqual(s.days[0].stops, [{ time: '09:30', title: 'Senso-ji', done: true }, { time: null, title: 'Ramen', done: false }])
  assert.equal(s.days[0].city, 'Tokyo')
  assert.equal(s.v, 1)
})
ok('last day has no tomorrow', () => assert.equal(buildSnapshot({ ...base, today: 3 }).days.length, 1))
ok('before the trip: no stops, first city only', () => {
  const s = buildSnapshot({ ...base, today: null })
  assert.deepEqual(s.days, [{ date: '2026-12-01', city: 'Tokyo', stops: [] }])
})
ok('a trip with no dates sends no days', () => assert.deepEqual(buildSnapshot({ ...base, trip: { ...trip, start_date: null }, today: null }).days, []))
ok('small and private: capped stops and titles, nothing else', () => {
  const many = (d) => Array.from({ length: 40 }, (_, i) => ({ time: '10:00', title: 'x'.repeat(200) + i, done: false }))
  const s = buildSnapshot({ ...base, stopsOf: many, today: 1 })
  assert.equal(s.days[0].stops.length, 12)
  assert.ok(s.days[0].stops[0].title.length <= 48)
  assert.ok(JSON.stringify(s).length < 3500)
  assert.deepEqual(Object.keys(s).sort(), ['days', 'lang', 'numDays', 'start', 'trip', 'v'])
})
console.log(n + ' passed')
