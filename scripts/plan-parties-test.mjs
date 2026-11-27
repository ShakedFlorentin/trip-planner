// Who a trip is planned for, through plan-trip's own index.ts (the dry path): `node scripts/plan-parties-test.mjs`.
// The app creates every trip with no couples (members.couple is null), and for such a trip plan_place_couples answers
// each place with `couples: null, voted: [], yes: []`. The planner used to read that as "nobody liked it": an empty
// plan, and every place it had planned before taken off. A trip with no couples is ONE party of all its members.
// No network and no database: a made-up trip (made-up people and places) behind a stand-in for the Supabase client.
import { build } from 'esbuild'
import { join } from 'node:path'
import { engine, root } from './plan-harness.mjs'
import { measure } from './plan-metrics.mjs'

const dir = process.env.PLAN_DIR ?? join(root, 'supabase/functions/plan-trip')
const TID = '00000000-0000-4000-8000-000000000001'
const START = '2027-03-01'
const DAYS = 6
const dateOf = (d) => new Date(Date.parse(START + 'T00:00:00Z') + (d - 1) * 86400000).toISOString().slice(0, 10)

// ---- the made-up trip: three days in Tokyo, three in Kyoto, the city written on each day, no hotel yet ----
const CITIES = [
  { id: 'tokyo', name_en: 'Tokyo', name_he: 'טוקיו', lat: 35.681, lng: 139.767 },
  { id: 'kyoto', name_en: 'Kyoto', name_he: 'קיוטו', lat: 35.0116, lng: 135.7681 },
]
const KINDS = [
  { category: 'sight', opens: '09:00', closes: '17:00', visit_mins: 90, best_time: 'morning' },
  { category: 'food', opens: '11:00', closes: '22:00', visit_mins: 60, best_time: 'any' },
  { category: 'shopping', opens: '10:00', closes: '20:00', visit_mins: 75, best_time: 'afternoon' },
  { category: 'food', opens: '11:00', closes: '22:00', visit_mins: 60, best_time: 'any' },
  { category: 'sight', opens: null, closes: null, visit_mins: 60, best_time: 'any' },
  { category: 'cafe', opens: '10:00', closes: '18:00', visit_mins: 45, best_time: 'afternoon' },
]
// 12 places a city (4 of them restaurants), on a ring about 1 to 3 km around its middle. No dice: the same every run
const candidates = CITIES.flatMap((c) =>
  Array.from({ length: 12 }, (_, i) => {
    const k = KINDS[i % KINDS.length]
    const a = (i * 2 * Math.PI) / 12
    const r = 0.01 + 0.004 * (i % 4)
    return {
      id: `c-${c.id}-${i}`, name: `${c.name_en} test place ${i}`, address: null, area: null, city: c.id, category: k.category,
      lat: +(c.lat + r * Math.sin(a)).toFixed(5), lng: +(c.lng + r * 1.2 * Math.cos(a)).toFixed(5),
      tip: null, time_needed: null, verdict: i % 3 ? 'worth_it' : 'gem', local_pick: false, tabelog_score: null,
      opens: k.opens, closes: k.closes, closed_weekdays: [], closed_dates: [], open_dates: [], best_time: k.best_time,
      visit_mins: k.visit_mins, booking: 'no', plan_line: null, baby_block: null, facts_at: '2027-01-01', en: null,
    }
  }),
)
const FOOD = candidates.filter((c) => c.category === 'food').length

/**
 * One shape of trip. members: [{ id, couple, answers? }]; who(i): whose the place is, as its row says (null: everyone's);
 * the vote rows are built the way plan_place_couples builds them: only couples count, a trip with none gets couples
 * null and no votes (vote(i, couples) gives a place's own { voted, yes }). flightWho: whose the flights are; planned: places the planner put on a day before.
 */
function trip({ members, who = () => null, flightWho = null, planned = 0, vote = null }) {
  const couples = [...new Set(members.map((m) => m.couple).filter(Boolean))].sort()
  const places = candidates.map((c, i) => ({
    id: `p-${c.id}`, candidate_id: c.id, name: c.name, city: c.city, area: null, lat: null, lng: null, who: who(i, c), visited: false, auto_planned: i < planned,
  }))
  const votes = candidates.map((c, i) => {
    if (!couples.length) return { candidate_id: c.id, couples: null, voted: [], yes: [] }
    const forWho = who(i, c) ? who(i, c).split(' + ') : couples
    // vote(i, couples): the row for this place when a test says who voted what (else: everyone it is for said yes)
    const own = vote?.(i, forWho)
    if (own) return { candidate_id: c.id, couples: forWho, ...own }
    return { candidate_id: c.id, couples: forWho, voted: forWho, yes: forWho }
  })
  return {
    trips: [{ id: TID, start_date: START, num_days: DAYS }],
    members: members.map((m) => ({ trip_id: TID, user_id: m.id, couple: m.couple })),
    profiles: members.filter((m) => m.answers).map((m) => ({ user_id: m.id, answers: m.answers })),
    bookings: [
      { id: 'b-in', trip_id: TID, kind: 'flight', title: 'TLV → NRT', starts_at: `${dateOf(1)}T00:30:00`, ends_at: `${dateOf(1)}T09:00:00`, who: flightWho, location: null },
      { id: 'b-out', trip_id: TID, kind: 'flight', title: 'KIX → TLV', starts_at: `${dateOf(DAYS)}T22:00:00`, ends_at: `${dateOf(DAYS + 1)}T05:00:00`, who: flightWho, location: null },
    ],
    day_info: Array.from({ length: DAYS }, (_, i) => ({ trip_id: TID, day: i + 1, city: i < 3 ? 'טוקיו' : 'קיוטו', who: null })),
    itinerary_items: places.slice(0, planned).map((p, i) => ({
      id: `i-${i}`, trip_id: TID, day: 2, time: `${10 + i * 2}:00`, title: p.name, location: null, notes: null, notes_en: null,
      category: 'sight', sort: i, place_id: p.id, who: null, auto: true, done: false,
    })),
    places: places.map((p) => ({ ...p, trip_id: TID })),
    trip_stays: [],
    cities: CITIES,
    candidates,
    geo_cache: [],
    votes,
  }
}

// ---- a stand-in for the Supabase client: reads the tables above, counts any write (a dry run makes none) ----
let tables = null
let writes = 0
globalThis.__fake = () => ({
  from: (table) => {
    let rows = [...(tables[table] ?? [])]
    let reading = true
    const b = {
      select: () => b,
      eq: (c, v) => { if (reading) rows = rows.filter((r) => r[c] === v); return b },
      gt: (c, v) => { rows = rows.filter((r) => r[c] > v); return b },
      in: (c, vs) => { rows = rows.filter((r) => vs.includes(r[c])); return b },
      not: (c) => { rows = rows.filter((r) => r[c] != null); return b },
      is: () => b, or: () => b, order: () => b, limit: () => b, returns: () => b,
      single: () => Promise.resolve(rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'no row' } }),
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      upsert: () => { if (table !== 'geo_cache') writes++; reading = false; return b },
      update: () => { writes++; reading = false; return b },
      insert: () => { writes++; reading = false; return b },
      delete: () => { writes++; reading = false; return b },
      then: (ok, bad) => Promise.resolve({ data: reading ? rows : null, error: null }).then(ok, bad),
    }
    return b
  },
  rpc: (name) => {
    if (name === 'get_planner_token') return Promise.resolve({ data: 'tok', error: null })
    if (name === 'plan_place_couples') return Promise.resolve({ data: tables.votes, error: null })
    throw new Error('rpc ' + name)
  },
  auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
})
let handler
globalThis.Deno = { serve: (h) => { handler = h }, env: { get: () => 'x' } }
// no network: the photo index is empty, an address lookup fails (the made-up places carry their own point)
globalThis.fetch = async (url) => {
  if (String(url).includes('media.json')) return new Response('{}', { status: 200 })
  throw new Error('network disabled')
}
const stub = {
  name: 'stub-npm',
  setup(b) {
    b.onResolve({ filter: /^npm:@supabase\/supabase-js/ }, () => ({ path: 'supabase-stub', namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const createClient = () => globalThis.__fake()', loader: 'js' }))
  },
}
const bundle = await build({ entryPoints: [join(dir, 'index.ts')], bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18', plugins: [stub], logLevel: 'silent' })
await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const { E } = await engine(dir)

const post = async (t, body) => {
  tables = t
  const res = await handler(new Request('http://x/', { method: 'POST', headers: { 'x-plan-token': 'tok', 'content-type': 'application/json' }, body: JSON.stringify({ trip_id: TID, ...body }) }))
  return res.json()
}
/** A dry run of a trip, with the numbers of the plan it gives (plan-metrics.mjs). */
async function dry(t) {
  const r = await post(t, { dry: true })
  if (r.error) throw new Error('planner error: ' + JSON.stringify(r.error))
  const days = () => r.input.days.map((d) => ({ ...d, at: new Map(Object.entries(d.at)) }))
  const out = E.plan(days(), r.input.units, r.input.fixed)
  return { ...r, m: measure({ units: r.input.units, days: days(), fixed: r.input.fixed }, out) }
}

let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`)
}
const line = (r) => `placed ${r.stats.placed}/${r.m.units} meals ${r.m.mealsFilled}/${r.m.mealSlots} km ${Math.round(r.m.km)} out-and-back ${r.m.outAndBack} bad times ${r.m.afterClosing + r.m.afterDark + r.m.pastDayEnd} remove ${r.stats.remove}`
/** What every shape must give: places on days, nothing taken off, no out-and-back, no bad time, meals eaten, no write. */
function sound(name, r, { units = candidates.length } = {}) {
  check(`${name}: every liked place is known to the planner`, r.m.units === units, `${r.m.units} of ${units}`)
  check(`${name}: places are planned`, r.stats.placed >= Math.min(units, 18), line(r))
  check(`${name}: nothing planned before is taken off`, r.stats.remove === 0, `remove ${r.stats.remove}`)
  check(`${name}: no out-and-back, no bad time`, r.m.outAndBack === 0 && r.m.afterClosing + r.m.afterDark + r.m.pastDayEnd === 0)
  check(`${name}: meals where liked food exists`, r.m.mealsFilled >= Math.min(r.m.mealSlots, FOOD) - 2 && r.m.mealsFilled > 0, `${r.m.mealsFilled} of ${r.m.mealSlots} slots, ${FOOD} restaurants`)
  check(`${name}: a dry run writes nothing`, writes === 0)
}
/** No couple's name is made up for the app: the inner name of the one party ('*') is nowhere in what the app reads. */
function nameless(name, r) {
  const seen = JSON.stringify({ summary: r.summary, plan: r.plan, cities: r.cities })
  check(`${name}: no made-up couple name reaches the app`, !seen.includes('*'), seen.includes('*') ? seen.slice(Math.max(0, seen.indexOf('*') - 60), seen.indexOf('*') + 20) : '')
  check(`${name}: issues carry no couple`, [...r.summary.issues, ...(r.summary.issues_more ?? [])].every((i) => !('couple' in i) || i.couple == null))
  check(`${name}: hotels and arrivals are keyed by the party with no name`, r.summary.days.every((d) => Object.keys(d.hotels).every((k) => k === '') && Object.keys(d.arrival ?? {}).every((k) => k === '')))
  check(`${name}: where to sleep is for everyone`, r.summary.stay_areas.length > 0 && r.summary.stay_areas.every((s) => s.party == null))
}

const A = { id: 'u-avi', couple: null }
const B = { id: 'u-bat', couple: null }
const C = { id: 'u-gil', couple: null }

// 1. one person, no couple
const solo = await dry(trip({ members: [A], planned: 3 }))
sound('solo, no couple', solo)
nameless('solo, no couple', solo)

// 2. two people, no couples; the rows still carry a name from an older version of the app (a place's who, a flight's who)
const two = await dry(trip({ members: [A, B], who: (i) => (i % 5 === 0 ? 'Old + Label' : null), flightWho: 'Old + Label', planned: 3 }))
sound('two people, no couples', two)
nameless('two people, no couples', two)
check('two people, no couples: a place that carries an old name is planned too, and keeps it', two.plan.filter((p) => p.who === 'Old + Label').length >= 3 && two.plan.every((p) => p.who == null || p.who === 'Old + Label'))
check('two people, no couples: the day they land starts after the flight', two.plan.filter((p) => p.day === 1).every((p) => p.time >= '10:00'), two.plan.filter((p) => p.day === 1).map((p) => p.time).join(' '))

// 3. three people, no couples: the day is as full as the calmest of them wants, and a baby of one is everyone's
const three = await dry(trip({ members: [A, B, C], planned: 3 }))
sound('three people, no couples', three)
nameless('three people, no couples', three)
const calm = await dry(trip({ members: [{ ...A, answers: { pace: 'packed' } }, { ...B, answers: { pace: 'relaxed', with: ['baby'] } }, C] }))
const packed = await dry(trip({ members: [{ ...A, answers: { pace: 'packed' } }, { ...B, answers: { pace: 'packed' } }, C] }))
const one = (r) => r.input.days[1].at['*'] ?? {}
check('three people, no couples: one party, present every day', three.input.days.every((d) => Object.keys(d.at).join() === '*'))
check('three people, no couples: the pace is the calmest member\'s', one(calm).cap === 360 && one(packed).cap === 600, `cap ${one(calm).cap} / ${one(packed).cap}`)
check('three people, no couples: a baby of one member is the party\'s', one(calm).end < one(packed).end, `the day ends at ${one(calm).end} / ${one(packed).end}`)

// 4. one couple, named: as before
// (a couple's name has no ' + ' in it: that is what joins two couples in a row's who)
const DO = 'Dana & Omer'
const couple = await dry(trip({ members: [{ id: 'u-dana', couple: DO }, { id: 'u-omer', couple: DO }], planned: 3 }))
sound('one named couple', couple)
check('one named couple: the days are the couple\'s', couple.summary.days.every((d) => Object.keys(d.hotels).join() === DO))
// the same trip with and without the name: the same places on the same days at the same times
const same = (a, b) => JSON.stringify(a.plan.map((p) => [p.day, p.time, p.title])) === JSON.stringify(b.plan.map((p) => [p.day, p.time, p.title]))
check('one named couple and the same two people with no couple get the same plan', same(couple, await dry(trip({ members: [A, B], planned: 3 }))))

// 5. a couple and a person on their own (a party of one): some places only one of them liked
const NOA = 'Noa'
const whose = (i) => (i % 4 === 1 ? DO : i % 4 === 3 ? NOA : null)
const pair = await dry(trip({ members: [{ id: 'u-dana', couple: DO }, { id: 'u-omer', couple: DO }, { id: 'u-noa', couple: NOA }], who: whose, planned: 3 }))
sound('a couple and a party of one', pair)
check('a couple and a party of one: both are on every day', pair.input.days.every((d) => Object.keys(d.at).sort().join() === [DO, NOA].sort().join()))
check('a couple and a party of one: a place only one liked is that party\'s', pair.input.units.some((u) => u.couples.join() === DO) && pair.input.units.some((u) => u.couples.join() === NOA))

// 6. a couple, and a member with no couple: the days are the couple's (the member with no couple is not a party
//    with days of their own: nothing says where they sleep apart from the group). What they like counts: 8 below
const part = await dry(trip({ members: [{ id: 'u-dana', couple: DO }, { id: 'u-omer', couple: DO }, C], planned: 3 }))
sound('a couple and a member with no couple', part)
check('a couple and a member with no couple: planned for the couple', part.input.days.every((d) => Object.keys(d.at).join() === DO))

// 8. two couples and a member with no couple: the member is one more voice (parties.ts). plan_place_couples names
//    such a voice '~' + the member's id in voted and yes (supabase/sql/2026-11-27-lone-members-vote.sql).
{
  const RT = 'Rina & Tal'
  const LONE = '~u-gil'
  const mixedMembers = [{ id: 'u-dana', couple: DO }, { id: 'u-omer', couple: DO }, { id: 'u-rina', couple: RT }, { id: 'u-tal', couple: RT }, C]
  // place 0: no couple said yes, the lone member did. place 1: one couple and the lone member. place 2: one couple
  // alone, the other said no. place 3: everyone, the lone member said no. place 4: everyone, the lone member silent.
  // place 5: nobody at all. The rest: both couples.
  const votesWith = (lone) => (i, cs) =>
    i === 0 ? { voted: lone ? [...cs, LONE] : cs, yes: lone ? [LONE] : [] }
    : i === 1 ? { voted: lone ? [...cs, LONE] : cs, yes: lone ? [DO, LONE] : [DO] }
    : i === 2 ? { voted: cs, yes: [DO] }
    : i === 3 ? { voted: lone ? [...cs, LONE] : cs, yes: cs }
    : i === 5 ? { voted: cs, yes: [] }
    : null
  const whoM = (i) => (i === 1 || i === 2 ? DO : null)
  const with1 = await dry(trip({ members: mixedMembers, who: whoM, vote: votesWith(true) }))
  const without = await dry(trip({ members: mixedMembers, who: whoM, vote: votesWith(false) }))
  const unit = (r, i) => r.input.units.find((u) => u.id === `p-${candidates[i].id}`)
  sound('two couples and a lone member', with1, { units: candidates.length - 1 })
  check('lone member: a place only they liked is planned', !!unit(with1, 0) && !unit(without, 0), `with ${!!unit(with1, 0)} without ${!!unit(without, 0)}`)
  check('lone member: their like beside one couple\'s counts as a second yes', unit(with1, 1)?.priority === unit(without, 1)?.priority + 1 && unit(with1, 2)?.priority === unit(without, 2)?.priority, `${unit(without, 1)?.priority} -> ${unit(with1, 1)?.priority}`)
  check('lone member: their no takes nothing off', !!unit(with1, 3) && unit(with1, 3).priority === unit(without, 3).priority)
  check('lone member: their silence holds nothing up', !!unit(with1, 4) && !with1.summary.unplanned.some((u) => u.reason === 'waiting'))
  check('lone member: a place nobody liked stays out', !unit(with1, 5))
  check('lone member: the days are the couples\', as before', with1.input.days.every((d) => Object.keys(d.at).sort().join() === [DO, RT].sort().join()) && JSON.stringify(with1.input.days) === JSON.stringify(without.input.days))
  check('lone member: a place is planned for the couples its row names, or all', unit(with1, 0).couples.slice().sort().join() === [DO, RT].sort().join() && unit(with1, 1).couples.join() === DO)
  const seen = JSON.stringify({ summary: with1.summary, plan: with1.plan, cities: with1.cities })
  check('lone member: their mark reaches nothing the app reads', !seen.includes('~'))
  const stayOf = async (lone) => post(trip({ members: mixedMembers, who: whoM, vote: votesWith(lone) }), { suggest_stays: true })
  const s1 = await stayOf(true)
  check('lone member, where to sleep: an answer, and their mark is not in it', !s1.error && s1.alternatives?.length > 0 && !JSON.stringify(s1).includes('~'), s1.error ? JSON.stringify(s1.error) : '')
  // the split of the nights: a place counts for the couples that said yes, never for the lone member's mark
  const pb = await build({ entryPoints: [join(dir, 'parties.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
  const PT = await import('data:text/javascript;base64,' + Buffer.from(pb.outputFiles[0].text).toString('base64'))
  const both = [DO, RT]
  const lf = (yes, one = false) => PT.likedFor?.({ candidate_id: 'x', couples: both, voted: yes, yes }, both, one)?.join('|')
  check('lone member, where to sleep: one couple and the lone member liked it: it is that couple\'s', lf([DO, LONE]) === DO, String(lf([DO, LONE])))
  check('lone member, where to sleep: only the lone member liked it: it is everyone\'s', lf([LONE]) === '')
  check('lone member, where to sleep: as before with no lone member', lf([DO]) === DO && lf([DO, RT]) === '' && lf([DO, RT, LONE]) === '' && lf([], true) === '')
  check('lone member: wanted and counted', PT.wanted({ couples: both, voted: [...both, LONE], yes: [LONE] }, false) === 'plan' && PT.wanted({ couples: both, voted: [DO, LONE], yes: [LONE] }, false) === 'waiting' && PT.wanted({ couples: both, voted: both, yes: [] }, false) === 'skip' && PT.yesCount({ yes: [DO, LONE] }, false) === 2)
  console.log(`mixed+1  ${line(with1)}`)
}

// 7. where to sleep (the split of the nights between cities) for a trip with no couples: its places count
const split = await post(trip({ members: [A, B] }), { suggest_stays: true })
check('where to sleep, no couples: an answer with nights', !split.error && Array.isArray(split.alternatives) && split.alternatives.length > 0, split.error ? JSON.stringify(split.error) : `${split.alternatives?.length} alternatives`)
check('where to sleep, no couples: no made-up couple name', !JSON.stringify(split).includes('*'))

console.log(`solo     ${line(solo)}\ntwo      ${line(two)}\nthree    ${line(three)}\ncouple   ${line(couple)}\ncouple+1 ${line(pair)}\nmixed    ${line(part)}`)
console.log(failed ? `${failed} FAILED` : 'all passed')
process.exit(failed ? 1 : 0)
