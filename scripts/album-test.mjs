// Tests for the trip-album matcher (src/album/match.ts): `node scripts/album-test.mjs`.
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = await build({ entryPoints: [join(root, 'src/album/match.ts')], bundle: true, write: false, format: 'esm', platform: 'node' })
const { matchPhotos } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const vout = await build({ entryPoints: [join(root, 'src/album/visit.ts')], bundle: true, write: false, format: 'esm', platform: 'node' })
const { visitMinutes } = await import('data:text/javascript;base64,' + Buffer.from(vout.outputFiles[0].text).toString('base64'))

let bad = 0
const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m) } else console.log('  ok   ' + m) }

// Fushimi Inari, and points due north of it at a known distance (1 deg of latitude = 111195 m on the haversine sphere)
const A = { lat: 34.9671, lng: 135.7727 }
const north = (m) => ({ lat: A.lat + m / 111195, lng: A.lng })
const days = [{ day: 1, date: '2026-12-12', tz: 'Asia/Tokyo' }, { day: 2, date: '2026-12-13', tz: 'Asia/Tokyo' }]
const stops = [
  { placeId: 'inari', name: 'Inari', day: 1, ...A, start: '09:00', minutes: 90 },
  { placeId: 'nara', name: 'Nara', day: 1, lat: 34.685, lng: 135.843, start: '13:00' },
  { placeId: 'hotel', name: 'Hotel', day: 1, lat: 35.0, lng: 135.76, hotel: true },
  { placeId: 'other', name: 'Other', day: 2, lat: 35.01, lng: 135.67, start: '10:00', minutes: 60 },
]
// epoch ms of a Tokyo wall-clock time on 12/13 Dec 2026 (UTC+9, no DST)
const at = (d, hm) => { const [h, m] = hm.split(':').map(Number); return Date.UTC(2026, 11, d, h - 9, m) }
const dayOf = (r, n) => r.days.find((d) => d.day === n)
const ids = (r, n, placeId) => dayOf(r, n).places.find((p) => p.placeId === placeId)?.photoIds

let r = matchPhotos([{ id: 'p299', time: at(12, '09:10'), ...north(299) }], days, stops, {})
ok(ids(r, 1, 'inari')?.includes('p299'), '299 m from a stop is matched')
r = matchPhotos([{ id: 'p301', time: at(12, '09:10'), ...north(301) }], days, stops, {})
ok(!ids(r, 1, 'inari') && dayOf(r, 1).loose.photoIds.includes('p301'), '301 m is loose')

r = matchPhotos([{ id: 'late', time: at(12, '23:50'), ...A }, { id: 'early', time: at(13, '00:10'), lat: 40, lng: 140 }], days, stops, {})
ok(ids(r, 1, 'inari')?.includes('late'), 'Tokyo 23:50 is day 1')
ok(dayOf(r, 1).loose.photoIds.length === 0 && dayOf(r, 2).loose.photoIds.includes('early'), 'Tokyo 00:10 is day 2')

r = matchPhotos([{ id: 'x', time: at(12, '10:00') }], days, stops, {})
ok(ids(r, 1, 'inari')?.includes('x'), 'no location, inside a 90-min window: matched')
r = matchPhotos([{ id: 'y', time: at(12, '10:40') }], days, stops, {})
ok(dayOf(r, 1).loose.photoIds.includes('y') && dayOf(r, 1).loose.guessPlaceId === 'inari', 'no location, after the window: loose, guess = nearest in time')
r = matchPhotos([{ id: 'z', time: at(12, '12:50') }], days, stops, {})
ok(dayOf(r, 1).loose.guessPlaceId === 'nara', 'guess is the stop nearest in time')

r = matchPhotos([{ id: 'n1', time: at(12, '15:59') }, { id: 'n2', time: at(12, '16:01') }], days, stops, {})
ok(ids(r, 1, 'nara')?.includes('n1'), 'unknown minutes run to 180: 15:59 matched')
ok(!ids(r, 1, 'nara')?.includes('n2') && dayOf(r, 1).loose.photoIds.includes('n2'), 'unknown minutes: 16:01 is past the cap')

const gap = [
  { placeId: 'a', name: 'A', day: 1, lat: null, lng: null, start: '09:00' },
  { placeId: 'b', name: 'B', day: 1, lat: null, lng: null, start: '10:00' },
]
r = matchPhotos([{ id: 'g1', time: at(12, '09:59') }, { id: 'g2', time: at(12, '10:01') }], days, gap, {})
ok(ids(r, 1, 'a')?.includes('g1') && ids(r, 1, 'b')?.includes('g2'), 'unknown minutes end at the next stop start')

r = matchPhotos([{ id: 'm', time: at(12, '09:10'), ...A }], days, stops, { m: { day: 1, placeId: 'nara' } })
ok(ids(r, 1, 'nara')?.includes('m') && !ids(r, 1, 'inari'), 'manual choice wins over the match')
r = matchPhotos([{ id: 'm2', time: at(12, '09:10'), ...A }], days, stops, { m2: { day: 2, placeId: null } })
ok(dayOf(r, 2).loose.photoIds.includes('m2') && dayOf(r, 1).loose.photoIds.length === 0, 'manual: no place, other day')

r = matchPhotos([{ id: 'before', time: at(11, '12:00'), ...A }, { id: 'after', time: at(14, '12:00') }], days, stops, {})
ok(r.days.every((d) => d.places.length === 0 && d.loose.photoIds.length === 0), 'photos outside the trip days are dropped')

r = matchPhotos([{ id: 'h', time: at(12, '20:00'), lat: 35.0, lng: 135.76 }], days, stops, {})
ok(ids(r, 1, 'hotel')?.includes('h'), 'a hotel stop is matched')
ok(typeof dayOf(r, 1).places[0].from === 'number' && dayOf(r, 1).places[0].hotel === true, 'places carry a time span and the hotel flag')

r = matchPhotos([{ id: 'xd', time: at(13, '15:00'), ...A }], days, stops, {})
ok(ids(r, 2, 'inari')?.includes('xd'), 'nearest stop of any day within 300 m, under the photo day')

r = matchPhotos([{ id: 'la', time: Date.UTC(2026, 11, 12, 8, 0), ...A }], [{ day: 1, date: '2026-12-12', tz: 'America/Los_Angeles' }], [stops[0]], {})
ok(r.days[0].places.length === 1, 'the day tz is used (08:00Z is 00:00 on 12 Dec in Los Angeles)')

for (const [txt, want] of [['1-2 hours', 120], ['30-45 דקות', 45], ['כשעה', 60], ['About an hour', 60], ['שעה-שעתיים', 120], ['שעתיים', 120], ['כחצי שעה', 30], ['45 minutes', 45], ['About 1 hour', 60], ['', null], ['varies', null]])
  ok(visitMinutes(txt) === want, `visit length "${txt}" is ${want}`)

console.log(bad ? `${bad} FAILED` : 'all passed')
process.exit(bad ? 1 : 0)
