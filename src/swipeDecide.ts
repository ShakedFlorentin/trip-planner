// Where a released row ends up. Pure (no DOM) so scripts/swipe-test.mjs can check it.
export const FLICK_WINDOW_MS = 100 // only samples this close to lifting count as speed; a pause before lifting means v = 0
export const FLICK_MIN_TRAVEL = 48 // a flick helps only after the finger really moved this far in this gesture
export const FLICK_MAX_PROJECT = 60 // and adds at most this much
export const ACTION_MIN_PULL = 56 // the start action also needs this much real pull, whatever the speed

export type Sample = { t: number; x: number }
export type Release = { kind: 'action' | 'end' | 'start' | 'close'; v: number }

/** Finger speed in px/s from the samples in the last FLICK_WINDOW_MS before lifting; 0 when paused or too few. */
export function releaseSpeed(trail: Sample[], liftT: number): number {
  const recent = trail.filter((s) => liftT - s.t <= FLICK_WINDOW_MS)
  if (recent.length < 2) return 0
  const a = recent[0]
  const b = recent[recent.length - 1]
  return b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0
}

/**
 * pos: row offset now; from: offset when the finger went down; k: +1 in RTL, -1 in LTR (sign toward the end actions);
 * project: px a flick would carry on (spring.ts project). Returns what to do on lift.
 */
export function decideRelease(o: { pos: number; from: number; k: number; v: number; endW: number; startW: number; hasStart: boolean; project: (v: number) => number }): Release {
  const { pos, from, k, v, endW, startW, hasStart } = o
  const travel = Math.abs(pos - from)
  const carry = travel >= FLICK_MIN_TRAVEL ? Math.max(-FLICK_MAX_PROJECT, Math.min(FLICK_MAX_PROJECT, o.project(v))) : 0
  const rest = (pos + carry) * k
  if (hasStart && rest < -startW * 1.2 && pos * k <= -ACTION_MIN_PULL) return { kind: 'action', v: 0 }
  if (rest > endW * 0.4) return { kind: 'end', v }
  if (hasStart && rest < -startW * 0.4) return { kind: 'start', v }
  return { kind: 'close', v }
}
