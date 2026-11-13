// Tests for when the app may ask for a rating (src/rating.ts): `node scripts/rating-test.mjs`.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const load = async (native) => {
  const out = await build({
    entryPoints: [join(root, 'src/rating.ts')], bundle: true, write: false, format: 'esm', platform: 'node',
    plugins: [{ name: 'stubs', setup(b) {
      b.onResolve({ filter: /^\.\/native$/ }, () => ({ path: 'native', namespace: 'stub' }))
      b.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: 'core', namespace: 'stub' }))
      b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({
        contents: a.path === 'native' ? `export const isNative = ${native}` : 'export const registerPlugin = () => ({ request: async () => { globalThis.asked = (globalThis.asked ?? 0) + 1; return { asked: true } } })',
      }))
    } }],
  })
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64') + '#' + Math.random())
}
const store = new Map()
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }
const DAY = 86_400_000
let bad = 0
const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m) } else console.log('  ok   ' + m) }

const web = await load(false)
ok(!web.mayAskForRating(), 'the website never asks')

store.clear()
const app = await load(true)
const first = Number(store.get('firstOpen'))
ok(first > 0, 'the first open is remembered')
ok(!app.mayAskForRating(first + DAY), 'not in the first two days')
ok(app.mayAskForRating(first + 2 * DAY), 'after two days, yes')
store.set('ratingAsks', JSON.stringify({ at: [first + 2 * DAY] }))
ok(!app.mayAskForRating(first + 100 * DAY), 'not again within 120 days')
ok(app.mayAskForRating(first + 123 * DAY), 'again after 120 days')
store.set('ratingAsks', JSON.stringify({ at: [1, 2, 3].map((n) => first + n * 200 * DAY) }))
ok(!app.mayAskForRating(first + 2000 * DAY), 'never more than three times')

store.clear(); store.set('firstOpen', String(Date.now() - 3 * DAY))
app.askForRating(0)
await new Promise((r) => setTimeout(r, 20))
ok(globalThis.asked === 1 && JSON.parse(store.get('ratingAsks')).at.length === 1, 'asking calls Apple once and is remembered')
app.askForRating(0)
await new Promise((r) => setTimeout(r, 20))
ok(globalThis.asked === 1, 'a second good moment the same day does not ask again')

console.log(bad ? `\n${bad} failure(s)` : '\nall good')
process.exit(bad ? 1 : 0)
