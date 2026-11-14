// node scripts/look-test.mjs: checks src/look.ts (card look time, roadmap step 11) with a fake clock and a fake page
// visibility; ./track is replaced by a stub (counting on).
import { build } from 'esbuild'
import assert from 'node:assert/strict'
let t = 0, vis = 'visible'; const handlers = []
globalThis.performance = { now: () => t }
globalThis.document = { get visibilityState() { return vis }, addEventListener: (_, f) => handlers.push(f) }
globalThis.localStorage = { getItem: () => null }
const out = await build({ entryPoints: ['src/look.ts'], bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'stub-track', setup: (b) => { b.onResolve({ filter: /\/track$/ }, () => ({ path: 'track', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const countingOn = () => true' })) } }] })
const L = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const flip = (v) => { vis = v; handlers.forEach((f) => f()) }
L.lookStart('a', true); t = 2000; L.lookPause('a')          // a: 2 s, then leaves the top
L.lookStart('b', false); t = 3000; flip('hidden'); t = 60000; flip('visible'); t = 61000  // b: 1 s + (hidden) + 1 s
assert.deepEqual(L.lookTake('b'), { look_ms: 2000, photos_seen: 0, opened: false })
t = 70000; L.lookStart('a', true); L.lookPhoto('a', 2); L.lookOpened('a'); t = 71500         // a back: +1.5 s, not the time it was away
assert.deepEqual(L.lookTake('a'), { look_ms: 3500, photos_seen: 2, opened: true })
L.lookStart('c'); t = 500000                                    // a phone left on the table: a minute at most
assert.equal(L.lookTake('c').look_ms, 60000)
assert.equal(L.lookTake('never'), null)
console.log('look-test: ok')
