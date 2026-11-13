/**
 * Destination photos for the Music-style city tiles, kept in public/cities/<slug>.webp. A slug is listed in
 * PHOTOS only once its file is there, so tiles never ask for a missing image; until then a tile is plain colour.
 */
const PHOTOS = new Set<string>(['tokyo', 'yokohama', 'kyoto', 'osaka', 'nara', 'fuji'])

// names as they are written in day_info / places (Hebrew, free text) and in the swipe deck (English keys)
const SLUGS: [RegExp, string][] = [
  [/tokyo|טוקיו|שינג׳?ו?קו|שיבויה|אסאקוסה|גינזה/i, 'tokyo'], // he-only
  [/yokohama|יוקוהמה/i, 'yokohama'], // he-only
  [/kyoto|קיוטו/i, 'kyoto'], // he-only
  [/osaka|או?סקה|אוסאקה/i, 'osaka'], // he-only
  [/nara|נארה/i, 'nara'], // he-only
  [/hakone|הקונה/i, 'hakone'], // he-only
  [/nikko|ניקו/i, 'nikko'], // he-only
  [/kobe|קובה|himeji|הימג׳?י/i, 'kobe'], // he-only
  [/hiroshima|הירושימה|miyajima|מיאג׳?ימה/i, 'hiroshima'], // he-only
  [/kanazawa|קנאזאווה/i, 'kanazawa'], // he-only
  [/takayama|טקאיאמה|shirakawa|שירקאווה/i, 'takayama'], // he-only
  [/fukuoka|פוקואוקה|hakata|הקאטה/i, 'fukuoka'], // he-only
  [/nagoya|נגויה/i, 'nagoya'], // he-only
  [/sapporo|סאפורו|hokkaido|הוקאידו/i, 'sapporo'], // he-only
  [/okinawa|אוקינאווה|naha|נאהה/i, 'okinawa'], // he-only
  [/daytrip|טיולי יום|פוג׳?י|קוואגוצ׳?יקו|fuji/i, 'fuji'], // he-only
]

export function citySlug(name: string | null | undefined) {
  return SLUGS.find(([re]) => re.test(name ?? ''))?.[1] ?? null
}

/** The photo for a destination, or null while it has none. */
export function cityPhoto(name: string | null | undefined) {
  const slug = citySlug(name)
  return slug && PHOTOS.has(slug) ? `${import.meta.env.BASE_URL}cities/${slug}.webp` : null
}

// each city keeps one tile colour wherever it shows (15): the known ones fixed, any other city by its name, so a city
// seen twice on the route looks like the same city, on every trip, with nothing to set up
const COLOR: Record<string, number> = { yokohama: 0, tokyo: 4, kyoto: 2, osaka: 3, nara: 6, fuji: 1 }

/** The tile colour (c0-c6) of a city, the same every time it shows. */
export function cityColor(name: string | null | undefined) {
  const slug = citySlug(name)
  if (slug && slug in COLOR) return COLOR[slug]
  const key = (slug ?? name ?? '').trim().toLowerCase()
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 7
}
