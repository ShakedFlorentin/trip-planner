// One planner at a time per trip, and what the app can read of a run in plan_state: `ran_at` moves when a run
// worked, `error` is set when it failed. The app (src/App.tsx) reads the row, asks for a plan, and calls it failed
// when `error` is set and is not what it read before: so taking the lease clears the last failure, and a failure
// is written with its time, which tells the same failure twice in a row apart.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { failMark } from './errors.ts'

export const LEASE_MS = 60_000

/** Requests that arrive while a planner runs mark the trip dirty and it runs once more. `run` plans and writes; `settle` is the wait before the first run. */
export async function loop<S>(
  admin: SupabaseClient,
  tid: string,
  run: () => Promise<{ stats: S; summary: unknown }>,
  settle = 2000,
): Promise<{ queued: true } | { results: S[] }> {
  await admin.from('plan_state').upsert({ trip_id: tid }, { onConflict: 'trip_id', ignoreDuplicates: true })
  const acquire = async () => {
    const now = new Date()
    const { data } = await admin
      .from('plan_state')
      // each run starts clean: the failure of the run before is not this run's
      .update({ lease_until: new Date(now.getTime() + LEASE_MS).toISOString(), dirty: false, error: null })
      .eq('trip_id', tid)
      .or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`)
      .select('trip_id')
    return !!data?.length
  }
  if (!(await acquire())) {
    await admin.from('plan_state').update({ dirty: true }).eq('trip_id', tid)
    // the running one may have finished in between and missed the flag
    if (!(await acquire())) return { queued: true }
  }
  const results: S[] = []
  try {
    for (let round = 0; round < 2; round++) {
      // swipes come in bursts: let the burst settle so one run covers it
      if (round === 0 && settle > 0) await new Promise((r) => setTimeout(r, settle))
      try {
        const r = await run()
        results.push(r.stats)
        await admin.from('plan_state').update({ ran_at: new Date().toISOString(), error: null, summary: r.summary }).eq('trip_id', tid)
      } catch (e) {
        // the error itself stays in the function logs; the row the app reads gets the code and when
        console.error('plan_failed', tid, e)
        await admin.from('plan_state').update({ error: failMark('plan_failed', new Date()) }).eq('trip_id', tid)
      }
      const { data } = await admin.from('plan_state').select('dirty').eq('trip_id', tid).single()
      if (!data?.dirty) break
      await admin
        .from('plan_state')
        .update({ dirty: false, lease_until: new Date(Date.now() + LEASE_MS).toISOString() })
        .eq('trip_id', tid)
    }
  } finally {
    await admin.from('plan_state').update({ lease_until: null }).eq('trip_id', tid)
  }
  return { results }
}
