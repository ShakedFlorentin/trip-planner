// Settings from the server (table app_settings, supabase/sql/2026-11-13-app-settings.sql): numbers an edge function
// reads at run time, so a change in the table takes effect without a deploy. Read once a minute per function instance;
// when the table can't be read, or a row is missing or not a number, the fallback written in the function is used.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

const TTL_MS = 60_000
let cache: { at: number; values: Record<string, unknown> } | null = null

async function all(admin: SupabaseClient): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values
  try {
    const { data, error } = await admin.from('app_settings').select('key, value')
    if (error) throw error
    cache = { at: Date.now(), values: Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value])) }
  } catch (e) {
    console.error('app_settings unreadable, using fallbacks', e instanceof Error ? e.message : e)
    cache = { at: Date.now(), values: cache?.values ?? {} }
  }
  return cache.values
}

/** A whole-number setting, or `fallback` when it is missing, not a number or below 0. */
export async function settingInt(admin: SupabaseClient, key: string, fallback: number): Promise<number> {
  const v = (await all(admin))[key]
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback
}

/** A switch in app_settings features (e.g. trip_pass), or `fallback` when it is missing or not true/false. */
export async function featureOn(admin: SupabaseClient, name: string, fallback = false): Promise<boolean> {
  const f = (await all(admin)).features
  const v = f && typeof f === 'object' ? (f as Record<string, unknown>)[name] : undefined
  return typeof v === 'boolean' ? v : fallback
}
