// One small scenario per planner fix of 26 Nov 2026 (meals, order on the map, hours and sunset, couples and days apart,
// real points, move/landing/departure days, baby and card facts). Each fails on the code before its fix.
// r1…r7: the second round (what a replay of a real trip showed), same rule: each fails on the code before its fix.
// r8…r12: the third round (what was still worse than the plan it replaced).
// r13 on: the fourth round (a walk planned after dark, a late lunch on the day they arrive, rides that grew).
// `node scripts/plan-fixes-test.mjs [1 2 … r1 r2 …]`; PLAN_DIR=<another copy of plan-trip> runs them on that code.
import { engine, sunsetMin } from './plan-harness.mjs'

const { E, P, G, F } = await engine()
const H = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b }
const TOKYO = { lat: 35.693, lng: 139.7 }
const east = (p, kmE, kmN = 0) => ({ lat: p.lat + kmN / 111, lng: p.lng + kmE / 90.4 })
const dateOf = (d) => new Date(Date.parse('2026-12-14T00:00:00Z') + d * 86400000).toISOString().slice(0, 10)
const day = (d, at) => ({ day: d, date: dateOf(d), weekday: new Date(dateOf(d) + 'T12:00:00Z').getUTCDay(), at: new Map(Object.entries(at)) })
const pres = (x = {}) => ({ base: 'tokyo', hotel: TOKYO, start: H('9:30'), end: H('21:30'), early: H('8:00'), ...x })
const unit = (id, x = {}) => ({
  id, couples: ['A'], base: 'tokyo', far: false, point: TOKYO, mins: 60, category: 'sight', best: 'any', opens: H('9:00'), closes: H('20:00'),
  closedWeekdays: [], closedDates: [], openDates: [], priority: 3, current: null, ...x,
})
const isMeal = (u) => u.category === 'food' || (u.category === 'nightlife' && u.meal)
const inSlot = (s, a, b) => s >= H(a) && s <= H(b)

const tests = {
  1: (t) => {
    // three full days, six restaurants and twelve higher-priority sights: every day gets a lunch and a dinner
    const days = [1, 2, 3].map((d) => day(d, { A: pres() }))
    const units = [
      ...Array.from({ length: 12 }, (_, i) => unit('sight' + i, { priority: 4, mins: 90, point: east(TOKYO, (i % 4) - 1.5, Math.floor(i / 4) - 1) })),
      ...Array.from({ length: 6 }, (_, i) => unit('food' + i, { category: 'food', opens: H('11:00'), closes: H('22:00'), point: east(TOKYO, i * 0.3) })),
    ]
    const out = E.plan(days, units, [])
    for (const d of days) {
      const meals = [...out.placed].filter(([id, p]) => p.day === d.day && id.startsWith('food')).map(([, p]) => p.start)
      const lunch = meals.filter((s) => inSlot(s, '11:00', '14:45')).length
      const dinner = meals.filter((s) => inSlot(s, '17:15', '21:00')).length
      t(lunch === 1, `day ${d.day}: ${lunch} lunches (meals at ${meals.map(E.hhmm).join(', ') || 'none'})`)
      t(dinner === 1, `day ${d.day}: ${dinner} dinners (meals at ${meals.map(E.hhmm).join(', ') || 'none'})`)
    }
    // two evening restaurants and one day: one dinner, not two
    const two = E.plan([days[0]], [unit('eve1', { category: 'food', best: 'evening', closes: H('23:00') }), unit('eve2', { category: 'food', best: 'evening', closes: H('23:00') })], [])
    t(two.placed.size === 1, `two evening restaurants on one day: ${two.placed.size} planned, expected 1`)
    // a day with no meal says so
    const none = E.plan([days[0]], [unit('only-sight')], [])
    t(none.issues.some((i) => i.kind === 'no_lunch' && i.day === 1 && i.couple === 'A'), 'no "no_lunch" issue on a day with no meal')
    t(none.issues.some((i) => i.kind === 'no_dinner' && i.day === 1 && i.couple === 'A'), 'no "no_dinner" issue on a day with no meal')
    // an izakaya whose card says it serves a meal is the dinner; the café is not a lunch
    const iz = E.plan([days[0]], [unit('izakaya', { category: 'nightlife', best: 'evening', meal: true, opens: H('17:00'), closes: H('23:00') }), unit('cafe', { category: 'cafe' })], [])
    t(!iz.issues.some((i) => i.kind === 'no_dinner'), 'an izakaya that serves food did not count as dinner')
    t(iz.issues.some((i) => i.kind === 'no_lunch'), 'a café counted as lunch')
  },
  2: (t) => {
    // two areas 8 km apart; the cards' hours alone (morning, then four afternoons) zigzag between them
    const W = TOKYO
    const Ea = east(TOKYO, 8)
    const units = [
      unit('w1', { best: 'morning', point: W }),
      unit('w2', { best: 'afternoon', point: east(W, 0.3) }),
      unit('e1', { best: 'afternoon', point: Ea }),
      unit('w3', { best: 'afternoon', point: east(W, 0, 0.3) }),
      unit('e2', { best: 'afternoon', point: east(Ea, 0.3) }),
    ]
    const out = E.plan([day(1, { A: pres() })], units, [])
    t(out.placed.size === 5, `${out.placed.size}/5 placed`)
    const seq = [...out.placed].sort((a, b) => a[1].start - b[1].start).map(([id]) => id)
    const sides = seq.map((id) => id[0]).join('')
    t(/^w+e+$|^e+w+$/.test(sides), `the day zigzags between the two areas: ${seq.join(' → ')}`)
    for (const [id, p] of out.placed) if (id !== 'w1') t(p.start >= H('12:00'), `${id}: an afternoon place at ${E.hhmm(p.start)}`)
    // travel is part of the day's load: four 90-minute places 15 km apart are more than a 7-hour day holds
    const far = [0, 1, 2, 3].map((i) => unit('far' + i, { mins: 90, point: east(TOKYO, 15 * (i - 1.5)) }))
    const short = E.plan([day(1, { A: pres({ end: H('16:30') }) })], far, [])
    for (const [id, p] of short.placed) t(p.start + 90 <= H('16:30'), `${id}: ends ${E.hhmm(p.start + 90)}, the day ends 16:30`)
    t(short.placed.size >= 3 && [...short.placed.values()].every((p) => p.start + 90 <= H('16:30')), `${short.placed.size} of 4 planned on a 7-hour day (3 fit with the rides)`)
  },
  3: (t) => {
    const d = day(6, { A: pres() }) // 20 Dec 2026
    const dusk = sunsetMin(d.date, TOKYO)
    t(Math.abs(dusk - H('16:31')) <= 6, `sunset sum: ${E.hhmm(dusk)}`)
    t(typeof E.sunset === 'function' && Math.abs(E.sunset(d.date, TOKYO) - dusk) <= 3, 'plan.ts has no sunset(date, point), or it disagrees with the harness')
    // an outdoor "evening" sight that closes at 17:00 is over by dusk, not started at 18:00
    const lake = E.plan([d], [unit('lake', { best: 'evening', mins: 90, opens: H('8:00'), closes: H('17:00'), outdoor: true })], [])
    const l = lake.placed.get('lake')
    t(!!l && l.start + 90 <= dusk + 20, `outdoor evening sight: ${l ? 'ends ' + E.hhmm(l.start + 90) : 'not planned'} (dusk ${E.hhmm(dusk)})`)
    // an "evening" viewpoint is there for the sunset of that date, not at a flat 18:00
    const view = E.plan([d], [unit('view', { best: 'evening', mins: 90, closes: H('22:30') })], [])
    const v = view.placed.get('view')
    t(!!v && v.start >= dusk - 60 && v.start <= dusk + 15, `sunset viewpoint at ${v ? E.hhmm(v.start) : '-'} (sunset ${E.hhmm(dusk)})`)
    // a morning market that opens at 5:00 and closes at 10:00 starts before 9:30
    const market = E.plan([d], [unit('market', { category: 'food', best: 'morning', opens: H('5:00'), closes: H('10:00') })], [])
    const m = market.placed.get('market')
    t(!!m && m.start + 60 <= H('10:00') && m.start >= H('8:00'), `early market: ${m ? E.hhmm(m.start) : 'not planned'}`)
    // a morning place that opens early starts before 9:30 even when it closes late
    const shrine = E.plan([d], [unit('shrine', { best: 'morning', opens: H('6:00'), closes: H('17:00') })], [])
    t(shrine.placed.get('shrine')?.start < H('9:30'), `morning place open from 6:00 starts ${E.hhmm(shrine.placed.get('shrine')?.start ?? 0)}`)
    // nothing runs past the end of the day
    const shortDay = day(6, { A: pres({ end: H('15:00') }) })
    const late = E.plan([shortDay], [unit('museum', { best: 'afternoon', mins: 90 })], [])
    const s = late.placed.get('museum')
    t(!s || s.start + 90 <= H('15:00'), `a stop runs to ${s ? E.hhmm(s.start + 90) : '-'} on a day that ends 15:00`)
    t(!!s, 'the afternoon stop was dropped instead of moved earlier')
  },
  4: (t) => {
    const KYOTO = { lat: 35.003, lng: 135.759 }
    // both liked a Kyoto temple, but couple B is not in Japan during the Kyoto days: A goes
    const days = [
      day(1, { A: pres(), B: pres() }),
      day(2, { A: pres({ base: 'kyoto', hotel: KYOTO, start: H('14:00') }) }),
      day(3, { A: pres({ base: 'kyoto', hotel: KYOTO }) }),
    ]
    const temple = unit('temple', { couples: ['A', 'B'], base: 'kyoto', point: east(KYOTO, 1) })
    const out = E.plan(days, [temple], [])
    t([2, 3].includes(out.placed.get('temple')?.day), `a both-liked place with one couple abroad: ${out.unplanned.get('temple') ?? 'day ' + out.placed.get('temple')?.day}`)
    // the days one couple spends alone in Yokohama do not collect their Tokyo places while the Tokyo days have room
    const YOKO = { lat: 35.456, lng: 139.633 }
    const alone = [
      day(1, { A: pres({ base: 'yokohama', hotel: YOKO }) }),
      day(2, { A: pres({ base: 'yokohama', hotel: YOKO }) }),
      ...[3, 4, 5].map((d) => day(d, { A: pres(), B: pres() })),
    ]
    const spots = [[0, 0], [6, 2], [-3, -4], [8, 3], [2, 5], [-2, 1]]
    const units = [
      unit('yoko1', { base: 'yokohama', point: east(YOKO, 0.5) }),
      unit('yoko2', { base: 'yokohama', point: east(YOKO, -0.5) }),
      ...spots.map(([x, y], i) => unit('tokyoA' + i, { point: east(TOKYO, x, y) })),
      ...spots.map(([x, y], i) => unit('tokyoAB' + i, { couples: ['A', 'B'], mins: 90, point: east(TOKYO, y, x) })),
    ]
    const o2 = E.plan(alone, units, [])
    t(o2.away.size === 0, `${o2.away.size} Tokyo places put on the Yokohama days: ${[...o2.away.keys()].join(', ')}`)
    t(o2.placed.size === units.length, `${o2.placed.size}/${units.length} placed`)
    // a 15-minute stall two hours away does not earn a day trip
    const stall = unit('stall', { far: true, mins: 15, point: east(TOKYO, -70, -40) })
    const o3 = E.plan([day(1, { A: pres() })], [stall, unit('museum', { mins: 120 })], [])
    t(!o3.placed.has('stall'), 'a 15-minute stall two hours away got a day trip')
    t(o3.placed.has('museum'), 'the day was not given back to the places in town')
    // a day trip of three places wins a day from a day of small places in town
    const trip = [0, 1, 2].map((i) => unit('trip' + i, { far: true, mins: 100, priority: 4, point: east(east(TOKYO, -60, -30), i) }))
    const town = Array.from({ length: 5 }, (_, i) => unit('town' + i, { priority: 3, mins: 75, point: east(TOKYO, i - 2, 1) }))
    const o4 = E.plan([day(1, { A: pres() })], [...town, ...trip], [])
    t(trip.every((u) => o4.placed.has(u.id)), `a three-place day trip (priority 4) lost the day to small places in town: ${[...o4.placed.keys()].join(', ')}`)
  },
  5: async (t) => {
    // a place whose point is unknown (the city's middle stands in) is not 0 km from a place that is really there
    const here = unit('here', { best: 'morning' })
    const unknown = unit('unknown', { approx: true, best: 'midday', opens: H('9:00') })
    const out = E.plan([day(1, { A: pres() })], [here, unknown, unit('also-unknown', { approx: true, best: 'midday' })], [])
    const starts = ['here', 'unknown', 'also-unknown'].map((id) => out.placed.get(id)?.start).sort((a, b) => a - b)
    t(starts.length === 3 && starts[2] - starts[1] >= 60 + 20, `two places with unknown points are planned as if next door: ${starts.map((s) => E.hhmm(s ?? 0)).join(', ')}`)
    if (!G) return t(false, 'no geo.ts: places with an address and no point are never looked up')
    const v = G.addressVariants('〒150-0001 1 Chome-2-3 Jingumae, Shibuya City, Tokyo 150-0001, Japan (3F)', 'Some Cafe', 'Tokyo')
    t(v.length >= 3 && v.some((q) => !/150-0001|3F|〒/.test(q)) && v.some((q) => /Some Cafe/.test(q) && /Tokyo/.test(q)), `address variants: ${JSON.stringify(v)}`)
    const now = Date.parse('2026-12-01T00:00:00Z')
    const mk = (rows, answers) => {
      const cache = new Map(rows)
      const asked = []
      return {
        asked, cache,
        deps: {
          now, budget: { left: 5 },
          get: async (q) => cache.get(q) ?? null,
          put: async (q, pt) => void cache.set(q, { lat: pt?.lat ?? null, lng: pt?.lng ?? null, at: new Date(now).toISOString() }),
          fetch: async (q) => { asked.push(q); return answers[q] ?? null },
        },
      }
    }
    const key = (q) => q.toLowerCase().trim()
    const addr = 'Jingumae 1-2-3, Shibuya, Tokyo'
    const [first] = G.addressVariants(addr, 'Some Cafe', 'Tokyo')
    // a fresh miss is trusted, an old one is asked again
    const fresh = mk([[key(first), { lat: null, lng: null, at: '2026-11-29T00:00:00Z' }]], { [first]: TOKYO })
    const r1 = await G.locate({ address: addr, name: 'Some Cafe', city: 'Tokyo', near: TOKYO }, fresh.deps)
    t(!fresh.asked.includes(first), 'a two-day-old miss was asked again')
    const old = mk([[key(first), { lat: null, lng: null, at: '2026-11-01T00:00:00Z' }]], { [first]: TOKYO })
    const r2 = await G.locate({ address: addr, name: 'Some Cafe', city: 'Tokyo', near: TOKYO }, old.deps)
    t(old.asked.includes(first) && r2?.lat === TOKYO.lat, `a month-old miss was not asked again (${JSON.stringify(r2)})`)
    void r1
    // the next way of writing the address is tried when the first finds nothing
    const second = mk([], { ['Some Cafe, Tokyo']: east(TOKYO, 1) })
    const r3 = await G.locate({ address: addr, name: 'Some Cafe', city: 'Tokyo', near: TOKYO }, second.deps)
    t(!!r3 && second.asked.length >= 2, `no second try after a miss (${second.asked.length} asked)`)
    // an answer in another part of the country is not the place
    const wrong = mk([], Object.fromEntries(G.addressVariants(addr, 'Some Cafe', 'Tokyo').map((q) => [q, { lat: 43.06, lng: 141.35 }])))
    const r4 = await G.locate({ address: addr, name: 'Some Cafe', city: 'Tokyo', near: TOKYO }, wrong.deps)
    t(r4 === null, 'a point 800 km from the city was accepted')
    // the run's budget of network lookups is kept
    const tight = mk([], {})
    tight.deps.budget.left = 1
    await G.locate({ address: addr, name: 'Some Cafe', city: 'Tokyo', near: TOKYO }, tight.deps)
    t(tight.asked.length === 1, `budget of 1 lookup, ${tight.asked.length} made`)
  },
  6: (t) => {
    const KYOTO = { lat: 35.003, lng: 135.759 }
    const OSAKA = { lat: 34.676, lng: 135.501 }
    const sleep = (party, checkIn, checkOut, city, point, x = {}) => ({ party, checkIn, checkOut, city, point, label: city, key: city, confirmed: true, booked: true, ...x })
    const build = (sleeps, flights = [], x = {}) =>
      P.buildDays({ numDays: 6, dateOf, sleeps, couples: ['A'], dayWho: new Map(), flights, trains: [], capOf: new Map(), baby: new Set(), past: () => false, ...x })
    // Kyoto → Osaka is half an hour by train: the day in Osaka does not start at a flat 14:00
    const move = build([sleep(null, dateOf(1), dateOf(3), 'kyoto', KYOTO), sleep(null, dateOf(3), dateOf(6), 'osaka', OSAKA)])
    const m = move[2].at.get('A')
    t(m.start >= H('11:30') && m.start < H('14:00'), `Kyoto → Osaka day starts ${E.hhmm(m.start)}`)
    // Tokyo → Kyoto with a late check-out is later than 14:00
    const long = build([sleep(null, dateOf(1), dateOf(3), 'tokyo', TOKYO, { outMin: H('11:00') }), sleep(null, dateOf(3), dateOf(6), 'kyoto', KYOTO)])
    t(long[2].at.get('A').start >= H('14:15'), `Tokyo → Kyoto after an 11:00 check-out starts ${E.hhmm(long[2].at.get('A').start)}`)
    // a booked train sets the start
    const train = build([sleep(null, dateOf(1), dateOf(3), 'tokyo', TOKYO), sleep(null, dateOf(3), dateOf(6), 'kyoto', KYOTO)], [], { trains: [{ who: null, starts_at: dateOf(3) + 'T08:00:00', ends_at: dateOf(3) + 'T10:15:00' }] })
    t(train[2].at.get('A').start <= H('11:15'), `with a train that arrives 10:15 the day starts ${E.hhmm(train[2].at.get('A').start)}`)
    // landing day: a lighter day
    const land = build([sleep(null, dateOf(1), dateOf(6), 'tokyo', TOKYO)], [{ who: null, title: 'TLV → HND', starts_at: dateOf(0) + 'T22:00:00', ends_at: dateOf(1) + 'T07:00:00' }])
    const units = Array.from({ length: 10 }, (_, i) => unit('near' + i, { point: east(TOKYO, (i % 3) * 0.4, Math.floor(i / 3) * 0.4) }))
    const out = E.plan(land, units, [])
    const first = [...out.placed].filter(([, p]) => p.day === 1).length * 60
    t(land[0].at.get('A').landing === true && first <= 0.6 * 510, `landing day holds ${first} minutes of plans (a full day holds 510)`)
    // departure day: the ride to the airport is in the day's end, and the last stop leaves time to get back for the bags
    const YOKO = { lat: 35.456, lng: 139.633 }
    const NRT = { lat: 35.772, lng: 140.3929 }
    const dep = build([sleep(null, dateOf(1), dateOf(3), 'yokohama', YOKO)], [{ who: null, title: 'NRT → TLV', starts_at: dateOf(3) + 'T20:00:00', ends_at: dateOf(4) + 'T03:00:00' }])
    const e = dep[2].at.get('A').end
    t(e <= H('20:00') - 180 - E.ride(YOKO, NRT), `leaving from Narita at 20:00 with ${E.ride(YOKO, NRT)} min to the airport, the day ends ${E.hhmm(e)}`)
    const dep2 = build([sleep(null, dateOf(1), dateOf(3), 'tokyo', TOKYO)], [{ who: null, title: 'HND → TLV', starts_at: dateOf(3) + 'T19:00:00', ends_at: dateOf(4) + 'T03:00:00' }])
    const awayPt = east(TOKYO, 15)
    const o2 = E.plan([dep2[2]], [unit('last', { best: 'afternoon', point: awayPt })], [])
    const p = o2.placed.get('last')
    const end2 = dep2[2].at.get('A').end
    t(!p || p.start + 60 + E.ride(awayPt, TOKYO) <= end2 + 15, `departure day ends ${E.hhmm(end2)}; the last stop ends ${p ? E.hhmm(p.start + 60) : '-'}, ${E.ride(awayPt, TOKYO)} min from the hotel`)
  },
  7: (t) => {
    const days = P.buildDays({
      numDays: 2, dateOf, couples: ['A', 'B'], dayWho: new Map(), flights: [], trains: [], capOf: new Map(), baby: new Set(['B']), past: () => false,
      sleeps: [{ party: null, checkIn: dateOf(1), checkOut: dateOf(4), city: 'tokyo', point: TOKYO, label: 'h', key: 'h', confirmed: true, booked: true }],
    })
    const b = days[0].at.get('B')
    t(b.baby === true && b.end <= H('20:30') && days[0].at.get('A').end === H('21:30'), `the couple with the baby ends ${E.hhmm(b.end)}`)
    const bar = unit('bar', { couples: ['A', 'B'], category: 'nightlife', best: 'night', adults: true, opens: H('19:00'), closes: H('24:00') })
    const kaiseki = unit('kaiseki', { couples: ['B'], category: 'food', best: 'evening', adults: true, booking: true, opens: H('17:30'), closes: H('22:00') })
    const out = E.plan(days, [bar, kaiseki, unit('park', { couples: ['A', 'B'] })], [])
    t(out.placed.has('bar') && out.only?.get('bar')?.join() === 'A', `an adults-only bar both liked: ${out.placed.has('bar') ? 'for ' + (out.only?.get('bar')?.join() ?? 'everyone') : 'not planned'}`)
    for (const [id, p] of out.placed) {
      const who = out.only?.get(id) ?? [bar, kaiseki].find((u) => u.id === id)?.couples ?? ['A', 'B']
      if (who.includes('B')) t(p.start + 60 <= H('20:30'), `${id}: the couple with the baby is out until ${E.hhmm(p.start + 60)}`)
    }
    t(out.issues.some((i) => i.id === 'kaiseki' && i.kind === 'booking'), 'a place that needs a booking raised no issue')
    t(out.issues.some((i) => i.id === 'kaiseki' && i.kind === 'baby'), 'an adults-only place planned for the couple with the baby raised no issue')
    t(!out.issues.some((i) => i.id === 'park' && (i.kind === 'baby' || i.kind === 'booking')), 'a plain park raised a baby or booking issue')
  },
  r1: (t) => {
    // one day both couples share, full as the plan stands: three places both liked and two own places each, the own
    // ones with more stars than the place both liked that is still waiting. It takes the room of one own place of each
    const days = [day(1, { A: pres(), B: pres() })]
    const both = ['A', 'B']
    const units = [
      ...[0, 1, 2].map((i) => unit('shared' + i, { couples: both, mins: 100, priority: 5, current: 1 })),
      ...[0, 1].map((i) => unit('ownA' + i, { couples: ['A'], mins: 90, priority: 4.5, current: 1 })),
      ...[0, 1].map((i) => unit('ownB' + i, { couples: ['B'], mins: 90, priority: 4.5, current: 1 })),
      unit('waiting', { couples: both, mins: 100, priority: 4 }),
    ]
    const out = E.plan(days, units, [])
    t(out.placed.has('waiting'), `a place both couples liked is "${out.unplanned.get('waiting')}" while the day holds ${[...out.placed.keys()].filter((id) => id.startsWith('own')).length} places only one couple liked`)
    t([0, 1, 2].every((i) => out.placed.has('shared' + i)), 'a place both liked was taken off for another')
    // and the plan stays as it is on the next run
    const next = E.plan(days, units.map((u) => ({ ...u, current: out.placed.get(u.id)?.day ?? null })), [])
    t(next.placed.size === out.placed.size && [...next.placed.keys()].every((id) => out.placed.has(id)), 'the plan changed when run again on its own result')
  },
  r2: (t) => {
    // the flags come from the card's facts, not from words in its name (made-up cards)
    t(!!F, 'no flags.ts: the flags are still guessed where the trip is read')
    if (!F) return
    const card = (x) => ({ category: 'sight', name: 'x', best: 'any', visitMins: 60, opens: null, closes: null, notes: [], ...x })
    const day_ = (name, x) => t(!F.daylightOnly(card({ name, ...x })), `"${name}" is held to daylight`)
    day_('Harbor Sea Life Park', { best: 'morning', opens: H('9:30'), closes: H('17:00') })
    day_('Cloud Tower Floating Garden Observatory', { best: 'evening', opens: H('9:30'), closes: H('22:30') })
    day_('Old Temple Garden', { best: 'morning', opens: H('6:00'), closes: H('18:00') })
    day_('Lantern Shrine Night Lights', { best: 'night' })
    day_('Garden View Cafe', { category: 'cafe', best: 'morning' })
    day_('Riverside Park', { best: null })
    t(F.daylightOnly(card({ name: 'Riverside Path', best: 'morning' })), 'open ground with no hours and a card that asks for the morning is not held to daylight')
    const bar = (name, x) => F.servesDinner(card({ category: 'nightlife', name, best: 'night', visitMins: 90, ...x }))
    t(!bar('Lantern Yokocho', { best: 'afternoon', visitMins: 150, opens: H('11:00'), closes: H('22:30') }), 'an afternoon alley counts as a meal')
    t(!bar('Stone Yokocho', { visitMins: 45, notes: ['step into a small izakaya'] }), 'a 45-minute alley stop counts as a meal')
    t(!bar('Memory Yokocho'), 'an alley whose card says nothing about food counts as a meal')
    t(!bar('Bar Quiet'), 'a bar counts as a meal')
    t(!bar('Never Checked Izakaya', { best: null, visitMins: null }), 'a card never checked counts as a meal')
    t(bar('Backstreet izakaya alleys'), 'an evening izakaya of an hour and a half is not a dinner')
    t(bar('Smoke Lane', { best: 'evening', visitMins: 60, notes: [null, 'Yakitori counters, cash only'] }), 'a card whose plan line says yakitori is not a dinner')
    // and in the plan: a nightlife meal is a dinner only. Open from 11:00, it does not stand in for the lunch
    const d = [day(1, { A: pres() })]
    const out = E.plan(d, [unit('alley', { category: 'nightlife', meal: true, best: 'afternoon', mins: 150, opens: H('11:00'), closes: H('22:30') })], [])
    t(out.issues.some((i) => i.kind === 'no_lunch'), `an alley at ${out.placed.has('alley') ? E.hhmm(out.placed.get('alley').start) : '-'} counted as the lunch`)
  },
  r3: (t) => {
    // a lake an hour and a half's visit, 85 km away, and nothing else out there: not a day trip
    const d = [day(1, { A: pres() })]
    const LAKE = east(TOKYO, -75, -40)
    const lake = unit('lake', { far: true, mins: 90, priority: 4, best: 'evening', closes: H('17:00'), point: LAKE })
    const alone = E.plan(d, [lake], [])
    t(!alone.placed.has('lake'), `a lone 90-minute stop ${Math.round(E.km(TOKYO, LAKE))} km away is the whole day`)
    // with a lunch and a second place beside it, it is one
    const more = [lake, unit('soba', { far: true, category: 'food', mins: 60, opens: H('11:00'), closes: H('15:00'), point: east(LAKE, 1) }), unit('cave', { far: true, mins: 60, point: east(LAKE, 2) })]
    const full = E.plan(d, more, [])
    t(more.every((u) => full.placed.has(u.id)), `a day trip of three places near each other: ${full.placed.size}/3 planned`)
    // and so is one long place on its own (a castle, half a day)
    const castle = E.plan(d, [unit('castle', { far: true, mins: 150, priority: 4, best: 'morning', closes: H('17:00'), point: LAKE })], [])
    t(castle.placed.has('castle'), 'a lone half-day place is not planned as a day trip')
  },
  r4: (t) => {
    // a couple sleeping in Yokohama for a Sunday and a Monday; everything they liked is in Tokyo, 25 km away: two
    // sights and a market food crawl (mornings, closed on Sunday). The day in Tokyo is the day the market is open,
    // and the crawl is its lunch
    const YOKO = east(TOKYO, 0, -25)
    const days = [6, 7].map((d) => day(d, { A: pres({ base: 'yokohama', hotel: YOKO }) }))
    t(days[0].weekday === 0, 'the first day of the scenario should be a Sunday')
    const units = [
      unit('museum', { best: 'morning', mins: 90 }),
      unit('shops', { category: 'shopping', best: 'afternoon', mins: 90, point: east(TOKYO, 1) }),
      unit('market', { category: 'food', best: 'morning', mins: 90, opens: H('8:00'), closes: H('14:00'), closedWeekdays: [0], point: east(TOKYO, 0.5) }),
    ]
    const out = E.plan(days, units, [])
    const m = out.placed.get('market')
    t(!!m && inSlot(m.start, '11:00', '14:45'), `the market crawl is ${m ? 'at ' + E.hhmm(m.start) : 'not planned'}: not the day's lunch`)
    for (const d of days) {
      const here = [...out.placed].filter(([, p]) => p.day === d.day)
      if (here.length) t(!out.issues.some((i) => i.kind === 'no_lunch' && i.day === d.day), `day ${d.day}: ${here.length} stops in Tokyo and no lunch`)
    }
  },
  r5: (t) => {
    // the day they fly home in the evening ends at 19:10: too early for a bar, not for an early dinner
    const d = [day(1, { A: pres({ end: H('19:10'), depart: true }) })]
    const shops = unit('shops', { category: 'shopping', best: 'midday', mins: 120 })
    const grill = unit('grill', { category: 'food', best: 'evening', opens: H('17:00'), closes: H('23:00'), point: east(TOKYO, 0.5) })
    const out = E.plan(d, [shops, grill], [])
    const g = out.placed.get('grill')
    t(!!g && g.start >= H('17:00') && g.start + 60 <= H('19:10'), `an evening restaurant on a day that ends 19:10: ${g ? 'at ' + E.hhmm(g.start) : 'not planned (' + out.unplanned.get('grill') + ')'}`)
    // and with no restaurant to give, the day says it has no dinner
    const none = E.plan(d, [shops], [])
    t(none.issues.some((i) => i.kind === 'no_dinner' && i.day === 1), 'a day that ends 19:10 with no dinner raises no "no_dinner"')
    // a day that is over by 18:00 has no dinner to plan
    const early = E.plan([day(1, { A: pres({ end: H('18:00'), depart: true }) })], [shops], [])
    t(!early.issues.some((i) => i.kind === 'no_dinner'), 'a day that ends 18:00 asks for a dinner')
  },
  r6: (t) => {
    // two evening restaurants alike and one dinner to plan: the one whose point is known is the one planned
    const d = [day(1, { A: pres() })]
    const eve = (id, x) => unit(id, { category: 'food', best: 'evening', mins: 90, priority: 4, opens: H('17:00'), closes: H('23:00'), ...x })
    for (const order of [0, 1]) {
      const two = [eve('a-nowhere', { approx: true }), eve('b-known', { point: east(TOKYO, 3) })]
      const out = E.plan(d, order ? two.reverse() : two, [unit('sight', { point: east(TOKYO, 0.4) })])
      t(out.placed.has('b-known') && !out.placed.has('a-nowhere'), `of two dinners alike, planned: ${[...out.placed.keys()].join(', ')}`)
    }
    // and the ride to a place with no known point is never nothing: 25 minutes each way in the day's times
    const out = E.plan(d, [unit('first', { best: 'morning' }), unit('nowhere', { best: 'morning', approx: true })], [])
    const [x, y] = ['first', 'nowhere'].map((id) => out.placed.get(id)).sort((p, q) => p.start - q.start)
    t(y.start - (x.start + 60) >= 25, `${y.start - (x.start + 60)} minutes between a place and one with no known point`)
  },
  r7: (t) => {
    // the day they move to a new city starts at 12:45: a liked restaurant whose card says "afternoon" is that day's
    // lunch, eaten in the lunch hours, not held to 14:30 and then pushed past them by a two-hour store
    const d = [day(1, { A: pres({ start: H('12:45') }) })]
    const out = E.plan(d, [
      unit('store', { category: 'shopping', best: 'morning', mins: 120, opens: H('10:00'), closes: H('20:00'), priority: 5 }),
      unit('cutlet', { category: 'food', best: 'afternoon', mins: 60, opens: H('11:00'), closes: H('22:00'), point: east(TOKYO, 0, -5) }),
      unit('market', { category: 'shopping', best: 'evening', mins: 60, opens: H('12:00'), closes: H('22:00'), point: east(TOKYO, 1), priority: 4 }),
      unit('arcade', { category: 'shopping', best: 'afternoon', mins: 90, opens: null, closes: null, point: east(TOKYO, 2.2), priority: 4.5 }),
      unit('grill', { category: 'food', best: 'evening', mins: 90, opens: H('17:00'), closes: H('23:00'), point: east(TOKYO, 2), priority: 5 }),
    ], [])
    const at = out.placed.get('cutlet')?.start
    t(at != null && at >= H('11:00') && at <= H('14:45'), `the afternoon restaurant is at ${at == null ? 'no time' : E.hhmm(at)}`)
    t(!out.issues.some((i) => i.kind === 'no_lunch'), 'no_lunch raised on a day with a liked lunch in reach')
    t(out.placed.has('store') && out.placed.has('grill'), 'the store and the dinner stay in the day')
  },
  r8: (t) => {
    // a card with no coordinates whose address is not found: the neighbourhood its card names is where it is (that
    // neighbourhood's main station), not "somewhere in the city"
    if (!G?.areaPoint) return t(false, 'no areaPoint: a place whose address is not found has no point at all')
    const near = (p, lat, lng) => !!p && Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lng - lng) < 0.001
    t(near(G.areaPoint('אוסקה', 'Shinsaibashi/Dotonbori', null), 34.6665, 135.5009), 'a written area: its neighbourhood (Minami)') // he-only
    t(near(G.areaPoint('קיוטו', 'Pontocho, Nakagyo-ku', null), 35.0039, 135.7642), 'an area and no address at all (Downtown Kyoto)') // he-only
    // an area that names no place ("various") says nothing: the address decides
    t(near(G.areaPoint('טוקיו', 'Various malls', 'Some Mall, Kasai, Edogawa-ku, Tokyo'), 35.6258, 139.7714), 'an area that names no place: the address (Tokyo Bay)') // he-only
    t(near(G.areaPoint('טוקיו', null, '1-11-13 Ebisu-minami, Shibuya-ku, Tokyo'), 35.658, 139.7016), 'no area: the address (Shibuya & Ebisu)') // he-only
    // nothing to go by: still not known, never a guess
    t(G.areaPoint('טוקיו', 'Somewhere nice', '1-2-3 Nowhere') === null, 'an area and an address that fit no neighbourhood stay unknown') // he-only
    t(G.areaPoint('טוקיו', 'Various', null) === null && G.areaPoint(null, 'Ebisu', null) === null, 'no place named, or no city: unknown') // he-only
  },
  r9: (t) => {
    // a place nobody knows the point of does not go between two places that are known: the ride to it and from it
    // can't be measured, so it comes first or last and the known stretch of the day stays in one piece
    const d = [day(1, { A: pres() })]
    const out = E.plan(d, [
      unit('west', { best: 'morning', mins: 90, point: east(TOKYO, -6) }),
      unit('east', { best: 'afternoon', mins: 90, point: east(TOKYO, 6) }),
      unit('late', { category: 'shopping', best: 'evening', mins: 90, point: east(TOKYO, 6, 1) }),
      unit('nowhere', { mins: 60, approx: true }),
    ], [])
    const line = [...out.placed].sort((a, b) => a[1].start - b[1].start).map(([id]) => id)
    t(line.length === 4, `${line.length} of 4 planned`)
    const i = line.indexOf('nowhere')
    t(i === 0 || i === line.length - 1, `the day goes ${line.join(' > ')}`)
  },
  r10: (t) => {
    // the morning couple B flies out they have no hours in town: couple A's day is their own, and their own places
    // are not held to the three hours "apart" of a day spent together
    const d = [day(1, { A: pres(), B: pres({ end: H('9:30'), depart: true }) })]
    const out = E.plan(d, ['one', 'two', 'three'].map((id, i) => unit(id, { mins: 80, point: east(TOKYO, i * 0.4) })), [])
    t(out.placed.size === 3, `${out.placed.size} of couple A's 3 places planned on the day couple B flies out`)
    // a day both couples do have: the three hours still hold
    const both = E.plan([day(1, { A: pres(), B: pres() })], ['one', 'two', 'three'].map((id, i) => unit(id, { mins: 80, point: east(TOKYO, i * 0.4) })), [])
    t(both.placed.size === 2, `${both.placed.size} of couple A's 3 places planned on a day with couple B in town, expected 2`)
  },
  r11: (t) => {
    // a long lunch and a long dinner are the day's sit-downs, not its load: with both planned and two sights, the
    // free hour of the afternoon still takes a third place, on time, and both meals keep their hours
    const d = [day(1, { A: pres() })]
    const us = [
      unit('lunch', { category: 'food', best: 'midday', mins: 120, opens: H('11:00'), closes: H('15:00'), priority: 4 }),
      unit('dinner', { category: 'food', best: 'evening', mins: 150, opens: H('17:00'), closes: H('23:00'), priority: 4 }),
      unit('temple', { best: 'morning', mins: 100, priority: 4, point: east(TOKYO, 0.5) }),
      unit('garden', { best: 'afternoon', mins: 100, priority: 4, point: east(TOKYO, 0, 0.5) }),
      unit('shop', { category: 'shopping', mins: 60, priority: 2, point: east(TOKYO, 0.3, 0.3) }),
    ]
    const out = E.plan(d, us, [])
    t(out.placed.size === 5, `${out.placed.size} of 5 planned (left out: ${us.filter((u) => !out.placed.has(u.id)).map((u) => u.id).join(', ') || 'none'})`)
    for (const [id, p] of out.placed) t(!p.late && !p.missed && p.start + us.find((u) => u.id === id).mins <= H('21:30'), `${id} at ${E.hhmm(p.start)} is late or past its hour`)
    t(!out.issues.some((i) => i.kind === 'no_lunch' || i.kind === 'no_dinner'), 'a meal left its slot')
    // and the plan is the same when the planner runs again on it
    const again = E.plan(d, us.map((u) => ({ ...u, current: out.placed.get(u.id)?.day ?? null })), [])
    t(again.placed.size === out.placed.size && [...again.placed].every(([id, p]) => out.placed.get(id)?.start === p.start), 'a second run on its own plan changed it')
    // a day with no free hours takes nothing more: six two-hour sights are more than the day
    const full = E.plan(d, Array.from({ length: 6 }, (_, i) => unit('s' + i, { mins: 120, point: east(TOKYO, i * 0.2) })), [])
    t(full.placed.size <= 4, `${full.placed.size} two-hour sights on one day`)
  },
  r12: (t) => {
    // a market's food crawl both couples liked, and a lunch restaurant only couple A liked, on one day: the market is
    // the lunch of both (at lunchtime, not at 9:30) instead of couple A eating twice and couple B having no lunch
    const d = [day(1, { A: pres(), B: pres() })]
    const us = [
      unit('market', { couples: ['A', 'B'], category: 'food', best: 'morning', mins: 75, opens: H('9:00'), closes: H('17:00'), priority: 4 }),
      unit('tofu', { category: 'food', best: 'midday', mins: 90, opens: H('11:00'), closes: H('16:00'), point: east(TOKYO, 1) }),
      unit('grill', { couples: ['A', 'B'], category: 'food', best: 'evening', mins: 90, opens: H('17:00'), closes: H('23:00'), priority: 4 }),
      unit('museum', { couples: ['A', 'B'], best: 'morning', mins: 90, priority: 4, point: east(TOKYO, 0.5) }),
    ]
    const out = E.plan(d, us, [])
    const at = (o, id) => o.placed.get(id)?.start
    const say = (s) => (s == null ? 'no hour' : E.hhmm(s))
    t(at(out, 'market') != null && inSlot(at(out, 'market'), '11:00', '14:45'), `the market is at ${say(at(out, 'market'))}, not at lunchtime`)
    t(!out.issues.some((i) => i.kind === 'no_lunch'), `no lunch for ${out.issues.filter((i) => i.kind === 'no_lunch').map((i) => 'couple ' + i.couple).join(', ')}`)
    t(!out.placed.has('tofu'), 'couple A has two lunches on one day')
    t(['market', 'grill', 'museum'].every((id) => out.placed.has(id)), 'a place both couples liked was left out')
    // with a second day, couple A's own restaurant is the lunch of the other day: nothing is lost
    const two = E.plan([d[0], day(2, { A: pres(), B: pres() })], us, [])
    t(two.placed.size === 4, `${two.placed.size} of 4 planned over two days`)
    // when each couple has a lunch of their own, the market stays a morning stop and all are planned
    const own = E.plan(d, [...us, unit('soba', { couples: ['B'], category: 'food', best: 'midday', mins: 60, opens: H('11:00'), closes: H('16:00'), point: east(TOKYO, -1) })], [])
    t(own.placed.size === 5 && at(own, 'market') < H('11:00'), `with a lunch for each couple: ${own.placed.size} of 5 planned, the market at ${say(at(own, 'market'))}`)
  },
  r13: (t) => {
    // a walk in the open whose card names no time of day ("any") and has no hours: its name or its plan line says it
    // is a path, so it is held to daylight like a morning shrine path (made-up cards)
    if (!F) return t(false, 'no flags.ts')
    const card = (x) => ({ category: 'sight', name: 'x', best: 'any', visitMins: 90, opens: null, closes: null, notes: [], ...x })
    const yes = (name, x) => t(F.daylightOnly(card({ name, ...x })), `"${name}" is not held to daylight`)
    const no = (name, x) => t(!F.daylightOnly(card({ name, ...x })), `"${name}" is held to daylight`)
    yes("Thinker's Path (Shiko-no-michi)", { notes: ['להתחיל מהמקדש לפני 16:30', 'Start at the temple before 16:30 and head south'] })
    yes('Old Canal', { notes: [null, 'A quiet walk along the water'] })
    yes('Kamo Riverbank', { notes: ['הליכה שקטה לאורך הנהר', null] })
    yes('Cedar Trail')
    // nothing says it is a walk: a crossing, a neon street or a small shrine open all night stays as it was
    no('Neon Crossing')
    no('Corner Shrine', { visitMins: 15, notes: [null, 'Small and quiet, worth a stop only if you are at the station'] })
    no('All-Night Arcade', { notes: [null, 'Open 24/7, no queue early or late'] })
    no('Sign Street', { notes: [null, 'No walk-ins after 18:00, parking behind'] })
    // the card asks for the evening or the night, was never checked, has hours, or is not a sight: left alone
    no('Lantern Path', { best: 'evening' })
    no('Firefly Trail', { best: 'night' })
    no('Riverside Path', { best: null })
    no('Garden Path Museum', { opens: H('10:00'), closes: H('21:00') })
    no('Canal Walk Shops', { category: 'shopping' })
    // and in the plan: with the flag, the walk is over by dusk on a full winter day, after a dinner or not
    const d = [day(6, { A: pres() })]
    const dusk = sunsetMin(d[0].date, TOKYO)
    const us = (outdoor) => [
      unit('aquarium', { best: 'morning', mins: 120, opens: H('10:00'), closes: H('17:00'), priority: 4 }),
      unit('market', { category: 'food', best: 'midday', mins: 75, opens: H('10:00'), closes: H('17:00'), priority: 4 }),
      unit('shops', { category: 'shopping', best: 'afternoon', mins: 90, opens: H('11:00'), closes: H('20:00'), priority: 4, point: east(TOKYO, 0.5) }),
      unit('grill', { category: 'food', best: 'evening', mins: 90, opens: H('17:00'), closes: H('23:00'), priority: 4 }),
      unit('path', { mins: 90, opens: null, closes: null, point: east(TOKYO, 3, 2), outdoor }),
    ]
    const out = E.plan(d, us(true), [])
    const p = out.placed.get('path')
    t(!p || p.start + 90 <= dusk + 20, `the walk ends ${p ? E.hhmm(p.start + 90) : '-'}, dusk is ${E.hhmm(dusk)}`)
  },
}

const only = process.argv.slice(2)
let failed = 0
for (const [n, run] of Object.entries(tests)) {
  if (only.length && !only.includes(n)) continue
  const errs = []
  try {
    await run((ok, msg) => { if (!ok) errs.push(msg) })
  } catch (e) {
    errs.push('threw: ' + (e.stack ?? e))
  }
  console.log(`${errs.length ? 'FAIL' : 'PASS'}  ${n.startsWith('r') ? (Number(n.slice(1)) > 12 ? 'round 4, test ' + n : Number(n.slice(1)) > 7 ? 'round 3, test ' + n : 'round 2, fix ' + n.slice(1)) : 'fix ' + n}`)
  for (const e of errs) console.log('   - ' + e)
  if (errs.length) failed++
}
console.log(failed ? `\n${failed} fix test(s) failed` : '\nok')
process.exit(failed ? 1 : 0)
