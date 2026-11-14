// Live changes, the way that holds with thousands of phones: one private Broadcast channel per trip
// ("live:<trip id>"). The database sends what changed, rows included (supabase/sql/2026-11-14-live-v2.sql), and who
// may listen is checked once, when the phone joins. Before this every table had its own Postgres Changes
// subscription, which the database checks per change and per subscriber.
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { settings } from './settings'

/** `rows` is null when more than 20 rows changed at once (or they were too big): read the table again. */
export type LiveChange = { t: string; op: 'INSERT' | 'UPDATE' | 'DELETE'; n: number; rows: Record<string, unknown>[] | null }
/** 'resync': the channel was down and is back, so changes may have been missed. */
type Listener = (c: LiveChange | 'resync') => void

/** Whether this phone listens the new way: app_settings features.live; localStorage live = 1 / 0 wins, for testing. */
export function liveOn(): boolean {
  try {
    const o = localStorage.getItem('live')
    if (o === '1') return true
    if (o === '0') return false
  } catch {
    // no storage: the server's setting decides
  }
  return settings().features.live
}

/** after the last listener leaves, keep the channel this long, so moving between tabs doesn't rejoin */
const LINGER = 3000

type Trip = { channel: RealtimeChannel; subs: Set<Listener>; closeTimer: ReturnType<typeof setTimeout> | null }
const trips = new Map<string, Trip>()

/** Listens to one trip's changes; returns how to stop. Every listener of a trip shares its one channel. */
export function onLive(tripId: string, f: Listener): () => void {
  let t = trips.get(tripId)
  if (!t) {
    const subs = new Set<Listener>()
    let joined = false
    let dropped = false
    const channel = supabase
      .channel('live:' + tripId, { config: { private: true } })
      .on('broadcast', { event: 'change' }, (m) => {
        const c = m.payload as LiveChange | undefined
        if (c && typeof c.t === 'string') subs.forEach((g) => g(c))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (dropped) subs.forEach((g) => g('resync'))
          joined = true
          dropped = false
        } else if (joined) {
          dropped = true
        }
      })
    t = { channel, subs, closeTimer: null }
    trips.set(tripId, t)
  }
  const trip = t
  if (trip.closeTimer) clearTimeout(trip.closeTimer)
  trip.closeTimer = null
  trip.subs.add(f)
  return () => {
    trip.subs.delete(f)
    if (trip.subs.size) return
    trip.closeTimer = setTimeout(() => {
      void supabase.removeChannel(trip.channel)
      if (trips.get(tripId) === trip) trips.delete(tripId)
    }, LINGER)
  }
}
