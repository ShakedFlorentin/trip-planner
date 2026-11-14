// node scripts/table-test.mjs: checks src/tableStore.ts (the shared copy of a trip table) with a fake Supabase:
// screens share one load and one channel, a burst of changes is followed by few loads, a delete on another trip
// loads nothing, and a reload asked during a load runs once after it.
import { build } from 'esbuild'
import assert from 'node:assert/strict'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let loads = 0, channels = 0, removed = 0, serverRows = [{ id: 'a', trip_id: 't1' }], loadMs = 60
let onChange = () => {}, onDelete = () => {}, onSwipeDelete = () => {}
const mem = new Map()
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }
globalThis.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }
globalThis.window = { addEventListener() {}, removeEventListener() {} }
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
globalThis.__fake = {
  from: () => ({ select: () => ({ eq: () => ({ order: async () => { loads++; const rows = [...serverRows]; await sleep(loadMs); return { data: rows, error: null } } }) }) }),
  channel: (name) => {
    channels++
    const mine = name.startsWith('candidates')
    const ch = { on: (_, f, cb) => { if (f.event === 'DELETE') { if (mine) onDelete = cb; else onSwipeDelete = cb } else if (mine) onChange = cb; return ch }, subscribe: () => ch }
    return ch
  },
  removeChannel: () => { removed++ },
}
const out = await build({ entryPoints: ['src/tableStore.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'stub-supabase', setup: (b) => { b.onResolve({ filter: /\/supabase$/ }, () => ({ path: 'supabase', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = globalThis.__fake' })) } }] })
const { tableStore, dropTableStores } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

// 1. three screens open the same table together: one channel, one load, all three see the rows
const s = tableStore('candidates', 't1', 'created_at')
assert.equal(s, tableStore('candidates', 't1', 'created_at'))
let seen = 0
const offs = [1, 2, 3].map(() => s.subscribe(() => seen++))
assert.equal(s.getState().loading, true)
await sleep(150)
assert.equal(loads, 1); assert.equal(channels, 1)
assert.deepEqual(s.getState().rows, [{ id: 'a', trip_id: 't1' }])
assert.equal(s.getState().loading, false); assert.equal(s.getState().stale, false)
assert.ok(seen >= 3)

// 2. 300 cards arrive over about 0.6 s (a new trip's first sync): a few loads, not 300, and the last one has them all
loads = 0
for (let i = 0; i < 300; i++) { serverRows.push({ id: 'c' + i, trip_id: 't1' }); onChange(); if (i % 5 === 4) await sleep(10) }
await sleep(700)
assert.ok(loads >= 1 && loads <= 4, `burst loads: ${loads}`)
assert.equal(s.getState().rows.length, 301)

// 3. a row deleted on another trip loads nothing; one of ours does; no keys at all (unknown row) does too
loads = 0
onDelete({ old: { id: 'someone-elses' } }); await sleep(450)
assert.equal(loads, 0)
serverRows = serverRows.filter((r) => r.id !== 'c7')
onDelete({ old: { id: 'c7' } }); await sleep(450)
assert.equal(loads, 1); assert.equal(s.getState().rows.length, 300)
onDelete({ old: {} }); await sleep(450)
assert.equal(loads, 2)
// a swipe's key is two columns
const sw = tableStore('swipes', 't1', 'created_at'); const offSw = sw.subscribe(() => {})
serverRows = [{ candidate_id: 'c1', user_id: 'u1', trip_id: 't1' }]
await sw.reload(); loads = 0
onSwipeDelete({ old: { candidate_id: 'c1', user_id: 'u2' } }); await sleep(450)
assert.equal(loads, 0)
onSwipeDelete({ old: { candidate_id: 'c1', user_id: 'u1' } }); await sleep(450)
assert.equal(loads, 1)
offSw()

// 4. a screen saves and asks for a reload while a load is in flight: exactly one more load, and it has the new row.
//    A delete that arrives during a load is followed by one more load too (the load may have read the row)
loads = 0; loadMs = 150; serverRows = [{ id: 'a', trip_id: 't1' }]
const first = s.reload(); await sleep(30)
serverRows.push({ id: 'new', trip_id: 't1' })
const second = s.reload(); s.reload()
await Promise.all([first, second])
assert.equal(loads, 2); assert.equal(s.getState().rows.length, 2)
loads = 0
const third = s.reload(); await sleep(30); onDelete({ old: { id: 'not-loaded-yet' } }); await third
assert.equal(loads, 2)
loadMs = 60

// 5. a failed load keeps the rows, says so, and marks them unconfirmed; the next good load clears it
const good = globalThis.__fake.from
globalThis.__fake.from = () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: null, error: { message: 'boom' } }) }) }) })
await s.reload()
assert.equal(s.getState().error, 'boom'); assert.equal(s.getState().stale, true); assert.equal(s.getState().rows.length, 2)
globalThis.__fake.from = good
await s.reload()
assert.equal(s.getState().error, ''); assert.equal(s.getState().stale, false)

// 6. moving between tabs: the last screen closes and another opens right away: same channel, no new load.
//    Left closed, the channel goes after a few seconds; the saved copy opens the next visit at once
loads = 0; channels = 0; removed = 0
offs.forEach((f) => f())
const off2 = s.subscribe(() => {})
await sleep(200)
assert.equal(loads, 0); assert.equal(channels, 0); assert.equal(removed, 0)
off2()
await sleep(3300)
assert.equal(removed, 2) // this table's channel, and the swipes one closed in step 3
dropTableStores()
const again = tableStore('candidates', 't1', 'created_at')
assert.notEqual(again, s)
assert.equal(again.getState().rows.length, 2); assert.equal(again.getState().loading, false); assert.equal(again.getState().stale, true)
console.log('table-test: ok')
