// Tests for the plain-code parts of the hours re-check (supabase/functions/card-facts/facts.ts): which Tabelog page is
// the card's own, and reading the three closing lines of the answer. `node scripts/recheck-test.mjs` (npm run test:recheck).
// The Claude call itself is not run here.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// the Deno-only imports (npm:…) are not needed by the functions under test: stand-ins that load
const stubs = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /^npm:/ }, (a) => ({ path: a.path, namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents:
        'const p = new Proxy(function () {}, { get: (_, k) => (k === "then" ? undefined : p), apply: () => p });' +
        'export default class {}; export const z = p; export const zodOutputFormat = () => ({});',
    }))
  },
}
const out = await build({
  entryPoints: [join(root, 'supabase/functions/card-facts/facts.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18', plugins: [stubs],
})
const F = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

let bad = 0
let n = 0
const same = (got, want, msg) => {
  n++
  if (JSON.stringify(got) !== JSON.stringify(want)) { bad++; console.log(`  FAIL ${msg}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`) }
}

// ---- tabelogPage ----
const page = 'https://tabelog.com/en/osaka/A2701/A270206/27151368/'
same(F.tabelogPage(null), null, 'no sources')
same(F.tabelogPage(['https://www.instagram.com/reel/abc/']), null, 'no Tabelog source')
same(F.tabelogPage([page]), page, 'the page itself')
same(F.tabelogPage(['https://tabelog.com/en/osaka/A2701/A270206/27151368/dtlrvwlst/']), page, 'a review sub-page')
same(F.tabelogPage(['https://ssl.tabelog.com/en/tokyo/A1301/A130103/13032283/']), 'https://tabelog.com/en/tokyo/A1301/A130103/13032283/', 'the ssl host')
same(F.tabelogPage(['https://tabelog.com/osaka/A2701/A270206/27151368/']), page, 'the Japanese page becomes the English one')
same(
  F.tabelogPage([page + 'dtlrvwlst/', page, 'https://tabelog.com/en/osaka/A2701/A270206/27143953/', 'https://tabelog.com/en/osaka/A2701/A270101/27135093/']),
  page,
  'the restaurant named most often wins',
)
same(
  F.tabelogPage([page, 'https://tabelog.com/en/osaka/A2701/A270206/27143953/']),
  null,
  'two restaurants named once each: no page',
)
same(F.tabelogPage(['https://tabelog.com/en/osaka/A2701/rstLst/', 'https://tabelog.com/en/rstLst/?sw=x']), null, 'a search page is not a restaurant page')
same(F.tabelogPage(['http://tabelog.com/en/osaka/A2701/A270206/27151368/', 'https://evil.example/tabelog.com/en/osaka/A2701/A270206/27151368/']), null, 'http and other hosts are not taken')

// ---- readRecheck ----
const ans = (s, h, d) => `Some notes.\nSTATUS: ${s}\nHOURS: ${h}\nCLOSED_DAYS: ${d}`
same(F.readRecheck(ans('open', '11:30-22:00', '1')), { status: 'open', opens: '11:30', closes: '22:00', closed_weekdays: [1] }, 'plain answer')
same(F.readRecheck(ans('open', '18:00-02:00', 'none')), { status: 'open', opens: '18:00', closes: '02:00', closed_weekdays: [] }, 'past midnight, no closing day')
same(F.readRecheck(ans('open', '17:00-26:00', '0, 3')), { status: 'open', opens: '17:00', closes: '02:00', closed_weekdays: [0, 3] }, '26:00 is 02:00')
same(F.readRecheck(ans('closed_for_good', 'unknown', 'unknown')), { status: 'closed', opens: null, closes: null, closed_weekdays: null }, 'closed for good')
same(F.readRecheck(ans('unknown', 'unknown', 'unknown')), { status: 'unknown', opens: null, closes: null, closed_weekdays: null }, 'nothing found')
same(F.readRecheck(ans('open', 'none', 'none')), { status: 'open', opens: null, closes: null, closed_weekdays: [] }, 'a street: no hours')
same(F.readRecheck(ans('open', '9:00 – 17:00', '3,1,3')), { status: 'open', opens: '09:00', closes: '17:00', closed_weekdays: [1, 3] }, 'one-digit hour, dash, repeated days')
same(F.readRecheck('**STATUS:** open\n**HOURS:** 10:00-20:00\n**CLOSED_DAYS:** none'), { status: 'open', opens: '10:00', closes: '20:00', closed_weekdays: [] }, 'bold labels')
same(F.readRecheck(ans('open', '11:00-22:00', 'Monday')), { status: 'open', opens: '11:00', closes: '22:00', closed_weekdays: null }, 'a day in words is not taken')
same(F.readRecheck(ans('open', '11:00-25:99', '7')), { status: 'open', opens: null, closes: null, closed_weekdays: null }, 'bad time and bad day are dropped')
same(F.readRecheck(ans('open', 'same', 'same')), { status: 'open', opens: null, closes: null, closed_weekdays: null }, 'same keeps the card')
same(F.readRecheck(ans('open', 'same', '1, 2')), { status: 'open', opens: null, closes: null, closed_weekdays: [1, 2] }, 'same hours, new closing days')
same(F.readRecheck(ans('open', '00:00-00:00', 'none')), { status: 'open', opens: null, closes: null, closed_weekdays: [] }, 'always open is not hours')
same(
  F.readRecheck('Format:\nSTATUS: open | closed_for_good | unknown\nHOURS: same | HH:MM-HH:MM\nCLOSED_DAYS: same | none | numbers\n\nSTATUS: open\nHOURS: 11:00-22:00\nCLOSED_DAYS: 2'),
  { status: 'open', opens: '11:00', closes: '22:00', closed_weekdays: [2] },
  'a repeated format first: the last lines win',
)
same(F.readRecheck(ans('open', 'same', '0,1,2,3,4,5,6')), { status: 'open', opens: null, closes: null, closed_weekdays: null }, 'seven days with open is not taken')
same(F.readRecheck(ans('closed_for_good', 'same', '0,1,2,3,4,5,6')), { status: 'closed', opens: null, closes: null, closed_weekdays: null }, 'seven days with closed for good: the status closes it')
same(F.readRecheck('It is open 11:00-22:00.'), null, 'no closing lines')
same(F.readRecheck('STATUS: open\nHOURS: 11:00-22:00'), null, 'a missing line')

console.log(bad ? `${bad} of ${n} FAILED` : `all ${n} passed`)
process.exit(bad ? 1 : 0)
