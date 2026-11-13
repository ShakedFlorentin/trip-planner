import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { settings } from './settings'
import { isEn } from './i18n'

/**
 * The trip pass (roadmap step 10, supabase/sql/2026-11-14-trip-pass.sql): the first free_places_per_trip new places of
 * each trip are free for the whole group, and a pass makes them unlimited for everyone on the trip. Places already in
 * Toogo's library are always free. Behind app_settings features.trip_pass.
 *
 * Buying is not wired yet: the website checkout (a payment company) and Apple's in-app purchase each come later and
 * plug into buyPass(). Until then an admin gives passes (grant_trip_pass), and the offer says payment opens soon.
 */
export type PassStatus = { enabled: boolean; pass: boolean; source?: string | null; free: number; used: number; left: number }

/** The pass state of a trip for this member, or null while unknown (or the trip pass is switched off). */
export function usePassStatus(tripId: string | null, refreshKey = 0) {
  const [status, setStatus] = useState<PassStatus | null>(null)
  useEffect(() => {
    if (!tripId) return
    let live = true
    void supabase.rpc('trip_pass_status', { p_trip: tripId }).then(({ data, error }) => {
      if (!live || error) return
      const d = data as Partial<PassStatus> | null
      setStatus(d?.enabled ? { enabled: true, pass: !!d.pass, source: d.source ?? null, free: d.free ?? 0, used: d.used ?? 0, left: d.left ?? 0 } : null)
    })
    return () => {
      live = false
    }
  }, [tripId, refreshKey])
  return status
}

/** The price in the app's language: shekels in Hebrew, dollars in English (app_settings trip_pass_price). */
export function passPrice() {
  const p = settings().trip_pass_price
  return isEn ? `$${p.usd.toFixed(2)}` : `₪${Math.round(p.ils)}`
}

/** Starts buying a pass for this trip. Today there is no way to pay yet, so it says so ('soon'). */
export async function buyPass(_tripId: string): Promise<'started' | 'soon'> {
  return 'soon'
}
