// What the planner needs to know about a place that the swipe card doesn't say: opening hours, closed days around the
// trip, how long a visit takes, one short practical line in Hebrew (and the same in English) and hidden search words. Looked up once per card with Claude and a
// few web searches; card-facts writes it onto the card's plan columns.
import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0'
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1.1.0/helpers/zod'
import { z } from 'npm:zod@4'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { logCall } from './ai-log.ts'

const MODEL = 'claude-haiku-5-5'

const FactsSchema = z.object({
  address: z.string(),
  line: z.string(),
  baby: z.string(),
  line_en: z.string(),
  baby_en: z.string(),
  opens: z.string(),
  closes: z.string(),
  closed_weekdays: z.array(z.number().int()),
  closed_dates: z.array(z.string()),
  open_dates: z.array(z.string()),
  best_time: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night', 'any']),
  hours: z.number(),
  booking: z.enum(['required', 'recommended', 'no']),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  tags: z.array(z.string()),
})
export type Facts = {
  key: string
  name: string
  address: string | null
  line_he: string | null
  baby_he: string | null
  line_en: string | null
  baby_en: string | null
  opens: string | null
  closes: string | null
  closed_weekdays: number[]
  closed_dates: string[]
  open_dates: string[]
  best_time: string
  hours: number | null
  booking: string
  lat: number | null
  lng: number | null
  tags: string[]
}

export type PlaceInfo = {
  name: string
  name_ja?: string | null
  city?: string | null
  area?: string | null
  category?: string | null
  tip?: string | null
  baby_notes?: string | null
  hype?: string | null
  reality?: string | null
  time_needed?: string | null
}

/** The same place under small differences in spelling, case or punctuation gets one key. */
export const factKey = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

const RESEARCH = `You check practical visiting facts for a place in Japan for travellers there between 12 and 31 December 2026.
Each search costs money: one search is usually enough (use the Japanese name when you have it); search a second time only if the opening hours or the December closures are still missing. Report:
- regular opening hours (as of late 2026) and weekly closing days
- closures between 12 and 31 December 2026, especially the year-end holidays (usually from 28-31 December); say clearly when the place is open on those days if you find it
- for a market, a festival or an event that runs on certain dates only: the dates it runs between 12 and 31 December 2026
- whether you need to book ahead, and the usual queue
- how long a typical visit takes
- the best time of day to go, if there is one (sunset view, dinner, nightlife, morning before crowds)
- the exact address and coordinates
- anything that makes it hard with a stroller and a milk-only 5-month-old baby (no strollers allowed, stairs only, no children, smoking inside, very cramped)
Only report what you find or what is well known; say "unknown" otherwise. Plain facts, not who said them. Be brief.`

const EXTRACT = `Turn the notes into the fields below.
- address: the street address in English as Google Maps takes it (e.g. "4-2-15 Ginza, Chuo-ku, Tokyo"); for a street or area without one, the best place to navigate to (e.g. "Nishiki Market, Nakagyo-ku, Kyoto").
- line: ONE short practical tip in natural Hebrew, at most 70 characters, the single thing most worth knowing before going (book ahead, cash only, come before opening, buy the sunset slot, closed on Mondays). Not a description of the place. Keep place and brand names as they are. No emoji, no exclamation marks.
- baby: in Hebrew, at most 60 characters, ONLY if something there changes the plan with a milk-only baby (strollers not allowed, stairs only, no children, smoking inside). Otherwise "".
- Hebrew style for line and baby: short, everyday spoken Israeli Hebrew, like a friend texting the useful bit ("כדאי להגיע מוקדם", "אין מקום לעגלה"). No talk about sources ("לפי…", "מבקרים מציינים"), no marketing words or translation-ese, no em dashes; plural or impersonal, never a gendered singular.
- line_en / baby_en: the same two lines in plain, everyday English (same limits; baby_en "" when baby is ""). Short and practical ("Book ahead", "Cash only", "No room for a stroller"), no marketing words, no exclamation marks, no em dashes. baby_en must say the block in words like "no stroller", "stairs only", "smoky", "adults only", "not suitable".
- opens / closes: typical opening and closing time as "HH:MM" (24h); "" if it has no hours (a street, an area) or unknown. A bar open past midnight closes at e.g. "02:00".
- closed_weekdays: weekly closing days as numbers, 0 = Sunday ... 6 = Saturday; [] if none or unknown.
- closed_dates: dates between 2026-12-12 and 2026-12-31 it is closed as "YYYY-MM-DD" (year-end holidays included); [] if none or unknown.
- open_dates: ONLY for something that runs on certain dates only (a market, a festival, an event): the dates between 2026-12-12 and 2026-12-31 it runs, "YYYY-MM-DD"; [] for a place that is simply open on its usual days.
- best_time: when to go if it matters (morning before crowds, midday for lunch, afternoon, evening for dinner or sunset, night for bars and night views); "any" otherwise.
- hours: typical visit length in hours including the usual queue (e.g. 1, 1.5, 3, 8 for a full day trip).
- booking: "required", "recommended" or "no".
- lat / lng: only if stated in the notes, else null.
- tags: 10-25 hidden search words for the app's search (never shown): what it sells, serves or makes (each signature dish, product and key ingredient), the kind of place (ramen shop, bakery, temple, market, bar, onsen), cuisine, notable things you see or do there, and the words people would type instead, singular and plural, each in BOTH lowercase English and Hebrew (e.g. "pancake", "pancakes", "hotcake", "פנקייק", "פנקייקים"; "knives", "סכינים"). Japanese dish names in their usual romanization and Hebrew spelling. 1-3 words each; not the place's name, city or area; nothing the notes don't support.`

/** Looks a place up; null when the lookup failed. */
export async function lookUp(admin: SupabaseClient, client: Anthropic, p: PlaceInfo): Promise<Facts | null> {
  const known = [
    `Place: ${p.name}${p.name_ja ? ` (${p.name_ja})` : ''}`,
    p.area || p.city ? `Where: ${[p.area, p.city].filter(Boolean).join(', ')}` : '',
    p.category ? `Kind: ${p.category}` : '',
    [p.hype, p.reality, p.tip, p.baby_notes, p.time_needed].filter(Boolean).length
      ? `What the trip's card already says: ${[p.hype, p.reality, p.tip, p.baby_notes, p.time_needed && `time needed: ${p.time_needed}`]
          .filter(Boolean)
          .join(' / ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  let step = 'facts-research'
  let t = performance.now()
  const log = (r: Anthropic.Message) =>
    logCall(admin, { fn: 'card-facts', step, userId: null, model: MODEL, usage: r.usage, ms: performance.now() - t, stopReason: r.stop_reason })
  try {
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: known }]
    let research: Anthropic.Message | null = null
    for (let i = 0; i < 3; i++) {
      t = performance.now()
      research = await client.messages.create({
        model: MODEL,
        // thinking counts toward this; at 3000 one lookup in 55 was cut off
        max_tokens: 6000,
        output_config: { effort: 'low' },
        system: RESEARCH,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages,
      })
      log(research)
      if (research.stop_reason !== 'pause_turn') break
      messages.push({ role: 'assistant', content: research.content })
    }
    if (!research || research.stop_reason === 'refusal') return null
    const notes = research.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    step = 'facts-extract'
    t = performance.now()
    const r = await client.messages.parse({
      model: MODEL,
      // thinking counts toward this: cut off here, the paid search before it is thrown away
      max_tokens: 4000,
      output_config: { effort: 'low', format: zodOutputFormat(FactsSchema) },
      system: EXTRACT,
      messages: [{ role: 'user', content: `${known}\n\nNotes:\n${notes}` }],
    })
    log(r)
    const f = r.parsed_output
    if (!f) return null
    const time = (s: string) => (/^\d{1,2}:\d{2}$/.test(s.trim()) ? s.trim().padStart(5, '0') : null)
    const inJapan = f.lat != null && f.lng != null && f.lat > 24 && f.lat < 46 && f.lng > 122 && f.lng < 146
    return {
      key: factKey(p.name),
      name: p.name,
      address: f.address.trim() || null,
      line_he: f.line.trim() || null,
      baby_he: f.baby.trim() || null,
      line_en: f.line_en.trim() || null,
      baby_en: f.baby_en.trim() || null,
      opens: time(f.opens),
      closes: time(f.closes),
      closed_weekdays: [...new Set(f.closed_weekdays.filter((d) => d >= 0 && d <= 6))],
      closed_dates: f.closed_dates.filter((d) => /^2026-12-(1[2-9]|2\d|3[01])$/.test(d)),
      open_dates: f.open_dates.filter((d) => /^2026-12-(1[2-9]|2\d|3[01])$/.test(d)),
      best_time: f.best_time,
      hours: f.hours > 0 && f.hours <= 12 ? f.hours : null,
      booking: f.booking,
      lat: inJapan ? f.lat : null,
      lng: inJapan ? f.lng : null,
      tags: [...new Set(f.tags.map((w) => w.trim().toLowerCase()).filter(Boolean))].slice(0, 30),
    }
  } catch (error) {
    console.error('facts lookup failed', p.name, error instanceof Error ? error.message : error)
    logCall(admin, { fn: 'card-facts', step, userId: null, model: MODEL, ms: performance.now() - t, error: String(error instanceof Error ? error.message : error) })
    return null
  }
}

// ---- the re-check: a card whose facts are older than six months, when its place is matched into a trip ----
// Only what ages is asked for: is the place still in business, its opening hours and its weekly closing days. One
// call; a card that knows its own Tabelog page reads that page (no fee) instead of searching, any other card gets
// one search. Nothing else on the card is written again.

/** What the re-check found; a null field was not found and the card keeps what it has. */
export type Recheck = {
  status: 'open' | 'closed' | 'unknown'
  opens: string | null
  closes: string | null
  closed_weekdays: number[] | null
  searches: number
}
export type RecheckInfo = PlaceInfo & {
  address?: string | null
  sources?: string[] | null
  opens?: string | null
  closes?: string | null
  closed_weekdays?: number[] | null
}

// The card's own hours go in with the question and stay unless what is found clearly says otherwise: on cards two
// weeks old, asking with no card to compare against changed the hours or closing days of 5 of the 9 that were
// searched, and gave a street opening hours. With the card in the question, 2 of the same 9 changed.
const ENDING = `The message says what the card has now. That was researched with more care than this check: keep it ("same") unless what you read clearly states different regular hours or closing days for this very place, at this branch. One store inside a complex, holiday or seasonal hours, last-order times and a page that does not mention the hours are not a reason to change anything.
Report nothing else. End your answer with exactly these three lines and nothing after them:
STATUS: open | closed_for_good | unknown
HOURS: same | HH:MM-HH:MM
CLOSED_DAYS: same | none | weekday numbers separated by commas, 0 = Sunday ... 6 = Saturday
STATUS is closed_for_good only when a source says the place has permanently closed; "unknown" when you could not tell that it is still in business.
HOURS is the first opening and the last closing of a regular day in 24h time (lunch 11:30-14:00 and dinner 17:00-22:00 is 11:30-22:00; a bar open until 2 am is 18:00-02:00). Never guess: anything not clearly stated is "same".`

const RECHECK_SEARCH = `You re-check one place in Japan whose card was written months ago. Find only this, as it is today:
- whether the place is still in business or has closed for good (permanently closed, 閉店)
- its regular opening time and closing time
- its weekly closing days
Each search costs money: run exactly one search (the place's name as given, its area, and "opening hours"), and answer from its results. Never search a second time.
${ENDING}`

const RECHECK_PAGE = `You re-check one restaurant, cafe or bar in Japan whose card was written months ago. Find only this, as it is today:
- whether the place is still in business or has closed for good (permanently closed, 閉店)
- its regular opening time and closing time
- its weekly closing days
The message gives the place's own Tabelog page. Read that page with web_fetch, the address exactly as written. Fetching it costs nothing. It is the right page only when its name and area match the place.
Each search costs money: search (once, the place's name as given, its area, and "opening hours") only if the page could not be read, is another place's, or does not say the hours.
${ENDING}`

/**
 * The card's own Tabelog page, if its sources name one restaurant page more than any other: the English page of that
 * restaurant, whatever sub-page or host (ssl., o., s.) the source was.
 */
export function tabelogPage(sources: string[] | null | undefined) {
  const seen = new Map<string, number>()
  for (const s of sources ?? []) {
    const m = typeof s === 'string' && s.match(/^https:\/\/(?:[a-z]+\.)?tabelog\.com\/(?:en\/)?([a-z]+\/A\d{4}\/A\d{6}\/\d{6,10})(?:\/|$)/)
    if (m) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1)
  }
  const ranked = [...seen.entries()].sort((a, b) => b[1] - a[1])
  // two restaurants named equally often: no telling which is the card's
  if (!ranked.length || (ranked[1] && ranked[1][1] === ranked[0][1])) return null
  return `https://tabelog.com/en/${ranked[0][0]}/`
}

/** Reads the three closing lines of a re-check answer; null when they are not there. */
export function readRecheck(text: string): Omit<Recheck, 'searches'> | null {
  // the last such line: an answer that repeats the format first, then gives its own lines, is read by its own
  const line = (label: string) => [...text.matchAll(new RegExp(`^\\s*\\**${label}\\**\\s*:\\s*\\**\\s*(.+?)\\s*\\**\\s*$`, 'gim'))].pop()?.[1]?.toLowerCase() ?? null
  const status = line('STATUS')
  const hours = line('HOURS')
  const days = line('CLOSED_DAYS')
  if (!status || !hours || !days) return null
  const time = (s: string) => {
    const m = s.match(/^(\d{1,2}):(\d{2})$/)
    if (!m || +m[1] > 29 || +m[2] > 59) return null
    return `${String(+m[1] % 24).padStart(2, '0')}:${m[2]}`
  }
  const span = hours.match(/^(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})$/)
  const opens = span ? time(span[1]) : null
  const closes = span ? time(span[2]) : null
  // 00:00-00:00 and the like is "always open" written as hours: not hours
  const real = opens && closes && opens !== closes
  let closed_weekdays = /^none\b/.test(days)
    ? []
    : /^[0-6](\s*,\s*[0-6])*$/.test(days)
      ? [...new Set(days.split(',').map((d) => +d.trim()))].sort()
      : null
  // closed on all seven days is not a weekly closing day: a place closed for good is STATUS closed_for_good, not this
  if (closed_weekdays?.length === 7) closed_weekdays = null
  return {
    status: /^closed/.test(status) ? 'closed' : /^open/.test(status) ? 'open' : 'unknown',
    opens: real ? opens : null,
    closes: real ? closes : null,
    closed_weekdays,
  }
}

/** Re-checks a place's hours; null when the call failed or was refused (nothing is changed then). An answer that could not be read is "unknown" with nothing found: the check ran and was paid for. */
export async function recheck(admin: SupabaseClient, client: Anthropic, p: RecheckInfo): Promise<Recheck | null> {
  const page = tabelogPage(p.sources)
  const known = [
    `Place: ${p.name}${p.name_ja ? ` (${p.name_ja})` : ''}`,
    p.area || p.city ? `Where: ${[p.area, p.city].filter(Boolean).join(', ')}` : '',
    p.address ? `Address on the card: ${p.address}` : '',
    p.category ? `Kind: ${p.category}` : '',
    `The card's hours now: ${p.opens && p.closes ? `${p.opens}-${p.closes}` : 'none on the card'}`,
    `The card's weekly closing days now: ${p.closed_weekdays?.length ? p.closed_weekdays.join(', ') : 'none'}`,
    page ? `Its Tabelog page: ${page}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const step = page ? 'recheck-page' : 'recheck-search'
  let t = performance.now()
  try {
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: known }]
    let answer: Anthropic.Message | null = null
    let searches = 0
    let fetches = 0
    for (let i = 0; i < 3; i++) {
      t = performance.now()
      answer = await client.messages.create({
        model: MODEL,
        // thinking counts toward this
        max_tokens: 2000,
        output_config: { effort: 'low' },
        system: page ? RECHECK_PAGE : RECHECK_SEARCH,
        tools: [
          // declared in every round, as the rounds that continue a paused one still hold its search results; one
          // search is allowed in each, and the prompt says to search once
          { type: 'web_search_20250305' as const, name: 'web_search' as const, max_uses: 1 },
          // Tabelog only: the address comes from the card's sources, which a post's text once chose. The hours sit
          // far down a Tabelog page: at 8,000 tokens two of three pages were cut off before them
          ...(page && !fetches
            ? [{ type: 'web_fetch_20250910' as const, name: 'web_fetch' as const, max_uses: 1, max_content_tokens: 16000, allowed_domains: ['tabelog.com'] }]
            : []),
        ],
        messages,
      })
      logCall(admin, { fn: 'card-facts', step, userId: null, model: MODEL, usage: answer.usage, ms: performance.now() - t, stopReason: answer.stop_reason })
      const used = answer.usage.server_tool_use as { web_search_requests?: number | null; web_fetch_requests?: number | null } | null | undefined
      searches += used?.web_search_requests ?? 0
      fetches += used?.web_fetch_requests ?? 0
      if (answer.stop_reason !== 'pause_turn') break
      messages.push({ role: 'assistant', content: answer.content })
    }
    if (!answer || answer.stop_reason === 'refusal') return null
    const text = answer.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    const read = readRecheck(text)
    if (!read) console.error('re-check answer not readable', p.name, text.slice(-300))
    return { ...(read ?? { status: 'unknown' as const, opens: null, closes: null, closed_weekdays: null }), searches }
  } catch (error) {
    console.error('re-check failed', p.name, error instanceof Error ? error.message : error)
    logCall(admin, { fn: 'card-facts', step, userId: null, model: MODEL, ms: performance.now() - t, error: String(error instanceof Error ? error.message : error) })
    return null
  }
}
