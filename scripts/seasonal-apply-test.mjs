// Test for scripts/seasonal-apply.mjs: three made-up cards (one with an apostrophe, Hebrew and a dollar sign) must come out
// as safely quoted SQL, and bad entries must be reported. `node scripts/seasonal-apply-test.mjs`. No database, no real data.
import { buildSql, lit, validate } from './seasonal-apply.mjs'

let bad = 0
let n = 0
const ok = (cond, msg) => {
  n++
  if (!cond) {
    bad++
    console.error('FAIL ' + msg)
  }
}

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const good = [
  {
    id: A,
    name: "Test Garden (Bob's)",
    set: { plan_line: "סגור בימי שני, בוב's $5 $s0 טיפ", highlights: ['שער', "Bob's gate"], todo: null },
    en_set: { plan_line: "Closed Mondays, Bob's $5", highlights: ["Bob's gate"] },
    seasonal: {
      winter: { he: 'קר, כדאי מעיל.', en: 'Cold, bring a coat.' },
      summer: { he: 'חם ולח.', en: "Hot and humid, it's sticky." },
      only: ['winter', 'summer'],
      dated: [{ from: '2026-12-28', to: '2026-12-31', he: 'סגור בסוף השנה.', en: 'Closed at year end.' }],
    },
    unsure: 'left spring out',
  },
  { id: B, name: 'Only seasonal', set: {}, en_set: {}, seasonal: { spring: { he: 'פריחה.', en: 'Blossom.' } } },
  { id: C, name: 'Only text', set: { tip: 'טיפ חדש', serves: "מגישים בוב's", dishes: ['א', 'ב'] }, en_set: { tip: 'New tip', serves: 'Serves it', dishes: ['a'] } },
]

// ---- valid input -> SQL
const v = validate([{ file: 'out-a.json', entries: good }])
ok(v.problems.length === 0, 'good entries have no problems: ' + v.problems.join('; '))
ok(v.cards.length === 3, 'three cards kept')
const sql = buildSql(v.cards, { sourceNote: 'test' })
ok(/^begin;$/m.test(sql) && /^commit;$/m.test(sql), 'wrapped in one transaction')
ok((sql.match(/^begin;$/gm) ?? []).length === 1 && (sql.match(/^commit;$/gm) ?? []).length === 1, 'exactly one begin and one commit')
ok(sql.includes('Cards: 3 (2 with changed Hebrew fields, 2 with changed English fields, 2 with seasonal notes)'), 'header counts: ' + sql.split('\n')[1])
ok(sql.includes('create table if not exists public.place_library_backup_20261118_seasonal'), 'backup table')
ok(sql.indexOf('backup_20261118_seasonal as') < sql.indexOf('update public.place_library set'), 'backup comes before the first update')
ok(/enable row level security/.test(sql), 'backup tables have row-level security on')
ok((sql.match(/^update public\.place_library set /gm) ?? []).length === 3, 'three library updates')
ok((sql.match(/^update public\.candidates set /gm) ?? []).length === 3, 'three candidates updates')
ok(sql.includes(`where id = '${A}';`) && sql.includes(`where library_id = '${A}';`), 'both tables addressed by id / library_id')
// apostrophe and Hebrew survive inside dollar quotes, with no escaping needed and no string breaking out
ok(sql.includes("$s1$סגור בימי שני, בוב's $5 $s0 טיפ$s1$"), 'apostrophe, Hebrew, $5 and a "$s0" inside the text: tag moved to s1')
ok(sql.includes(`$s0$Closed Mondays, Bob's $5$s0$`) || sql.includes(`en = coalesce(en, '{}'::jsonb) || $s0$`), 'English set merged into en')
ok(sql.includes("highlights = array[$s0$שער$s0$, $s0$Bob's gate$s0$]::text[]"), 'highlights as a text array')
ok(sql.includes('todo = null'), 'null clears a field')
ok(sql.includes('seasonal = $s0${"winter"'), 'seasonal written as jsonb')
ok(sql.includes('"from":"2026-12-28"'), 'dated entry kept')
ok(sql.includes("Hot and humid, it's sticky."), 'apostrophe in seasonal json kept as is')
// the card with no set/en_set only changes seasonal
const bLine = sql.split('\n').find((l) => l.includes(`where id = '${B}'`)) ?? ''
ok(/^update public\.place_library set seasonal = /.test(bLine) && !/tip|plan_line/.test(bLine), 'seasonal-only card touches only seasonal')
// lit(): the closing tag never appears inside the text
ok(lit("a$s0$b") === '$s1$a$s0$b$s1$', 'lit picks a tag the text does not contain')
ok(sql.includes("dishes = array[$s0$א$s0$, $s0$ב$s0$]::text[]") && /serves = \$s0\$מגישים/.test(sql), 'serves (text) and dishes (array) written')
ok(lit(null) === 'null', 'lit(null)')
ok(lit('x$') === '$s0$x$$s0$', 'text ending in a dollar sign is still closed correctly')
ok(!/\u0000/.test(sql), 'no NUL')

// ---- invalid input -> problems, and no card kept
const wrong = [
  { id: 'not-a-uuid', name: 'bad id', set: { tip: 'x' } },
  { id: A, name: 'dup of A' },
  { id: B, name: 'bad keys', set: { name: 'x', closed_dates: [] }, en_set: { price: 'y' } },
  { id: C, name: 'bad seasons', seasonal: { monsoon: { he: 'a', en: 'b' }, winter: { he: 'only hebrew' }, only: ['winter', 'fall'] } },
  { id: '44444444-4444-4444-8444-444444444444', name: 'bad dates', seasonal: { dated: [{ from: '2026-12-31', to: '2026-12-28', he: 'a', en: 'b' }, { from: '2026-02-30', to: '2026-03-01', he: 'a', en: 'b' }] } },
  { id: '55555555-5555-4555-8555-555555555555', name: 'bad types', set: { highlights: 'one', tip: 5 } },
]
const w = validate([
  { file: 'out-a.json', entries: [good[0]] },
  { file: 'out-b.json', entries: wrong },
])
const text = w.problems.join('\n')
ok(/id is not a uuid/.test(text), 'reports a bad id')
ok(/also appears in out-a\.json\[0\]/.test(text), 'reports a repeated id across files')
ok(/set\.name is not an allowed key/.test(text) && /set\.closed_dates is not an allowed key/.test(text), 'reports keys outside the allowed set')
ok(/en_set\.price is not an allowed key/.test(text), 'reports a bad en_set key')
ok(/seasonal\.monsoon is not a season/.test(text), 'reports an unknown season')
ok(/seasonal\.winter needs both he and en/.test(text), 'reports a season missing en')
ok(/seasonal\.only must be/.test(text), 'reports a bad "only" value')
ok(/dated\[0\] has from after to/.test(text), 'reports from after to')
ok(/dated\[1\] needs real ISO dates/.test(text), 'reports an impossible date (30 Feb)')
ok(/set\.highlights must be null or an array/.test(text) && /set\.tip must be a string or null/.test(text), 'reports wrong value types')
ok(w.cards.length === 1, 'only the valid card (A) is kept: ' + w.cards.length)
ok(validate([{ file: 'x.json', entries: { not: 'an array' } }]).problems[0] === 'x.json: not an array', 'reports a file that is not an array')

console.log(bad ? `${bad} of ${n} checks FAILED` : `all ${n} checks passed`)
process.exit(bad ? 1 : 0)
