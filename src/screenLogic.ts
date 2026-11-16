import type { Expense, Report } from './types'

/** A report that is still waiting in the phone's outbox has no status and no id yet: it counts as open. */
export const reportStatus = (r: Pick<Report, 'status'>): Report['status'] => r.status ?? 'open'
export const reportKey = (r: Pick<Report, 'id' | 'created_at'>) => r.id ?? r.created_at

/** Whether the "all settled" line may be shown: only once the rows are really loaded, never while loading or after a failed load. */
export const canSayBalanced = (s: { loading: boolean; error: boolean; rows: number }) => !s.loading && !s.error && s.rows > 0

const HOURS = 6

/**
 * A settlement already recorded for the same two sides, in the same currency, on the same day, in the last few hours:
 * the payer's "החזרתי" and the receiver's "קיבלתי" are two taps on one repayment. `side` maps a person to their side
 * (their couple, or themselves), so the receiver's record (made as someone else of the couple) still matches.
 */
export function findSettleTwin<E extends Pick<Expense, 'id' | 'kind' | 'paid_by' | 'split_among' | 'currency' | 'spent_on' | 'created_at'>>(
  rows: E[],
  want: { from: string; to: string; currency: string; day: string; now: number; skipId?: string },
  side: (id: string) => string,
) {
  const from = side(want.from)
  const to = side(want.to)
  return rows.find(
    (e) =>
      e.kind === 'settlement' &&
      e.id !== want.skipId &&
      e.currency === want.currency &&
      e.spent_on === want.day &&
      side(e.paid_by) === from &&
      side(e.split_among?.[0] ?? '') === to &&
      want.now - new Date(e.created_at).getTime() < HOURS * 3600_000 &&
      want.now - new Date(e.created_at).getTime() > -3600_000,
  )
}

/** A new expense starts in the currency the screen shows, whatever was set the last time. */
export const newExpenseCurrency = (shown: string): 'JPY' | 'ILS' => (shown === 'JPY' ? 'JPY' : 'ILS')

/** Matches that arrive together are shown one at a time: the first is on screen, the rest wait. */
export const queueMatches = <T,>(waiting: T[], arrived: T[]) => [...waiting, ...arrived]
export const nextMatch = <T,>(waiting: T[]) => waiting.slice(1)
