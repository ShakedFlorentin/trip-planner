// Changes made with no connection: a swipe, a ticked task, a new expense. Every write to a table goes through
// outboxFetch (the Supabase client's fetch). When there is no network it is kept here, in order, the app answers as if
// it was saved, and screens show it at once (useTripTable lays the pending changes over the rows it has). When the
// phone is back online the changes are sent in the order they were made, then the screens reload.
// Only table writes wait here; AI lookups, translation and file uploads need a connection.

type Pending = {
  id: string
  table: string
  method: 'POST' | 'PATCH' | 'DELETE'
  /** the PostgREST path and query, e.g. "/rest/v1/swipes?on_conflict=..." */
  path: string
  prefer: string | null
  body: string | null
  at: number
  /** who made the change: only that account sends it or sees it */
  uid?: string
  /** the server refused it (400, 403, 404): kept for the person to retry or discard, never sent again by itself */
  failed?: number
  /** a send was already tried, so the server may have it: a retry must not make a second copy */
  tried?: boolean
}

const KEY = 'outbox'
const WRITES = new Set(['POST', 'PATCH', 'DELETE'])
// tables whose rows have a uuid `id`: a row added offline gets its id here, so a later edit or delete of it, made
// before it reached the server, points at the same row. Not `reports`: the database lets the app write only its
// text columns there, so a row id made here would be refused
const HAS_ID = new Set(['itinerary_items', 'places', 'expenses', 'checklist_items', 'bookings', 'essentials', 'candidates', 'trip_stays'])
// the columns that make a row unique, for laying an upsert over the rows on screen
// tables with a unique rule besides the row id (supabase/sql baseline): a booking with the same confirmation, a place or
// a card with the same name in a trip
const NATURAL_UNIQUE = new Set(['bookings', 'places', 'candidates'])
const ROW_KEY: Record<string, string[]> = { swipes: ['trip_id', 'candidate_id', 'user_id'], day_info: ['trip_id', 'day'] }

const listeners = new Set<() => void>()
const changed = () => listeners.forEach((f) => f())

function read(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}
function write(list: Pending[]) {
  const text = JSON.stringify(list)
  try {
    localStorage.setItem(KEY, text)
  } catch {
    // storage full: the saved screen copies (cache:*) can be fetched again, a waiting change cannot, so they go first.
    // The remembered account id stays: it is what lets the app open offline
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('cache:') && k !== 'cache:userId') localStorage.removeItem(k)
      localStorage.setItem(KEY, text)
    } catch {
      // still full or blocked: the change stays in memory until the app closes
    }
  }
  memory = list
  changed()
}
let memory: Pending[] = read()
// the signed-in account; changes another account left on this device stay put until it is back
let owner: string | null = null
const mine = () => (owner ? memory.filter((p) => p.uid === owner) : [])
const waiting = () => mine().filter((p) => !p.failed)

/** The changes still waiting for a connection or refused by the server (`failed`). */
export const pending = mine

/** The changes the server refused. */
export const failedChanges = () => mine().filter((p) => p.failed)

/** Clears the failed mark so the change is sent again, then sends. */
export function retryFailed(id?: string) {
  write(memory.map((p) => (p.failed && p.uid === owner && (!id || p.id === id) ? { ...p, failed: undefined } : p)))
  return flush()
}

/** Gives up on a refused change. */
export function discardFailed(id: string) {
  write(memory.filter((p) => !(p.id === id && p.failed)))
}

/** Who is signed in (null once signed out). Changes left from before accounts were remembered go to the first one. */
export function setOutboxUser(uid: string | null) {
  if (uid === owner) return
  owner = uid
  if (uid && memory.some((p) => !p.uid)) write(memory.map((p) => (p.uid ? p : { ...p, uid })))
  else changed()
  if (uid && navigator.onLine) flush()
}

/** Calls back whenever the waiting changes do (queued, sent). */
export function onOutbox(f: () => void) {
  listeners.add(f)
  return () => listeners.delete(f)
}

const tableOf = (url: URL) => url.pathname.match(/\/rest\/v1\/([^/]+)$/)?.[1] ?? null

/** The answer PostgREST would have given, made up from the request itself. */
function madeUp(method: string, body: string | null, prefer: string | null, accept: string | null) {
  if (method === 'POST' && prefer?.includes('return=representation') && body) {
    const rows = JSON.parse(body)
    const list = Array.isArray(rows) ? rows : [rows]
    const one = accept?.includes('vnd.pgrst.object')
    return new Response(JSON.stringify(one ? list[0] : list), { status: 201, headers: { 'Content-Type': 'application/json' } })
  }
  return new Response(null, { status: method === 'POST' ? 201 : 204 })
}

/** The body of an insert with a row id made here, once, before the first send: every retry then carries the same id. */
function withIds(table: string, method: string, body: string | null) {
  if (method !== 'POST' || !body || !HAS_ID.has(table)) return body
  try {
    const rows = JSON.parse(body)
    const withId = (r: Record<string, unknown>) => ({ id: crypto.randomUUID(), ...r })
    return JSON.stringify(Array.isArray(rows) ? rows.map(withId) : withId(rows))
  } catch {
    return body
  }
}

function enqueue(url: URL, method: string, body: string | null, headers: Headers, tried: boolean) {
  const table = tableOf(url)!
  const item: Pending = {
    id: crypto.randomUUID(),
    table,
    method: method as Pending['method'],
    path: url.pathname + url.search,
    prefer: headers.get('Prefer'),
    body,
    at: Date.now(),
    uid: owner ?? undefined,
    tried: tried || undefined,
  }
  write([...memory, item])
  scheduleRetry()
  return madeUp(method, body, item.prefer, headers.get('Accept'))
}

const offline = (e: unknown) => e instanceof TypeError || (e instanceof DOMException && e.name === 'AbortError')

let base = ''
let apiKey = ''
let token: () => Promise<string | null> = async () => null
let flushing: Promise<void> | null = null
// when a send last failed for lack of network: a new change then goes straight to the queue instead of first waiting
// out another timeout
let lastBroke = 0

/** The ids a change touches (row id in the query, or in the body of an insert), or its table when it has none. */
function touches(p: Pending) {
  const keys = new Set<string>()
  for (const m of p.path.matchAll(/[?&]id=(?:eq|in)\.\(?([^&)]*)/g)) m[1].split(',').forEach((x) => keys.add(x))
  try {
    for (const r of p.body ? [].concat(JSON.parse(p.body)) : []) if ((r as { id?: string })?.id) keys.add((r as { id: string }).id)
  } catch {
    // not JSON: fall back to the table
  }
  if (!keys.size || !HAS_ID.has(p.table)) keys.add(p.table)
  return keys
}

/**
 * Sends the waiting changes in order. A lost connection, 401, 408 or 429 stops and tries again later. A 5xx holds
 * back only later changes to the same row (an edit must not outrun its insert); others still go. A 409 "duplicate key"
 * on the id of an insert we made means an earlier send arrived: done; any other 409 (a missing parent row, another
 * unique column) is a refusal. A refusal (400, 403, 404) is kept, marked failed, for the
 * person to retry or discard. Only an unrelated later change goes on past a held-back one.
 */
export function flush() {
  if (flushing || !waiting().length || !base) return flushing ?? Promise.resolve()
  flushing = (async () => {
    let sent = 0
    const held = new Set<string>()
    for (const item of waiting()) {
      const auth = await Promise.race([token().catch(() => null), pause(TOKEN_MS).then(() => null)])
      // only ever with the token of the account that made the change
      if (!auth || subOf(auth) !== item.uid) break
      if (!memory.some((p) => p.id === item.id && !p.failed)) continue
      const keys = touches(item)
      if ([...keys].some((k) => held.has(k))) continue
      const headers: Record<string, string> = { apikey: apiKey, 'Content-Type': 'application/json' }
      if (auth) headers.Authorization = `Bearer ${auth}`
      let prefer = item.prefer ? item.prefer.replace('return=representation', 'return=minimal') : null
      // a retry of an insert: if the first send did arrive, the server skips the copy instead of failing. Not for a row
      // with our id in a table that has another unique rule (the same booking twice): skipping would hide that clash
      // too, and the 409 on our id already says the first send arrived
      const clashable = NATURAL_UNIQUE.has(item.table) && ownIds(item).length > 0
      if (item.tried && item.method === 'POST' && !clashable && !prefer?.includes('resolution=')) prefer = (prefer ? prefer + ',' : '') + 'resolution=ignore-duplicates'
      if (prefer) headers.Prefer = prefer
      write(memory.map((p) => (p.id === item.id && !p.tried ? { ...p, tried: true } : p)))
      let res: Response
      try {
        res = await writeFetch(base + item.path, { method: item.method, headers, body: item.body ?? undefined })
      } catch {
        lastBroke = Date.now()
        break
      }
      // signed out or the login lapsed: keep it for when the person is back
      if (res.status === 401 || res.status === 408 || res.status === 429) break
      if (res.status >= 500) {
        keys.forEach((k) => held.add(k))
        continue
      }
      let text = ''
      if (!res.ok) text = await Promise.race([res.text().catch(() => ''), pause(2000).then(() => '')])
      if (res.status === 409 && arrivedBefore(item, text)) {
        // the first send got through
      } else if (!res.ok) {
        console.warn('outbox: refused', item.table, item.method, res.status, text)
        write(memory.map((p) => (p.id === item.id ? { ...p, failed: res.status } : p)))
        keys.forEach((k) => held.add(k))
        continue
      }
      write(memory.filter((p) => p.id !== item.id))
      sent++
    }
    if (sent) {
      retryStep = 0
      lastBroke = 0
      window.dispatchEvent(new Event('outbox-sent'))
    }
  })().finally(() => {
    flushing = null
    scheduleRetry()
  })
  return flushing
}

/** The account a session token belongs to. */
function subOf(jwt: string) {
  try {
    return (JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub as string) ?? null
  } catch {
    return null
  }
}

const realFetch: typeof fetch = (...args) => fetch(...args)

// "online" with no data (a train, an eSIM with a bar and nothing behind it) never answers: a write that waits longer
// than this is treated like no connection, kept in the queue and sent again later. Only table writes: an AI lookup
// or an upload can take longer and is left alone
const WRITE_MS = 8000
const TOKEN_MS = 5000
const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const writeFetch: typeof fetch = (input, init = {}) => {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), WRITE_MS)
  const outer = init.signal
  if (outer) {
    if (outer.aborted) ctl.abort()
    else outer.addEventListener('abort', () => ctl.abort(), { once: true })
  }
  return realFetch(input, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer))
}

// while changes wait and the app is open, try again after 15, 30, then every 60 seconds
const RETRY_S = [15, 30, 60]
let retryStep = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
function scheduleRetry() {
  if (retryTimer !== undefined || !waiting().length) return
  retryTimer = setTimeout(() => {
    retryTimer = undefined
    if (!waiting().length) return void (retryStep = 0)
    if (navigator.onLine) void flush()
    else scheduleRetry()
  }, RETRY_S[Math.min(retryStep++, RETRY_S.length - 1)] * 1000)
}

/** The row ids an insert carries from us (every row has one), or an empty list. */
function ownIds(p: Pending) {
  if (p.method !== 'POST' || !p.body) return []
  try {
    const rows = [].concat(JSON.parse(p.body)) as { id?: unknown }[]
    const ids = rows.map((r) => r?.id)
    return ids.every((x) => typeof x === 'string') ? (ids as string[]) : []
  } catch {
    return []
  }
}

/**
 * A 409 that only says an earlier send arrived: "duplicate key" (23505) on the primary key, with our own row id. When
 * the answer names the key, it has to be our id. When it names nothing, it counts only in a table with no other unique
 * rule, where it can't mean anything else.
 */
function arrivedBefore(p: Pending, text: string) {
  const ids = ownIds(p)
  if (!ids.length) return false
  try {
    const e = JSON.parse(text) as { code?: string; message?: string; details?: string }
    if (e.code !== '23505') return false
    if (e.details) {
      const hit = /^Key \(id\)=\(([^)]+)\)/.exec(e.details)
      return !!hit && ids.includes(hit[1])
    }
    return /_pkey"/.test(e.message ?? '') || !NATURAL_UNIQUE.has(p.table)
  } catch {
    return false
  }
}

/** The Supabase client's fetch: table writes wait in the outbox when there is no network. */
export const outboxFetch: typeof fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const method = (init.method ?? 'GET').toUpperCase()
  if (!WRITES.has(method) || !tableOf(url)) return realFetch(input, init)
  const headers = new Headers(init.headers)
  // a change made after others that are still waiting goes after them
  if (waiting().length && navigator.onLine && Date.now() - lastBroke > 15_000) await flush()
  const body = withIds(tableOf(url)!, method, typeof init.body === 'string' ? init.body : null)
  if (!navigator.onLine || waiting().length) return enqueue(url, method, body, headers, false)
  try {
    return await writeFetch(input, body === init.body ? init : { ...init, body })
  } catch (e) {
    if (offline(e)) return enqueue(url, method, body, headers, true)
    throw e
  }
}

/** Points the outbox at the project and the session, and sends what waits whenever the phone is back online. */
export function startOutbox(url: string, key: string, getToken: () => Promise<string | null>) {
  base = url.replace(/\/$/, '')
  apiKey = key
  token = getToken
  const go = () => {
    retryStep = 0
    return navigator.onLine && flush()
  }
  window.addEventListener('online', go)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && go())
  setTimeout(go, 1500)
}

// ---- laying the waiting changes over rows on screen

/** PostgREST filters in a query string: col=eq.x, col=in.(a,b), col=is.null. */
function matcher(search: string) {
  const tests: ((r: Record<string, unknown>) => boolean)[] = []
  for (const [col, v] of new URLSearchParams(search)) {
    if (['select', 'on_conflict', 'columns', 'order', 'limit'].includes(col)) continue
    const m = v.match(/^(eq|in|is)\.(.*)$/)
    if (!m) continue
    const [, op, arg] = m
    if (op === 'eq') tests.push((r) => String(r[col]) === arg)
    if (op === 'is') tests.push((r) => (arg === 'null' ? r[col] == null : String(r[col]) === arg))
    if (op === 'in') {
      const set = new Set(arg.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')))
      tests.push((r) => set.has(String(r[col])))
    }
  }
  return (r: Record<string, unknown>) => tests.length > 0 && tests.every((f) => f(r))
}

/** The rows of a table as they will be once the waiting changes are sent. */
export function withPending<T>(table: string, rows: T[]): T[] {
  const waiting = mine().filter((p) => p.table === table && !p.failed)
  if (!waiting.length) return rows
  let out = rows as Record<string, unknown>[]
  for (const p of waiting) {
    const q = p.path.includes('?') ? p.path.slice(p.path.indexOf('?')) : ''
    if (p.method === 'DELETE') {
      const hit = matcher(q)
      out = out.filter((r) => !hit(r))
      continue
    }
    const body = p.body ? JSON.parse(p.body) : null
    if (p.method === 'PATCH') {
      const hit = matcher(q)
      out = out.map((r) => (hit(r) ? { ...r, ...body } : r))
      continue
    }
    const keys = new URLSearchParams(q).get('on_conflict')?.split(',') ?? ROW_KEY[table] ?? ['id']
    const upsert = p.prefer?.includes('resolution=merge-duplicates')
    for (const row of Array.isArray(body) ? body : [body]) {
      const at = out.findIndex((r) => keys.every((k) => row[k] !== undefined && String(r[k]) === String(row[k])))
      if (at >= 0 && upsert) out = out.map((r, i) => (i === at ? { ...r, ...row } : r))
      else if (at < 0) out = [...out, { created_at: new Date(p.at).toISOString(), ...row }]
    }
  }
  return out as T[]
}
