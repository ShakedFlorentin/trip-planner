// A run that is asked to plan what it has just planned does not plan again. The planner (plan.ts) reads nothing but
// what it is given and gives the same plan for the same input, so the plan of a trip's last input is kept while the
// function stays loaded, and an input that is the same to the letter gets that plan back. Nothing is skipped after
// it: the run still compares the plan with the rows there are and writes what differs, which is nothing when nothing
// changed. Kept in memory only: a function that was unloaded in between plans again, as before.
import type { Day, Fixed, Outcome, Unit } from './plan.ts'

/** How many trips' last plans are kept (the oldest goes first). */
export const KEEP_TRIPS = 6

/**
 * The input as text, for telling two inputs apart: every field that the planner can read is in it. What JSON would
 * blur is written out: a Map, a Set, and a number that is not finite.
 */
export function inputKey(days: Day[], units: Unit[], fixed: Fixed[]): string {
  return JSON.stringify([days, units, fixed], (_k, v) => {
    if (typeof v === 'number' && !Number.isFinite(v)) return { $n: String(v) }
    if (v instanceof Map) return { $m: [...v] }
    if (v instanceof Set) return { $s: [...v] }
    return v
  })
}

export type PlanMemo = Map<string, { key: string; out: Outcome }>

/** The plan for this input: the one kept for the trip when the input is the same, else planned now and kept. */
export function planOnce(
  memo: PlanMemo,
  tid: string,
  days: Day[],
  units: Unit[],
  fixed: Fixed[],
  plan: (days: Day[], units: Unit[], fixed: Fixed[]) => Outcome,
): { out: Outcome; reused: boolean } {
  // the key is taken before planning: it is the input as it came
  const key = inputKey(days, units, fixed)
  const had = memo.get(tid)
  if (had && had.key === key) {
    // the trip asked for last is the last to go
    memo.delete(tid)
    memo.set(tid, had)
    return { out: had.out, reused: true }
  }
  const out = plan(days, units, fixed)
  memo.delete(tid)
  memo.set(tid, { key, out })
  while (memo.size > KEEP_TRIPS) memo.delete(memo.keys().next().value as string)
  return { out, reused: false }
}
