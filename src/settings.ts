import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/**
 * Settings from the server (table app_settings, supabase/sql/2026-11-13-app-settings.sql): a changed row changes the
 * app with no new version, on the website and in the iOS app alike. Read once at start, then every 10 minutes while
 * the app is open; the last values read are kept on the phone, so an offline start uses them, and the defaults below
 * cover a first start offline, a missing row or a value of the wrong type.
 */
export type Settings = {
  swipe_batch_size: number
  /** guest_mode: someone not signed in starts with the questionnaire and real cards, and signs in to save (off by default) */
  /** google_signin: "Continue with Google" on the sign-in screen, and new accounts through Google (supabase/sql/2026-11-13-google-signin.sql) */
  features: { share_extension: boolean; rating_prompt: boolean; guest_mode: boolean; google_signin: boolean }
  free_places_per_trip: number
  trip_pass_price: { usd: number; ils: number }
}

export const DEFAULTS: Settings = {
  swipe_batch_size: 20,
  features: { share_extension: true, rating_prompt: true, guest_mode: false, google_signin: false },
  free_places_per_trip: 10,
  trip_pass_price: { usd: 7.99, ils: 29 },
}

const KEY = 'appSettings'
const REFRESH_MS = 10 * 60_000

const num = (v: unknown, d: number, min = 0, max = Infinity) => (typeof v === 'number' && v >= min && v <= max ? v : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** The rows as read, checked one by one against the defaults: anything odd falls back to its default. */
export function parseSettings(rows: Record<string, unknown>): Settings {
  const f = obj(rows.features)
  const p = obj(rows.trip_pass_price)
  return {
    swipe_batch_size: Math.round(num(rows.swipe_batch_size, DEFAULTS.swipe_batch_size, 5, 100)),
    features: {
      share_extension: bool(f.share_extension, DEFAULTS.features.share_extension),
      rating_prompt: bool(f.rating_prompt, DEFAULTS.features.rating_prompt),
      guest_mode: bool(f.guest_mode, DEFAULTS.features.guest_mode),
      google_signin: bool(f.google_signin, DEFAULTS.features.google_signin),
    },
    free_places_per_trip: Math.round(num(rows.free_places_per_trip, DEFAULTS.free_places_per_trip)),
    trip_pass_price: { usd: num(p.usd, DEFAULTS.trip_pass_price.usd), ils: num(p.ils, DEFAULTS.trip_pass_price.ils) },
  }
}

const saved = (): Record<string, unknown> => {
  try {
    return obj(JSON.parse(localStorage.getItem(KEY) ?? '{}'))
  } catch {
    return {}
  }
}

let current = parseSettings(saved())
// whether the values come from the server (now or on an earlier visit), not only the defaults
let known = Object.keys(saved()).length > 0
const listeners = new Set<() => void>()

/** The settings now (defaults until the first read). */
export const settings = () => current

/** Reads the table and tells every screen that uses a setting. A failed read keeps what there was. */
export async function loadSettings() {
  try {
    const { data, error } = await supabase.from('app_settings').select('key, value')
    if (error || !data) return
    const rows = Object.fromEntries(data.map((r: { key: string; value: unknown }) => [r.key, r.value]))
    try {
      localStorage.setItem(KEY, JSON.stringify(rows))
    } catch {
      // private mode: this start still uses the values just read
    }
    current = parseSettings(rows)
    known = true
    listeners.forEach((l) => l())
  } catch {
    // offline: the saved values or the defaults stay
  } finally {
    // asked once, answered or not: whoever waits for the first answer stops waiting
    if (!known) {
      known = true
      listeners.forEach((l) => l())
    }
  }
}

/** True once the settings have been read from the server, on this visit or an earlier one (or the first try failed). */
export function useSettingsKnown() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => known,
  )
}

/** A screen's view of the settings: it draws again when they change. */
export function useSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    settings,
  )
}

if (typeof window !== 'undefined') {
  void loadSettings()
  setInterval(() => document.visibilityState === 'visible' && void loadSettings(), REFRESH_MS)
}
