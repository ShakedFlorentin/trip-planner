import { supabase } from './supabase'
import { currentDay, dayDate, mediaIndex, readCache, writeCache } from './lib'
import { saveDoc, savedDoc } from './docs'
import { track } from './track'
import type { Booking, Candidate, ItineraryItem, Place } from './types'
import { ymd } from './views/planUtils'

/**
 * Roadmap step 12: today and tomorrow are kept on the phone before they are needed (the subway, an eSIM with a bar of
 * signal and no data). Run whenever the app is in front with a connection during the trip, at most every couple of
 * hours, and from the "save now" line on Home. It saves, ahead of being opened:
 *  - the trip's lists, under the same keys the screens read (useTripTable in lib.ts), so every screen opens offline;
 *  - the photos of the places planned for those days (Cache Storage 'photos', served by sw.js);
 *  - the map around them, a few zoom levels (Cache Storage 'tiles', served by sw.js);
 *  - the documents attached to those days' bookings and the hotel nights (Cache Storage 'docs', see docs.ts).
 * Photos and map are skipped when the phone asks to save data. Nothing here is sent anywhere.
 */

export type ReadyReport = { days: number[]; places: number; photos: number; tiles: number; docs: number; missed: number }

// the lists the screens keep, with the order each screen asks for (the cache key includes it)
const TABLES: [string, string][] = [
  ['itinerary_items', 'sort'],
  ['places', 'created_at'],
  ['candidates', 'created_at'],
  ['bookings', 'starts_at'],
  ['day_info', 'day'],
  ['checklist_items', 'created_at'],
  ['essentials', 'sort'],
  ['swipes', 'created_at'],
]
const AGAIN_MS = 2 * 60 * 60_000
const PHOTOS_PER_PLACE = 3
const MAX_PHOTOS = 80
const ZOOMS = [13, 14, 15, 16]
const MAX_TILES_PER_DAY = 160

const key = (tripId: string) => 'ready:' + tripId

/** What was saved last time for this trip, and when. */
export function lastReady(tripId: string) {
  return readCache<ReadyReport>(key(tripId))
}

/**
 * The days worth having on the phone now: today and tomorrow during the trip, day 1 on the day before it starts.
 * Empty outside that window.
 */
export function daysToKeep(start: string | null, numDays: number): number[] {
  if (!start) return []
  const today = currentDay(start, numDays)
  if (today) return today < numDays ? [today, today + 1] : [today]
  const tokyo = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
  const until = Math.round((Date.parse(start + 'T00:00:00Z') - Date.parse(tokyo + 'T00:00:00Z')) / 86400000)
  return until === 1 ? [1] : []
}

/** Whether it is time to save again: a different set of days, or the last save is a couple of hours old. */
export function due(tripId: string, days: number[]) {
  if (!days.length) return false
  const last = lastReady(tripId)
  return !last || last.data.days.join() !== days.join() || Date.now() - last.at > AGAIN_MS
}

let running: Promise<ReadyReport | null> | null = null

/** Saves the given days of a trip on the phone. One run at a time; null when offline or nothing to save. */
export function prepare(trip: { id: string; start_date: string | null }, days: number[]): Promise<ReadyReport | null> {
  if (!days.length || !navigator.onLine) return Promise.resolve(null)
  running ??= run(trip, days).finally(() => (running = null))
  return running
}

async function run(trip: { id: string; start_date: string | null }, days: number[]): Promise<ReadyReport | null> {
  const began = performance.now()
  const report: ReadyReport = { days, places: 0, photos: 0, tiles: 0, docs: 0, missed: 0 }

  // 1. the lists, fresh, where the screens look for them
  const rows: Record<string, unknown[]> = {}
  await Promise.all(
    TABLES.map(async ([table, order]) => {
      const { data, error } = await supabase.from(table).select('*').eq('trip_id', trip.id).order(order)
      if (error || !data) return report.missed++
      rows[table] = data
      writeCache(`${table}:${trip.id}:${order}`, data)
    }),
  )
  if (!rows.itinerary_items) return null

  // 2. the places of these days, with their photos and where they are
  const media = await mediaIndex()
  const items = (rows.itinerary_items as ItineraryItem[]).filter((i) => days.includes(i.day))
  const places = new Map(((rows.places ?? []) as Place[]).map((p) => [p.id, p]))
  const cards = new Map(((rows.candidates ?? []) as Candidate[]).map((c) => [c.id, c]))
  const byDay = new Map<number, { lat: number; lng: number }[]>()
  const photos: string[] = []
  for (const it of items) {
    const p = it.place_id ? places.get(it.place_id) : undefined
    if (!p) continue
    report.places++
    const card = p.candidate_id ? cards.get(p.candidate_id) : undefined
    const m = media[p.name]
    const list = p.photos?.length ? p.photos : card?.photos?.length ? card.photos : (m?.photos ?? [])
    photos.push(...list.slice(0, PHOTOS_PER_PLACE))
    const lat = p.lat ?? card?.lat ?? m?.lat ?? null
    const lng = p.lng ?? card?.lng ?? m?.lng ?? null
    if (lat != null && lng != null) byDay.set(it.day, [...(byDay.get(it.day) ?? []), { lat, lng }])
  }

  const light = !(navigator as { connection?: { saveData?: boolean } }).connection?.saveData
  if (light) {
    // 3. photos
    const unique = [...new Set(photos)].slice(0, MAX_PHOTOS)
    report.photos = await keep('photos', unique, (n) => (report.missed += n))
    // 4. the map around each day's places
    const tiles = [...byDay.values()].flatMap((pts) => tilesAround(pts))
    report.tiles = await keep('tiles', [...new Set(tiles)], (n) => (report.missed += n))
  }

  // 5. the documents of these days' bookings, and of the hotel nights that cover them
  const dates = days.map((d) => {
    const at = dayDate(trip.start_date, d)
    return at ? ymd(at) : ''
  })
  const docs = ((rows.bookings ?? []) as Booking[]).filter((b) => b.file_path && touches(b, dates))
  for (const b of docs) {
    if (await savedDoc(b.file_path!)) report.docs++
    else if (await saveDoc(b.file_path!)) report.docs++
    else report.missed++
  }

  writeCache(key(trip.id), report)
  track('ready', { days: days.length, places: report.places, photos: report.photos, tiles: report.tiles, docs: report.docs, missed: report.missed, ms: Math.round(performance.now() - began) })
  window.dispatchEvent(new Event('ready-saved'))
  return report
}

/** A booking that starts on one of these dates, or a stay (check-in to check-out) that covers one. */
function touches(b: Booking, dates: string[]) {
  const from = b.starts_at?.slice(0, 10) ?? ''
  const to = b.ends_at?.slice(0, 10) ?? from
  return dates.some((d) => d && from && from <= d && d <= to)
}

/** Fetches what is not saved yet into a cache (4 at a time); returns how many are there now. */
async function keep(name: string, urls: string[], missed: (n: number) => void): Promise<number> {
  let cache: Cache
  try {
    cache = await caches.open(name)
  } catch {
    return 0
  }
  let have = 0
  const queue = [...urls]
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      try {
        if (await cache.match(u)) {
          have++
          continue
        }
        const res = await fetch(u, { mode: 'cors' })
        if (!res.ok) throw new Error(String(res.status))
        await cache.put(u, res)
        have++
      } catch {
        missed(1)
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return have
}

// the same map the app shows (PlacesMap.tsx): Esri's street map, or its dark grey base and labels in dark mode
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/'
function layers() {
  const forced = document.documentElement.dataset.theme
  const dark = forced ? forced === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  return dark
    ? [ESRI + 'Canvas/World_Dark_Gray_Base/MapServer/tile/', ESRI + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/']
    : [ESRI + 'World_Street_Map/MapServer/tile/']
}

const tileX = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z)
const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)
}

/** The map tiles around a day's places, from the wide view down to the street, closest zoom dropped if too many. */
function tilesAround(pts: { lat: number; lng: number }[]): string[] {
  if (!pts.length) return []
  const pad = 0.006 // about 600 m around the outermost places
  const n = Math.max(...pts.map((p) => p.lat)) + pad
  const s = Math.min(...pts.map((p) => p.lat)) - pad
  const e = Math.max(...pts.map((p) => p.lng)) + pad
  const w = Math.min(...pts.map((p) => p.lng)) - pad
  const out: string[] = []
  for (const z of ZOOMS) {
    const xs = [tileX(w, z), tileX(e, z)]
    const ys = [tileY(n, z), tileY(s, z)]
    const count = (xs[1] - xs[0] + 1) * (ys[1] - ys[0] + 1)
    if (out.length + count * layers().length > MAX_TILES_PER_DAY) break
    for (let x = xs[0]; x <= xs[1]; x++) for (let y = ys[0]; y <= ys[1]; y++) for (const l of layers()) out.push(`${l}${z}/${y}/${x}`)
  }
  return out
}
