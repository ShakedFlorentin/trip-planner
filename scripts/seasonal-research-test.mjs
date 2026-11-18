// Test for the season-aware research pieces (supabase/functions/_shared/seasonal.ts) and that the two research functions
// no longer hard-code December 2026. `node scripts/seasonal-research-test.mjs`. No Claude call, no network.
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({ entryPoints: [join(root, 'supabase/functions/_shared/seasonal.ts')], bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18' })
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

let bad = 0
let n = 0
const ok = (c, m) => {
  n++
  if (!c) {
    bad++
    console.error('FAIL ' + m)
  }
}
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)}`)

// trip window
eq(S.tripWindow('2026-12-12', 20), { from: '2026-12-12', to: '2026-12-31' }, 'a 20-day trip from 12 Dec ends 31 Dec')
eq(S.tripWindow('2026-12-12', 1), { from: '2026-12-12', to: '2026-12-12' }, 'one day')
eq(S.tripWindow(null, 14), null, 'no start date: no window')
eq(S.tripWindow('2026-02-30', 14), null, 'impossible date: no window')
eq(S.tripWindow('2026-12-12', 0), null, 'zero days: no window')
const win = S.tripWindow('2026-12-12', 20)

// dates the model gives for closures
eq(S.datesInWindow(['2026-12-28', '2026-12-31', '2026-12-05', '2027-01-02', 'x', '2026-12-28'], win), ['2026-12-28', '2026-12-31'], 'only dates inside the trip, once each')
eq(S.datesInWindow(['2026-12-28'], null), [], 'no trip dates: no closed/open dates')

// prompts
ok(!/December|2026-12|12 and 31/.test(S.researchWho(null) + S.researchSeasonBullets(null) + S.extractSeasonRules(null)), 'no December in the no-dates prompts')
ok(S.researchSeasonBullets(null).includes('cherry') && !S.researchSeasonBullets(null).includes('closures between'), 'no-dates research asks about seasons, not closure dates')
ok(S.researchSeasonBullets(win).includes('closures between 2026-12-12 and 2026-12-31'), 'with dates the closure research is for those dates')
ok(S.extractSeasonRules(null).includes('always [] (no trip dates are known)'), 'no dates: dated is always []')

// cleanSeasonal
const good = {
  winter: { he: 'קר, כדאי מעיל.', en: 'Cold, bring a coat.' },
  spring: { he: '', en: '' },
  summer: { he: 'חם', en: '' },
  autumn: { he: 'עלים אדומים.', en: 'Red leaves.' },
  only: ['winter', 'winter', 'monsoon'],
  dated: [
    { from: '2026-12-28', to: '2026-12-31', he: 'סגור.', en: 'Closed.' },
    { from: '2026-06-01', to: '2026-06-05', he: 'מחוץ לטיול', en: 'outside the trip' },
    { from: '2026-12-31', to: '2026-12-28', he: 'הפוך', en: 'reversed' },
    { from: '2026-12-20', to: '2026-12-21', he: 'אין אנגלית', en: '' },
  ],
}
const c = S.cleanSeasonal(good, win)
eq(Object.keys(c).sort(), ['autumn', 'dated', 'only', 'winter'], 'empty or half-empty seasons are dropped, the rest kept')
eq(c.only, ['winter'], 'only: valid, once')
eq(c.dated, [{ from: '2026-12-28', to: '2026-12-31', he: 'סגור.', en: 'Closed.' }], 'dated: only a valid range that overlaps the trip, with both languages')
eq(S.cleanSeasonal(good, null).dated, undefined, 'no trip dates: no dated lines')
eq(S.cleanSeasonal({ only: ['winter', 'spring', 'summer', 'autumn'] }, win), null, 'all four seasons in only = no limit = nothing left')
eq(S.cleanSeasonal({ winter: { he: '', en: '' } }, win), null, 'nothing real: null')
eq(S.cleanSeasonal('x', win), null, 'not an object: null')
eq(S.cleanSeasonal({ winter: { he: 'ראה <b>http://evil.example/x</b> כאן', en: 'See [x](http://evil.example) here' } }, win).winter, { he: 'ראה כאן', en: 'See x here' }, 'links and markup stripped')
ok(S.cleanSeasonal({ winter: { he: 'א'.repeat(500), en: 'b'.repeat(500) } }, win).winter.he.length === 200, 'a note is cut to 200 characters')
eq(S.withoutDated(c).dated, undefined, 'withoutDated drops dated, keeps the rest')
eq(S.withoutDated({ dated: c.dated }), null, 'withoutDated of dated-only is null')

// the research functions no longer say December 2026 on their own
for (const f of ['supabase/functions/card-facts/facts.ts', 'supabase/functions/suggest-place/index.ts']) {
  const t = readFileSync(join(root, f), 'utf8')
  ok(!/2026-12-\(|between 12 and 31 December|plan a December trip|closures between 12 and 31/.test(t), `${f} has no hard-coded December window`)
  ok(/seasonal/.test(t), `${f} asks for seasonal`)
}
const saved = readFileSync(join(root, 'supabase/functions/card-facts/index.ts'), 'utf8')
ok(/seasonal: f\.seasonal/.test(saved) && (saved.match(/seasonal: f\.seasonal/g) ?? []).length === 2, 'card-facts writes seasonal to the card and to the library card it created')
ok(/seasonal: d\.seasonal/.test(readFileSync(join(root, 'src/views/AddPlace.tsx'), 'utf8')), 'AddPlace saves the lookup\'s seasonal on the new card')

console.log(bad ? `${bad} of ${n} checks FAILED` : `all ${n} checks passed`)
process.exit(bad ? 1 : 0)
