// First-run events (src/track.ts trackOnce): once per account, nothing while counting is off, `node scripts/track-test.mjs`.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({
  entryPoints: [join(root, 'src/track.ts')], bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.VITE_BUILD': '"test"' },
  plugins: [{ name: 'stubs', setup(b) {
    for (const [re, name] of [[/^\.\/supabase$/, 'supabase'], [/^\.\/settings$/, 'settings'], [/^\.\/i18n$/, 'i18n'], [/^@capacitor\/core$/, 'core']])
      b.onResolve({ filter: re }, () => ({ path: name, namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({
      contents: a.path === 'supabase' ? 'export const supabase = { rpc: async (n, a) => { (globalThis.sent ??= []).push(...a.batch.events); return { error: null } } }'
        : a.path === 'settings' ? 'export const settings = () => ({ features: { counting: globalThis.serverCounting !== false } })'
        : a.path === 'i18n' ? 'export const lang = "he"'
        : 'export const Capacitor = { isNativePlatform: () => false }',
    }))
  } }],
})
const store = new Map()
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
globalThis.window = globalThis
globalThis.addEventListener = () => {}
globalThis.document = { addEventListener() {}, visibilityState: 'visible', referrer: '' }
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
globalThis.location = { search: '', hostname: 'x' }
const m = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
let bad = 0
const ok = (c, msg) => { if (!c) { bad++; console.log('  FAIL ' + msg) } else console.log('  ok   ' + msg) }
// the module's queue is private, so count what reaches the (stubbed) database after the 4 s batch timer
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const names = () => (globalThis.sent ?? []).map((e) => e.name)

m.trackOnce('first_swipe', 'u1', { liked: true })
m.trackOnce('first_swipe', 'u1', { liked: false })
m.trackOnce('first_swipe', 'u2', { liked: true })
m.trackOnce('first_match', undefined)
await wait(4500)
ok(names().filter((n) => n === 'first_swipe').length === 2, 'first_swipe once per account (u1 once, u2 once)')
ok(!names().includes('first_match'), 'no account id, nothing counted')

// the person's own switch is off: nothing is sent and nothing is remembered
globalThis.sent = []
m.setCounting(false)
m.trackOnce('first_plan', 'u1', { items: 3 })
await wait(4500)
ok(names().length === 0, 'opted out: nothing sent')
ok(!store.has('first:first_plan:u1'), 'opted out: not marked as done')
m.setCounting(true)
m.trackOnce('first_plan', 'u1', { items: 3 })
m.trackOnce('first_plan', 'u1', { items: 4 })
await wait(4500)
ok(names().filter((n) => n === 'first_plan').length === 1, 'opted back in: the first time still counts, once')

// the server's switch
globalThis.sent = []; globalThis.serverCounting = false
m.trackOnce('first_match', 'u1')
await wait(4500)
ok(names().length === 0 && !store.has('first:first_match:u1'), 'server counting off: nothing sent, nothing remembered')
console.log(bad ? `\n${bad} FAILED` : '\nALL PASS')
process.exit(bad ? 1 : 0)
