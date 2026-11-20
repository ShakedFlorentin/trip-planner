// node scripts/swipe-test.mjs: the row-release decision in src/swipeDecide.ts. A tiny nudge never fires the action;
// a real pull or a fast flick after real travel does; both text directions.
import { build } from 'esbuild'
import assert from 'node:assert/strict'

const out = await build({ entryPoints: ['src/swipeDecide.ts'], bundle: true, write: false, format: 'esm', platform: 'node' })
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const project = (v) => ((v / 1000) * 0.998) / (1 - 0.998) // same as src/spring.ts

// a finger moving `dist` px toward the start action (sign -k) in `ms`, steady, then optionally held `pause` ms before lifting
const run = (k, dist, ms, pause = 0, n = 6) => {
  const dir = -k // start action side
  const trail = Array.from({ length: n + 1 }, (_, i) => ({ t: (ms * i) / n, x: dir * dist * (i / n) }))
  const liftT = ms + pause
  const pos = dir * dist
  const v = S.releaseSpeed(trail, liftT)
  return { v, r: S.decideRelease({ pos, from: 0, k, v, endW: 152, startW: 76, hasStart: true, project }) }
}
const cases = [
  ['12px / 48ms', 12, 48, 0, false],
  ['20px / 80ms', 20, 80, 0, false],
  ['20px / 40ms', 20, 40, 0, false],
  ['30px / 240ms', 30, 240, 0, false],
  ['40px then 400ms pause', 40, 100, 400, false],
  ['48px fast', 48, 60, 0, false],
  ['120px slow', 120, 600, 0, true],
  ['100px slow', 100, 700, 0, true],
  ['70px fast flick', 70, 90, 0, true],
  ['70px then 300ms pause (no flick, 70 < 91)', 70, 200, 300, false],
]
for (const k of [1, -1]) {
  for (const [name, d, ms, pause, fires] of cases) {
    const { v, r } = run(k, d, ms, pause)
    console.log(`${k === 1 ? 'rtl' : 'ltr'} ${name.padEnd(42)} v=${Math.round(v)} -> ${r.kind}`)
    assert.equal(r.kind === 'action', fires, `${k} ${name} -> ${r.kind}`)
  }
}
// pause: speed is zero
assert.equal(S.releaseSpeed([{ t: 0, x: 0 }, { t: 50, x: 40 }], 450), 0)
// no start action: a nudge snaps back, a real pull toward the end actions opens them, a closed flick from open closes
for (const k of [1, -1]) {
  const d = (pos, from, v) => S.decideRelease({ pos, from, k, v, endW: 152, startW: 0, hasStart: false, project }).kind
  assert.equal(d(k * 12, 0, k * 250), 'close')
  assert.equal(d(k * 90, 0, 0), 'end')
  assert.equal(d(k * 152, k * 152, 0), 'end')
  assert.equal(d(k * 60, k * 152, k * -2000), 'close') // open row flicked shut
}
console.log('swipe-test ok')
