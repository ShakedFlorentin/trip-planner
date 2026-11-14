import { countingOn } from './track'

/**
 * How long the top card of the swipe deck was looked at before the vote (roadmap step 11), and whether its photos or
 * its details were opened. Only time the page is actually on screen counts, and one look counts for at most a minute
 * (the phone put down on the table is not interest). Kept with the vote (swipes.look_ms, photos_seen, opened) and
 * used by src/rank.ts. Not kept when the person turned "Help improve Toogo" off in Settings.
 */
export type Look = { look_ms: number; photos_seen: number; opened: boolean }

const MAX_MS = 60_000
// active: the card is on top now (only those clocks run again when the app comes back to the screen)
type Open = { since: number | null; ms: number; photos: Set<number>; opened: boolean; active: boolean }
const open = new Map<string, Open>()

const now = () => performance.now()
const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'

if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    for (const o of open.values()) {
      if (!visible() && o.since != null) {
        o.ms += now() - o.since
        o.since = null
      } else if (visible() && o.active && o.since == null) o.since = now()
    }
  })

/** The card came to the top of the deck (its first photo, if it has one, is in view). Starting again on the same card keeps the time it already had. */
export function lookStart(id: string, hasPhoto = true) {
  const o = open.get(id)
  if (o) {
    o.active = true
    if (o.since == null && visible()) o.since = now()
    return
  }
  open.set(id, { since: visible() ? now() : null, ms: 0, photos: new Set(hasPhoto ? [0] : []), opened: false, active: true })
}

/** The card left the top without a vote (filter changed, screen left): its clock stops until it is back. */
export function lookPause(id: string) {
  const o = open.get(id)
  if (!o) return
  o.active = false
  if (o.since != null) {
    o.ms += now() - o.since
    o.since = null
  }
}

export function lookPhoto(id: string, index: number) {
  open.get(id)?.photos.add(index)
}

export function lookOpened(id: string) {
  const o = open.get(id)
  if (o) o.opened = true
}

/** The look at a card that was just voted on, and forgets it. Null when there was none or the person opted out. */
export function lookTake(id: string): Look | null {
  const o = open.get(id)
  open.delete(id)
  if (!o || !countingOn()) return null
  const ms = o.ms + (o.since != null ? now() - o.since : 0)
  return { look_ms: Math.round(Math.min(MAX_MS, ms)), photos_seen: o.photos.size, opened: o.opened }
}
