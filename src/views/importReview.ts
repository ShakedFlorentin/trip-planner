// Pure rules of the booking-import check step (used by ImportSheet in Bookings.tsx and by scripts/import-review-test.mjs).

export type ImportFlag = 'starts_at_outside_trip' | 'ends_at_outside_trip' | 'bad_start' | 'bad_end' | 'end_before_start' | 'url_dropped' | 'no_title'

const FLAGS: ImportFlag[] = ['starts_at_outside_trip', 'ends_at_outside_trip', 'bad_start', 'bad_end', 'end_before_start', 'url_dropped', 'no_title']

/** Flags the reader sent for one booking, unknown values dropped. */
export function readFlags(v: unknown): ImportFlag[] {
  return Array.isArray(v) ? FLAGS.filter((f) => v.includes(f)) : []
}

/** A date the reader had to drop: the row starts unticked and says so. */
export const DATE_DROPPED: ImportFlag[] = ['starts_at_outside_trip', 'ends_at_outside_trip', 'bad_start', 'bad_end', 'end_before_start']
export const dateDropped = (flags: ImportFlag[]) => flags.some((f) => DATE_DROPPED.includes(f))

/** Same stored time, whatever the timestamp's formatting. A missing time is never "the same time" as another missing one. */
export function sameTime(a: string | null, b: string | null) {
  if (!a || !b) return false
  return a === b || Date.parse(a) === Date.parse(b)
}
