// Where a place is, from its address: the ways of writing the address worth asking for, and the lookup itself with
// its cache rules. Pure (the cache and the network are handed in), so it runs under scripts/plan-fixes-test.mjs.
//
// The lookup is the free OpenStreetMap one the planner already used for hotels, kept in geo_cache. Two things were
// wrong with it: a miss was kept for ever (one bad day at OpenStreetMap, or one odd address, and the hotel sat in the
// city's middle for good), and only one way of writing the address was tried.

import { areaOf } from '../_shared/areas.ts'

export type GeoPoint = { lat: number; lng: number }
/** A geo_cache row: lat null is a miss; at is when it was written. */
export type GeoRow = { lat: number | null; lng: number | null; at?: string | null }
export type GeoDeps = {
  /** now, in ms */
  now: number
  /** network lookups left for this run (each takes over a second: OpenStreetMap asks for one request a second) */
  budget: { left: number }
  get: (q: string) => Promise<GeoRow | null>
  put: (q: string, p: GeoPoint | null) => Promise<void>
  fetch: (q: string) => Promise<GeoPoint | null>
}

/** What locate is asked: an address (with the place's name and city), or the ways of writing it, ready made. */
export type GeoAsk = { address?: string | null; name?: string | null; city?: string | null; near?: GeoPoint | null; maxKm?: number; queries?: string[] }

/** The cache keys locate asks for, in the order it asks. */
export function cacheKeys(x: GeoAsk): string[] {
  return (x.queries ?? addressVariants(x.address, x.name, x.city)).map((q) => q.toLowerCase().trim()).filter(Boolean)
}

// the keys of one read, as they would stand in the request's address: under what a server takes in one line
export const READ_CHARS = 6000

/**
 * The same cache with the run's addresses read ahead, many in one read (readMany: the rows of these keys, or null
 * when the read failed). locate then asks as before, in the same order, and is answered from what was read; a key
 * that was not read ahead (its read failed, or it holds a character the list cannot carry) is read by itself, once.
 * What the run writes is remembered as the table would now give it back.
 */
export async function primed(
  deps: GeoDeps,
  keys: string[],
  readMany: (keys: string[]) => Promise<({ q: string } & GeoRow)[] | null>,
  maxChars = READ_CHARS,
): Promise<GeoDeps> {
  const known = new Map<string, Promise<GeoRow | null>>()
  const chunks: string[][] = []
  let size = 0
  for (const k of new Set(keys)) {
    // a quote or a backslash would break the list of keys
    if (!k || /["\\]/.test(k)) continue
    const len = encodeURIComponent(k).length + 9
    if (!chunks.length || size + len > maxChars) {
      chunks.push([])
      size = 0
    }
    chunks[chunks.length - 1].push(k)
    size += len
  }
  await Promise.all(
    chunks.map(async (chunk) => {
      let rows: ({ q: string } & GeoRow)[] | null = null
      try {
        rows = await readMany(chunk)
      } catch {
        rows = null
      }
      if (!rows) return
      const byKey = new Map(rows.map((r) => [r.q, r]))
      for (const k of chunk) {
        const r = byKey.get(k)
        known.set(k, Promise.resolve(r ? { lat: r.lat, lng: r.lng, at: r.at } : null))
      }
    }),
  )
  return {
    ...deps,
    // the lookups left are the run's own count: the same object, not a copy
    budget: deps.budget,
    get: (q) => {
      let r = known.get(q)
      if (!r) known.set(q, (r = deps.get(q)))
      return r
    },
    put: async (q, p) => {
      await deps.put(q, p)
      known.set(q, Promise.resolve({ lat: p?.lat ?? null, lng: p?.lng ?? null, at: new Date(deps.now).toISOString() }))
    },
  }
}

// a miss is believed for this long, then asked again
export const MISS_DAYS = 14
// an answer farther than this from where the place should be (its city's middle) is another place of the same name
export const MAX_KM = 60

const tidy = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/\s*,(\s*,)+/g, ',')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim()

/**
 * The ways of writing an address worth asking for, most exact first: the address without what a map search trips on
 * (postal code, floor, brackets, the country), the same without the block and house numbers (the neighbourhood: a
 * point a few hundred metres off beats the city's middle), and the place's name with its city.
 */
export function addressVariants(address: string | null | undefined, name: string | null | undefined, cityEn: string | null | undefined): string[] {
  const out: string[] = []
  const add = (s: string) => {
    const t = tidy(s)
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t)
  }
  const a = (address ?? '').trim()
  if (a) {
    const clean = a
      .replace(/[（(][^）)]*[）)]/g, ' ')
      .replace(/〒/g, ' ')
      .replace(/\b\d{3}-\d{4}\b/g, ' ')
      .replace(/\bB?\d{1,2}\s?F\b|\b\d{1,2}(st|nd|rd|th)\s+floor\b|\d{1,2}階/gi, ' ')
      .replace(/,?\s*(Japan|日本)\s*$/i, ' ')
    add(clean)
    add(
      clean
        .replace(/\d+\s*-?\s*chome\b[-\d]*/gi, ' ')
        .replace(/\d+丁目[\d\-−番地号]*/g, ' ')
        .replace(/(^|[\s,])\d+(-\d+)+(?=$|[\s,])/g, '$1')
        .replace(/(^|[\s,])\d+(?=$|[\s,])/g, '$1'),
    )
  }
  const n = (name ?? '').trim()
  const c = (cityEn ?? '').trim()
  if (n && c) add(`${n}, ${c}`)
  else if (n) add(n)
  return out
}

// a written area that names no place ("Various malls", "Multiple branches")
const NO_PLACE = /various|multiple|several|branches|citywide|all over/i

/**
 * Where a place is when its coordinates are not known and its address was not found: the main station of the
 * neighbourhood its card names (the same table the app groups places by), or of the one its address names. A place a
 * kilometre off is planned among its neighbours; a place with no point at all is planned blind. null when neither the
 * area nor the address names a neighbourhood of that city: it stays unknown, it is not guessed.
 * cityHe: the city's Hebrew name (the AREAS key).
 */
export function areaPoint(cityHe: string | null | undefined, area: string | null | undefined, address: string | null | undefined): GeoPoint | null {
  if (!cityHe) return null
  const a = (area && !NO_PLACE.test(area) ? areaOf(cityHe, area) : null) ?? (address ? areaOf(cityHe, address) : null)
  return a ? { lat: a.lat, lng: a.lng } : null
}

function kmBetween(a: GeoPoint, b: GeoPoint) {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371
}

/**
 * The point of a place, or null when it is not known (the caller then marks the place as unknown; it does not pretend
 * it is in the city's middle). Each way of writing the address is tried in turn: a cached answer is used, a cached
 * miss is believed for MISS_DAYS and then asked again, the network is asked while the run's budget lasts. An answer
 * far from where the place should be is not the place.
 */
export async function locate(
  x: GeoAsk,
  deps: GeoDeps,
): Promise<GeoPoint | null> {
  const ok = (p: GeoPoint) => !x.near || kmBetween(p, x.near) <= (x.maxKm ?? MAX_KM)
  for (const q of x.queries ?? addressVariants(x.address, x.name, x.city)) {
    const key = q.toLowerCase().trim()
    if (!key) continue
    const hit = await deps.get(key)
    if (hit && hit.lat != null && hit.lng != null) {
      const p = { lat: hit.lat, lng: hit.lng }
      if (ok(p)) return p
      continue
    }
    const age = hit?.at ? deps.now - Date.parse(hit.at) : Infinity
    // a miss with no date on it is an old one (written before misses were dated)
    if (hit && age < MISS_DAYS * 86400000) continue
    if (deps.budget.left <= 0) continue
    deps.budget.left--
    let p: GeoPoint | null
    try {
      p = await deps.fetch(q)
    } catch {
      // the lookup itself failed (no network, a timeout): not a miss, nothing to remember
      continue
    }
    await deps.put(key, p)
    if (p && ok(p)) return p
  }
  return null
}
