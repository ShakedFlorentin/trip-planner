// One live copy of each trip table, shared by every screen that shows it (the hook is useTripTable in lib.ts).
// Before this, every screen kept its own copy and its own realtime channel, and loaded the whole table again on
// every change: a new trip's 300 cards arriving meant hundreds of full loads per phone, and a row deleted on any
// trip made every open phone load that table again (stress test, docs/stress-test-2026-11-14.md).
// Now: one channel and one load per table, a burst of changes is followed by one load, and a delete only counts
// when the row is one of ours.
// With app_settings features.live on (live.ts) the changes come over the trip's one Broadcast channel with the rows
// themselves, which are put in place without reading the table again. And the deck (candidates) is read by
// revision: ids and revs first, then only the cards this phone doesn't hold at that rev.
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { readCache, writeCache } from './cache'
import { liveOn, onLive, type LiveChange } from './live'

export type TableState<T> = { rows: T[]; loading: boolean; error: string; stale: boolean; updatedAt: number | null }

/** after a change, wait this long for more changes before loading */
const WAIT = 250
/** while changes keep coming, still load this often */
const MAX_WAIT = 1500
/** a screen that opens this soon after a load uses it (several screens share a table; moving between tabs) */
const FRESH = 5000
/** after the last screen closes, keep listening this long, so moving between tabs doesn't reconnect */
const LINGER = 3000

/** a change put in place is saved for offline this long after the last one */
const SAVE_WAIT = 2000
/** the deck is read by revision in pieces of this many cards; with most of it missing, in one go instead */
const PIECE = 80

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Row = Record<string, unknown>
/** the columns that name a row, where it isn't `id` */
const ROW_KEY: Record<string, string[]> = { swipes: ['candidate_id', 'user_id'], day_info: ['trip_id', 'day'], members: ['trip_id', 'user_id'], plan_state: ['trip_id'] }

/** The order the database gives (ascending, nothing last); rows that tie keep their places. */
function sorted(rows: Row[], order: string) {
  return rows.slice().sort((a, b) => {
    const x = a[order] as string | number | null | undefined
    const y = b[order] as string | number | null | undefined
    if (x == null) return y == null ? 0 : 1
    if (y == null) return -1
    return x < y ? -1 : x > y ? 1 : 0
  })
}

export class TableStore<T> {
  private state: TableState<T>
  private readonly key: string
  private subs = new Set<() => void>()
  private channel: RealtimeChannel | null = null
  private offLive: (() => void) | null = null
  private listening = false
  private saveTimer: ReturnType<typeof setTimeout> | null = null
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
    if (!this.listening) {
      this.listening = true
      // what was saved ahead for offline (ready.ts) while no screen was showing this table
      const cached = readCache<T[]>(this.key)
      if (cached && cached.at > (this.state.updatedAt ?? 0)) {
        this.haveRows = true
        this.set({ rows: cached.data, updatedAt: cached.at, loading: false })
      }
      if (liveOn()) {
        this.offLive = onLive(this.tripId, this.live)
      } else {
        this.channel = supabase
          .channel(this.key)
          .on('postgres_changes', { event: '*', schema: 'public', table: this.table, filter: `trip_id=eq.${this.tripId}` }, () => this.changed())
          // realtime can't filter deletes by column, so every delete on the table arrives, other trips' too
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: this.table }, (p) => this.deleted(p.old as Record<string, unknown>))
          .subscribe()
      }
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
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
      writeCache(this.key, this.state.rows)
    }
    if (!this.listening) return
    this.listening = false
    if (this.channel) void supabase.removeChannel(this.channel)
    this.channel = null
    this.offLive?.()
    this.offLive = null
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

  /** A change from the trip's Broadcast channel. */
  private live = (c: LiveChange | 'resync') => {
    if (c === 'resync') return void this.reload()
    if (c.t !== this.table) return
    // too many rows to carry: read the table
    if (!c.rows) return this.changed()
    this.place(c.op === 'DELETE' ? 'DELETE' : 'UPSERT', c.rows)
  }

  /** Rows this phone just saved, as the server answered the write: shown at once, with no read of the table. */
  put = (rows: T[]) => this.place('UPSERT', rows as Row[])
  /** Rows this phone just deleted (their key columns are enough). */
  remove = (rows: Partial<T>[]) => this.place('DELETE', rows as Row[])

  private place(op: 'UPSERT' | 'DELETE', changed: Row[]) {
    const key = ROW_KEY[this.table] ?? ['id']
    const same = (a: Row, b: Row) => key.every((k) => String(a[k]) === String(b[k]))
    let rows = this.state.rows as Row[]
    if (op === 'DELETE') {
      rows = rows.filter((r) => !changed.some((d) => same(r, d)))
    } else {
      rows = rows.slice()
      for (const n of changed) {
        const at = rows.findIndex((r) => same(r, n))
        if (at >= 0) rows[at] = n
        else rows.push(n)
      }
      rows = sorted(rows, this.order)
    }
    this.set({ rows: rows as T[], updatedAt: Date.now() })
    // a load in flight may have read the table before this change: it would put the old rows back, so read once more
    if (this.loading) this.again ||= 'soon'
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => writeCache(this.key, this.state.rows), SAVE_WAIT)
  }

  /**
   * The table's rows from the server. The deck is read by revision: ids and revs, then only the cards not held at
   * that rev (a card's rev goes up on every change). A phone that has the deck reads about 35 KB instead of 1.3 MB.
   */
  private async read(): Promise<{ data: Row[] | null; message: string }> {
    const all = async () => {
      const res = await supabase.from(this.table).select('*').eq('trip_id', this.tripId).order(this.order)
      return { data: res.data as Row[] | null, message: res.error?.message ?? '' }
    }
    if (this.table !== 'candidates') return all()
    const slim = await supabase.from('candidates').select('id,rev').eq('trip_id', this.tripId).order(this.order)
    // a database from before the rev column: the whole table, as before
    if (slim.error || !slim.data) return all()
    const held = new Map<string, Row>()
    for (const r of this.state.rows as Row[]) if (typeof r.rev === 'number') held.set(`${r.id}:${r.rev}`, r)
    const want = slim.data as { id: string; rev: number }[]
    const missing = want.filter((w) => !held.has(`${w.id}:${w.rev}`)).map((w) => w.id)
    if (missing.length > PIECE * 3 || missing.length > want.length * 0.6) return all()
    const fresh = new Map<string, Row>()
    for (let i = 0; i < missing.length; i += PIECE) {
      const res = await supabase.from('candidates').select('*').in('id', missing.slice(i, i + PIECE))
      if (res.error) return { data: null, message: res.error.message }
      for (const r of res.data as Row[]) fresh.set(String(r.id), r)
    }
    // a card deleted between the two reads is in neither: left out
    const rows = want.map((w) => fresh.get(w.id) ?? held.get(`${w.id}:${w.rev}`)).filter((r): r is Row => !!r)
    return { data: rows, message: '' }
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
    let data: Row[] | null = null
    let message = ''
    try {
      const res = await this.read()
      data = res.data
      message = res.message
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
