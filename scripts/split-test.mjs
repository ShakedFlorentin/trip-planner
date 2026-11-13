// Tests for the night-split suggester (supabase/functions/plan-trip/split.ts): `node scripts/split-test.mjs`.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({
  entryPoints: [join(root, 'supabase/functions/plan-trip/split.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18',
})
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

let bad = 0
const ok = (cond, msg) => { if (!cond) { bad++; console.log('  FAIL ' + msg) } }
const DAY = 86400000
const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)
const START = '2026-11-10'

const cities = [
  { id: 'tokyo', lat: 35.681, lng: 139.767 },
  { id: 'yokohama', lat: 35.444, lng: 139.638 },
  { id: 'kyoto', lat: 35.003, lng: 135.759 },
  { id: 'osaka', lat: 34.686, lng: 135.502 },
  { id: 'nara', lat: 34.685, lng: 135.805 },
]
// n places of `mins` each in a city
const places = (city, n, mins, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: `${city}${i}`, city, mins, ...extra }))
const base = (o) => ({ startDate: START, numDays: 10, parties: [], stays: [], cities, places: [], ...o })
const dates = (r) => Array.from({ length: r.nights }, (_, i) => add(r.checkIn, i))
const show = (alts) => alts.map((a) => a.reason.kind + ': ' + a.rows.map((r) => `${r.city}${r.party ? '(' + r.party + ')' : ''}x${r.nights}`).join(' > ') + ` [moves ${a.reason.moves}, ${a.reason.coveredPlaces}/${a.reason.totalPlaces}` + (a.reason.dayTrips.length ? ', day trips ' + JSON.stringify(a.reason.dayTrips) : '') + ']').join('\n    ')

const cases = {
  'no hotels: every night gets one city, 2-3 distinct alternatives'() {
    const alts = S.suggestSplit(base({ places: [...places('tokyo', 8, 180), ...places('kyoto', 6, 180), ...places('osaka', 3, 120)] }))
    console.log('    ' + show(alts))
    ok(alts.length >= 2 && alts.length <= 3, `expected 2-3 alternatives, got ${alts.length}`)
    const sigs = new Set(alts.map((a) => a.rows.map((r) => r.city + r.nights).join()))
    ok(sigs.size === alts.length, 'alternatives are not distinct')
    for (const a of alts) {
      const all = a.rows.flatMap(dates).sort()
      ok(all.length === 9 && all.every((d, i) => d === add(START, i)), `${a.reason.kind}: nights not 9 consecutive: ${all}`)
      ok(a.rows.every((r) => r.party === null), 'party should be null for everyone')
    }
    const c = (k) => alts.find((a) => a.reason.kind === k)
    if (c('fewer_moves') && c('more_places')) ok(c('fewer_moves').reason.moves <= c('more_places').reason.moves, 'fewer_moves has more moves than more_places')
    const best = alts[0]
    ok(best.rows.some((r) => r.city === 'tokyo') && best.rows.some((r) => r.city === 'kyoto'), 'balanced should sleep in both tokyo and kyoto')
    ok(best.rows.length <= 3, 'balanced goes back and forth: ' + best.rows.map((r) => r.city))
  },

  'one city locked: its nights are never touched'() {
    const stays = [{ party: null, city: 'kyoto', checkIn: add(START, 4), checkOut: add(START, 7), status: 'confirmed', locked: true, source: 'booking' }]
    const alts = S.suggestSplit(base({ stays, places: [...places('tokyo', 8, 180), ...places('kyoto', 3, 180), ...places('osaka', 3, 120)] }))
    console.log('    ' + show(alts))
    ok(alts.length >= 1, 'no alternatives')
    const locked = new Set([4, 5, 6].map((n) => add(START, n)))
    for (const a of alts) {
      const all = a.rows.flatMap(dates)
      ok(!all.some((d) => locked.has(d)), `${a.reason.kind} writes over the locked nights`)
      ok(all.length === 6 && new Set(all).size === 6, `${a.reason.kind}: expected the 6 open nights, got ${all.length}`)
    }
    // a confirmed (not locked) stay is also safe; an earlier planner proposal is replaced
    const stays2 = [
      { party: null, city: 'tokyo', checkIn: add(START, 0), checkOut: add(START, 2), status: 'confirmed', locked: false, source: 'manual' },
      { party: null, city: 'osaka', checkIn: add(START, 2), checkOut: add(START, 9), status: 'proposed', locked: false, source: 'auto' },
    ]
    const a2 = S.suggestSplit(base({ stays: stays2, places: places('tokyo', 4, 180) }))
    const all2 = a2.flatMap((a) => a.rows.flatMap(dates))
    ok(!all2.includes(add(START, 0)) && !all2.includes(add(START, 1)), 'wrote over a confirmed stay')
    ok(a2[0].rows.reduce((s, r) => s + r.nights, 0) === 7, 'old auto proposal should be open again')
  },

  'two parties with different dates: each covered exactly on its own nights'() {
    const parties = [
      { id: 'A', arrival: 'tokyo', departure: 'osaka' },
      { id: 'B', from: add(START, 3), to: add(START, 8), arrival: 'tokyo' },
    ]
    const stays = [{ party: 'B', city: 'kyoto', checkIn: add(START, 5), checkOut: add(START, 8), status: 'confirmed', locked: true, source: 'booking' }]
    const alts = S.suggestSplit(base({ parties, stays, places: [...places('tokyo', 6, 180), ...places('kyoto', 4, 180, { parties: ['A'] }), ...places('osaka', 3, 120)] }))
    console.log('    ' + show(alts))
    ok(alts.length >= 1, 'no alternatives')
    for (const a of alts) {
      const cover = (id, from, to) => {
        const got = a.rows.filter((r) => r.party === null || r.party === id).flatMap(dates)
        const lock = id === 'B' ? [5, 6, 7].map((n) => add(START, n)) : []
        const want = []
        for (let d = from; d < to; d = add(d, 1)) if (!lock.includes(d)) want.push(d)
        ok(got.slice().sort().join() === want.join(), `${a.reason.kind}: party ${id} nights ${got.sort()} != ${want}`)
      }
      cover('A', START, add(START, 9))
      cover('B', add(START, 3), add(START, 8))
      ok(!a.rows.some((r) => r.party === 'B' && dates(r).some((d) => ['2026-11-15', '2026-11-16', '2026-11-17'].includes(d))), 'wrote over B locked nights')
      ok(a.rows.some((r) => r.party !== null), `${a.reason.kind}: expected rows for single parties in the stretch they are apart`)
    }
  },

  'a city better as a day trip: Yokohama with two places does not get nights; with many it does'() {
    const few = S.suggestSplit(base({ places: [...places('tokyo', 10, 180), ...places('yokohama', 2, 90)] }))
    console.log('    ' + show(few))
    ok(few[0].rows.length === 1 && few[0].rows[0].city === 'tokyo' && few[0].rows[0].nights === 9, 'balanced should be 9 nights in Tokyo')
    ok(few[0].reason.dayTrips.some((d) => d.city === 'yokohama' && d.from === 'tokyo' && d.places === 2), 'Yokohama should be a day trip from Tokyo')
    const many = S.suggestSplit(base({ places: [...places('tokyo', 4, 180), ...places('yokohama', 12, 180)] }))
    console.log('    ' + show(many))
    ok(many.some((a) => a.rows.some((r) => r.city === 'yokohama' && r.nights >= 2)), 'Yokohama with a lot to do should get nights')
  },

  'no hotel every night: five cities in six nights never get one night each'() {
    // a naive split gives every city one night (each has one night of places); no alternative may hop like that
    const ps = [...places('tokyo', 2, 165), ...places('yokohama', 2, 165), ...places('kyoto', 2, 165), ...places('osaka', 2, 165), ...places('nara', 2, 165)]
    const alts = S.suggestSplit(base({ numDays: 7, places: ps }))
    console.log('    ' + show(alts))
    ok(alts.length >= 1, 'no alternatives')
    for (const a of alts) {
      const runs = []
      for (const r of a.rows) {
        const last = runs[runs.length - 1]
        if (last && last.city === r.city && last.checkOut === r.checkIn) { last.nights += r.nights; last.checkOut = r.checkOut }
        else runs.push({ ...r })
      }
      for (const r of runs) ok(r.nights >= 2, `${a.reason.kind}: a one-night stop in ${r.city} (${runs.map((x) => x.city + 'x' + x.nights).join(' > ')})`)
      ok(runs.length <= 3, `${a.reason.kind}: ${runs.length} bases in six nights`)
    }
  },

  'no hotel every night: a long trip keeps bases of three nights or more'() {
    const ps = [...places('tokyo', 6, 180), ...places('kyoto', 5, 180), ...places('osaka', 3, 180), ...places('nara', 2, 120), ...places('yokohama', 2, 120)]
    const alts = S.suggestSplit(base({ numDays: 12, places: ps }))
    console.log('    ' + show(alts))
    for (const a of alts) ok(a.rows.every((r) => r.nights >= 3), `${a.reason.kind} has a stop under three nights: ` + a.rows.map((r) => r.city + 'x' + r.nights).join(' > '))
  },

  'flights: a party stretch and the airports'() {
    const r = S.partyStretch(
      [
        { who: null, title: 'TLV → HND', starts_at: '2026-11-09T20:00', ends_at: '2026-11-11T08:00' },
        { who: null, title: 'KIX → TLV', starts_at: '2026-11-18T11:00', ends_at: '2026-11-18T20:00' },
      ],
      'A', START, 10,
    )
    ok(r.from === '2026-11-11' && r.arrival === 'tokyo' && r.to === '2026-11-18' && r.departure === 'osaka', 'stretch: ' + JSON.stringify(r))
  },

  'nothing to plan: no open nights, no cities'() {
    const stays = [{ party: null, city: 'tokyo', checkIn: START, checkOut: add(START, 9), status: 'confirmed', locked: true }]
    ok(S.suggestSplit(base({ stays })).length === 0, 'no open nights should give no alternatives')
    ok(S.suggestSplit(base({ cities: [] })).length === 0, 'no cities should give none')
  },
}

// ---------------------------------------------------------------- the route: starting values, seasons, rules
// The fifteen cities with what route-data.ts says about each, as index.ts hands them to the suggester.
const LL = { tokyo: [35.681, 139.767], yokohama: [35.444, 139.638], kyoto: [35.003, 135.759], osaka: [34.686, 135.502], nara: [34.685, 135.805], hakone: [35.233, 139.105], nikko: [36.75, 139.6], kobe: [34.69, 135.196], hiroshima: [34.397, 132.475], kanazawa: [36.578, 136.648], takayama: [36.141, 137.252], fukuoka: [33.59, 130.421], nagoya: [35.171, 136.882], sapporo: [43.069, 141.351], okinawa: [26.212, 127.681] }
const japan = Object.entries(LL).map(([id, [lat, lng]]) => ({ id, lat, lng, ...S.CITY_ROUTE[id] }))
const J = Object.fromEntries(japan.map((c) => [c.id, c]))
const trip = (o) => ({ startDate: '2026-12-12', numDays: 14, parties: [], stays: [], cities: japan, places: [], ...o })
const fly = (arrival, departure, extra = {}) => [{ id: 'a', arrival, departure, ...extra }]
const line = (a) => a.rows.map((r) => `${r.city} ${r.nights}`).join(' > ')
const showJ = (alts) => alts.map((a) => `${a.reason.kind}: ${line(a)}` + (a.reason.added.length ? ` [added ${a.reason.added}]` : '') + (a.reason.offSeason.length ? ` [off season ${a.reason.offSeason}]` : '')).join('\n    ')
const nightsIn = (a, city) => a.rows.filter((r) => r.city === city).reduce((s, r) => s + r.nights, 0)
const order = (a) => a.rows.map((r) => r.city)

// The route rules, written again here on their own (not the suggester's code): what "a route that makes sense" means.
const LINE = ['kanto', 'chubu', 'kansai', 'chugoku', 'kyushu']
const kmOf = (a, b) => { const r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r; return Math.sqrt(x * x + y * y) * 6371 }
const rideMins = (a, b) => 30 + kmOf(J[a], J[b]) * 0.4
/** Checks one alternative of a trip with no booked stays. Returns the rules it breaks, in words. */
function broken(a, inp) {
  const out = []
  const runs = a.rows.map((r) => ({ city: r.city, n: r.nights }))
  const N = inp.numDays - 1
  const dep = inp.parties[0]?.departure, arr = inp.parties[0]?.arrival, late = inp.parties[0]?.arrivalLate
  const month = Number(add(inp.startDate, Math.floor(N / 2)).slice(5, 7)) - 1
  if (runs.reduce((s, r) => s + r.n, 0) !== N) out.push(`covers ${runs.reduce((s, r) => s + r.n, 0)} of ${N} nights`)
  runs.forEach((r, k) => { if (k && runs[k - 1].city === r.city) out.push(`${r.city} twice in a row`) })
  // one direction along the line, each region once; only a short way back to the departure airport may return
  const R = []
  for (const r of runs) { const g = J[r.city].region; if (R.length && R[R.length - 1].g === g) R[R.length - 1].n += r.n; else R.push({ g, n: r.n }) }
  // the last stop may be the departure airport's region, whichever way the route went before it
  const last = R[R.length - 1]
  const home = R.length > 1 && dep && J[dep].region === last.g
  const way = home ? R.slice(0, -1) : R
  if (new Set(way.map((x) => x.g)).size !== way.length) out.push('a region twice: ' + way.map((x) => x.g))
  const idx = way.map((x) => LINE.indexOf(x.g)).filter((i) => i >= 0)
  if (!idx.every((v, i) => !i || v > idx[i - 1]) && !idx.every((v, i) => !i || v < idx[i - 1])) out.push('zigzag: ' + way.map((x) => x.g))
  // an island is the first or the last stop; only a night or two by the departure airport may follow it
  R.forEach((x, k) => { if (LINE.indexOf(x.g) < 0 && k !== 0 && k !== R.length - 1 && !(k === R.length - 2 && home && last.n <= 2)) out.push(`${x.g} in the middle of the trip`) })
  // how long a base lasts
  runs.forEach((r, k) => {
    if (runs.length === 1) return
    const airportNight = (k === runs.length - 1 && r.city === dep) || (k === 0 && late && r.city === arr)
    if (airportNight) return
    if (J[r.city].air) { if (r.n < 3) out.push(`${r.city} for ${r.n} nights after a flight`); return }
    const from = k ? runs[k - 1].city : arr && arr !== r.city ? arr : null
    if (r.n < 2 && !(from && rideMins(from, r.city) <= 100)) out.push(`${r.city} for one night`)
  })
  // an island: the stops next to it are near an airport
  runs.forEach((r, k) => {
    if (!J[r.city].air) return
    for (const nb of [runs[k - 1], runs[k + 1]]) {
      if (nb && !J[nb.city].air && !J[nb.city].hub && Math.min(...japan.filter((c) => c.hub && !c.air).map((h) => rideMins(nb.city, h.id))) > 90) out.push(`${r.city} next to ${nb.city}, far from an airport`)
    }
  })
  // about one base per three nights
  let bases = runs.length
  if (runs.length > 1 && runs[runs.length - 1].n === 1 && runs[runs.length - 1].city === dep) bases--
  if (runs.length > 1 && runs[0].n === 1 && late && runs[0].city === arr) bases--
  if (bases > Math.max(1, Math.round(N / 3))) out.push(`${bases} bases in ${N} nights`)
  // seasons: an out-of-season city only when someone picked it or liked a place there
  const liked = new Set(inp.places.map((p) => p.city))
  runs.forEach((r, k) => {
    if ((J[r.city].season?.[month] ?? 2) !== 0 || (inp.picked ?? []).includes(r.city) || liked.has(r.city)) return
    // an airport's own city is where the trip lands or leaves, whatever the season: its nights by the flight are fine
    if ((r.city === arr && k === 0) || (r.city === dep && k === runs.length - 1)) { if (r.n > 3) out.push(`${r.n} nights in ${r.city} out of season`); return }
    out.push(`${r.city} out of season`)
  })
  return out
}

Object.assign(cases, {
  'only flights, first visit: 14 days, land in Tokyo, leave from Osaka'() {
    const inp = trip({ parties: fly('tokyo', 'osaka') })
    const alts = S.suggestSplit(inp)
    console.log('    ' + showJ(alts))
    const best = alts[0]
    ok(order(best).join() === 'tokyo,kyoto,osaka', 'balanced should be Tokyo, Kyoto, Osaka in that order: ' + line(best))
    ok(nightsIn(best, 'tokyo') >= 5 && nightsIn(best, 'kyoto') >= 3 && nightsIn(best, 'osaka') >= 2, 'balanced nights: ' + line(best))
    ok(nightsIn(best, 'tokyo') > nightsIn(best, 'osaka'), 'Tokyo should get more nights than Osaka')
    ok(best.reason.typical && !best.reason.added.length, 'balanced: typical, nothing added')
    ok(alts.length >= 2, 'expected a second choice')
    for (const a of alts) ok(!broken(a, inp).length, `${a.reason.kind}: ${broken(a, inp)} (${line(a)})`)
  },

  'only flights: a week, round trip from Tokyo, ends in Tokyo'() {
    const inp = trip({ numDays: 8, parties: fly('tokyo', 'tokyo') })
    const alts = S.suggestSplit(inp)
    console.log('    ' + showJ(alts))
    const best = alts[0]
    ok(nightsIn(best, 'tokyo') >= 4 && nightsIn(best, 'kyoto') >= 2, 'a week should hold Tokyo and Kyoto: ' + line(best))
    ok(order(best).at(-1) === 'tokyo', 'should end in the departure city: ' + line(best))
    ok(best.rows.length <= 2, 'a week is two bases: ' + line(best))
    // four nights are one base
    const short = S.suggestSplit(trip({ numDays: 5, parties: fly('tokyo', 'tokyo') }))
    ok(short.length === 1 && line(short[0]) === 'tokyo 4', 'four nights: ' + showJ(short))
  },

  'first visit gets more Tokyo than a return visit'() {
    const first = S.suggestSplit(trip({ parties: fly('tokyo', 'osaka') }))[0]
    const again = S.suggestSplit(trip({ parties: fly('tokyo', 'osaka'), firstVisit: false }))[0]
    console.log(`    first: ${line(first)}\n    been before: ${line(again)}`)
    ok(nightsIn(first, 'tokyo') > nightsIn(again, 'tokyo'), 'first visit should have more Tokyo nights')
  },

  'a hotel booked in the middle: the open nights fit around it'() {
    const stays = [{ party: null, city: 'kyoto', checkIn: add('2026-12-12', 5), checkOut: add('2026-12-12', 9), status: 'confirmed', locked: true, source: 'booking' }]
    const alts = S.suggestSplit(trip({ parties: fly('tokyo', 'osaka'), stays }))
    console.log('    ' + showJ(alts))
    const best = alts[0]
    const before = best.rows.filter((r) => r.checkOut <= add('2026-12-12', 5))
    const after = best.rows.filter((r) => r.checkIn >= add('2026-12-12', 9))
    ok(before.length && before.every((r) => r.city === 'tokyo'), 'before Kyoto should be Tokyo: ' + line(best))
    ok(after.length && after.every((r) => ['osaka', 'kyoto'].includes(r.city)), 'after Kyoto should stay in Kansai: ' + line(best))
    for (const a of alts) ok(!a.rows.flatMap(dates).some((d) => d >= add('2026-12-12', 5) && d < add('2026-12-12', 9)), `${a.reason.kind} writes over the booked nights`)
  },

  'three weeks in April with Hiroshima and Kanazawa picked: all five, in line order'() {
    const inp = trip({ startDate: '2027-04-05', numDays: 22, parties: fly('tokyo', 'osaka'), picked: ['tokyo', 'kyoto', 'osaka', 'hiroshima', 'kanazawa'] })
    const alts = S.suggestSplit(inp)
    console.log('    ' + showJ(alts))
    const best = alts[0]
    for (const c of ['tokyo', 'kanazawa', 'kyoto', 'hiroshima', 'osaka']) ok(nightsIn(best, c) >= 2, `${c} should get two nights or more: ` + line(best))
    ok(order(best)[0] === 'tokyo' && order(best)[1] === 'kanazawa' && order(best).at(-1) === 'osaka', 'Tokyo, then Kanazawa, ending in Osaka by the airport: ' + line(best))
    for (const a of alts) ok(!broken(a, inp).length, `${a.reason.kind}: ${broken(a, inp)} (${line(a)})`)
    for (const a of alts.filter((x) => x.reason.kind !== 'more_places')) ok(!a.reason.added.length, `${a.reason.kind} added a city nobody picked`)
    ok(alts.some((a) => a.reason.kind === 'more_places' && a.reason.added.length), 'more places should add a city and say so')
  },

  'seasons: no Alps, Hokkaido or Okinawa in December; Okinawa in July'() {
    const winter = trip({ numDays: 22, parties: fly('tokyo', 'tokyo') })
    const w = S.suggestSplit(winter)
    console.log('    December: ' + showJ(w).replace(/\n {4}/g, ' | '))
    for (const a of w) for (const c of ['takayama', 'sapporo', 'okinawa']) ok(!nightsIn(a, c), `${a.reason.kind} goes to ${c} in December`)
    // picked anyway: allowed, and said
    const picked = S.suggestSplit(trip({ parties: fly('tokyo', 'osaka'), picked: ['tokyo', 'kyoto', 'osaka', 'takayama'] }))
    console.log('    Takayama picked: ' + showJ(picked).replace(/\n {4}/g, ' | '))
    for (const a of picked) ok(!nightsIn(a, 'takayama') || a.reason.offSeason.includes('takayama'), 'Takayama in December without the off-season note')
    const summer = trip({ startDate: '2027-07-10', numDays: 13, parties: fly('tokyo', 'tokyo'), picked: ['tokyo', 'kyoto', 'okinawa'] })
    const s = S.suggestSplit(summer)
    console.log('    July: ' + showJ(s).replace(/\n {4}/g, ' | '))
    ok(nightsIn(s[0], 'okinawa') >= 3, 'Okinawa picked in July should get three nights or more: ' + line(s[0]))
    ok(order(s[0])[0] === 'okinawa' || order(s[0]).at(-1) === 'okinawa' || (order(s[0]).at(-2) === 'okinawa' && s[0].rows.at(-1).nights <= 2), 'Okinawa at an end of the trip: ' + line(s[0]))
    for (const a of s) ok(!broken(a, summer).length, `${a.reason.kind}: ${broken(a, summer)} (${line(a)})`)
  },

  'the route makes sense: never Tokyo 3, Osaka 3, Sapporo 1'() {
    const inp = trip({ startDate: '2027-07-10', numDays: 8, parties: fly('tokyo', 'osaka'), picked: ['tokyo', 'osaka', 'sapporo'] })
    const alts = S.suggestSplit(inp)
    console.log('    7 nights: ' + showJ(alts).replace(/\n {4}/g, ' | '))
    for (const a of alts) {
      ok(!nightsIn(a, 'sapporo'), `${a.reason.kind}: Sapporo in a week that Tokyo and Osaka fill: ` + line(a))
      ok(!broken(a, inp).length, `${a.reason.kind}: ${broken(a, inp)}`)
    }
    // with room for it, Sapporo comes in properly: three nights or more, at an end
    const long = trip({ startDate: '2027-07-10', numDays: 15, parties: fly('tokyo', 'osaka'), picked: ['tokyo', 'osaka', 'sapporo'] })
    const l = S.suggestSplit(long)
    console.log('    14 nights: ' + showJ(l).replace(/\n {4}/g, ' | '))
    ok(nightsIn(l[0], 'sapporo') >= 3 && nightsIn(l[0], 'tokyo') >= 4, 'two weeks should hold Sapporo and a full Tokyo: ' + line(l[0]))
    for (const a of l) ok(!broken(a, long).length, `${a.reason.kind}: ${broken(a, long)} (${line(a)})`)
  },

  'what the group liked wins over the starting values'() {
    // eighteen liked places, nearly all in Hiroshima and Osaka: the split follows them, not the classic line
    const liked = [...places('hiroshima', 8, 150), ...places('osaka', 8, 150), ...places('tokyo', 2, 150)]
    const alts = S.suggestSplit(trip({ numDays: 11, parties: fly('tokyo', 'osaka'), places: liked }))
    console.log('    ' + showJ(alts))
    const best = alts[0]
    ok(nightsIn(best, 'hiroshima') >= 3 && nightsIn(best, 'osaka') >= 3, 'should follow the liked places: ' + line(best))
    ok(nightsIn(best, 'tokyo') <= 3 && !nightsIn(best, 'kyoto'), 'not the classic line: ' + line(best))
    ok(!best.reason.typical, 'eighteen liked places are not "typical"')
  },

  'late landing and a morning flight: the nights by the airports'() {
    const inp = trip({ numDays: 11, parties: fly('tokyo', 'tokyo', { arrivalLate: true, departureEarly: true }), picked: ['kyoto', 'osaka'] })
    const alts = S.suggestSplit(inp)
    console.log('    ' + showJ(alts))
    for (const a of alts) {
      ok(order(a)[0] === 'tokyo', `${a.reason.kind}: the first night should be in Tokyo after a late landing: ` + line(a))
      ok(order(a).at(-1) === 'tokyo', `${a.reason.kind}: the last night should be in Tokyo before a morning flight: ` + line(a))
    }
    const r = S.partyStretch([{ who: null, title: 'TLV → NRT', starts_at: '2026-12-11 22:00:00+00', ends_at: '2026-12-12 19:40:00+00' }, { who: null, title: 'CTS → TLV', starts_at: '2026-12-20 09:10:00+00', ends_at: '2026-12-20 20:00:00+00' }], 'A', '2026-12-12', 9)
    ok(r.arrivalLate === true && r.departureEarly === true && r.arrival === 'tokyo' && r.departure === 'sapporo', 'flight times and airports: ' + JSON.stringify(r))
  },

  'two thousand random trips: every suggestion keeps every route rule, and the same trip gives the same answer'() {
    let seed = 20261113
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)]
    const airports = ['tokyo', 'osaka', 'tokyo', 'osaka', 'tokyo', 'nagoya', 'fukuoka', 'sapporo', 'okinawa']
    const all = japan.map((c) => c.id)
    let worst = 0, total = 0, none = 0, slowest = ''
    const bad0 = bad
    for (let n = 0; n < 2000; n++) {
      const numDays = 5 + Math.floor(rnd() * 18) // 4 to 21 nights
      const month = 1 + Math.floor(rnd() * 12)
      const arrival = pick(airports)
      const picked = rnd() < 0.35 ? [] : all.filter(() => rnd() < 0.25)
      const liked = rnd() < 0.6 ? [] : all.filter(() => rnd() < 0.3).flatMap((c) => places(c, 1 + Math.floor(rnd() * 8), 120))
      const inp = trip({
        startDate: `2027-${String(month).padStart(2, '0')}-0${1 + Math.floor(rnd() * 9)}`,
        numDays,
        parties: rnd() < 0.1 ? [] : fly(arrival, rnd() < 0.5 ? arrival : pick(airports), { arrivalLate: rnd() < 0.2, departureEarly: rnd() < 0.2 }),
        picked,
        places: liked,
        firstVisit: rnd() < 0.7,
      })
      const t0 = performance.now()
      const alts = S.suggestSplit(inp)
      const ms = performance.now() - t0
      if (ms > worst) slowest = `trip ${n}: ${numDays - 1} nights, month ${month}, ${arrival}→${inp.parties[0]?.departure ?? '-'}, picked ${picked.length}, liked cities ${new Set(liked.map((p) => p.city)).size}`
      worst = Math.max(worst, ms)
      total += ms
      if (!alts.length) none++
      for (const a of alts) {
        const b = broken(a, inp)
        if (b.length && bad - bad0 < 8) ok(false, `trip ${n} (${numDays - 1} nights, month ${month}, ${arrival}→${inp.parties[0]?.departure ?? '-'}, picked ${picked}): ${a.reason.kind} ${line(a)}: ${b.join('; ')}`)
        else if (b.length) bad++
        // only "more places" may add a city off the classic line (the classic three join any split the picks don't fill)
        const off = a.reason.added.filter((c) => !J[c].classic)
        if (a.reason.kind !== 'more_places' && off.length) ok(false, `trip ${n}: ${a.reason.kind} added ${off}`)
      }
      if (n % 100 === 0 && JSON.stringify(S.suggestSplit(inp)) !== JSON.stringify(alts)) ok(false, `trip ${n}: a second run gave another answer`)
    }
    console.log(`    slowest ${worst.toFixed(0)} ms (${slowest}), average ${(total / 2000).toFixed(1)} ms` + (none ? `, ${none} with no suggestion` : ''))
    ok(none === 0, `${none} trips got no suggestion`)
    ok(worst < 1500, `slowest trip took ${worst.toFixed(0)} ms`)
  },
})

const only = process.argv.slice(2)
for (const [name, fn] of Object.entries(cases)) {
  if (only.length && !only.some((o) => name.includes(o))) continue
  const before = bad
  console.log(name)
  const t0 = Date.now()
  try { fn() } catch (e) { bad++; console.log('  ERROR ' + (e.stack || e)) }
  console.log(`  ${bad === before ? 'ok' : 'FAILED'} (${Date.now() - t0} ms)`)
}
if (bad) { console.log(`\n${bad} failure(s)`); process.exit(1) }
console.log('\nall good')
