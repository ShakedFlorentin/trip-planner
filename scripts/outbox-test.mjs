// node scripts/outbox-test.mjs: checks src/outbox.ts (writes kept while there is no network) with a fake fetch:
// a write that never answers is queued after the timeout, the queue retries on a 15/30/60 s backoff, a 409 counts as
// "sent" only for a duplicate on our own row id (any other 409 is marked failed), and a full localStorage frees the
// saved screen copies (cache:*) before falling back to memory.
import { build } from 'esbuild'
import assert from 'node:assert/strict'

const realSetTimeout = globalThis.setTimeout
const sleep = (ms) => new Promise((r) => realSetTimeout(r, ms))
const tick = () => sleep(5)

// ---- fakes (set before the module loads: it reads localStorage on import)
const mem = new Map()
let quota = Infinity
globalThis.localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => {
    if (v.length + [...mem].reduce((n, [a, b]) => (a === k ? n : n + a.length + b.length), 0) > quota) throw new DOMException('full', 'QuotaExceededError')
    mem.set(k, v)
  },
  removeItem: (k) => mem.delete(k),
  key: (i) => [...mem.keys()][i],
  get length() { return mem.size },
}
Object.defineProperty(localStorage, 'keys', { value: () => [...mem.keys()] })
const origKeys = Object.keys
Object.keys = (o) => (o === globalThis.localStorage ? [...mem.keys()] : origKeys(o))
const events = []
globalThis.window = { addEventListener() {}, dispatchEvent: (e) => events.push(e.type) }
globalThis.document = { visibilityState: 'visible', addEventListener() {} }
let online = true
Object.defineProperty(globalThis, 'navigator', { value: { get onLine() { return online } }, configurable: true })

// timers: recorded, run by hand
let timers = []
globalThis.setTimeout = (fn, ms) => { const t = { fn, ms, on: true }; timers.push(t); return t }
globalThis.clearTimeout = (t) => { if (t) t.on = false }
const fire = async (pred) => {
  const t = timers.find((x) => x.on && pred(x))
  assert.ok(t, 'expected a timer')
  t.on = false
  t.fn()
  await tick(); await tick()
}

// fetch: a script of answers; 'hang' never answers until aborted
let calls = []
let answer = () => new Response(null, { status: 201 })
globalThis.fetch = (url, init = {}) => {
  calls.push({ url, ...init })
  const a = answer(url, init)
  if (a === 'hang')
    return new Promise((_, no) => {
      init.signal?.addEventListener('abort', () => no(new DOMException('aborted', 'AbortError')))
    })
  if (a instanceof Error) return Promise.reject(a)
  return Promise.resolve(a)
}

const out = await build({ entryPoints: ['src/outbox.ts'], bundle: true, write: false, format: 'esm', platform: 'node' })
const ob = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

const jwt = (sub) => 'x.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.y'
const U = 'user-1'
ob.startOutbox('https://x.supabase.co', 'key', async () => jwt(U))
ob.setOutboxUser(U)
await tick()
timers = []

const post = (table, rows) =>
  ob.outboxFetch(`https://x.supabase.co/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) })
const reset = () => {
  localStorage.removeItem('outbox')
  for (const p of [...ob.pending()]) ob.discardFailed(p.id)
}
const clean = async () => {
  // empty the queue between cases
  answer = () => new Response(null, { status: 201 })
  for (let i = 0; i < 3; i++) {
    await ob.flush()
    // let a planned retry run, so the module's own timer is free for the next case
    for (const t of timers.filter((x) => x.on && x.ms >= 15000)) { t.on = false; t.fn(); await tick() }
  }
  for (const p of ob.pending()) { if (p.failed) ob.discardFailed(p.id) }
  assert.equal(ob.pending().length, 0, 'queue emptied between cases')
  calls = []; timers = []; events.length = 0
}
const cases = []
const it = (name, f) => cases.push([name, f])

it('network fine: a write goes straight through and is not queued', async () => {
  answer = () => new Response(null, { status: 201 })
  const r = await post('expenses', { amount: 5 })
  assert.equal(r.status, 201)
  assert.equal(ob.pending().length, 0)
  assert.equal(calls.length, 1)
  assert.ok(calls[0].signal, 'the write carries an abort signal')
  assert.equal(timers.filter((t) => t.on).length, 0, 'the timeout timer is cleared once it answered')
})

it('online but no data: the write is queued after ~8 s, answers as saved, and carries the same row id on retry', async () => {
  answer = () => 'hang'
  const p = post('expenses', { amount: 7 })
  await tick()
  const t = timers.find((x) => x.on && x.ms === 8000)
  assert.ok(t, 'an 8 s timeout is set')
  t.fn()
  const r = await p
  assert.equal(r.status, 201)
  assert.equal(ob.pending().length, 1)
  const item = ob.pending()[0]
  assert.equal(item.tried, true, 'marked as possibly arrived')
  assert.ok(JSON.parse(item.body).id, 'row id made before the first send')
  assert.ok(timers.some((x) => x.on && x.ms === 15000), 'a retry is planned in 15 s')
  await clean()
})

it('a hanging queue gives up after one timeout and does not stall the next write', async () => {
  answer = () => 'hang'
  const first = post('expenses', { amount: 1 }); await tick()
  timers.find((x) => x.on && x.ms === 8000).fn(); await first
  calls = []
  // flush in the background hangs too
  const f = ob.flush(); await tick()
  timers.filter((x) => x.on && x.ms === 8000).forEach((x) => x.fn()); await f
  const t0 = calls.length
  const second = await post('expenses', { amount: 2 })   // must not wait for another flush
  assert.equal(second.status, 201)
  assert.equal(calls.length, t0, 'went to the queue with no new network call')
  assert.equal(ob.pending().length, 2)
  await clean()
})

it('backoff: 15 s, 30 s, then 60 s while the queue waits; success resets', async () => {
  answer = () => new TypeError('Failed to fetch')
  await post('expenses', { amount: 3 })
  const delays = []
  for (let i = 0; i < 4; i++) {
    const t = timers.filter((x) => x.on && x.ms >= 15000).at(-1)
    assert.ok(t, 'retry timer ' + i)
    delays.push(t.ms / 1000)
    await fire((x) => x === t)
  }
  assert.deepEqual(delays, [15, 30, 60, 60])
  answer = () => new Response(null, { status: 201 })
  const t = timers.filter((x) => x.on && x.ms >= 15000).at(-1)
  await fire((x) => x === t)
  assert.equal(ob.pending().length, 0, 'sent on the retry')
  assert.ok(events.includes('outbox-sent'))
  assert.equal(timers.filter((x) => x.on && x.ms >= 15000).length, 0, 'no timer once the queue is empty')
  await clean()
})

const queueOne = async (table, row) => {
  answer = () => new TypeError('Failed to fetch')
  await post(table, row)
  calls = []
  return ob.pending()[0]
}
const conflict = (code, details) => () => new Response(JSON.stringify({ code, details, message: 'x' }), { status: 409 })

it('409 duplicate on our own id: the first send arrived, so it counts as sent', async () => {
  const item = await queueOne('bookings', { title: 'Hotel' })
  const id = JSON.parse(item.body).id
  answer = conflict('23505', `Key (id)=(${id}) already exists.`)
  await ob.flush()
  assert.equal(ob.pending().length, 0)
  await clean()
})

it('409 FK violation: kept and marked failed, not dropped', async () => {
  const item = await queueOne('bookings', { title: 'Hotel' })
  answer = conflict('23503', 'Key (trip_id)=(zzz) is not present in table "trips".')
  await ob.flush()
  assert.equal(ob.pending().length, 1)
  assert.equal(ob.failedChanges().length, 1)
  assert.equal(ob.failedChanges()[0].failed, 409)
  assert.equal(ob.failedChanges()[0].id, item.id)
  await clean()
})

it('409 duplicate on another unique column (same booking twice): failed, not silently dropped', async () => {
  await queueOne('bookings', { title: 'Hotel' })
  answer = conflict('23505', 'Key (trip_id, kind, starts_at)=(a, b, c) already exists.')
  await ob.flush()
  assert.equal(ob.failedChanges().length, 1)
  await clean()
})

it('409 duplicate on a different id than ours: failed', async () => {
  await queueOne('bookings', { title: 'Hotel' })
  answer = conflict('23505', 'Key (id)=(someone-elses) already exists.')
  await ob.flush()
  assert.equal(ob.failedChanges().length, 1)
  await clean()
})

it('409 with an unreadable body: failed', async () => {
  await queueOne('bookings', { title: 'Hotel' })
  answer = () => new Response('<html>', { status: 409 })
  await ob.flush()
  assert.equal(ob.failedChanges().length, 1)
  await clean()
})

it('retry header: a booking/place/card insert with our own id is retried plain (ignore-duplicates would hide a real clash)', async () => {
  await queueOne('bookings', { title: 'Hotel' })
  answer = () => new Response(null, { status: 201 })
  await ob.flush()
  assert.equal(calls.length, 1)
  assert.ok(!/ignore-duplicates/.test(calls[0].headers.Prefer ?? ''), calls[0].headers.Prefer)
  assert.equal(ob.pending().length, 0)
  await clean()
})

it('retry header: an expense (no other unique rule) keeps ignore-duplicates, as before', async () => {
  await queueOne('expenses', { amount: 4 })
  answer = () => new Response(null, { status: 201 })
  await ob.flush()
  assert.match(calls[0].headers.Prefer, /resolution=ignore-duplicates/)
  await clean()
})

it('409 with only the code or a _pkey message: sent for an expense and for a booking when the message names the pkey; failed for a booking with nothing named', async () => {
  await queueOne('expenses', { amount: 5 })
  answer = () => new Response(JSON.stringify({ code: '23505' }), { status: 409 })
  await ob.flush()
  assert.equal(ob.pending().length, 0, 'expense, bare 23505')
  await queueOne('bookings', { title: 'A' })
  answer = () => new Response(JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint "bookings_pkey"' }), { status: 409 })
  await ob.flush()
  assert.equal(ob.pending().length, 0, 'booking, pkey message')
  await queueOne('bookings', { title: 'B' })
  answer = () => new Response(JSON.stringify({ code: '23505' }), { status: 409 })
  await ob.flush()
  assert.equal(ob.failedChanges().length, 1, 'booking, bare 23505 is unproven')
  await clean()
})

it('retry header: an insert with no row id of ours keeps ignore-duplicates', async () => {
  await queueOne('reports', { text: 'hi' })
  answer = () => new Response(null, { status: 201 })
  await ob.flush()
  assert.match(calls[0].headers.Prefer, /resolution=ignore-duplicates/)
  await clean()
})

it('other refusals and 5xx behave as before', async () => {
  await queueOne('expenses', { amount: 1 })
  answer = () => new Response('no', { status: 403 })
  await ob.flush()
  assert.equal(ob.failedChanges()[0].failed, 403)
  await clean()
  await queueOne('expenses', { amount: 2 })
  answer = () => new Response('no', { status: 503 })
  await ob.flush()
  assert.equal(ob.pending().length, 1)
  assert.equal(ob.failedChanges().length, 0)
  await clean()
})

it('storage full: screen copies are dropped and the queue is saved; the account id stays', async () => {
  mem.set('cache:trip:1', 'x'.repeat(2000))
  mem.set('cache:members:1', 'y'.repeat(2000))
  mem.set('cache:userId', '{"data":"u"}')
  mem.set('theme', 'dark')
  quota = 2000 + 300
  answer = () => new TypeError('Failed to fetch')
  await post('expenses', { amount: 9 })
  assert.ok(!mem.has('cache:trip:1') && !mem.has('cache:members:1'))
  assert.ok(mem.has('cache:userId') && mem.has('theme'))
  assert.equal(JSON.parse(mem.get('outbox')).length, 1, 'saved to localStorage')
  quota = Infinity
  await clean()
})

it('storage full and nothing to free: falls back to memory, the change is still queued', async () => {
  quota = 10
  answer = () => new TypeError('Failed to fetch')
  await post('expenses', { amount: 9 })
  assert.equal(ob.pending().length, 1)
  assert.ok(!mem.has('outbox') || mem.get('outbox').length <= 10)
  quota = Infinity
  await clean()
})

let failed = 0
for (const [name, f] of cases) {
  try {
    await f()
    console.log('ok   ' + name)
  } catch (e) {
    failed++
    console.log('FAIL ' + name + '\n     ' + (e.stack ?? e).toString().split('\n').slice(0, 4).join('\n     '))
  }
}
console.log(failed ? `\n${failed} failed` : `\nall ${cases.length} passed`)
process.exit(failed ? 1 : 0)
