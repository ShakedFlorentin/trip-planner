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
// a query the way the app builds it: from(t).select(cols).eq().order(), or .select('*').in('id', ids)
let slimLoads = 0, pieceLoads = 0, fullLoads = 0
const liveHandlers = {}, liveStatus = {}
const query = () => {
  const st = { cols: '*', ids: null }
  const b = {
    select: (c) => { st.cols = c; return b }, eq: () => b, order: () => b, in: (_, ids) => { st.ids = ids; return b },
    then: (ok, bad) => (async () => {
      loads++
      if (st.cols === 'id,rev') slimLoads++; else if (st.ids) pieceLoads++; else fullLoads++
      let rows = [...serverRows]
      await sleep(loadMs)
      if (st.ids) rows = rows.filter((r) => st.ids.includes(r.id))
      if (st.cols === 'id,rev') rows = rows.map((r) => ({ id: r.id, rev: r.rev }))
      return { data: rows, error: null }
    })().then(ok, bad),
  }
  return b
}
globalThis.__fake = {
  // the settings read at start (settings.ts, pulled in by live.ts) is not a table load
  from: (t) => (t === 'app_settings' ? { select: async () => ({ data: [], error: null }) } : query()),
  channel: (name) => {
    channels++
    const mine = name.startsWith('places')
    const ch = {
      on: (type, f, cb) => {
        if (type === 'broadcast') liveHandlers[name] = cb
        else if (f.event === 'DELETE') { if (mine) onDelete = cb; else onSwipeDelete = cb } else if (mine) onChange = cb
        return ch
      },
      subscribe: (cb) => { liveStatus[name] = cb; cb?.('SUBSCRIBED'); return ch },
    }
    return ch
  },
  removeChannel: () => { removed++ },
}
const out = await build({ entryPoints: ['src/tableStore.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'stub-supabase', setup: (b) => { b.onResolve({ filter: /\/supabase$/ }, () => ({ path: 'supabase', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = globalThis.__fake' })) } }] })
const { tableStore, dropTableStores } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

// 1. three screens open the same table together: one channel, one load, all three see the rows
const s = tableStore('places', 't1', 'created_at')
assert.equal(s, tableStore('places', 't1', 'created_at'))
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
globalThis.__fake.from = () => { const b = { select: () => b, eq: () => b, order: () => b, then: (ok) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(ok) }; return b }
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
const again = tableStore('places', 't1', 'created_at')
assert.notEqual(again, s)
assert.equal(again.getState().rows.length, 2); assert.equal(again.getState().loading, false); assert.equal(again.getState().stale, true)

// 7. the deck is read by revision: the whole deck once, then ids and revs, then only the cards that changed
mem.clear(); loadMs = 20; slimLoads = fullLoads = pieceLoads = 0
serverRows = Array.from({ length: 300 }, (_, i) => ({ id: 'k' + i, rev: 0, trip_id: 't2', name: 'card ' + i, created_at: String(1000 + i) }))
const deck = tableStore('candidates', 't2', 'created_at'); const offDeck = deck.subscribe(() => {})
await sleep(150)
assert.deepEqual([slimLoads, fullLoads, pieceLoads].join(), [1, 1, 0].join())   // nothing held: ids, then everything in one read
assert.equal(deck.getState().rows.length, 300)
slimLoads = fullLoads = pieceLoads = 0
await deck.reload()
assert.deepEqual([slimLoads, fullLoads, pieceLoads].join(), [1, 0, 0].join())   // all held at their rev: ids only
serverRows[5] = { ...serverRows[5], rev: 1, name: 'renamed' }                    // one changed,
serverRows.splice(10, 1)                                                         // one deleted,
serverRows.push({ id: 'new', rev: 0, trip_id: 't2', name: 'added', created_at: '9999' }) // one added
slimLoads = fullLoads = pieceLoads = 0
await deck.reload()
assert.deepEqual([slimLoads, fullLoads, pieceLoads].join(), [1, 0, 1].join())   // ids, and one read of the two cards
const dr = deck.getState().rows
assert.equal(dr.length, 300); assert.equal(dr[5].name, 'renamed'); assert.equal(dr.at(-1).id, 'new'); assert.ok(!dr.some((r) => r.id === 'k10'))
assert.equal(dr[6].name, 'card 6')
// a new visit starts from the saved deck: ids only again
dropTableStores(); slimLoads = fullLoads = pieceLoads = 0
const deck2 = tableStore('candidates', 't2', 'created_at'); const offDeck2 = deck2.subscribe(() => {})
await sleep(150)
assert.deepEqual([slimLoads, fullLoads, pieceLoads].join(), [1, 0, 0].join())
assert.equal(deck2.getState().rows.length, 300)
offDeck(); offDeck2()

// 8. live (features.live): one Broadcast channel per trip; rows that arrive are put in place with no read
mem.set('live', '1'); channels = 0
serverRows = [{ candidate_id: 'c1', user_id: 'u1', trip_id: 't3', liked: true, created_at: '2026-11-14T09:00:00+00:00' }]
const votes = tableStore('swipes', 't3', 'created_at'); const offVotes = votes.subscribe(() => {})
const lists = tableStore('checklist_items', 't3', 'created_at'); const offLists = lists.subscribe(() => {})
await sleep(150)
assert.equal(channels, 1)                                                        // two tables, one channel
const say = (payload) => liveHandlers['live:t3']({ event: 'change', payload })
loads = 0
say({ t: 'swipes', op: 'INSERT', n: 1, rows: [{ candidate_id: 'c2', user_id: 'u1', trip_id: 't3', liked: false, created_at: '2026-11-14T08:00:00+00:00' }] })
assert.deepEqual(votes.getState().rows.map((r) => r.candidate_id), ['c2', 'c1'])  // in the table's order, at once
say({ t: 'swipes', op: 'UPDATE', n: 1, rows: [{ candidate_id: 'c2', user_id: 'u1', trip_id: 't3', liked: true, created_at: '2026-11-14T08:00:00+00:00' }] })
assert.equal(votes.getState().rows.length, 2); assert.equal(votes.getState().rows[0].liked, true)
say({ t: 'swipes', op: 'DELETE', n: 1, rows: [{ candidate_id: 'c1', user_id: 'u1', trip_id: 't3' }] })
assert.deepEqual(votes.getState().rows.map((r) => r.candidate_id), ['c2'])
// this phone's own vote, as the server answered the write, and its undo: in place too
votes.put([{ candidate_id: 'c5', user_id: 'me', trip_id: 't3', liked: true, created_at: '2026-11-14T09:30:00+00:00' }])
assert.deepEqual(votes.getState().rows.map((r) => r.candidate_id), ['c2', 'c5'])
votes.remove([{ candidate_id: 'c5', user_id: 'me' }])
assert.deepEqual(votes.getState().rows.map((r) => r.candidate_id), ['c2'])
say({ t: 'bookings', op: 'INSERT', n: 1, rows: [{ id: 'b1', trip_id: 't3' }] })     // another table: not ours
await sleep(450)
assert.equal(loads, 0); assert.equal(votes.getState().rows.length, 1); assert.equal(lists.getState().rows.length, 1)
say({ t: 'swipes', op: 'INSERT', n: 300, rows: null })                           // too many to carry: one read of that table
await sleep(450)
assert.equal(loads, 1)
loads = 0
liveStatus['live:t3']('CHANNEL_ERROR'); liveStatus['live:t3']('SUBSCRIBED')        // the channel dropped and came back
await sleep(200)
assert.equal(loads, 2)                                                           // both tables read again
// the rows put in place are saved for the next visit
say({ t: 'swipes', op: 'INSERT', n: 1, rows: [{ candidate_id: 'c7', user_id: 'u1', trip_id: 't3', liked: true, created_at: '2026-11-14T10:00:00+00:00' }] })
offVotes(); offLists()
await sleep(3300)
assert.ok(JSON.parse(mem.get('cache:swipes:t3:created_at')).data.some((r) => r.candidate_id === 'c7'))
console.log('table-test: ok')
process.exit(0) // the settings refresh timer (settings.ts) would keep node open
