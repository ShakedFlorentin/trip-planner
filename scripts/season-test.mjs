// Tests for the seasonal card notes (src/season.ts): `node scripts/season-test.mjs`.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// i18n reads the language from localStorage when it loads, so each language gets its own copy of the module
const load = async (lang) => {
  const out = await build({ entryPoints: [join(root, 'src/season.ts')], bundle: true, write: false, format: 'esm', platform: 'node' })
  globalThis.localStorage = { getItem: () => lang }
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text + `\n// ${lang}`).toString('base64'))
}
const he = await load('he')
const en = await load('en')

let bad = 0
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) bad++
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`))
}
const { tripSeason, seasonNote, datedNotes, onlyLine } = he

// season of a trip
eq('Feb 20 + 14 days: 9 winter, 5 spring -> winter', tripSeason('2027-02-20', 14), 'winter')
eq('Feb 26 + 7 days: 3 winter, 4 spring -> spring', tripSeason('2027-02-26', 7), 'spring')
eq('Feb 25 + 10 days: 4 winter, 6 spring -> spring', tripSeason('2027-02-25', 10), 'spring')
eq('exact tie, Feb 27 + 4 days (2 winter, 2 spring) -> earlier', tripSeason('2027-02-27', 4), 'winter')
eq('exact tie, Nov 29 + 4 days (2 autumn, 2 winter) -> the one the trip is in first', tripSeason('2026-11-29', 4), 'autumn')
eq('year boundary: Dec 28 + 7 days -> winter', tripSeason('2026-12-28', 7), 'winter')
eq('leap day counts: Feb 28 2028 + 2 days -> winter', tripSeason('2028-02-28', 2), 'winter')
eq('one day', tripSeason('2026-07-15', 1), 'summer')
eq('autumn trip', tripSeason('2026-10-01', 10), 'autumn')
eq('no start date', tripSeason(null, 10), null)
eq('bad start date', tripSeason('soon', 10), null)

// the note
const s = { winter: { he: 'קר', en: 'Cold' }, spring: { he: 'פריחה' }, summer: { en: 'Hot' }, autumn: { he: ' ', en: ' ' } }
eq('he note', seasonNote(s, 'winter', false), 'קר')
eq('en note', seasonNote(s, 'winter', true), 'Cold')
eq('en missing -> he', seasonNote(s, 'spring', true), 'פריחה')
eq('he missing -> en', seasonNote(s, 'summer', false), 'Hot')
eq('blank text -> null', seasonNote(s, 'autumn', false), null)
eq('season not on card -> null', seasonNote({ winter: { he: 'x' } }, 'summer', false), null)
eq('no season -> null', seasonNote(s, null, false), null)
eq('no seasonal -> null', seasonNote(null, 'winter', false), null)

// dated notes: [from, to] inclusive against the trip's first and last day
const d = { dated: [{ from: '2026-12-28', to: '2026-12-31', he: 'סגור', en: 'Closed' }] }
eq('trip ends on from (Dec 28)', datedNotes(d, '2026-12-25', 4, false), ['סגור'])
eq('trip ends the day before from', datedNotes(d, '2026-12-25', 3, false), [])
eq('trip starts on to (Dec 31)', datedNotes(d, '2026-12-31', 5, false), ['סגור'])
eq('trip starts the day after to', datedNotes(d, '2027-01-01', 5, false), [])
eq('trip inside the range', datedNotes(d, '2026-12-29', 1, false), ['סגור'])
eq('range inside the trip', datedNotes(d, '2026-12-01', 60, true), ['Closed'])
eq('no start date', datedNotes(d, null, 5, false), [])
eq('no dated', datedNotes({}, '2026-12-29', 3, false), [])
eq('en missing -> he', datedNotes({ dated: [{ from: '2026-12-28', to: '2026-12-28', he: 'סגור' }] }, '2026-12-28', 1, true), ['סגור'])

// the "only" line
eq('winter place on a summer trip (he)', onlyLine({ only: ['winter'] }, 'summer'), 'בעיקר בחורף')
eq('winter place on a summer trip (en)', en.onlyLine({ only: ['winter'] }, 'summer'), 'Best in winter')
eq('two seasons (he)', onlyLine({ only: ['autumn', 'spring'] }, 'summer'), 'בעיקר באביב ובסתיו')
eq('two seasons (en)', en.onlyLine({ only: ['autumn', 'spring'] }, 'summer'), 'Best in spring and autumn')
eq('three seasons (en)', en.onlyLine({ only: ['winter', 'spring', 'autumn'] }, 'summer'), 'Best in autumn, winter and spring')
eq('autumn place (en), no a/an', en.onlyLine({ only: ['autumn'] }, 'spring'), 'Best in autumn')
eq('across new year (en)', en.onlyLine({ only: ['winter', 'autumn'] }, 'summer'), 'Best in autumn and winter')
eq('across new year (he)', onlyLine({ only: ['winter', 'autumn'] }, 'summer'), 'בעיקר בסתיו ובחורף')
eq('summer place (he)', onlyLine({ only: ['summer'] }, 'winter'), 'בעיקר בקיץ')
eq('spring place (he)', onlyLine({ only: ['spring'] }, 'autumn'), 'בעיקר באביב')
eq('autumn place (he)', onlyLine({ only: ['autumn'] }, 'spring'), 'בעיקר בסתיו')
eq('trip season is in only -> null', onlyLine({ only: ['winter'] }, 'winter'), null)
eq('year-round (no only) -> null', onlyLine({}, 'winter'), null)
eq('empty only -> null', onlyLine({ only: [] }, 'winter'), null)
eq('no trip season -> null', onlyLine({ only: ['winter'] }, null), null)

if (bad) {
  console.log(`\n${bad} failed`)
  process.exit(1)
}
console.log('\nall passed')
