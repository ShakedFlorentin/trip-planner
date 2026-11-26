// Puts the phone's trip photos on trip days and places. Pure: no storage, no network, nothing leaves the phone.
// Rules: docs/superpowers/specs/2026-11-20-place-photos-and-trip-album-design.md ("Matching rules").

export type AlbumPhoto = { id: string; time: number; lat?: number; lng?: number }
export type AlbumStop = {
  placeId: string
  name: string
  day: number
  lat: number | null
  lng: number | null
  start?: string
  minutes?: number
  hotel?: boolean
}
export type AlbumDay = { day: number; date: string; tz: string }
export type AlbumPlace = { placeId: string; photoIds: string[]; from: number; to: number; hotel?: boolean }
export type AlbumResult = {
  days: { day: number; places: AlbumPlace[]; loose: { photoIds: string[]; guessPlaceId: string | null } }[]
}

export const NEAR_METERS = 300
export const MAX_WINDOW_MINUTES = 180

const hasPos = (x: { lat?: number | null; lng?: number | null }): x is { lat: number; lng: number } =>
  typeof x.lat === 'number' && typeof x.lng === 'number'

function meters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)))
}

const formatters = new Map<string, Intl.DateTimeFormat>()
/** The photo's wall-clock date and minutes since midnight in the given zone. */
function localParts(time: number, tz: string) {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
    formatters.set(tz, f)
  }
  const p: Record<string, string> = {}
  for (const x of f.formatToParts(new Date(time))) p[x.type] = x.value
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

const toMinutes = (hm: string | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hm ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

type Window = { stop: AlbumStop; from: number; to: number }

/** Visit windows of a day's timed stops, in minutes since local midnight. */
function windows(dayStops: AlbumStop[]): Window[] {
  const timed = dayStops
    .map((stop) => ({ stop, from: toMinutes(stop.start) }))
    .filter((w): w is { stop: AlbumStop; from: number } => w.from !== null)
    .sort((a, b) => a.from - b.from)
  return timed.map((w, i) => {
    const next = timed[i + 1]?.from
    const known = typeof w.stop.minutes === 'number' && w.stop.minutes > 0
    const len = known
      ? w.stop.minutes!
      : Math.min(MAX_WINDOW_MINUTES, next !== undefined ? Math.max(0, next - w.from) : MAX_WINDOW_MINUTES)
    return { stop: w.stop, from: w.from, to: w.from + len }
  })
}

function nearest(photo: { lat: number; lng: number }, list: AlbumStop[]) {
  let best: AlbumStop | null = null
  let bestD = Infinity
  for (const s of list) {
    if (!hasPos(s)) continue
    const d = meters(photo, s)
    if (d < bestD) { best = s; bestD = d }
  }
  return best && bestD <= NEAR_METERS ? best : null
}

export function matchPhotos(
  photos: AlbumPhoto[],
  days: AlbumDay[],
  stops: AlbumStop[],
  manual: Record<string, { day: number; placeId: string | null }>,
): AlbumResult {
  const byDay = new Map(days.map((d) => [d.day, { places: new Map<string, AlbumPlace>(), loose: [] as string[], guess: new Map<string, number>() }]))
  const wins = new Map(days.map((d) => [d.day, windows(stops.filter((s) => s.day === d.day))]))
  const stopById = (id: string) => stops.find((s) => s.placeId === id)

  const put = (dayNo: number, placeId: string, p: AlbumPhoto) => {
    const bucket = byDay.get(dayNo)
    if (!bucket) return
    const cur = bucket.places.get(placeId)
    if (cur) {
      cur.photoIds.push(p.id)
      cur.from = Math.min(cur.from, p.time)
      cur.to = Math.max(cur.to, p.time)
    } else {
      bucket.places.set(placeId, { placeId, photoIds: [p.id], from: p.time, to: p.time, ...(stopById(placeId)?.hotel ? { hotel: true } : {}) })
    }
  }

  const sorted = [...photos].sort((a, b) => a.time - b.time)
  for (const p of sorted) {
    const chosen = manual[p.id]
    if (chosen) {
      if (!byDay.has(chosen.day)) continue
      if (chosen.placeId) put(chosen.day, chosen.placeId, p)
      else byDay.get(chosen.day)!.loose.push(p.id)
      continue
    }

    let dayNo: number | null = null
    let minutes = 0
    for (const d of days) {
      const local = localParts(p.time, d.tz)
      if (local.date === d.date) { dayNo = d.day; minutes = local.minutes; break }
    }
    if (dayNo === null) continue
    const bucket = byDay.get(dayNo)!

    if (hasPos(p)) {
      const hit = nearest(p, stops.filter((s) => s.day === dayNo)) ?? nearest(p, stops)
      if (hit) put(dayNo, hit.placeId, p)
      else bucket.loose.push(p.id)
      continue
    }

    const list = wins.get(dayNo) ?? []
    const inside = list.find((w) => minutes >= w.from && minutes < w.to)
    if (inside) { put(dayNo, inside.stop.placeId, p); continue }
    bucket.loose.push(p.id)
    let guess: Window | null = null
    let gap = Infinity
    for (const w of list) {
      const g = minutes < w.from ? w.from - minutes : minutes - w.to
      if (g < gap) { guess = w; gap = g }
    }
    if (guess) bucket.guess.set(guess.stop.placeId, (bucket.guess.get(guess.stop.placeId) ?? 0) + 1)
  }

  return {
    days: days.map((d) => {
      const b = byDay.get(d.day)!
      let guessPlaceId: string | null = null
      let top = 0
      for (const [id, n] of b.guess) if (n > top) { guessPlaceId = id; top = n }
      return {
        day: d.day,
        places: [...b.places.values()].sort((x, y) => x.from - y.from),
        loose: { photoIds: b.loose, guessPlaceId },
      }
    }),
  }
}
