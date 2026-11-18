// node scripts/search-share-test.mjs: the trip search matching (src/searchMatch.ts) and the share snapshot filter
// (src/shareSnapshot.ts), both bundled on the fly with esbuild.
import { build } from 'esbuild'
import assert from 'node:assert/strict'

const load = async (entry) => {
  const out = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent', define: { 'import.meta.env': '{}' } })
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
}
const { makeHas, norm } = await load('src/searchMatch.ts')
const { buildSnapshot } = await load('src/shareSnapshot.ts')

// ---- search ----
const find = (q, ...fields) => makeHas(q)(...fields)
// Hebrew: anywhere in the word (prefix letters)
assert.ok(find('טוקיו', 'בטוקיו'))
assert.ok(find('טיסה', 'הטיסה שלנו'))
assert.ok(!find('פריז', 'בטוקיו'))
// niqqud and geresh are ignored
assert.ok(find("ג'", 'ג׳ינזה'))
// English: start of a word only
assert.ok(find('one', 'One Piece cafe'))
assert.ok(find('shib', 'Shibuya Sky'))
assert.ok(find('sky', 'Shibuya Sky'))
assert.ok(!find('one', 'Hakone'))
assert.ok(!find('one', 'Sonezaki'))
assert.ok(find('ONE', 'the one'))
// Japanese: anywhere, not only at the start of a field
assert.ok(find('ラーメン', '一蘭 ラーメン 渋谷'))
assert.ok(find('渋谷', '東京都渋谷区'))
assert.ok(find('蘭', '一蘭'))
assert.ok(!find('寿司', '一蘭 ラーメン'))
// kana: hiragana finds katakana and the other way round, long-vowel mark and voiced marks kept
assert.ok(find('らーめん', 'ラーメン'))
assert.ok(find('ラーメン', 'らーめん'))
assert.ok(find('とんかつ', 'トンカツ屋'))
assert.ok(find('がっこう', 'ガッコウ'))
assert.ok(!find('かつ', 'カツ'.replace('カ', 'タ')))
assert.equal(norm('ラーメン'), 'らーめん')
// mixed query with kana is not word-start limited
assert.ok(find('ramen ラーメン', 'best ramen ラーメン'))
assert.ok(!find('x', null, undefined))

// ---- share snapshot ----
const mk = (o) => ({ id: o.id, name: o.name ?? 'P' + o.id, category: 'food', city: 'טוקיו', lat: 35.1, lng: 139.2, ...o })
const places = [
  mk({ id: 'a', name: 'Shared ramen' }),
  mk({ id: 'b', name: 'Couple secret', who: 'הזוג' }),
  mk({ id: 'c', name: 'Shared sight', category: 'sight' }),
  mk({ id: 'd', name: 'Hotel-ish', category: 'hotel' }),
]
const item = (id, place_id, extra = {}) => ({ id, day: 1, place_id, time: null, sort: 0, ...extra })
const items = [item('i1', 'a'), item('i2', 'b'), item('i3', 'c', { who: 'הזוג' }), item('i4', 'd')]
const trip = { id: 't', name: 'Japan', num_days: 2 }
const base = { trip, days: [], items, places, cards: [], withName: false, withTips: true }
const snap = buildSnapshot(base)
assert.deepEqual(snap.days.map((d) => d.stops.map((s) => s.name)), [['Shared ramen']])
assert.ok(!JSON.stringify(snap).includes('secret'))
// a day with only private stops disappears
assert.equal(buildSnapshot({ ...base, items: [item('x', 'b')] }).days.length, 0)

// tips: a library card's tip is shared, a member-typed one is not
const cards = [
  { id: 'k1', category: 'food', library_id: 'L1', tip: 'Go early', en: { tip: 'Go early EN' } },
  { id: 'k2', category: 'food', library_id: null, tip: 'our private note' },
]
const tp = [mk({ id: 'p1', candidate_id: 'k1' }), mk({ id: 'p2', candidate_id: 'k2' })]
const ts = buildSnapshot({ ...base, places: tp, cards, items: [item('j1', 'p1'), item('j2', 'p2')] })
assert.equal(ts.days[0].stops[0].tip, 'Go early')
assert.equal(ts.days[0].stops[0].tip_en, 'Go early EN')
assert.equal(ts.days[0].stops[1].tip, undefined)
assert.equal(buildSnapshot({ ...base, places: tp, cards, items: [item('j1', 'p1')], withTips: false }).days[0].stops[0].tip, undefined)

// caps match what the public page reads: 40 stops a day, 60 days
const many = Array.from({ length: 50 }, (_, n) => mk({ id: 'm' + n }))
const capped = buildSnapshot({ ...base, places: many, items: many.map((p, n) => item('q' + n, p.id, { sort: n })) })
assert.equal(capped.days[0].stops.length, 40)
const long = buildSnapshot({ ...base, trip: { ...trip, num_days: 80 }, places: [mk({ id: 'z' })], items: Array.from({ length: 80 }, (_, n) => item('d' + n, 'z', { day: n + 1 })) })
assert.equal(long.days.length, 60)
// skipped days are left out
assert.equal(buildSnapshot({ ...base, skipDays: new Set([1]) }).days.length, 0)

console.log('search-share-test ok')
