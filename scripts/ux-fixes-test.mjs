// Tests for the error text, the trip-not-found decision and the wallet line in src/screenLogic.ts:
// `node scripts/ux-fixes-test.mjs`. Runs in Hebrew and in English (the language is read once at load).
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmp = join(tmpdir(), 'toogo-ux-fixes-test')
mkdirSync(tmp, { recursive: true })
const entry = join(tmp, 'entry.ts')
writeFileSync(entry, `export * from '${root}/src/screenLogic'`)
const out = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const code = out.outputFiles[0].text

let bad = 0
const eq = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(JSON.stringify(a) + ' !== ' + JSON.stringify(b)) }
const test = (name, fn) => {
  try {
    fn()
    console.log('PASS ' + name)
  } catch (e) {
    bad++
    console.log('FAIL ' + name + ': ' + e.message)
  }
}
const setNav = (onLine) => Object.defineProperty(globalThis, 'navigator', { value: { onLine }, configurable: true, writable: true })

async function load(lang, salt) {
  globalThis.localStorage = { getItem: (k) => (k === 'lang' && lang === 'en' ? 'en' : null), setItem() {}, removeItem() {} }
  setNav(true)
  return import('data:text/javascript;base64,' + Buffer.from(code + '\n// ' + salt).toString('base64'))
}

const he = await load('he', 'he')
const en = await load('en', 'en')

for (const [name, L, E] of [['he', he, null], ['en', en, true]]) {
  const say = (he_, en_) => (E ? en_ : he_)

  test(name + ': offline message when the phone is offline, whatever the server said', () => {
    setNav(false)
    eq(L.errorText('permission denied'), say('אין אינטרנט, לא נשמר. נסו שוב כשיש קליטה.', 'No internet, not saved. Try again when you have signal.'))
    setNav(true)
  })
  test(name + ': network-ish messages count as offline', () => {
    for (const m of ['Failed to fetch', 'NetworkError when attempting', 'Load failed', 'request timed out']) {
      if (!/אין אינטרנט|No connection|No internet/i.test(L.errorText(m))) throw new Error('not offline text for ' + m + ': ' + L.errorText(m))
    }
  })
  test(name + ': row-level security gives the permission line, not the raw message', () => {
    const s = L.errorText('new row violates row-level security policy for table "bookings"')
    if (/row-level|policy|bookings/.test(s)) throw new Error('raw text leaked: ' + s)
    eq(s === L.errorText('permission denied for table x'), true)
  })
  test(name + ': duplicate, check and not-null each map to their own line', () => {
    const d = L.errorText('duplicate key value violates unique constraint')
    const c = L.errorText('new row violates check constraint "x"')
    const n = L.errorText('null value in column "title"')
    eq(new Set([d, c, n]).size >= 2, true)
    eq(c, n)
    for (const s of [d, c, n]) if (/constraint|column|key value/.test(s)) throw new Error('raw text leaked: ' + s)
  })
  test(name + ': unknown error gives the fallback, and a custom fallback wins', () => {
    const def = L.errorText('something odd')
    if (/something odd/.test(def)) throw new Error('raw text leaked')
    eq(L.errorText('something odd', 'custom'), 'custom')
    eq(L.errorText('', 'custom'), 'custom')
  })
  test(name + ': an upload error keeps the caller fallback but a network error still says offline', () => {
    eq(L.errorText('weird', 'upload failed'), 'upload failed')
    if (L.errorText('Failed to fetch', 'upload failed') === 'upload failed') throw new Error('offline hidden')
  })

  test(name + ': no error is no failure', () => eq(L.tripLoadFailure(null, true), ''))
  test(name + ': PGRST116 (no row: trip deleted or member removed) is gone', () => eq(L.tripLoadFailure({ code: 'PGRST116' }, true), 'gone'))
  test(name + ': PGRST116 with no session (anon request, expired login) is offline, never gone', () => eq(L.tripLoadFailure({ code: 'PGRST116' }, false), 'offline'))
  test(name + ': gone needs a confirmed user and a second empty answer', () => {
    eq(L.goneConfirmed(true, { error: null, data: null }), true)
    eq(L.goneConfirmed(false, { error: null, data: null }), false)
    eq(L.goneConfirmed(true, { error: { code: '503' }, data: null }), false)
    eq(L.goneConfirmed(true, { error: null, data: { id: 'x' } }), false)
    eq(L.goneConfirmed(true, null), false)
  })
  test(name + ': any other error, or one with no code, is offline, never gone', () => {
    eq(L.tripLoadFailure({ code: '' }, true), 'offline')
    eq(L.tripLoadFailure({}, true), 'offline')
    eq(L.tripLoadFailure({ code: '503' }, true), 'offline')
    eq(L.tripLoadFailure({ code: '42501' }, true), 'offline')
  })

  test(name + ': wand start: offline, refused, accepted, server hiccup', () => {
    eq(L.wandStartFailure({ error: null }, false), 'offline')
    eq(L.wandStartFailure(null, true), 'failed')
    eq(L.wandStartFailure({ error: { name: 'FunctionsFetchError' } }, true), 'offline')
    eq(L.wandStartFailure({ error: { name: 'FunctionsHttpError', context: { status: 401 } } }, true), 'failed')
    eq(L.wandStartFailure({ error: { name: 'FunctionsHttpError', context: { status: 403 } } }, true), 'failed')
    eq(L.wandStartFailure({ error: { name: 'FunctionsHttpError', context: { status: 504 } } }, true), '')
    eq(L.wandStartFailure({ error: null }, true), '')
  })

  test(name + ': wallet line is singular for 1 and plural with the number otherwise', () => {
    eq(L.creditsGivenText(1), say('קרדיט אחד הועבר לטיול. הוא זמין לכולם בטיול.', '1 credit moved to the trip. Everyone on the trip can use it.'))
    eq(L.creditsGivenText(5), say('5 קרדיטים הועברו לטיול. הם זמינים לכולם בטיול.', '5 credits moved to the trip. Everyone on the trip can use them.'))
    eq(L.creditsGivenText(2).includes('2'), true)
  })
}

if (bad) {
  console.log(bad + ' failed')
  process.exit(1)
}
console.log('all passed')
