// One live copy of each trip table, shared by every screen that shows it (the hook is useTripTable in lib.ts).
// Before this, every screen kept its own copy and its own realtime channel, and loaded the whole table again on
// every change: a new trip's 300 cards arriving meant hundreds of full loads per phone, and a row deleted on any
// trip made every open phone load that table again (stress test, docs/stress-test-2026-11-14.md).
// Now: one channel and one load per table, a burst of changes is followed by one load, and a delete only counts
// when the row is one of ours.
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { readCache, writeCache } from './cache'

export type TableState<T> = { rows: T[]; loading: boolean; error: string; stale: boolean; updatedAt: number | null }

/** after a change, wait this long for more changes before loading */
const WAIT = 250
/** while changes keep coming, still load this often */
const MAX_WAIT = 1500
/** a screen that opens this soon after a load uses it (several screens share a table; moving between tabs) */
const FRESH = 5000
/** after the last screen closes, keep listening this long, so moving between tabs doesn't reconnect */
const LINGER = 3000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class TableStore<T> {
  private state: TableState<T>
  private readonly key: string
  private subs = new Set<() => void>()
  private channel: RealtimeChannel | null = null
  private haveRows: boolean
  /** the load in flight (with the loads that follow it), if any */
  private loading: Promise<void> | null = null
  /** something changed while a load was in flight: load once more after it ('now': a screen asked) */
  private again: false | 'soon' | 'now' = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private firstChangeAt = 0
  private loadedAt = 0
  private closeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly table: string,
    private readonly tripId: string,
    private readonly order: string,
  ) {
    this.key = `${table}:${tripId}:${order}`
    const cached = readCache<T[]>(this.key)
    this.state = { rows: cached?.data ?? [], loading: !cached, error: '', stale: !!cached, updatedAt: cached?.at ?? null }
    this.haveRows = !!cached
  }

  getState = () => this.state

  subscribe = (f: () => void) => {
    this.subs.add(f)
    if (this.subs.size === 1) this.open()
    return () => {
      this.subs.delete(f)
      if (!this.subs.size) this.closeTimer = setTimeout(() => this.close(), LINGER)
    }
  }

  /** Loads now (a screen saved something, or the app came back). A load in flight is followed by one more. */
  reload = (): Promise<void> => {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.firstChangeAt = 0
    if (this.loading) {
      this.again = 'now'
      return this.loading
    }
    this.loading = this.run()
    return this.loading
  }

  /** Stops listening and forgets the rows (sign-out). */
  drop() {
    if (this.closeTimer) clearTimeout(this.closeTimer)
    this.close()
    this.subs.clear()
  }

  private set(patch: Partial<TableState<T>>) {
    this.state = { ...this.state, ...patch }
    this.subs.forEach((f) => f())
  }

  private open() {
    if (this.closeTimer) clearTimeout(this.closeTimer)
    this.closeTimer = null
    if (!this.channel) {
      // what was saved ahead for offline (ready.ts) while no screen was showing this table
      const cached = readCache<T[]>(this.key)
      if (cached && cached.at > (this.state.updatedAt ?? 0)) {
        this.haveRows = true
        this.set({ rows: cached.data, updatedAt: cached.at, loading: false })
      }
      this.channel = supabase
        .channel(this.key)
        .on('postgres_changes', { event: '*', schema: 'public', table: this.table, filter: `trip_id=eq.${this.tripId}` }, () => this.changed())
        // realtime can't filter deletes by column, so every delete on the table arrives, other trips' too
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: this.table }, (p) => this.deleted(p.old as Record<string, unknown>))
        .subscribe()
      document.addEventListener('visibilitychange', this.refresh)
      // catch up after the phone comes back online, when realtime events may have been missed
      window.addEventListener('online', this.refresh)
      // what was saved offline has reached the server: show the server's copy
      window.addEventListener('outbox-sent', this.reload)
    }
    if (!this.loading && Date.now() - this.loadedAt > FRESH) void this.reload()
  }

  private close() {
    this.closeTimer = null
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.firstChangeAt = 0
    if (!this.channel) return
    void supabase.removeChannel(this.channel)
    this.channel = null
    document.removeEventListener('visibilitychange', this.refresh)
    window.removeEventListener('online', this.refresh)
    window.removeEventListener('outbox-sent', this.reload)
  }

  private refresh = () => {
    if (document.visibilityState === 'visible') void this.reload()
  }

  /** A change arrived: load once the changes stop coming, or every MAX_WAIT while they keep coming. */
  private changed() {
    if (this.loading) {
      this.again ||= 'soon'
      return
    }
    const now = Date.now()
    this.firstChangeAt ||= now
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.reload(), Math.max(0, Math.min(WAIT, this.firstChangeAt + MAX_WAIT - now)))
  }

  /** A row was deleted somewhere in the table: it matters only when it is one of ours. */
  private deleted(old: Record<string, unknown> | undefined) {
    const keys = Object.keys(old ?? {})
    const rows = this.state.rows as Record<string, unknown>[]
    const ours = !keys.length || rows.some((r) => keys.every((k) => String(r[k]) === String(old![k])))
    // a load in flight may have read the row before it was deleted
    if (ours || this.loading) this.changed()
  }

  private async run() {
    try {
      for (;;) {
        this.again = false
        await this.fetch()
        if (!this.again) break
        // let the rest of a burst arrive, unless a screen is waiting for what it just saved
        if (this.again === 'soon') await sleep(WAIT)
      }
    } finally {
      this.loading = null
    }
  }

  private async fetch() {
    let data: unknown = null
    let message = ''
    try {
      const res = await supabase.from(this.table).select('*').eq('trip_id', this.tripId).order(this.order)
      data = res.data
      message = res.error?.message ?? ''
    } catch (e) {
      message = e instanceof Error ? e.message : String(e)
    }
    if (message) {
      // offline with a saved copy is expected, and the offline banner says so: don't nag on every screen
      const quiet = this.haveRows && navigator.onLine === false
      this.set({ error: quiet ? this.state.error : message, stale: true, loading: false })
      return
    }
    const at = Date.now()
    this.loadedAt = at
    this.haveRows = true
    writeCache(this.key, data)
    this.set({ rows: data as T[], error: '', stale: false, updatedAt: at, loading: false })
  }
}

const stores = new Map<string, TableStore<unknown>>()

/** The shared copy of one trip's table in one order. */
export function tableStore<T>(table: string, tripId: string, order: string): TableStore<T> {
  const key = `${table}:${tripId}:${order}`
  let s = stores.get(key)
  if (!s) stores.set(key, (s = new TableStore<unknown>(table, tripId, order)))
  return s as TableStore<T>
}

/** Forget every table (sign-out, so the next person on this phone doesn't see the old data). */
export function dropTableStores() {
  stores.forEach((s) => s.drop())
  stores.clear()
}
