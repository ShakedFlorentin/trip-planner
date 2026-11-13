// Tests for where-to-sleep (supabase/functions/plan-trip/stay.ts): `node scripts/stay-test.mjs` (npm run test:stay).
// The planner-level cases (the stays become the plan's bases, day trips) are fixtures in scripts/plan-fixtures/stay-*.json.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({
  entryPoints: [join(root, 'supabase/functions/plan-trip/stay.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node18',
})
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const AB = await build({ entryPoints: [join(root, 'supabase/functions/_shared/areas.ts')], bundle: true, write: false, format: 'esm', platform: 'node' })
const A = await import('data:text/javascript;base64,' + Buffer.from(AB.outputFiles[0].text).toString('base64'))

let bad = 0
const ok = (cond, msg) => { if (!cond) { bad++; console.log('  FAIL ' + msg) } }
const dateOf = (d) => new Date(Date.parse('2026-12-01T00:00:00Z') + (d - 1) * 86400000).toISOString().slice(0, 10)

const CITIES = {
  tokyo: { lat: 35.681, lng: 139.767, en: 'Tokyo', he: 'טוקיו' },
  yokohama: { lat: 35.444, lng: 139.638, en: 'Yokohama', he: 'יוקוהמה' },
  kyoto: { lat: 35.003, lng: 135.759, en: 'Kyoto', he: 'קיוטו' },
  osaka: { lat: 34.686, lng: 135.502, en: 'Osaka', he: 'אוסקה' },
  nara: { lat: 34.685, lng: 135.805, en: 'Nara', he: 'נארה' },
  hiroshima: { lat: 34.397, lng: 132.475, en: 'Hiroshima', he: 'הירושימה' },
  fukuoka: { lat: 33.59, lng: 130.42, en: 'Fukuoka', he: 'פוקואוקה' },
}
const ctxOf = (places = []) => ({
  base: Object.fromEntries(Object.entries(CITIES).map(([k, c]) => [k, { lat: c.lat, lng: c.lng }])),
  nameEn: Object.fromEntries(Object.entries(CITIES).map(([k, c]) => [k, c.en])),
  nameHe: Object.fromEntries(Object.entries(CITIES).map(([k, c]) => [k, c.he])),
  places,
})
const pl = (id, city, lat, lng, extra = {}) => ({ id, city, point: { lat, lng }, weight: 3.5, mins: 90, ...extra })
const row = (o) => ({ party: null, lat: null, lng: null, area: null, status: 'proposed', booked: false, hotelPoint: null, hotelTitle: null, ...o })

// Tokyo places by neighbourhood (real coordinates)
const SHINJUKU = [pl('gyoen', 'tokyo', 35.6852, 139.7101), pl('omoide', 'tokyo', 35.6929, 139.6995), pl('goldengai', 'tokyo', 35.694, 139.7046)]
const SHIBUYA = [pl('sky', 'tokyo', 35.6585, 139.7022), pl('crossing', 'tokyo', 35.6595, 139.7005), pl('ebisu', 'tokyo', 35.6467, 139.7101)]
const HARAJUKU = [pl('takeshita', 'tokyo', 35.6716, 139.703), pl('meiji', 'tokyo', 35.6764, 139.6993), pl('omotesando', 'tokyo', 35.6654, 139.7121)]
const FUJI = [pl('chureito', 'daytrip', 35.5011, 138.8013), pl('oishi', 'daytrip', 35.5178, 138.7514)]
const ASAKUSA = [pl('sensoji', 'tokyo', 35.7148, 139.7967), pl('ueno', 'tokyo', 35.7156, 139.7745), pl('skytree', 'tokyo', 35.7101, 139.8107), pl('yanaka', 'tokyo', 35.7266, 139.7668)]

const cases = {
  'every area has a centre and a station, and the app and the planner read one table'() {
    for (const [city, list] of Object.entries(A.AREAS)) for (const a of list) {
      ok(typeof a.lat === 'number' && typeof a.lng === 'number' && a.lat > 24 && a.lat < 46 && a.lng > 122 && a.lng < 146, `${city}/${a.key}: centre ${a.lat},${a.lng} not in Japan`)
      ok(!!a.station && !!a.search, `${city}/${a.key}: no station or search`)
      // a place the table files under an area sits near that area's centre (catches a swapped or mistyped coordinate)
    }
    for (const h of A.HUBS) for (const k of h.areas) ok(A.AREAS[h.city]?.some((a) => a.key === k), `hub ${h.id}: no area ${k} in ${h.city}`)
    for (const city of ['טוקיו', 'אוסקה', 'קיוטו', 'נארה']) ok(A.AREAS[city].filter((a) => a.pick).length === 1, `${city}: needs exactly one default base`)
  },

  'Shinjuku, Shibuya and Harajuku days plus Fuji: one Tokyo base, Shinjuku, near the Fuji bus'() {
    const ctx = ctxOf([...SHINJUKU, ...SHIBUYA, ...HARAJUKU, ...FUJI])
    const r = S.sleepsFromStays([row({ city: 'tokyo', check_in: dateOf(1), check_out: dateOf(6) })], ctx)
    ok(r.recs.length === 1, `expected one recommendation for the stretch, got ${r.recs.length}`)
    const rec = r.recs[0]
    console.log('    ' + JSON.stringify(rec.best) + ' others ' + rec.alternatives.map((a) => a.key).join(', '))
    ok(rec.best.key === 'Shinjuku', `recommended ${rec.best.key}`)
    ok(rec.best.hubs.includes('fuji'), 'Shinjuku should say it is near the Fuji bus')
    ok(rec.best.total === 9, `total ${rec.best.total}, expected the 9 Tokyo places (Fuji is a day trip)`)
    ok(rec.alternatives.length >= 1 && rec.alternatives.length <= 2, `alternatives: ${rec.alternatives.length}`)
    ok(!rec.alternatives.some((a) => a.key === rec.best.key), 'an alternative repeats the best')
    ok(rec.nights === 5 && rec.check_in === dateOf(1) && rec.check_out === dateOf(6), 'stretch dates')
    ok(r.sleeps.length === 1 && r.sleeps[0].point.lat === 35.6896 && r.sleeps[0].point.lng === 139.7006, 'sleeps at Shinjuku station')
    ok(r.sleeps[0].booked === false, 'an estimate')
  },

  'no hotel every night: back-to-back Tokyo stays (one per day) still get one area and one base'() {
    // three single-night rows, each night's places in another neighbourhood: a per-night answer would hop
    const ctx = ctxOf([...SHINJUKU, ...SHIBUYA, ...HARAJUKU])
    const rows = [1, 2, 3].map((d) => row({ city: 'tokyo', check_in: dateOf(d), check_out: dateOf(d + 1) }))
    const r = S.sleepsFromStays(rows, ctx)
    ok(r.recs.length === 1, `expected one recommendation for the three nights, got ${r.recs.length}`)
    ok(r.recs[0]?.nights === 3, 'the recommendation covers all three nights')
    const bases = new Set(r.sleeps.map((s) => `${s.point.lat},${s.point.lng}|${s.key}`))
    ok(bases.size === 1, `the three nights sleep at ${bases.size} places: ${[...bases].join(' / ')}`)
  },

  'no hotel every night: day cities with a one-day Yokohama stop stay one Tokyo base'() {
    const ctx = ctxOf([...SHINJUKU, ...SHIBUYA, pl('minato-mirai', 'yokohama', 35.4575, 139.6325)])
    const days = ['tokyo', 'tokyo', 'yokohama', 'tokyo', 'tokyo', 'tokyo']
    const r = S.sleepsFromDays(days, 6, dateOf, ctx)
    ok(r.sleeps.length === 1 && r.sleeps[0].city === 'tokyo', `expected one Tokyo stretch, got ${r.sleeps.map((s) => s.city + ' ' + s.checkIn + '→' + s.checkOut).join(', ')}`)
    ok(r.sleeps[0]?.checkIn === dateOf(1) && r.sleeps[0]?.checkOut === dateOf(6), 'nights 1-5, out on the morning of day 6')
    ok(r.recs.length === 1, 'one recommendation')
  },

  'no hotel every night: a far one-night stop stays (nothing else makes sense), a close one joins'() {
    // Hiroshima is too far from Kyoto and from Fukuoka for a day trip: its night stays
    const far = S.sleepsFromDays(['kyoto', 'kyoto', 'hiroshima', 'fukuoka', 'fukuoka', 'fukuoka'], 6, dateOf, ctxOf())
    ok(far.sleeps.map((s) => s.city).join() === 'kyoto,hiroshima,fukuoka', `got ${far.sleeps.map((s) => s.city).join()}`)
    // Kyoto 3, Nara 1, Osaka 3: Nara joins the nearer neighbour (Kyoto is 36 km, Osaka 27 km)
    const near = S.sleepsFromDays(['kyoto', 'kyoto', 'kyoto', 'nara', 'osaka', 'osaka', 'osaka', 'osaka'], 8, dateOf, ctxOf())
    ok(near.sleeps.map((s) => s.city).join() === 'kyoto,osaka', `got ${near.sleeps.map((s) => s.city + 'x' + Math.round((Date.parse(s.checkOut) - Date.parse(s.checkIn)) / 864e5)).join(' > ')}`)
    // a run of single days in four cities a day trip apart: never one night each
    const hop = S.sleepsFromDays(['tokyo', 'yokohama', 'tokyo', 'yokohama', 'tokyo', 'tokyo'], 6, dateOf, ctxOf())
    for (const s of hop.sleeps) ok(Date.parse(s.checkOut) - Date.parse(s.checkIn) >= 2 * 864e5 || hop.sleeps.length === 1, `a one-night stop: ${s.city} ${s.checkIn}`)
  },

  'Kyoto with Fushimi Inari and a Nara day trip: Kyoto Station, near the train to Nara'() {
    const ctx = ctxOf([
      pl('inari', 'kyoto', 34.9671, 135.7727), pl('tofukuji', 'kyoto', 34.9765, 135.7737), pl('kiyomizu', 'kyoto', 34.9949, 135.785),
      pl('todaiji', 'nara', 34.689, 135.8398), pl('narapark', 'nara', 34.685, 135.843),
    ])
    const r = S.sleepsFromDays(['kyoto', 'kyoto', 'kyoto', 'kyoto'], 4, dateOf, ctx)
    const rec = r.recs[0]
    console.log('    ' + JSON.stringify(rec?.best))
    ok(rec?.best.key === 'Kyoto Station & South', `recommended ${rec?.best.key}`)
    ok(rec?.best.hubs.includes('nara'), 'near the train to Nara')
  },

  'Asakusa, Ueno and Skytree: Asakusa & Ueno; the reason counts what is close'() {
    const rec = S.recommendArea('טוקיו', ASAKUSA.map((p) => ({ point: p.point, weight: 3, mins: 90, dayTrip: false })))
    ok(rec.best.key === 'Asakusa & Ueno', `recommended ${rec.best.key}`)
    ok(rec.best.total === 4 && rec.best.near >= 3 && [15, 20, 25, 30].includes(rec.best.within), `reason ${JSON.stringify(rec.best)}`)
    for (const a of rec.alternatives) ok(a.within === rec.best.within && a.near <= rec.best.near, `alternative ${a.key} measured differently: ${JSON.stringify(a)}`)
  },

  'nothing liked yet: the city\'s usual base, said as central'() {
    for (const [city, key] of [['טוקיו', 'Shinjuku'], ['אוסקה', 'Minami'], ['קיוטו', 'Downtown Kyoto'], ['נארה', 'Nara Park & Naramachi']]) {
      const rec = S.recommendArea(city, [])
      ok(rec?.basis === 'central' && rec.best.key === key, `${city}: ${rec?.basis} ${rec?.best.key}`)
    }
    ok(S.recommendArea('יוקוהמה', []) === null, 'a city with no areas has no recommendation')
    // never an area that is no good as a base
    const rec = S.recommendArea('טוקיו', [{ point: { lat: 35.6258, lng: 139.7714 }, weight: 5, mins: 120, dayTrip: false }])
    ok(rec.best.key !== 'Tokyo Bay' && rec.best.key !== 'Outer Tokyo', `recommended ${rec.best.key} as a base`)
  },

  'a booked hotel, coordinates or a typed area: no recommendation, the same point as before'() {
    const ctx = ctxOf([...SHIBUYA])
    const hp = { lat: 35.6655, lng: 139.7599 }
    const r = S.sleepsFromStays([
      row({ city: 'tokyo', check_in: dateOf(1), check_out: dateOf(3), booked: true, hotelPoint: hp, hotelTitle: 'Mitsui Garden', status: 'confirmed' }),
      row({ city: 'kyoto', check_in: dateOf(3), check_out: dateOf(5), lat: 35.01, lng: 135.76 }),
      row({ city: 'osaka', check_in: dateOf(5), check_out: dateOf(7), area: 'Dotonbori' }),
    ], ctx)
    ok(r.recs.length === 0, `expected no recommendation, got ${r.recs.map((x) => x.city)}`)
    ok(r.sleeps[0].point === hp && r.sleeps[0].key === 'Mitsui Garden' && r.sleeps[0].label === 'Mitsui Garden' && r.sleeps[0].booked, 'booked hotel unchanged')
    ok(r.sleeps[1].point.lat === 35.01 && r.sleeps[1].key === 'kyoto|', 'coordinates unchanged')
    ok(r.sleeps[2].point.lat === 34.6665 && r.sleeps[2].label === 'Dotonbori', 'a typed area sleeps at its station (Namba)')
  },

  'a couple\'s own places count only for its own stretch'() {
    const ctx = ctxOf([...ASAKUSA.map((p) => ({ ...p, parties: ['A'] })), ...SHIBUYA.map((p) => ({ ...p, parties: ['B'] }))])
    const r = S.sleepsFromStays([
      row({ party: 'A', city: 'tokyo', check_in: dateOf(1), check_out: dateOf(4) }),
      row({ party: 'B', city: 'tokyo', check_in: dateOf(1), check_out: dateOf(4) }),
    ], ctx)
    const of = (p) => r.recs.find((x) => x.party === p)?.best.key
    ok(of('A') === 'Asakusa & Ueno' && of('B') === 'Shibuya & Ebisu', `A: ${of('A')}, B: ${of('B')}`)
  },

  'the city written on a day: Hebrew, English, two cities'() {
    const ctx = ctxOf()
    ok(S.cityIdOf('טוקיו', ctx) === 'tokyo' && S.cityIdOf('Kyoto', ctx) === 'kyoto' && S.cityIdOf('אוסקה / נארה', ctx) === 'osaka', 'names')
    ok(S.cityIdOf('', ctx) === null && S.cityIdOf('ירח', ctx) === null, 'unknown')
    // a blank day takes the day before it (and the first days the first written one)
    const r = S.sleepsFromDays([null, 'kyoto', null, null], 4, dateOf, ctx)
    ok(r.sleeps.length === 1 && r.sleeps[0].city === 'kyoto' && r.sleeps[0].checkIn === dateOf(1) && r.sleeps[0].checkOut === dateOf(4), JSON.stringify(r.sleeps))
    ok(S.sleepsFromDays([null, null], 2, dateOf, ctx).sleeps.length === 0, 'no city anywhere: nothing')
  },

  'deterministic: the same input gives the same answer'() {
    const ctx = ctxOf([...SHINJUKU, ...SHIBUYA, ...HARAJUKU, ...FUJI, ...ASAKUSA])
    const a = JSON.stringify(S.sleepsFromDays(['tokyo', 'tokyo', 'tokyo', 'tokyo', 'tokyo'], 5, dateOf, ctx))
    const b = JSON.stringify(S.sleepsFromDays(['tokyo', 'tokyo', 'tokyo', 'tokyo', 'tokyo'], 5, dateOf, ctx))
    ok(a === b, 'two runs differ')
  },
}

for (const [name, fn] of Object.entries(cases)) {
  const before = bad
  console.log(name)
  fn()
  console.log(bad === before ? '  ok' : '  FAILED')
}
console.log(bad ? `\n${bad} failure(s)` : '\nall good')
process.exit(bad ? 1 : 0)
