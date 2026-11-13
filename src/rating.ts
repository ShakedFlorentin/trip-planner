import { registerPlugin } from '@capacitor/core'
import { isNative } from './native'
import { settings } from './settings'

/**
 * Apple's rating prompt at a good moment: right after a match pop-up is closed, or right after the plan was updated.
 * Only in the iOS app (ios/App/App/AppReview.swift), with Apple's own prompt and no question of ours before it
 * (Apple doesn't allow sorting people first). Apple shows it at most three times a year; on top of that we ask only
 * after two days of use, then at most once in 120 days and three times ever. Switched off with app_settings
 * features.rating_prompt = false.
 */
const AppReview = registerPlugin<{ request(): Promise<{ asked: boolean }> }>('AppReview')

const KEY = 'ratingAsks'
const FIRST = 'firstOpen'
const DAY = 86_400_000

type Asks = { at: number[] }

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // private mode or full storage: the next moment asks again, which Apple still limits
  }
}

// the day the app was first opened on this phone
if (isNative && !read<number | null>(FIRST, null)) write(FIRST, Date.now())

/** Whether this is a moment to ask: the app, two days in, not asked in 120 days, fewer than three asks. */
export function mayAskForRating(now = Date.now()) {
  if (!isNative || !settings().features.rating_prompt) return false
  const first = read<number | null>(FIRST, null)
  const { at } = read<Asks>(KEY, { at: [] })
  if (!first || now - first < 2 * DAY) return false
  if (at.length >= 3) return false
  return !at.length || now - at[at.length - 1] >= 120 * DAY
}

/** A good moment (a match, an updated plan): ask Apple for its rating prompt, if the rules above allow. */
export function askForRating(delayMs = 600) {
  if (!mayAskForRating()) return
  // after the pop-up or message has gone, so the prompt never covers it
  setTimeout(() => {
    if (!mayAskForRating()) return
    write(KEY, { at: [...read<Asks>(KEY, { at: [] }).at, Date.now()] })
    void AppReview.request().catch(() => {
      // an app build from before the rating prompt has no such plugin
    })
  }, delayMs)
}
