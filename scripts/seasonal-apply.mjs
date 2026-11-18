// Turns the cards agents' out-*.json files (seasonal card notes, spec 2026-11-18) into ONE SQL file for the owner to run.
//   node scripts/seasonal-apply.mjs <folder with out-*.json> <output .sql>
// Writes no SQL file when any entry is invalid (the problems are printed, exit code 1). Never touches a database.
// Run the output only after supabase/sql/2026-11-18-seasonal-notes.sql (it adds the `seasonal` column), and not before
// the owner's Japan trip is over (toogo-rules 6).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SEASONS = ['winter', 'spring', 'summer', 'autumn']
export const SET_KEYS = ['tip', 'plan_line', 'reality', 'special', 'todo', 'hype', 'baby_notes', 'baby_block', 'highlights', 'serves', 'dishes']
const ARRAY_KEYS = new Set(['highlights', 'dishes'])
const SEASONAL_KEYS = new Set([...SEASONS, 'only', 'dated'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SEASONAL_MAX_BYTES = 8000 // the same cap as the column's check in 2026-11-18-seasonal-notes.sql

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isText = (v) => typeof v === 'string' && v.trim() !== '' && !v.includes('\u0000')
const isoDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** Problems with one field map (set or en_set): unknown keys, wrong value types. */
function checkFields(where, m, out) {
  if (m === undefined) return
  if (!isObj(m)) return out.push(`${where} is not an object`)
  for (const [k, v] of Object.entries(m)) {
    if (!SET_KEYS.includes(k)) {
      out.push(`${where}.${k} is not an allowed key`)
      continue
    }
    if (v === null) continue
    if (ARRAY_KEYS.has(k)) {
      if (!Array.isArray(v) || !v.every((x) => typeof x === 'string' && x.trim() !== '' && !x.includes('\u0000'))) out.push(`${where}.${k} must be null or an array of non-empty strings`)
    } else if (typeof v !== 'string' || v.includes('\u0000')) out.push(`${where}.${k} must be a string or null`)
  }
}

/** Problems with a seasonal object. */
function checkSeasonal(s, out) {
  if (s === undefined || s === null) return
  if (!isObj(s)) return out.push('seasonal is not an object')
  for (const k of Object.keys(s)) if (!SEASONAL_KEYS.has(k)) out.push(`seasonal.${k} is not a season, "only" or "dated"`)
  for (const season of SEASONS) {
    if (!(season in s)) continue
    const n = s[season]
    if (!isObj(n) || !isText(n.he) || !isText(n.en)) out.push(`seasonal.${season} needs both he and en as non-empty text`)
    else if (Object.keys(n).some((k) => k !== 'he' && k !== 'en')) out.push(`seasonal.${season} has keys other than he and en`)
  }
  if ('only' in s) {
    if (!Array.isArray(s.only) || !s.only.length || !s.only.every((x) => SEASONS.includes(x))) out.push(`seasonal.only must be a non-empty list of ${SEASONS.join('/')}`)
    else if (new Set(s.only).size !== s.only.length) out.push('seasonal.only has a repeated season')
  }
  if ('dated' in s) {
    if (!Array.isArray(s.dated)) out.push('seasonal.dated must be a list')
    else
      s.dated.forEach((d, i) => {
        const w = `seasonal.dated[${i}]`
        if (!isObj(d)) return out.push(`${w} is not an object`)
        if (Object.keys(d).some((k) => !['from', 'to', 'he', 'en'].includes(k))) out.push(`${w} has keys other than from, to, he, en`)
        if (!isoDate(d.from) || !isoDate(d.to)) out.push(`${w} needs real ISO dates (YYYY-MM-DD) in from and to`)
        else if (d.from > d.to) out.push(`${w} has from after to`)
        if (!isText(d.he) || !isText(d.en)) out.push(`${w} needs both he and en as non-empty text`)
      })
  }
  if (Buffer.byteLength(JSON.stringify(s), 'utf8') >= SEASONAL_MAX_BYTES) out.push(`seasonal is ${SEASONAL_MAX_BYTES} bytes or more (the column's check refuses it)`)
}

/**
 * Checks every entry of every file. `files` is [{ file, entries }]. Returns { problems: string[], cards: entry[] } where
 * cards are the valid-looking entries that change something (set, en_set or seasonal), with a repeated id reported.
 */
export function validate(files) {
  const problems = []
  const cards = []
  const seen = new Map()
  for (const { file, entries } of files) {
    if (!Array.isArray(entries)) {
      problems.push(`${file}: not an array`)
      continue
    }
    entries.forEach((e, i) => {
      const at = `${file}[${i}]${isObj(e) && typeof e.name === 'string' ? ` (${e.name})` : ''}`
      const out = []
      if (!isObj(e)) return problems.push(`${at}: not an object`)
      if (typeof e.id !== 'string' || !UUID.test(e.id)) out.push('id is not a uuid')
      else if (seen.has(e.id.toLowerCase())) out.push(`id also appears in ${seen.get(e.id.toLowerCase())}`)
      else seen.set(e.id.toLowerCase(), at)
      checkFields('set', e.set, out)
      checkFields('en_set', e.en_set, out)
      checkSeasonal(e.seasonal, out)
      for (const m of out) problems.push(`${at}: ${m}`)
      const has = (m) => isObj(m) && Object.keys(m).length > 0
      if (!out.length && (has(e.set) || has(e.en_set) || isObj(e.seasonal))) cards.push({ ...e, id: e.id.toLowerCase() })
    })
  }
  return { problems, cards }
}

/** A text as a Postgres dollar-quoted literal whose tag does not occur in it. */
export function lit(s) {
  if (s === null || s === undefined) return 'null'
  const str = String(s)
  for (let i = 0; ; i++) {
    const tag = `$s${i}`
    if (!str.includes(tag)) return `${tag}$${str}${tag}$`
  }
}
const arr = (a) => (a === null ? 'null' : a.length ? `array[${a.map(lit).join(', ')}]::text[]` : `'{}'::text[]`)
const json = (o) => `${lit(JSON.stringify(o))}::jsonb`

/** The SET list for one card's update (the same for place_library and candidates). */
function assignments(e) {
  const parts = []
  for (const [k, v] of Object.entries(e.set ?? {})) parts.push(`${k} = ${ARRAY_KEYS.has(k) ? arr(v) : lit(v)}`)
  if (e.en_set && Object.keys(e.en_set).length) parts.push(`en = coalesce(en, '{}'::jsonb) || ${json(e.en_set)}`)
  if (isObj(e.seasonal)) parts.push(`seasonal = ${json(e.seasonal)}`)
  return parts
}

/** The whole SQL file for the valid cards. */
export function buildSql(cards, { sourceNote = '' } = {}) {
  const withSet = cards.filter((c) => c.set && Object.keys(c.set).length).length
  const withEn = cards.filter((c) => c.en_set && Object.keys(c.en_set).length).length
  const withSeasonal = cards.filter((c) => isObj(c.seasonal)).length
  const ids = cards.map((c) => `'${c.id}'`).join(', ')
  const L = []
  L.push(`-- Seasonal card notes: the card text changes (generated by scripts/seasonal-apply.mjs; NOT APPLIED).`)
  L.push(`-- ${sourceNote ? sourceNote + '. ' : ''}Cards: ${cards.length} (${withSet} with changed Hebrew fields, ${withEn} with changed English fields, ${withSeasonal} with seasonal notes).`)
  L.push(`-- Each card updates its place_library row and every candidates row with that library_id: ${cards.length * 2} update statements.`)
  L.push(`-- Run it after supabase/sql/2026-11-18-seasonal-notes.sql (the seasonal column) and after the owner's Japan trip (toogo-rules 6).`)
  L.push(`-- One transaction. Safe to run twice: the backups keep the FIRST old values (a second run does not overwrite them), and the updates set the same values again.`)
  L.push(`-- Backups: place_library_backup_20261118_seasonal and candidates_backup_20261118_seasonal (rows as they were). Restore one card:`)
  L.push(`--   update public.place_library l set tip = b.tip, plan_line = b.plan_line, reality = b.reality, special = b.special, todo = b.todo, hype = b.hype,`)
  L.push(`--          baby_notes = b.baby_notes, baby_block = b.baby_block, highlights = b.highlights, en = b.en, seasonal = b.seasonal`)
  L.push(`--     from public.place_library_backup_20261118_seasonal b where b.id = l.id and l.id = '<id>';   -- the same for candidates`)
  L.push('')
  L.push('begin;')
  L.push('')
  L.push(`do $$ begin`)
  L.push(`  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'place_library' and column_name = 'seasonal')`)
  L.push(`     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'candidates' and column_name = 'seasonal') then`)
  L.push(`    raise exception 'run supabase/sql/2026-11-18-seasonal-notes.sql first (the seasonal column is missing)';`)
  L.push(`  end if;`)
  L.push(`end $$;`)
  L.push('')
  L.push(`-- backup of the rows about to change (created once; row-level security on and no policy: only the owner and the service role read it)`)
  L.push(`create table if not exists public.place_library_backup_20261118_seasonal as`)
  L.push(`  select * from public.place_library where id = any (array[${ids}]::uuid[]);`)
  L.push(`create table if not exists public.candidates_backup_20261118_seasonal as`)
  L.push(`  select * from public.candidates where library_id = any (array[${ids}]::uuid[]);`)
  L.push(`alter table public.place_library_backup_20261118_seasonal enable row level security;`)
  L.push(`alter table public.candidates_backup_20261118_seasonal enable row level security;`)
  L.push(`-- a later run with more cards adds only the rows the backup does not have yet`)
  L.push(`insert into public.place_library_backup_20261118_seasonal`)
  L.push(`  select * from public.place_library where id = any (array[${ids}]::uuid[]) and id not in (select id from public.place_library_backup_20261118_seasonal);`)
  L.push(`insert into public.candidates_backup_20261118_seasonal`)
  L.push(`  select * from public.candidates where library_id = any (array[${ids}]::uuid[]) and id not in (select id from public.candidates_backup_20261118_seasonal);`)
  L.push('')
  for (const c of cards) {
    const set = assignments(c)
    if (!set.length) continue
    L.push(`-- ${String(c.name ?? c.id).replace(/[\r\n]+/g, ' ')}`)
    L.push(`update public.place_library set ${set.join(', ')} where id = '${c.id}';`)
    L.push(`update public.candidates set ${set.join(', ')} where library_id = '${c.id}';`)
    L.push('')
  }
  L.push(`-- check (read-only): the number of library rows now carrying seasonal notes`)
  L.push(`--   select count(*) from public.place_library where id = any (array[${ids}]::uuid[]) and seasonal is not null;   -- ${withSeasonal}`)
  L.push('commit;')
  return L.join('\n') + '\n'
}

function main() {
  const [dir, out] = process.argv.slice(2)
  if (!dir || !out) {
    console.error('usage: node scripts/seasonal-apply.mjs <folder with out-*.json> <output .sql>')
    process.exit(2)
  }
  const names = readdirSync(dir).filter((f) => /^out-.*\.json$/.test(f)).sort()
  if (!names.length) {
    console.error(`no out-*.json in ${dir}`)
    process.exit(2)
  }
  const files = []
  const problems = []
  for (const f of names) {
    try {
      files.push({ file: f, entries: JSON.parse(readFileSync(join(dir, f), 'utf8')) })
    } catch (error) {
      problems.push(`${f}: not valid JSON (${error.message})`)
    }
  }
  const v = validate(files)
  problems.push(...v.problems)
  if (problems.length) {
    console.error(`${problems.length} problem(s), no SQL written:`)
    for (const p of problems) console.error('  - ' + p)
    process.exit(1)
  }
  writeFileSync(out, buildSql(v.cards, { sourceNote: `From ${names.join(', ')}` }))
  console.log(`${v.cards.length} cards from ${names.length} file(s) -> ${out}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
