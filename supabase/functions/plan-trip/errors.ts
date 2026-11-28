// What a failed run may say outside the function logs: a code and a fixed line. The error itself (its text, its
// stack) goes to console.error only, where the function logs keep it.

export type FailCode = 'plan_failed' | 'stays_failed'

const LINE: Record<FailCode, string> = {
  plan_failed: 'The plan could not be made',
  stays_failed: 'The stay suggestions could not be made',
}

/** The body of a failed answer. The error is taken only so a caller cannot forget to pass it on to the log; nothing of it is returned. */
export function failBody(code: FailCode, _e?: unknown): { error: FailCode; message: string } {
  return { error: code, message: LINE[code] }
}

/**
 * What plan_state.error holds after a failed run: the code and when, `plan_failed:2026-11-27T10:00:00.000Z`. The
 * app calls a run failed when this text is not the one it read before asking, so the time is what lets it see the
 * same failure a second time (plan_state has no column for when a run started).
 */
export function failMark(code: FailCode, at: Date): string {
  return `${code}:${at.toISOString()}`
}
