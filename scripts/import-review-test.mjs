// Booking-import review rules, the Places "whose" filter and the rating row (src/views/importReview.ts, placeWho.ts, ratingRow.ts).
// `node scripts/import-review-test.mjs`
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const load = async (f) => {
  const out = await build({ entryPoints: [join(root, f)], bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18' })
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
}
const { sameTime, readFlags, dateDropped } = await load('src/views/importReview.ts')
const { placeWhoOk } = await load('src/views/placeWho.ts')
const { ratingRow } = await load('src/views/ratingRow.ts')

let fails = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  got: ' + JSON.stringify(got)}`)
  if (!ok) fails++
}

// null times are never the same time (a round trip with no dates keeps both legs)
eq('null vs null', sameTime(null, null), false)
eq('null vs time', sameTime(null, '2026-12-12T07:00:00Z'), false)
eq('time vs null', sameTime('2026-12-12T07:00:00Z', null), false)
eq('same instant, two formats', sameTime('2026-12-12T07:00:00Z', '2026-12-12T07:00:00+00:00'), true)
eq('different times', sameTime('2026-12-12T07:00:00Z', '2026-12-13T07:00:00Z'), false)

// the same dup rule the sheet uses, with the real sameTime
const norm = (s) => s.trim().toLowerCase()
const isDup = (b, list) => list.some((h) => h.kind === b.kind && sameTime(h.starts_at, b.starts_at) && ((!!b.confirmation && h.confirmation === b.confirmation) || (norm(h.title) === norm(b.title) && (h.who ?? null) === (b.who ?? null))))
const leg = { kind: 'flight', title: 'TLV-TYO', starts_at: null, confirmation: 'ABC123', who: null }
eq('round trip, no dates, same code: both legs kept', isDup({ ...leg }, [{ ...leg }]), false)
const dated = { ...leg, starts_at: '2026-12-12T07:00:00Z' }
eq('same dated booking twice is still a duplicate', isDup(dated, [{ ...dated }]), true)

// flags
eq('flags: unknown dropped', readFlags(['bad_end', 'x', 'no_title']), ['bad_end', 'no_title'])
eq('flags: not an array', readFlags(undefined), [])
eq('outside trip drops date', dateDropped(readFlags(['starts_at_outside_trip'])), true)
eq('bad_start drops date', dateDropped(['bad_start']), true)
eq('end_before_start drops date', dateDropped(['end_before_start']), true)
eq('url_dropped alone keeps ticked', dateDropped(['url_dropped']), false)
eq('no_title alone keeps ticked', dateDropped(['no_title']), false)

// Places whose filter: A and B are couples, A is me
eq('no who: shown to everyone', placeWhoOk(null, 'mine', 'A'), true)
eq('mine: my place', placeWhoOk('A', 'mine', 'A'), true)
eq('mine: other couple place hidden', placeWhoOk('B', 'mine', 'A'), false)
eq('mine: shared place shown', placeWhoOk('A + B', 'mine', 'A'), true)
eq('B chip: my place hidden', placeWhoOk('A', 'B', 'A'), false)
eq('B chip: B place shown', placeWhoOk('B', 'B', 'A'), true)
eq('all: everything', placeWhoOk('B', 'all', 'A'), true)
eq('group: no who shown', placeWhoOk(null, 'group', 'A'), true)
eq('group: both liked shown', placeWhoOk('A + B', 'group', 'A'), true)
eq('group: one couple hidden', placeWhoOk('A', 'group', 'A'), false)

// rating row: no note key until your own note is known
eq('stars only before load', ratingRow({ library_id: 'L' }, 4, null, false), { library_id: 'L', stars: 4 })
eq('with note once known', ratingRow({ library_id: 'L' }, 4, 'x', true), { library_id: 'L', stars: 4, note: 'x' })
eq('known empty note is sent as null', ratingRow({ library_id: 'L' }, 4, null, true), { library_id: 'L', stars: 4, note: null })

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
