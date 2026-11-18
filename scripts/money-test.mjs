// Tests for money and offline writes (src/money.ts, src/outbox.ts, parseAmount): `node scripts/money-test.mjs`.
// The code under test is bundled with esbuild into a throwaway dir outside the repo; browser globals are stubbed.
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmp = process.env.MONEY_TEST_TMP || join(tmpdir(), 'toogo-money-test')
mkdirSync(tmp, { recursive: true })

async function bundle(name, source) {
  const entry = join(tmp, name + '-entry.ts')
  writeFileSync(entry, source)
  const out = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18', logLevel: 'silent' })
  return out.outputFiles[0].text
}
const load = (code, tag) => import('data:text/javascript;base64,' + Buffer.from(code + `\n// ${tag}`).toString('base64'))

// parseAmount is expected in src/money.ts (today it is private to src/views/Expenses.tsx), and fmtAmount (a row's amount
// as text) too; `import * as` so a missing export fails its test instead of stopping the whole script
const moneyCode = await bundle('money', `import * as M from '${root}/src/money'\nexport { M }`)
const M = (await load(moneyCode, "money")).M
const outboxCode = await bundle('outbox', `export * from '${root}/src/outbox'`)

let bad = 0
const test = (name, fn) => {
  return Promise.resolve().then(fn).then(
    () => console.log('PASS ' + name),
    (e) => { bad++; console.log('FAIL ' + name + '\n       ' + String(e?.message ?? e).split('\n').join('\n       ')) },
  )
}
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`) }
const truthy = (c, msg) => { if (!c) throw new Error(msg) }
const mustHave = (name) => { if (typeof M[name] !== 'function') throw new Error(`src/money.ts does not export ${name}`) }

// ---- 1. parseAmount: a valid amount is a finite number above 0 and at most 1e9; anything else is not valid.
// Text that is not a number at all (currency sign, letters, Infinity) must be NaN, which is not the same as 0.
const valid = (r) => typeof r === 'number' && Number.isFinite(r) && r > 0 && r <= 1e9
for (const s of ['Infinity', '1e400', '1e3', '0x10', '-5', '0', '', 'abc', '¥500', '500 ₪', '1e9999', '2000000000']) {
  await test(`parseAmount rejects ${JSON.stringify(s)}`, () => { mustHave('parseAmount'); truthy(!valid(M.parseAmount(s)), `accepted as ${M.parseAmount(s)}`) })
}
for (const s of ['¥500', 'abc', 'Infinity', '1e400']) {
  await test(`parseAmount ${JSON.stringify(s)} is "not a number" (NaN), not 0`, () => { mustHave('parseAmount'); truthy(Number.isNaN(M.parseAmount(s)), `got ${M.parseAmount(s)}`) })
}
for (const [s, want] of [['12.5', 12.5], ['12', 12], ['1,234.50', 1234.5], [' 7 ', 7], ['1000000000', 1e9]]) {
  await test(`parseAmount accepts ${JSON.stringify(s)} -> ${want}`, () => { mustHave('parseAmount'); eq(M.parseAmount(s), want, 'value') })
}

// ---- 2. settle-up: one threshold (1 shekel, by the trip rate) in both views
const A = 'a', B = 'b'
const parties = [{ key: 'p:a', label: 'A', ids: [A] }, { key: 'p:b', label: 'B', ids: [B] }]
const exp = (amount, currency) => ({ id: 'e', trip_id: 't', kind: 'expense', title: '', amount, currency, paid_by: A, split_among: [A, B], category: null, spent_on: '2026-11-10', created_by: A, created_at: '' })
const RATE = 0.025
const views = (amount) => {
  const e = [exp(amount, 'JPY')]
  return {
    jpy: M.settleUp(M.balances(e, [A, B], 'JPY', RATE), parties, 'JPY', RATE),
    ils: M.settleUp(M.balances(e, [A, B], 'ILS', RATE), parties, 'ILS', RATE),
  }
}
await test('settle-up: 150 yen split by 2 (75 yen = 1.9 shekels) is shown in BOTH views', () => {
  const v = views(150)
  truthy(v.ils.length === 1, 'shekel view should show the debt (it does today)')
  truthy(v.jpy.length === 1, 'yen view says settled while the shekel view says someone owes')
})
await test('settle-up: 40 yen split by 2 (20 yen = 0.5 shekel) is hidden in BOTH views', () => {
  const v = views(40)
  eq([v.jpy.length, v.ils.length], [0, 0], 'transfers [yen, shekel]')
})
await test('settle-up: the two views never disagree (150..1..) on whether a debt is shown', () => {
  const diff = []
  for (let y = 10; y <= 400; y += 10) { const v = views(y); if ((v.jpy.length > 0) !== (v.ils.length > 0)) diff.push(y) }
  eq(diff, [], 'yen amounts where the views disagree')
})

// ---- 5. zero-sum
await test('balances add up to zero (random expenses, a member who left is not in the list)', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const ids = ['m1', 'm2', 'm3', 'm4'], gone = 'left1'
  for (let run = 0; run < 200; run++) {
    const all = [...ids, gone]
    const es = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => {
      const split = all.filter(() => rnd() < 0.6); if (!split.length) split.push(all[0])
      return { ...exp(Math.round(rnd() * 500000) / 100, rnd() < 0.5 ? 'JPY' : 'ILS'), paid_by: all[Math.floor(rnd() * all.length)], split_among: split }
    })
    for (const cur of ['JPY', 'ILS']) {
      const sum = Object.values(M.balances(es, ids, cur, RATE)).reduce((s, v) => s + v, 0)
      if (sum !== 0) throw new Error(`run ${run} ${cur}: sum ${sum}`)
    }
  }
})
await test('an empty split_among is rejected or ignored; money never vanishes (sum 0, all finite)', () => {
  const es = [exp(100, 'ILS'), { ...exp(50, 'ILS'), split_among: [] }]
  let bal
  try { bal = M.balances(es, [A, B], 'ILS', RATE) } catch { return } // rejecting is fine
  const vals = Object.values(bal)
  truthy(vals.every(Number.isFinite), 'a balance is not finite: ' + JSON.stringify(bal))
  eq(vals.reduce((s, v) => s + v, 0), 0, 'sum of balances')
})

// ---- 6. row amount text
await test('a row amount shows 2 decimals for shekels (fmtAmount(12.5,"ILS") = "₪12.50")', () => {
  mustHave('fmtAmount')
  eq(M.fmtAmount(12.5, 'ILS'), '₪12.50', 'shekels')
  eq(M.fmtAmount(1234.5, 'ILS'), '₪1,234.50', 'shekels, thousands')
  eq(M.fmtAmount(1200, 'JPY'), '¥1,200', 'yen')
})

// ---- 3 and 4. outbox
const UID = 'user-1'
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const JWT = `${b64({ alg: 'none' })}.${b64({ sub: UID })}.sig`
let tag = 0
async function rig() {
  const calls = []
  let script = () => new Response(null, { status: 201 })
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  const nav = { onLine: true }
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
  globalThis.window = { addEventListener() {}, dispatchEvent() { return true } }
  globalThis.document = { addEventListener() {}, visibilityState: 'hidden' }
  globalThis.fetch = async (url, init = {}) => {
    const call = { url: String(url), method: init.method ?? 'GET', headers: Object.fromEntries(new Headers(init.headers)), body: init.body ?? null }
    calls.push(call)
    return script(call, calls.length)
  }
  const O = await load(outboxCode, 'outbox' + ++tag)
  O.startOutbox('https://x.test', 'anon', async () => JWT)
  O.setOutboxUser(UID)
  return { O, calls, nav, onFetch: (f) => { script = f } }
}
const post = (O, n, body = { amount: n }) => O.outboxFetch('https://x.test/rest/v1/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const lostReply = () => { throw new TypeError('Failed to fetch') }
const reply = (status) => () => new Response(status === 204 ? null : '{}', { status })
const bodyOf = (c) => JSON.parse(c.body)
const one = (b) => (Array.isArray(b) ? b[0] : b)

await test('outbox: the first send carries a client-made row id', async () => {
  const r = await rig(); r.onFetch(lostReply)
  await post(r.O, 1)
  truthy(one(bodyOf(r.calls[0])).id, 'first send had no id: ' + r.calls[0].body)
})
await test('outbox: after a lost reply the retry reuses the SAME id and sends Prefer ignore-duplicates', async () => {
  const r = await rig(); r.onFetch(lostReply)
  await post(r.O, 1)
  r.onFetch(reply(201)); await r.O.flush()
  const first = one(bodyOf(r.calls[0])).id, retry = r.calls[r.calls.length - 1]
  truthy(first, 'first send had no id, so a retry cannot be matched to it')
  eq(one(bodyOf(retry)).id, first, 'retry id')
  truthy(/resolution=ignore-duplicates/.test(retry.headers.prefer ?? ''), 'retry Prefer header: ' + retry.headers.prefer)
})
await test('outbox: a 409 duplicate-key reply on a row with our id counts as success (row dropped)', async () => {
  const r = await rig(); r.onFetch(lostReply)
  await post(r.O, 1)
  r.onFetch(() => new Response(JSON.stringify({ code: '23505' }), { status: 409 })); await r.O.flush()
  eq(r.O.pending().length, 0, 'rows left in queue')
})
for (const status of [400, 403, 404]) {
  await test(`outbox: a ${status} reply keeps the row in the queue (not dropped silently)`, async () => {
    const r = await rig(); r.nav.onLine = false
    await post(r.O, 1); r.nav.onLine = true
    r.onFetch(reply(status)); await r.O.flush()
    eq(r.O.pending().length, 1, 'rows left in queue')
  })
}
for (const status of [408, 429]) {
  await test(`outbox: a ${status} reply is retried like a network error (kept, sent on the next flush)`, async () => {
    const r = await rig(); r.nav.onLine = false
    await post(r.O, 1); r.nav.onLine = true
    r.onFetch(reply(status)); await r.O.flush()
    eq(r.O.pending().length, 1, 'rows left after the ' + status)
    r.onFetch(reply(201)); await r.O.flush()
    eq(r.O.pending().length, 0, 'rows left after the next flush')
  })
}
await test('outbox: a 5xx on row 1 does not stop row 2 from being tried', async () => {
  const r = await rig(); r.nav.onLine = false
  await post(r.O, 1); await post(r.O, 2); r.nav.onLine = true
  r.onFetch((c) => (one(bodyOf(c)).amount === 1 ? new Response('{}', { status: 500 }) : new Response(null, { status: 201 })))
  await r.O.flush()
  truthy(r.calls.some((c) => one(bodyOf(c)).amount === 2), 'row 2 was never sent')
})

console.log(bad ? `\n${bad} FAILED` : 'ok')
process.exit(bad ? 1 : 0)
