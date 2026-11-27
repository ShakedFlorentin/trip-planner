// Writes scripts/plan-fixtures/four-couples.json: a made-up trip of four couples, 8 days, Tokyo then Kyoto.
// The places are the Tokyo and Kyoto places of trip-20-days.json (public names, rough public coordinates), every
// second one, and who liked each is set here by its place in the list: everyone, two couples, three couples, or one
// couple alone. The people are invented. `node scripts/plan-fixtures/gen/make-four-couples.mjs <out file>`.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const out = process.argv[2]
const from = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'trip-20-days.json'), 'utf8'))
const [A, B, C, D] = ['Couple A', 'Couple B', 'Couple C', 'Couple D']
// who liked the place, by its place in the list (null = all four)
const WHO = [null, [A, B], [C], [A, C, D], [D], null, [B, C], [A], [B, D], null, [A, B, C], [B]]
// 31 Dec and the days before it are not in this trip: the closed dates of the 20-day trip mean nothing here
const places = from.places
  .filter((p) => p.city === 'tokyo' || p.city === 'kyoto')
  .filter((_, i) => i % 2 === 0)
  .map((p, i) => {
    const { couples: _was, closedDates: _dates, ...rest } = p
    const who = WHO[i % WHO.length]
    return { ...rest, ...(who ? { couples: who } : {}) }
  })
const sleep = (party, checkIn, checkOut, city, lat, lng, label) => ({
  party, checkIn, checkOut, city, point: { lat, lng }, label, key: label, confirmed: true, booked: true, outMin: 660, inMin: 900,
})
const fixture = {
  name: 'four-couples',
  description:
    'Made up: four couples, 8 days from 10 May 2027, Tokyo days 1-4 then Kyoto days 5-8. Couples A, B and D share one Tokyo hotel, ' +
    'couple C sleeps in another part of Tokyo; all four share the Kyoto hotel. Couple D (with a baby) lands on day 3, the others on day 1; ' +
    'couple B flies home on the morning of day 7. Each place is liked by all four, by three, by two, or by one couple alone. ' +
    'Regenerate from the script named in the fixtures README.',
  presence: {
    startDate: '2027-05-10',
    numDays: 8,
    couples: [A, B, C, D],
    baby: [D],
    cities: { tokyo: { lat: 35.681, lng: 139.767 }, kyoto: { lat: 35.003, lng: 135.759 } },
    sleeps: [
      sleep(A, '2027-05-10', '2027-05-14', 'tokyo', 35.693, 139.688, 'Nishi-Shinjuku Hotel'),
      sleep(B, '2027-05-10', '2027-05-14', 'tokyo', 35.693, 139.688, 'Nishi-Shinjuku Hotel'),
      sleep(D, '2027-05-12', '2027-05-14', 'tokyo', 35.693, 139.688, 'Nishi-Shinjuku Hotel'),
      sleep(C, '2027-05-10', '2027-05-14', 'tokyo', 35.7118, 139.7966, 'Asakusa Hotel'),
      sleep(A, '2027-05-14', '2027-05-18', 'kyoto', 35.003, 135.759, 'Karasuma Hotel'),
      sleep(B, '2027-05-14', '2027-05-16', 'kyoto', 35.003, 135.759, 'Karasuma Hotel'),
      sleep(C, '2027-05-14', '2027-05-18', 'kyoto', 35.003, 135.759, 'Karasuma Hotel'),
      sleep(D, '2027-05-14', '2027-05-18', 'kyoto', 35.003, 135.759, 'Karasuma Hotel'),
    ],
    flights: [
      { who: A, title: 'TLV → HND', starts_at: '2027-05-09T22:00:00', ends_at: '2027-05-10T09:15:00' },
      { who: B, title: 'TLV → HND', starts_at: '2027-05-09T22:00:00', ends_at: '2027-05-10T09:15:00' },
      { who: C, title: 'TLV → NRT', starts_at: '2027-05-09T23:00:00', ends_at: '2027-05-10T10:20:00' },
      { who: D, title: 'TLV → NRT', starts_at: '2027-05-11T23:00:00', ends_at: '2027-05-12T10:20:00' },
      { who: B, title: 'KIX → TLV', starts_at: '2027-05-16T10:45:00', ends_at: '2027-05-16T17:00:00' },
    ],
  },
  places,
  fixed: [],
  expect: { stable: true, noIssueKinds: ['hours', 'overlap', 'tight'] },
}
const body = JSON.stringify(fixture, null, 1)
  // one place per line: the list stays readable
  .replace(/\{\n\s+"id": [^]*?\n  \}/g, (m) => m.replace(/\n\s+/g, ' '))
writeFileSync(out, body + '\n')
console.log(places.length, 'places written to', out)
