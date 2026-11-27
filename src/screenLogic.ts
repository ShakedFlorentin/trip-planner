import type { Expense, Report } from './types'
import { t } from './i18n'

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

/** A save failed: plain words in the app's language. Never the server's raw text (policies, SQL, codes). `fallback` names the failed step when the cause is not one we know. */
export function errorText(message: string, fallback = t('לא הצלחנו לשמור. נסו שוב בעוד רגע.')) {
  if (!navigator.onLine || /failed to fetch|network|load failed|timeout|timed out/i.test(message)) return t('אין אינטרנט, לא נשמר. נסו שוב כשיש קליטה.')
  if (/row-level security|violates row|permission denied|not allowed|jwt|unauthori[sz]ed|forbidden/i.test(message)) return t('אין לכם הרשאה לשינוי הזה בטיול.')
  if (/duplicate key|already exists|unique/i.test(message)) return t('זה כבר קיים.')
  if (/violates (check|foreign key|not-null)|invalid input|null value/i.test(message)) return t('משהו בפרטים לא תקין, ולכן לא נשמר.')
  return fallback
}

/**
 * Why the trip did not load. 'gone': the server answered and the trip is not there for this person (deleted, or they were
 * removed: .single() finds 0 rows, PGRST116), so Retry can never work. Without a session the same request goes out as anon and
 * also finds 0 rows (RLS lets only signed-in users read trips), so that is 'offline', never 'gone'. Anything else: 'offline'.
 */
export const tripLoadFailure = (error: { code?: string } | null, hasSession: boolean): '' | 'gone' | 'offline' =>
  !error ? '' : error.code === 'PGRST116' && hasSession ? 'gone' : 'offline'

/**
 * The second look before a trip is treated as gone (and forgotten from the list): the server confirmed the user (getUser, not
 * the local token) and asked again with no error and no row. Any doubt is false.
 */
export const goneConfirmed = (hasUser: boolean, again: { error: unknown; data: unknown } | null): boolean =>
  hasUser && !!again && !again.error && !again.data

/** The calm line after credits moved to the trip, singular for one. */
export const creditsGivenText = (n: number) =>
  n === 1 ? t('קרדיט אחד הועבר לטיול. הוא זמין לכולם בטיול.') : t('{n} קרדיטים הועברו לטיול. הם זמינים לכולם בטיול.', { n })

/**
 * What the planner's answer to the wand tap says. 'offline': no network, so nothing was sent. 'failed': no answer object, or the
 * server refused (4xx, e.g. 401/403), so waiting is pointless. '': keep watching: it was accepted, or it is a 5xx or a timeout
 * and the planner may still finish (the poll of plan_state decides).
 */
export const wandStartFailure = (res: { error?: { name?: string; context?: { status?: number } } | null } | null, online: boolean): '' | 'offline' | 'failed' => {
  if (!online) return 'offline'
  if (!res) return 'failed'
  const e = res.error
  if (!e) return ''
  if (e.name === 'FunctionsFetchError') return 'offline'
  const status = e.context?.status
  return typeof status === 'number' && status >= 400 && status < 500 ? 'failed' : ''
}
