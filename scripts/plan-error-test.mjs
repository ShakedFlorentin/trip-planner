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

let X = null
try {
  const b = await build({ entryPoints: [join(dir, 'errors.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
  X = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'))
} catch {
  // no errors.ts yet
}
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
// every place index.ts answers or writes plan_state from a caught error
const leaks = src.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /(json\(|\.update\().*\be\b[^a-zA-Z]*(\.message|\.stack)|String\(e\b/.test(l))
t(leaks.length === 0, `index.ts sends or stores no raw error text${leaks.length ? ' (lines ' + leaks.map(([n]) => n).join(', ') + ')' : ''}`)
// every `catch (e)` that handles a failed run logs the error itself, directly or through fail()
const lines = src.split('\n')
const caught = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /catch \(e\)/.test(l))
const silent = caught.filter(([n]) => !/console\.error\(|\bfail\(/.test(lines.slice(n, n + 3).join('\n')))
t(caught.length >= 3 && silent.length === 0, `each caught failure is logged${silent.length ? ' (not at lines ' + silent.map(([n]) => n).join(', ') + ')' : ''}`)
t(/const fail = [^\n]*\n\s*console\.error\(code, tid, e\)/.test(src), 'fail() writes the error to the function log')

console.log(failed ? `\n${failed} check(s) failed` : '\nok')
process.exit(failed ? 1 : 0)
