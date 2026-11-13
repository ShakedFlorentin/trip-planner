import type { Answers, Candidate } from './types'
import { hidden, score } from './prefs'
import { localizeCard } from './lib'

/**
 * A visitor who has no account yet (app_settings features.guest_mode): what they answered and which cards they liked,
 * kept on this phone until they sign in. Then src/views/GuestImport.tsx turns it into their profile, a trip and likes,
 * and forgets it. The cards come from the site itself (dist/guest/<city>.json, built by scripts/pages/build-pages.mjs
 * from the switched-on library cards we wrote): no account, no database call, no photos.
 */
export type GuestState = {
  answers: Answers | null
  /** library card ids they liked, and every one they swiped either way */
  liked: string[]
  seen: string[]
}

const KEY = 'guest'
// the cities a guide page may open the app on (?city=…), and the visitor's deck when they picked none
export const GUEST_CITIES = ['tokyo', 'kyoto', 'osaka', 'nara', 'hakone', 'nikko', 'kobe', 'hiroshima', 'kanazawa', 'takayama', 'fukuoka', 'nagoya', 'sapporo', 'okinawa'] as const
const DEFAULT_CITIES = ['tokyo', 'kyoto', 'osaka']

const empty = (): GuestState => ({ answers: null, liked: [], seen: [] })

export function readGuest(): GuestState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<GuestState> | null
    if (!raw || typeof raw !== 'object') return empty()
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 500) : [])
    return { answers: raw.answers && typeof raw.answers === 'object' ? (raw.answers as Answers) : null, liked: ids(raw.liked), seen: ids(raw.seen) }
  } catch {
    return empty()
  }
}

export function writeGuest(g: GuestState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(g))
  } catch {
    // private mode: this visit still works, it just won't be there after a reload
  }
}

export function forgetGuest() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing kept
  }
}

/** What a visitor left to carry into their new account: answers or likes. Null when there is nothing. */
export function pendingGuest(): GuestState | null {
  const g = readGuest()
  return g.answers || g.liked.length ? g : null
}

/** The city a guide page opened the app on (?city=kyoto), or null. */
export function guestCityInUrl(): string | null {
  const c = new URLSearchParams(location.search).get('city')?.trim().toLowerCase() ?? ''
  return (GUEST_CITIES as readonly string[]).includes(c) ? c : null
}

/** A public card as the site serves it (the same fields as the guide pages). */
type PublicCard = Omit<Candidate, 'trip_id' | 'library_id' | 'photos' | 'sources' | 'added_by'> & { id: string }

/** The cards of these cities, shaped like a trip's cards so Discover's card draws them. A city that fails to load is skipped. */
export async function loadGuestCards(cities: string[]): Promise<Candidate[]> {
  const list = (cities.length ? cities : DEFAULT_CITIES).filter((c) => (GUEST_CITIES as readonly string[]).includes(c))
  const sets = await Promise.all(
    list.map(async (c) => {
      try {
        const r = await fetch(`${import.meta.env.BASE_URL}guest/${c}.json`)
        return r.ok ? ((await r.json()) as PublicCard[]) : []
      } catch {
        return []
      }
    }),
  )
  // no trip and no library link: the card's sheet then asks nothing of the database (ratings, photos, trip prefs)
  // in English, each card's English text over the Hebrew, as Discover shows a trip's cards
  return sets.flat().map((c) => localizeCard({ ...c, trip_id: '', library_id: null, photos: [], sources: [], added_by: 'Toogo' }) as unknown as Candidate)
}

/** The visitor's deck: what fits their answers, best first (the same fit Discover uses), not yet swiped. */
export function guestDeck(cards: Candidate[], g: GuestState): Candidate[] {
  const seen = new Set(g.seen)
  const a = g.answers
  const fit = (c: Candidate) => (a ? score(c as never, a) : 0) + (c.local_pick ? 1 : 0)
  // a steady order among equals, mixed so one city or kind doesn't come in a long run
  const mix = (id: string) => {
    let h = 0
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return h
  }
  return cards
    .filter((c) => !seen.has(c.id) && !(a && hidden(c as never, a)))
    .sort((x, y) => fit(y) - fit(x) || mix(x.id) - mix(y.id))
}
