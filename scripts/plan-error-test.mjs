// What a failed planner run may tell the app: a short code and a fixed line, never the raw error or its stack.
// The helpers in plan-trip/errors.ts are run; index.ts (a Deno entry, not runnable here) is read as text for what it
// sends. `node scripts/plan-error-test.mjs`
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'supabase/functions/plan-trip')
let failed = 0
const t = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed++ }

const load = async (file) => {
  try {
    const b = await build({ entryPoints: [join(dir, file)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
    return await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'))
  } catch {
    return null // the file is not there yet
  }
}
const X = await load('errors.ts')
t(!!X?.failBody, 'plan-trip/errors.ts gives the body of a failed answer')
if (X?.failBody) {
  const secret = new Error('connect ECONNREFUSED postgres://user:pw@db.internal:5432 at run (index.ts:400)')
  for (const code of ['plan_failed', 'stays_failed']) {
    const body = JSON.stringify(X.failBody(code, secret))
    t(JSON.parse(body).error === code, `${code}: the answer carries the code`)
    t(!/postgres|ECONNREFUSED|index\.ts|pw@/.test(body), `${code}: the answer carries nothing of the raw error`)
    t(JSON.parse(body).message.length > 0 && JSON.parse(body).message.length <= 80, `${code}: the answer has a short fixed line`)
  }
}

const src = readFileSync(join(dir, 'index.ts'), 'utf8')
const both = src + '\n' + (() => { try { return readFileSync(join(dir, 'lease.ts'), 'utf8') } catch { return '' } })()
// every place index.ts answers or writes plan_state from a caught error
const leaks = both.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /(json\(|\.update\().*\be\b[^a-zA-Z]*(\.message|\.stack)|String\(e\b/.test(l))
t(leaks.length === 0, `index.ts and lease.ts send or store no raw error text${leaks.length ? ' (lines of the two together ' + leaks.map(([n]) => n).join(', ') + ')' : ''}`)
// every `catch (e)` that handles a failed run logs the error itself, directly or through fail()
const lines = both.split('\n')
const caught = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /catch \(e\)/.test(l))
const silent = caught.filter(([n]) => !/console\.error\(|\bfail\(/.test(lines.slice(n, n + 3).join('\n')))
t(caught.length >= 3 && silent.length === 0, `each caught failure is logged${silent.length ? ' (not at lines ' + silent.map(([n]) => n).join(', ') + ')' : ''}`)
t(/const fail = [^\n]*\n\s*console\.error\(code, tid, e\)/.test(src), 'fail() writes the error to the function log')

// --- the same failure twice in a row: the app must see the second one too ---
// A stand-in for the plan_state table (one row) that takes the calls loop() makes, and the app's own rule from
// src/App.tsx: it reads the row, asks for a plan, and calls it failed when `row.error && row.error !== before.error`.
const L = await load('lease.ts')
t(!!L?.loop && !!X?.failMark, 'plan-trip/lease.ts holds the run loop, errors.ts the mark of a failed run')
if (L?.loop && X?.failMark) {
  const table = () => {
    const row = { trip_id: 'T', lease_until: null, dirty: false, ran_at: null, error: null, summary: null }
    const writes = []
    const free = () => row.lease_until === null || row.lease_until < new Date().toISOString()
    const admin = {
      from: (name) => {
        if (name !== 'plan_state') throw new Error('unexpected table ' + name)
        return {
          upsert: async () => ({ data: null, error: null }),
          update: (patch) => {
            let guarded = false
            const apply = () => {
              if (guarded && !free()) return { data: [], error: null }
              const unknown = Object.keys(patch).filter((k) => !(k in row))
              if (unknown.length) return { data: null, error: { message: 'no column ' + unknown.join(',') } }
              Object.assign(row, patch)
              writes.push({ ...patch })
              return { data: [{ trip_id: row.trip_id }], error: null }
            }
            const q = {
              eq: () => q,
              or: () => ((guarded = true), q),
              select: () => q,
              then: (ok, no) => Promise.resolve(apply()).then(ok, no),
            }
            return q
          },
          select: () => ({ eq: () => ({ single: async () => ({ data: { dirty: row.dirty }, error: null }) }) }),
        }
      },
    }
    return { row, writes, admin }
  }
  const boom = async () => { throw new Error('connect ECONNREFUSED postgres://user:pw@db.internal:5432') }
  const fine = async () => ({ stats: { placed: 1 }, summary: { ok: true } })
  const quiet = console.error
  const logged = []
  console.error = (...a) => logged.push(a)
  const seenByApp = (before, row) => (row.error && row.error !== before.error ? 'failed' : row.ran_at && row.ran_at !== before.ran_at && !row.dirty ? 'done' : 'still working')

  const s = table()
  let before = { ...s.row }
  await L.loop(s.admin, 'T', boom, 0)
  t(seenByApp(before, s.row) === 'failed', 'a first failed run: the app sees it failed')
  const first = s.row.error
  t(/^plan_failed/.test(first) && !/postgres|ECONNREFUSED|pw@/.test(first), `plan_state.error is the code and when, nothing of the raw error (${first})`)
  t(s.row.lease_until === null, 'the lease is given back after a failed run')
  await new Promise((r) => setTimeout(r, 5))
  before = { ...s.row }
  await L.loop(s.admin, 'T', boom, 0)
  t(seenByApp(before, s.row) === 'failed', `the same failure a second time: the app sees it failed again (${s.row.error})`)
  t(s.row.error !== first, 'the second failure is told apart from the first')
  t(logged.length === 2 && logged.every((a) => a.some((x) => x instanceof Error)), 'each failed run wrote the error itself to the function log')

  // each run starts clean: the old failure is gone the moment the lease is taken, before the run has an answer
  let during = 'unset'
  before = { ...s.row }
  await L.loop(s.admin, 'T', async () => { during = s.row.error; return fine() }, 0)
  t(during === null, 'taking the lease clears the last failure, so a run in progress shows none')
  t(seenByApp(before, s.row) === 'done' && s.row.error === null, 'a run that works after a failed one: the app sees it done')

  // a request while one runs still only marks the trip dirty and does not clear anything
  const b = table()
  b.row.lease_until = new Date(Date.now() + 60_000).toISOString()
  b.row.error = 'plan_failed:2026-01-01T00:00:00.000Z'
  const r = await L.loop(b.admin, 'T', fine, 0)
  t(r.queued === true && b.row.dirty === true && b.row.error === 'plan_failed:2026-01-01T00:00:00.000Z', 'a request during a run only marks the trip for one more run')
  console.error = quiet
}
t(/import \{ loop \} from '\.\/lease\.ts'/.test(src) && !/async function loop\(/.test(src), 'index.ts runs the loop from lease.ts')

console.log(failed ? `\n${failed} check(s) failed` : '\nok')
process.exit(failed ? 1 : 0)
