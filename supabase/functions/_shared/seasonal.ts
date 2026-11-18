// Season-aware card research, shared by card-facts and suggest-place (seasonal card notes, spec 2026-11-18).
// A new card's general fields must read true in any month; what depends on the time of year goes in `seasonal`
// (winter / spring / summer / autumn notes, `only`, and `dated` facts for the trip's own dates). The same shape as the
// seasonal jsonb column (supabase/sql/2026-11-18-seasonal-notes.sql). Pure functions: the one import is guard.ts.
import { stripProse } from './guard.ts'

export const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const
export type Season = (typeof SEASONS)[number]
export type SeasonalNote = { he: string; en: string }
export type Seasonal = { [K in Season]?: SeasonalNote } & { only?: Season[]; dated?: { from: string; to: string; he: string; en: string }[] }
/** The trip's days, ISO, inclusive. */
export type Window = { from: string; to: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/
const isoDate = (s: unknown): s is string => {
  if (typeof s !== 'string' || !ISO.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

/** The trip's first and last day from trips.start_date and num_days; null when the trip has no date (then nothing dated is asked or kept). */
export function tripWindow(start: unknown, days: unknown): Window | null {
  if (!isoDate(start)) return null
  const n = typeof days === 'number' && Number.isInteger(days) && days >= 1 && days <= 366 ? days : null
  if (!n) return null
  const end = new Date(new Date(start + 'T00:00:00Z').getTime() + (n - 1) * 86400000)
  return { from: start, to: end.toISOString().slice(0, 10) }
}

/** The dates (YYYY-MM-DD) that fall inside the trip's days; none at all when the trip has no dates. */
export const datesInWindow = (dates: unknown, win: Window | null): string[] =>
  !win || !Array.isArray(dates) ? [] : [...new Set(dates.filter((d): d is string => isoDate(d) && d >= win.from && d <= win.to))]

// ---- prompt pieces ----

/** One line for the research prompt: whose dates the facts are asked for. */
export const researchWho = (win: Window | null) =>
  win ? `for travellers there from ${win.from} to ${win.to}` : 'for travellers at any time of year (no trip dates are known)'

/** The research bullets about dates and seasons (the same web search; no extra call). */
export const researchSeasonBullets = (win: Window | null) =>
  [
    win
      ? `- closures between ${win.from} and ${win.to} (year-end holidays if the dates include them); say clearly when the place is open on those days if you find it`
      : null,
    win
      ? `- for a market, a festival or an event that runs on certain dates only: the dates it runs between ${win.from} and ${win.to}`
      : '- for a market, a festival or an event: the season it belongs to (do not look for exact dates)',
    '- how the place changes with the season, only what is well known: cherry or plum blossom, autumn leaves, the rainy season (June to mid-July), summer heat and humidity, typhoons (August to September), snow, a winter-only or summer-only attraction, a festival with a fixed season, opening hours that differ by season',
  ]
    .filter(Boolean)
    .join('\n')

/** The extraction rules for `seasonal`, and the rule that every general field is season-neutral. */
export const extractSeasonRules = (win: Window | null) => `- General fields must read true in any month: no month names, no weather, no season, no year-end holidays, in any of the card's text fields (including the plan line and the baby line, in Hebrew and English). What depends on the time of year goes in seasonal instead.
- seasonal: notes for the seasons you can say something real about (winter = Dec-Feb, spring = Mar-May, summer = Jun-Aug, autumn = Sep-Nov). Each is { he, en }: one short, plain, concrete sentence (two at most), Hebrew natural and first, English matching it, no hype words. A season with nothing real to say has he and en both "" (empty): no filler, no guessing. Only a real, well-known difference you found in the notes or are sure of (blossom, leaves, rainy season, summer heat, typhoons, snow, a fixed-season festival, hours that change by season). Never invent dates, hours or prices.
- seasonal.only: the seasons the place is open or worth visiting in, ONLY when it is limited to some (a snow park, a winter illumination, a summer-only beach); [] for a place that is fine all year.
- seasonal.dated: ${win ? `facts tied to specific dates that fall between ${win.from} and ${win.to} (a closure, an event run, an opening date), each { from, to, he, en } with ISO YYYY-MM-DD dates, inclusive, and only dates the notes state` : 'always [] (no trip dates are known)'}; [] when there are none.`

// ---- the answer ----

const note = (v: unknown): SeasonalNote | null => {
  if (!v || typeof v !== 'object') return null
  const { he, en } = v as { he?: unknown; en?: unknown }
  const h = stripProse(he, 200)
  const e = stripProse(en, 200)
  return h && e ? { he: h, en: e } : null
}

/**
 * The model's `seasonal` as the column keeps it: notes need both languages (no markup or links, at most 200 characters
 * each), `only` holds valid seasons (all four = no limit = left out), `dated` keeps only real ISO ranges that overlap
 * the trip's days (and none at all without trip dates). Null when nothing is left.
 */
export function cleanSeasonal(raw: unknown, win: Window | null): Seasonal | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const out: Seasonal = {}
  for (const s of SEASONS) {
    const n = note(r[s])
    if (n) out[s] = n
  }
  if (Array.isArray(r.only)) {
    const only = [...new Set(r.only.filter((x): x is Season => (SEASONS as readonly unknown[]).includes(x)))]
    if (only.length && only.length < SEASONS.length) out.only = only
  }
  if (win && Array.isArray(r.dated)) {
    const dated = r.dated
      .flatMap((d) => {
        const x = (d ?? {}) as { from?: unknown; to?: unknown }
        const n = note(d)
        return n && isoDate(x.from) && isoDate(x.to) && x.from <= x.to && x.from <= win.to && x.to >= win.from ? [{ from: x.from, to: x.to, ...n }] : []
      })
      .slice(0, 4)
    if (dated.length) out.dated = dated
  }
  if (!Object.keys(out).length) return null
  // the column refuses 8000 bytes or more: drop the dated lines before the notes
  if (new TextEncoder().encode(JSON.stringify(out)).length >= 7000) delete out.dated
  return Object.keys(out).length ? out : null
}

/** The same notes without the dated lines (a card whose dates the research could not back with a page). */
export function withoutDated(s: Seasonal | null): Seasonal | null {
  if (!s) return null
  const { dated: _dated, ...rest } = s
  return Object.keys(rest).length ? rest : null
}
