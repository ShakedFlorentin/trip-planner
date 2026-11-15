// What is kept of the model's reading of a booking confirmation, as pure functions (no Deno or npm imports) so
// scripts/guard-test.mjs can run them with hostile output. The confirmation text is untrusted, so the model's answer is
// too: dates must fall in the trip's window, a link must be https on a public host, every field is clamped and cleaned.
import { fence, safeUrl, stripProse } from '../_shared/guard.ts'

export type RawBooking = {
  kind: string
  title: string
  starts_at: string | null
  ends_at: string | null
  confirmation: string | null
  location: string | null
  url: string | null
  notes: string | null
}
export type Flag = 'starts_at_outside_trip' | 'ends_at_outside_trip' | 'bad_start' | 'bad_end' | 'end_before_start' | 'url_dropped' | 'no_title'
export type CleanBooking = RawBooking & { flags: Flag[] }
export type Window = { from: string; to: string }

const KINDS = ['flight', 'hotel', 'restaurant', 'train', 'activity', 'insurance', 'other']
/** How far past the trip's first and last day a booking may sit (the flight out leaves the day before). */
export const SLACK_DAYS = 3
export const MAX_BOOKINGS = 20
// "YYYY-MM-DDTHH:mm"; a bare date is let through too, as the app reads one (wallClock)
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/

const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** The days a booking may fall in: the trip's first day minus 3 to its last day plus 3. Null when the trip has no usable dates. */
export function tripWindow(start: string | null | undefined, numDays: number | null | undefined): Window | null {
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !(typeof numDays === 'number' && numDays >= 1 && numDays <= 366)) return null
  const first = new Date(`${start}T00:00:00Z`)
  if (Number.isNaN(first.getTime())) return null
  const day = 86_400_000
  return { from: ymd(new Date(first.getTime() - SLACK_DAYS * day)), to: ymd(new Date(first.getTime() + (numDays - 1 + SLACK_DAYS) * day)) }
}

/** A local date-time "YYYY-MM-DDTHH:mm" (or a bare "YYYY-MM-DD") when it is a real one, else null. */
export function localTime(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const m = v.trim().match(LOCAL)
  if (!m) return null
  const [y, mo, d] = m.slice(1, 4).map(Number)
  const h = m[4] === undefined ? 0 : Number(m[4])
  const mi = m[5] === undefined ? 0 : Number(m[5])
  if (h > 23 || mi > 59) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return v.trim()
}

/** A few lines of plain text: each line cleaned like prose (no markup, no links), at most `lines` lines and `max` characters. */
function clampLines(v: unknown, lines: number, max: number): string | null {
  if (typeof v !== 'string') return null
  const out = v.split(/\r?\n/).map((l) => stripProse(l, max)).filter(Boolean).slice(0, lines).join('\n').slice(0, max).trim()
  return out || null
}

/**
 * The bookings that may be returned to the app. A date outside the trip window (or not a real date) becomes null and the
 * booking carries a flag, so the app's review step can show it instead of saving a wrong day. With no window (no trip
 * given) dates are only checked for shape. Never throws on odd input.
 */
export function cleanBookings(raw: unknown, window: Window | null): CleanBooking[] {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_BOOKINGS) : []
  const out: CleanBooking[] = []
  for (const r of list) {
    if (!r || typeof r !== 'object') continue
    const b = r as Record<string, unknown>
    const flags: Flag[] = []
    const title = stripProse(b.title, 120)
    if (!title) flags.push('no_title')
    const inWindow = (t: string) => !window || (t.slice(0, 10) >= window.from && t.slice(0, 10) <= window.to)
    let starts = localTime(b.starts_at)
    if (b.starts_at != null && !starts) flags.push('bad_start')
    if (starts && !inWindow(starts)) {
      flags.push('starts_at_outside_trip')
      starts = null
    }
    let ends = localTime(b.ends_at)
    if (b.ends_at != null && !ends) flags.push('bad_end')
    if (ends && !inWindow(ends)) {
      flags.push('ends_at_outside_trip')
      ends = null
    }
    if (starts && ends && ends.slice(0, 10) < starts.slice(0, 10)) {
      flags.push('end_before_start')
      ends = null
    }
    const url = b.url == null || b.url === '' ? null : safeUrl(b.url, null)
    if (b.url != null && b.url !== '' && !url) flags.push('url_dropped')
    out.push({
      kind: KINDS.includes(b.kind as string) ? (b.kind as string) : 'other',
      title: title || 'Booking',
      starts_at: starts,
      ends_at: ends,
      confirmation: stripProse(b.confirmation, 40) || null,
      location: stripProse(b.location, 200) || null,
      url,
      notes: clampLines(b.notes, 3, 400),
      flags,
    })
  }
  return out
}

/** The pasted text as a fenced block: an email or a PDF's text is data, never instructions. */
export const bookingText = (text: string) => fence('booking_text', text, 50_000)
