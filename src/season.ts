// Seasonal card notes (Japan): which season a trip is in, and which of a card's notes apply. Pure functions, no I/O.
import { isEn, t } from './i18n'
import type { Season, Seasonal } from './types'

export const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn']

// month (0-11) to season: Dec-Feb winter, Mar-May spring, Jun-Aug summer, Sep-Nov autumn
const OF_MONTH: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']

const DAY = 86400000

function parse(iso: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null
}

/** The season covering most of the trip's days. A tie goes to the season the trip is in first. No start date: null. */
export function tripSeason(start: string | null, numDays: number): Season | null {
  const from = parse(start)
  if (from === null) return null
  const n = Math.max(1, Math.floor(numDays) || 1)
  const days = new Map<Season, number>()
  for (let i = 0; i < n; i++) {
    const s = OF_MONTH[new Date(from + i * DAY).getUTCMonth()]
    days.set(s, (days.get(s) ?? 0) + 1)
  }
  let best: Season | null = null
  for (const [s, k] of days) if (best === null || k > days.get(best)!) best = s
  return best
}

/** The card's note for this season, in the app's language, else the other one. Null when there is none. */
export function seasonNote(seasonal: Seasonal | null | undefined, season: Season | null, isEn: boolean): string | null {
  const n = season ? seasonal?.[season] : null
  return text(n, isEn)
}

function text(n: { he?: string | null; en?: string | null } | null | undefined, isEn: boolean): string | null {
  const s = (isEn ? n?.en?.trim() || n?.he?.trim() : n?.he?.trim() || n?.en?.trim()) || null
  return s
}

/** Notes tied to dates, for those whose [from, to] (inclusive) overlaps the trip. No start date: none. */
export function datedNotes(seasonal: Seasonal | null | undefined, start: string | null, numDays: number, isEn: boolean): string[] {
  const a = parse(start)
  if (a === null || !seasonal?.dated?.length) return []
  const b = a + (Math.max(1, Math.floor(numDays) || 1) - 1) * DAY
  const out: string[] = []
  for (const d of seasonal.dated) {
    const from = parse(d.from)
    const to = parse(d.to)
    if (from === null || to === null || from > b || to < a) continue
    const s = text(d, isEn)
    if (s) out.push(s)
  }
  return out
}

// the order seasons follow each other in, for a list that runs across new year ("autumn and winter", not "winter and autumn")
const CYCLE: Season[] = ['spring', 'summer', 'autumn', 'winter']
/** The seasons as they come in the year: from the first one whose season before it isn't in the list. */
function inOrder(list: Season[]): Season[] {
  const has = new Set(list)
  const start = CYCLE.findIndex((s, i) => has.has(s) && !has.has(CYCLE[(i + 3) % 4]))
  const from = start < 0 ? 0 : start
  return [...CYCLE.slice(from), ...CYCLE.slice(0, from)].filter((s) => has.has(s))
}

/** "Best in winter" when the card is for other seasons than this trip's; null for a year-round card or no dates. */
export function onlyLine(seasonal: Seasonal | null | undefined, season: Season | null): string | null {
  const only = inOrder(SEASONS.filter((s) => seasonal?.only?.includes(s)))
  if (!season || !only.length || only.includes(season)) return null
  const name = (s: Season) => (s === 'winter' ? t('בחורף') : s === 'spring' ? t('באביב') : s === 'summer' ? t('בקיץ') : t('בסתיו'))
  const names = only.map(name)
  // Hebrew joins with a leading ו on the last name, English with "and"
  const he = names.length > 1 ? names.slice(0, -1).join(', ') + ' ו' + names[names.length - 1] : names[0] // he-only
  const en = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]
  return t('בעיקר {list}', { list: isEn ? en : he })
}
