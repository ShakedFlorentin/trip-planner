// Tests for src/screenLogic.ts (QA round 2026-11-16): `node scripts/screen-logic-test.mjs`.
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmp = join(tmpdir(), 'toogo-screen-logic-test')
mkdirSync(tmp, { recursive: true })
const entry = join(tmp, 'entry.ts')
writeFileSync(entry, `export * from '${root}/src/screenLogic'`)
const out = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const L = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

let bad = 0
const test = (name, fn) => {
  try {
    fn()
    console.log('PASS ' + name)
  } catch (e) {
    bad++
    console.log('FAIL ' + name + ': ' + e.message)
  }
}
const eq = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(JSON.stringify(a) + ' !== ' + JSON.stringify(b)) }

test('a report with no status counts as open, and keys on created_at when it has no id', () => {
  eq(L.reportStatus({}), 'open')
  eq(L.reportStatus({ status: 'fixed' }), 'fixed')
  eq(L.reportKey({ created_at: '2026-11-16T10:00:00Z' }), '2026-11-16T10:00:00Z')
  eq(L.reportKey({ id: 'r1', created_at: 'x' }), 'r1')
})

test('"all settled" only when loaded, without error, and with rows', () => {
  eq(L.canSayBalanced({ loading: true, error: false, rows: 0 }), false)
  eq(L.canSayBalanced({ loading: false, error: true, rows: 0 }), false)
  eq(L.canSayBalanced({ loading: false, error: false, rows: 0 }), false)
  eq(L.canSayBalanced({ loading: false, error: false, rows: 3 }), true)
})

const now = Date.parse('2026-11-16T12:00:00Z')
const side = (id) => ({ a1: 'A', a2: 'A', b1: 'B', b2: 'B' })[id] ?? id
const row = (o) => ({ id: 's1', kind: 'settlement', paid_by: 'a1', split_among: ['b1'], currency: 'ILS', spent_on: '2026-11-16', created_at: '2026-11-16T09:00:00Z', ...o })
const want = { from: 'a2', to: 'b2', currency: 'ILS', day: '2026-11-16', now }

test('payer and receiver of the same couple pair are twins', () => eq(!!L.findSettleTwin([row({})], want, side), true))
test('another currency, another day, another pair, or an old record is not a twin', () => {
  eq(L.findSettleTwin([row({ currency: 'JPY' })], want, side), undefined)
  eq(L.findSettleTwin([row({ spent_on: '2026-11-15' })], want, side), undefined)
  eq(L.findSettleTwin([row({ paid_by: 'b1', split_among: ['a1'] })], want, side), undefined)
  eq(L.findSettleTwin([row({ created_at: '2026-11-16T04:00:00Z' })], want, side), undefined)
})
test('an expense is not a twin, and the row being edited is skipped', () => {
  eq(L.findSettleTwin([row({ kind: 'expense' })], want, side), undefined)
  eq(L.findSettleTwin([row({})], { ...want, skipId: 's1' }, side), undefined)
})
test('a new expense starts in the shown currency', () => {
  eq(L.newExpenseCurrency('ILS'), 'ILS')
  eq(L.newExpenseCurrency('JPY'), 'JPY')
  eq(L.newExpenseCurrency('x'), 'ILS')
})
test('matches queue in arrival order and are shown one at a time', () => {
  const q = L.queueMatches(L.queueMatches([], ['m1', 'm2']), ['m3'])
  eq(q, ['m1', 'm2', 'm3'])
  eq(L.nextMatch(q), ['m2', 'm3'])
  eq(L.nextMatch(['m3']), [])
})
console.log(bad ? bad + ' failed' : 'all passed')
process.exit(bad ? 1 : 0)
