// The trip pass (supabase/sql/2026-11-14-trip-pass.sql): the first free_places_per_trip new places of each trip are
// free for the whole group, a pass makes them unlimited. Used by suggest-place only for a lookup that really
// researches something (a saved answer or a library place stays free). Behind app_settings features.trip_pass.
// Shared by the functions that use it: imported from ../_shared/pass.ts (deploys must include that file).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type PlaceHold =
  | { ok: true; opId: string }
  | { ok: false; repeat?: undefined; status: number; body: Record<string, unknown> }
  // this lookup id already used a place (and was not given back): no new AI work for it
  | { ok: false; repeat: true; opId: string; status: number; body: Record<string, unknown> }

/** Takes one of the trip's new places for this lookup, or says the trip needs a pass (402). */
export async function holdPlace(admin: SupabaseClient, userId: string, tripId: string, key: string): Promise<PlaceHold> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const opId = `place:${tripId}:${key}${attempt ? `:r${attempt}` : ''}`
    const { data, error } = await admin.rpc('reserve_place', { p_op_id: opId, p_user: userId, p_trip: tripId })
    if (error || !data) {
      console.error('reserve_place failed', error?.message)
      return { ok: false, status: 503, body: { error: 'try again in a moment' } }
    }
    const r = data as { ok: boolean; repeat?: boolean; state?: string; needs_pass?: boolean; not_member?: boolean; free?: number; used?: number }
    if (r.not_member) return { ok: false, status: 403, body: { error: 'not on this trip' } }
    if (!r.ok) return { ok: false, status: 402, body: { needs_pass: true, free: r.free ?? 0, used: r.used ?? 0 } }
    if (r.repeat && r.state === 'refunded') continue
    if (r.repeat) return { ok: false, repeat: true, opId, status: 409, body: { error: 'lookup already running' } }
    return { ok: true, opId }
  }
  return { ok: false, status: 503, body: { error: 'try again in a moment' } }
}

/** The search found places: the use stays counted. */
export async function settlePlace(admin: SupabaseClient, opId: string) {
  const { error } = await admin.rpc('settle_place', { p_op_id: opId })
  if (error) console.error('settle_place failed', error.message)
}

/** The search found nothing or failed: the place goes back to the trip. */
export async function refundPlace(admin: SupabaseClient, opId: string) {
  const { error } = await admin.rpc('refund_place', { p_op_id: opId })
  if (error) console.error('refund_place failed', error.message)
}
