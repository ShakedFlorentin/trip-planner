// node scripts/sw-test.mjs: checks the page() part of public/sw.js with a fake worker scope: a slow network shows the
// saved page and still saves the new one; a captive-portal page or a non-html answer is never saved as the app shell.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const realSetTimeout = setTimeout
const store = new Map()
const cache = { match: async (u) => store.get(String(u))?.clone(), put: async (u, r) => void store.set(String(u), r) }
let timers = []
let net = () => { throw new Error('no net') }
const handlers = {}
const scope = {
  self: { registration: { scope: 'https://x.test/app/' }, addEventListener: (n, f) => (handlers[n] = f), location: { origin: 'https://x.test' }, skipWaiting() {}, clients: {} },
  caches: { open: async () => cache, keys: async () => [], delete: async () => true },
  fetch: (u, o) => net(u, o),
  URL, Request, Response, Promise, console,
  setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length },
}
vm.createContext(scope)
vm.runInContext(readFileSync('public/sw.js', 'utf8'), scope)

const SHELL = '<html><script src="./assets/index-abc.js"></script></html>'
const html = (body, ct = 'text/html; charset=utf-8') => new Response(body, { status: 200, headers: { 'content-type': ct } })
const nav = async (u = 'https://x.test/app/') => {
  const waits = []
  let answer
  handlers.fetch({ request: { method: 'GET', url: u, mode: 'navigate' }, respondWith: (p) => (answer = p), waitUntil: (p) => waits.push(p) })
  return { answer, settle: () => Promise.all(waits) }
}
const it = []; const test = (n, f) => it.push([n, f])
const HOME = 'https://x.test/app/'

test('fast network: the page is returned and saved', async () => {
  store.clear(); timers = []
  net = async () => html(SHELL)
  const { answer, settle } = await nav()
  assert.equal(await (await answer).text(), SHELL)
  await settle()
  assert.equal(await store.get(HOME).text(), SHELL)
})
test('slow network: the saved page is shown at once, the new one is saved when it arrives', async () => {
  store.set(HOME, html('<old assets/index-old.js>')); timers = []
  let done; net = () => new Promise((r) => (done = r))
  const { answer, settle } = await nav()
  await new Promise((r) => realSetTimeout(r, 5))
  timers.find((t) => t.ms === 4000).fn()
  assert.match(await (await answer).text(), /index-old/)
  done(html('<new assets/index-new.js>'))
  await settle()
  assert.match(await store.get(HOME).text(), /index-new/)
})
test('slow network and nothing saved: keeps waiting for the network', async () => {
  store.clear(); timers = []
  let done; net = () => new Promise((r) => (done = r))
  const { answer, settle } = await nav()
  await new Promise((r) => realSetTimeout(r, 5))
  timers.find((t) => t.ms === 4000).fn()
  await new Promise((r) => realSetTimeout(r, 5))
  done(html(SHELL))
  assert.equal(await (await answer).text(), SHELL)
  await settle()
})
test('network down: the saved page', async () => {
  store.set(HOME, html('<old assets/index-old.js>')); timers = []
  net = async () => { throw new TypeError('Failed to fetch') }
  const { answer } = await nav()
  assert.match(await (await answer).text(), /index-old/)
})
test('captive portal (200 html without our script) is shown but never saved', async () => {
  store.set(HOME, html('<old assets/index-old.js>')); timers = []
  net = async () => html('<html>Log in to the Wi-Fi</html>')
  const { answer, settle } = await nav()
  assert.match(await (await answer).text(), /Wi-Fi/)
  await settle()
  assert.match(await store.get(HOME).text(), /index-old/)
})
test('a non-html answer, or an error status, is never saved', async () => {
  store.set(HOME, html('<old assets/index-old.js>')); timers = []
  net = async () => html(SHELL, 'application/json')
  await (await nav()).settle()
  net = async () => new Response(SHELL, { status: 503, headers: { 'content-type': 'text/html' } })
  await (await nav()).settle()
  assert.match(await store.get(HOME).text(), /index-old/)
})
test('another page of the site does not replace the saved app page', async () => {
  store.set(HOME, html('<old assets/index-old.js>')); timers = []
  net = async () => html(SHELL)
  await (await nav('https://x.test/app/other')).settle()
  assert.match(await store.get(HOME).text(), /index-old/)
})

let failed = 0
for (const [n, f] of it) {
  try { await f(); console.log('ok   ' + n) } catch (e) { failed++; console.log('FAIL ' + n + '\n     ' + String(e.stack).split('\n').slice(0, 4).join('\n     ')) }
}
console.log(failed ? `\n${failed} failed` : `\nall ${it.length} passed`)
process.exit(failed ? 1 : 0)
