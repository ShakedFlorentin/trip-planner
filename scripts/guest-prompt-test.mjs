// node scripts/guest-prompt-test.mjs: the sign-in prompt for a visitor (src/guestPrompt.ts) comes once after 8 swipes
// and once when the deck runs out, never every 12 swipes.
import { build } from 'esbuild'
import assert from 'node:assert/strict'

const out = await build({ entryPoints: ['src/guestPrompt.ts'], bundle: true, write: false, format: 'esm', platform: 'node' })
const P = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

// walk a visitor through `total` cards swiping one at a time; list the swipe numbers where the prompt showed
const walk = (total) => {
  let asked = { first: false, end: false }
  const at = []
  for (let swiped = 1; swiped <= total; swiped++) {
    const r = P.nextPrompt({ swiped, deckLeft: total - swiped, asked })
    asked = r.asked
    if (r.ask) at.push(swiped)
  }
  return at
}
assert.deepEqual(walk(48), [8, 48], '48 cards: once at 8, once at the end')
assert.deepEqual(walk(100), [8, 100], 'never every 12 swipes')
assert.deepEqual(walk(8), [8], 'the deck ends at the very swipe that asked: one ask')
assert.deepEqual(walk(5), [5], 'a short deck asks once, at its end')
assert.deepEqual(walk(1), [1])
// nothing swiped: an empty deck at open does not ask
assert.equal(P.nextPrompt({ swiped: 0, deckLeft: 0, asked: { first: false, end: false } }).ask, false)
// already asked at the end: nothing more
assert.equal(P.nextPrompt({ swiped: 48, deckLeft: 0, asked: { first: true, end: true } }).ask, false)
assert.equal(P.nextPrompt({ swiped: 20, deckLeft: 28, asked: { first: true, end: false } }).ask, false)
console.log('guest prompt ok')
