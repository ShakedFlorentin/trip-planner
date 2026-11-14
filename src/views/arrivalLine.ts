// The landing day's ride to the hotel, from the planner's summary (days[].arrival). Pure, no app imports, so a node test can run it.

export type Arrival = { airport: string; ride_min: number; ready: string }

/** "11:21" -> "11:25": the next 5 minutes (a time already on a 5 stays); null when it is not a time. */
export function roundUp5(hhmm: unknown): string | null {
  const m = typeof hhmm === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim()) : null
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 47 || min > 59) return null
  const total = Math.ceil((h * 60 + min) / 5) * 5
  const hh = Math.floor(total / 60) % 24
  return `${String(hh).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** The arrival of one party; a day with a single arrival also serves a booking that has no owner. */
export function arrivalOf(day: Record<string, Arrival> | undefined | null, who: string | null | undefined): Arrival | null {
  if (!day || typeof day !== 'object') return null
  const keys = Object.keys(day)
  const a = who && day[who] ? day[who] : !who && keys.length === 1 ? day[keys[0]] : null
  return a && typeof a === 'object' ? a : null
}

/** "To the hotel about 46 min · there around 11:25", or null when the numbers are missing (nothing shows then). */
export function arrivalLine(a: Arrival | null | undefined, fmt: (vars: { n: number; time: string }) => string): string | null {
  if (!a) return null
  const ride = Number(a.ride_min)
  const ready = roundUp5(a.ready)
  if (!Number.isFinite(ride) || ride <= 0 || !ready) return null
  return fmt({ n: Math.round(ride), time: ready })
}
