// Scripted users for the scale test: each one signs up through an invite, creates or joins a trip, opens the app
// the way the new app does (features.live: one Broadcast channel per trip, deck by revision), then swipes every
// 3-6 s, adds a list item or an expense now and then, and reopens the app every few minutes. No AI calls.
// Groups start at the pace the sign-in limit allows (1,800 token requests an hour per IP, bursts of 30).
// A brake ends the run when the slowest 5% of small requests over the last minute take more than P95_LIMIT ms or
// more than FAIL_LIMIT of them fail.
//
// node scripts/load/loadbot.mjs <invites file> <groups> <hold minutes>       new accounts, one invite per group
// REUSE=scripts/load/accounts-p2.txt REUSE_RUN=p2 node scripts/load/loadbot.mjs - 0 <hold minutes>   existing accounts
// See scripts/load/README.md (password, network, what is measured).
import { createRequire } from 'node:module'
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs'
const require = createRequire('/home/user/trip-planner/')
const { createClient } = require('@supabase/supabase-js')

const SUPA_URL = 'https://wbofjfwbdewgnwjmcpnv.supabase.co'
const KEY = readFileSync('/home/user/trip-planner/.env', 'utf8').match(/VITE_SUPABASE_KEY=(.*)/)[1].trim()
// logs and summaries go here (not into the repo)
const DIR = (process.env.LOAD_OUT || '/tmp/toogo-load') + '/'
import { mkdirSync } from 'node:fs'
mkdirSync(DIR, { recursive: true })
// every test account uses this password; set it on the accounts first (scripts/load/README.md). Never commit it.
const PASSWORD = process.env.LOAD_PASSWORD
if (!PASSWORD || PASSWORD.length < 12) throw new Error('LOAD_PASSWORD (12+ characters) is needed: see scripts/load/README.md')
const [invFile, groupsArg, holdArg] = process.argv.slice(2)
const INVITES = invFile && invFile !== '-' ? readFileSync(invFile, 'utf8').trim().split('\n') : []
const GROUPS = process.env.REUSE ? 0 : Math.min(Number(groupsArg || 10), INVITES.length)
const HOLD_MS = Number(holdArg || 5) * 60000
const P95_LIMIT = Number(process.env.P95_LIMIT || 5000)
const FAIL_LIMIT = Number(process.env.FAIL_LIMIT || 0.05)
const SIGNINS_PER_MIN = Number(process.env.SIGNINS_PER_MIN || 24)
const RUN = process.env.RUN || 'l1'
const LOG = DIR + `metrics-${RUN}.jsonl`
const t0 = Date.now()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rnd = (a, b) => a + Math.random() * (b - a)

// ── metrics ──────────────────────────────────────────────────────────────────────────────────────────────────
const recent = [] // {at, ms, ok, kind}
const totals = { requests: 0, failed: 0, bytes: 0, byName: {}, live: { joined: 0, joinErrors: {}, msgs: 0, rowsNull: 0 }, signins: 0, signinFail: 0, bots: 0, active: 0, errors: {} }
let stopping = false
let loadPhase = false
let brake = null
function record(name, ms, ok, bytes, status) {
  totals.requests++
  if (!ok) { totals.failed++; const k = `${name} ${status}`; totals.errors[k] = (totals.errors[k] || 0) + 1 }
  totals.bytes += bytes
  const n = (totals.byName[name] ||= { n: 0, ms: 0, err: 0, bytes: 0, max: 0 })
  n.n++; n.ms += ms; n.bytes += bytes; n.max = Math.max(n.max, ms); if (!ok) n.err++
  if (!name.startsWith('fn ') && !name.startsWith('auth ')) recent.push({ at: Date.now(), ms, ok })
}
function health() {
  const now = Date.now()
  while (recent.length && recent[0].at < now - 60000) recent.shift()
  const ms = recent.map((r) => r.ms).sort((a, b) => a - b)
  const fails = recent.filter((r) => !r.ok).length
  return { n: recent.length, p50: ms[ms.length >> 1] ?? 0, p95: ms[Math.floor(ms.length * 0.95)] ?? 0, failRate: recent.length ? +(fails / recent.length).toFixed(3) : 0 }
}
setInterval(() => {
  const h = health()
  const line = { t: Math.round((Date.now() - t0) / 1000), bots: totals.bots, active: totals.active, joined: totals.live.joined, ...h, req: totals.requests, failed: totals.failed, MB: +(totals.bytes / 1e6).toFixed(1), msgs: totals.live.msgs, brake: !!brake }
  appendFileSync(LOG, JSON.stringify(line) + '\n')
  console.log(JSON.stringify(line))
  if (!brake && loadPhase && h.n >= 50 && (h.p95 > P95_LIMIT || h.failRate > FAIL_LIMIT)) {
    brake = { at: line.t, ...h, active: totals.active }
    console.log('BRAKE ' + JSON.stringify(brake))
    stopping = true
  }
}, 15000)

// a fetch that times every request and names it the way the app's would be named
function name(url, method) {
  const p = new globalThis.URL(url).pathname
  let m
  if ((m = p.match(/^\/rest\/v1\/rpc\/([^/]+)/))) return 'rpc ' + m[1]
  if ((m = p.match(/^\/rest\/v1\/([^/]+)/))) return `${method} ${m[1]}`
  if ((m = p.match(/^\/functions\/v1\/([^/]+)/))) return 'fn ' + m[1]
  if ((m = p.match(/^\/auth\/v1\/([^/?]+)/))) return 'auth ' + m[1]
  return method + ' ' + p
}
const timedFetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  const method = (init.method || 'GET').toUpperCase()
  const n = name(url, method)
  const s = Date.now()
  try {
    const r = await fetch(input, init)
    const len = Number(r.headers.get('content-length') || 0)
    record(n, Date.now() - s, r.status < 400, len, r.status)
    return r
  } catch (e) {
    record(n, Date.now() - s, false, 0, 'net')
    throw e
  }
}

// ── sign-in pacing: a token bucket under the per-IP limit ────────────────────────────────────────────────────
let tokens = 20
setInterval(() => { tokens = Math.min(25, tokens + SIGNINS_PER_MIN / 60) }, 1000)
async function signInSlot() {
  while (tokens < 1) await sleep(500)
  tokens -= 1
}

// ── one user ─────────────────────────────────────────────────────────────────────────────────────────────────
const boards = {} // group -> invite links waiting
class Bot {
  constructor(group, idx, invite) {
    this.group = group; this.idx = idx; this.invite = invite
    this.email = `toogo.load.${RUN}.g${String(group).padStart(3, '0')}.m${idx}@example.com`
    this.password = PASSWORD
    this.sb = createClient(SUPA_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: timedFetch } })
    this.deck = new Map() // id -> rev
    this.order = []
    this.votes = 0
    this.lastCouples = 0
    this.couplesTimer = null
  }
  async q(p) { const r = await p; if (r.error) throw new Error(r.error.message); return r.data }
  async signUp() {
    const { error } = await this.sb.functions.invoke('sign-up', { body: { invite: this.invite, email: this.email, password: this.password, name: `Load ${this.group}.${this.idx}` } })
    if (error) throw new Error('sign-up: ' + (error.context?.status || error.message))
    await signInSlot()
    totals.signins++
    const { data, error: e2 } = await this.sb.auth.signInWithPassword({ email: this.email, password: this.password })
    if (e2) { totals.signinFail++; throw new Error('sign-in: ' + e2.message) }
    this.uid = data.user.id
    await this.sb.from('profiles').select('*').eq('user_id', this.uid).maybeSingle()
    const now = new Date().toISOString()
    const answers = { with: ['friends'], been_to_japan: false, cities: ['tokyo', 'kyoto', 'osaka'], interest: { food: 'love', sights: 'maybe' }, never: [], loves: ['ramen'], budget: 2, pace: 'balanced' }
    await this.q(this.sb.from('profiles').upsert({ user_id: this.uid, answers, completed_at: now, updated_at: now }, { onConflict: 'user_id' }))
  }
  async create(size) {
    await this.q(this.sb.rpc('my_invite'))
    this.trip = await this.q(this.sb.rpc('create_trip', { trip_name: `Load ${this.group}`, name: `Load ${this.group}.0`, start: '2027-04-01' }))
    boards[this.group] = []
    for (let i = 1; i < size; i++) {
      const inv = await this.q(this.sb.from('invites').insert({ trip_id: this.trip }).select('code').single())
      boards[this.group].push(inv.code)
    }
  }
  async join() {
    const inv = await this.q(this.sb.rpc('my_invite'))
    const row = Array.isArray(inv) ? inv[0] : inv
    this.trip = await this.q(this.sb.rpc('join_trip', { code: row.join_code, name: `Load ${this.group}.${this.idx}` }))
  }
  // the requests the app makes when it opens on a trip (Home), the deck by revision
  async open(cold) {
    const sb = this.sb, tid = this.trip
    await Promise.all([
      sb.from('app_settings').select('key, value'),
      sb.from('members').select('*').eq('trip_id', tid),
      sb.from('trips').select('*').eq('id', tid).single(),
      sb.from('profiles').select('user_id, answers').eq('user_id', this.uid),
      sb.rpc('trip_has_baby', { tid }),
      sb.from('cities').select('*'),
    ])
    await Promise.all(['places', 'day_info', 'itinerary_items', 'bookings', 'checklist_items', 'trip_stays', 'swipes'].map((t) => sb.from(t).select('*').eq('trip_id', tid).order(t === 'day_info' ? 'day' : t === 'bookings' ? 'starts_at' : 'created_at')).concat(this.readDeck()))
    this.track(cold ? 'open' : 'screen')
  }
  async readDeck() {
    const sb = this.sb, tid = this.trip
    if (!this.deck.size) {
      const all = await sb.from('candidates').select('*').eq('trip_id', tid).order('created_at')
      for (const c of all.data ?? []) this.deck.set(c.id, c.rev)
    } else {
      const slim = await sb.from('candidates').select('id,rev').eq('trip_id', tid).order('created_at')
      const want = slim.data ?? []
      const missing = want.filter((w) => this.deck.get(w.id) !== w.rev).map((w) => w.id)
      for (let i = 0; i < missing.length; i += 80) await sb.from('candidates').select('*').in('id', missing.slice(i, i + 80))
      this.deck = new Map(want.map((w) => [w.id, w.rev]))
    }
    this.order = [...this.deck.keys()].sort(() => Math.random() - 0.5)
  }
  async discover() {
    const sb = this.sb, tid = this.trip
    const synced = await sb.rpc('sync_library', { tid })
    if (synced.data) await this.readDeck()
    await Promise.all([sb.rpc('card_interest', { tid }), sb.rpc('trip_avoids_pork_seafood', { tid })])
    this.couples()
    this.track('screen')
  }
  // asked once per run of votes: 1 s after the last, at least every 4 s
  couples() {
    if (this.couplesTimer) clearTimeout(this.couplesTimer)
    const wait = this.lastCouples ? Math.max(0, Math.min(1000, this.lastCouples + 4000 - Date.now())) : 0
    this.couplesTimer = setTimeout(() => { this.lastCouples = Date.now(); void this.sb.rpc('trip_place_couples', { tid: this.trip }) }, wait)
  }
  track(n) {
    void this.sb.rpc('track', { batch: { visitor: this.uid, session: `${RUN}-${this.group}-${this.idx}`, events: [{ name: n, props: {}, at: new Date().toISOString() }] } })
  }
  listen() {
    return new Promise((resolve) => {
      const ch = this.sb.channel('live:' + this.trip, { config: { private: true } })
      ch.on('broadcast', { event: 'change' }, (m) => {
        totals.live.msgs++
        const c = m.payload
        if (c?.t === 'swipes') this.couples()
        if (c && c.rows === null) {
          totals.live.rowsNull++
          if (c.t === 'candidates') void this.readDeck()
          else void this.sb.from(c.t).select('*').eq('trip_id', this.trip)
        }
      })
      let done = false
      ch.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') { if (!done) { totals.live.joined++; done = true; resolve(true) } }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const k = status + ' ' + (err?.message || '').slice(0, 60)
          totals.live.joinErrors[k] = (totals.live.joinErrors[k] || 0) + 1
          if (!done) { done = true; resolve(false) }
        }
      })
      this.channel = ch
      setTimeout(() => { if (!done) { done = true; totals.live.joinErrors.timeout = (totals.live.joinErrors.timeout || 0) + 1; resolve(false) } }, 20000)
    })
  }
  async swipe() {
    const id = this.order.shift()
    if (!id) return this.readDeck()
    const liked = Math.random() < 0.55
    const r = await this.sb.from('swipes').upsert({ trip_id: this.trip, candidate_id: id, user_id: this.uid, liked, skipped: false, look_ms: Math.round(rnd(800, 9000)), photos_seen: 1, opened: false }).select()
    this.votes++
    this.couples()
    return r
  }
  async listItem() {
    await this.sb.from('checklist_items').insert({ trip_id: this.trip, list: 'todo', text: `Load item ${this.votes}`, assignee: null, couple: null, each: false }).select()
  }
  async expense() {
    const members = (await this.sb.from('members').select('user_id').eq('trip_id', this.trip)).data ?? []
    await this.sb.from('expenses').insert({ trip_id: this.trip, kind: 'expense', title: 'Load dinner', amount: Math.round(rnd(2000, 9000)), currency: 'JPY', paid_by: this.uid, split_among: members.map((m) => m.user_id), spent_on: '2027-04-02', created_by: this.uid }).select()
  }
  async life(endAt) {
    totals.active++
    let nextReopen = Date.now() + rnd(150000, 300000)
    let nextTrack = Date.now() + rnd(20000, 40000)
    while (!stopping && Date.now() < endAt) {
      await sleep(rnd(3000, 6000))
      if (stopping) break
      try {
        const r = Math.random()
        if (r < 0.88) await this.swipe()
        else if (r < 0.95) await this.listItem()
        else await this.expense()
        if (Date.now() > nextTrack) { this.track('screen'); nextTrack = Date.now() + rnd(20000, 40000) }
        if (Date.now() > nextReopen) { await this.open(false); await this.discover(); nextReopen = Date.now() + rnd(150000, 300000) }
      } catch (e) {
        totals.errors['bot ' + e.message.slice(0, 60)] = (totals.errors['bot ' + e.message.slice(0, 60)] || 0) + 1
      }
    }
    totals.active--
  }
}

// ── setup: accounts and trips, at the sign-in pace, nobody swiping yet ─────────────────────────────────────────
async function setup(g, size) {
  const bots = []
  try {
    const creator = new Bot(g, 0, INVITES[g])
    bots.push(creator); totals.bots++
    await creator.signUp()
    await creator.create(size)
    await creator.open(true)
    await creator.listen()
    await creator.discover()
    const joiners = boards[g].map((code, i) => new Bot(g, i + 1, code))
    for (const b of joiners) bots.push(b), totals.bots++
    await Promise.all(joiners.map(async (b) => { await b.signUp(); await b.join(); await b.open(true); await b.listen(); await b.discover() }))
  } catch (e) {
    const k = 'setup ' + e.message.slice(0, 80)
    totals.errors[k] = (totals.errors[k] || 0) + 1
  }
  return bots.filter((b) => b.trip && b.uid)
}

const sizes = Array.from({ length: GROUPS }, (_, i) => [2, 3, 3, 4][i % 4])
const users = sizes.reduce((a, b) => a + b, 0)
const WAVE = Number(process.env.WAVE || 40)
const WAVE_MS = Number(process.env.WAVE_MS || 90000)
console.log(`run ${RUN}: ${GROUPS} groups, ${users} users; setup ~${Math.round(users / SIGNINS_PER_MIN)} min, then waves of ${WAVE} active users every ${WAVE_MS / 1000} s, hold ${HOLD_MS / 60000} min at the end`)
const phase = (p) => { appendFileSync(LOG, JSON.stringify({ t: Math.round((Date.now() - t0) / 1000), phase: p }) + '\n'); console.log('PHASE ' + p) }

const REUSE = process.env.REUSE
async function back(line) {
  const [, g, m] = line.match(/^g(\d+)\.m(\d)$/)
  const b = new Bot(Number(g), Number(m), null)
  b.email = `toogo.load.${process.env.REUSE_RUN}.${line}@example.com`
  b.password = PASSWORD
  totals.bots++
  try {
    await signInSlot()
    totals.signins++
    const { data, error } = await b.sb.auth.signInWithPassword({ email: b.email, password: b.password })
    if (error) { totals.signinFail++; throw new Error('sign-in: ' + error.message) }
    b.uid = data.user.id
    const mine = await b.q(b.sb.from('members').select('trip_id').eq('user_id', b.uid))
    b.trip = mine[0]?.trip_id
    if (!b.trip) throw new Error('no trip')
    await b.open(true); await b.listen(); await b.discover()
    return [b]
  } catch (e) {
    const k = 'back ' + e.message.slice(0, 80)
    totals.errors[k] = (totals.errors[k] || 0) + 1
    return []
  }
}
phase(REUSE ? 'sign-in' : 'setup')
const pending = []
if (REUSE) {
  for (const line of readFileSync(REUSE, 'utf8').trim().split('\n')) {
    if (stopping) break
    pending.push(back(line))
    await sleep((1 / SIGNINS_PER_MIN) * 60000 * 0.95)
  }
}
for (let g = 0; g < GROUPS && !stopping && !REUSE; g++) {
  pending.push(setup(g, sizes[g]))
  await sleep((sizes[g] / SIGNINS_PER_MIN) * 60000 * 0.9)
}
const ready = (await Promise.all(pending)).flat()
console.log(`setup done: ${ready.length} users ready, ${totals.live.joined} live channels`)
await sleep(60000) // let the database settle after the trips' first syncs

phase('load')
loadPhase = true
const lives = []
const endAt = Date.now() + Math.ceil(ready.length / WAVE) * WAVE_MS + HOLD_MS
// waves mixed across trips, so each wave wakes people in many trips
const order = ready.slice().sort((a, b) => a.idx - b.idx || a.group - b.group)
for (let i = 0; i < order.length && !stopping; i += WAVE) {
  for (const b of order.slice(i, i + WAVE)) lives.push(b.life(endAt))
  appendFileSync(LOG, JSON.stringify({ t: Math.round((Date.now() - t0) / 1000), wave: i / WAVE + 1, activeTarget: Math.min(i + WAVE, order.length) }) + '\n')
  const until = Date.now() + WAVE_MS
  while (Date.now() < until && !stopping) await sleep(1000)
}
await Promise.all(lives)
for (const b of ready) if (b.channel) void b.sb.removeChannel(b.channel)
const h = health()
writeFileSync(DIR + `summary-${RUN}.json`, JSON.stringify({ run: RUN, groups: GROUPS, users, ready: ready.length, seconds: Math.round((Date.now() - t0) / 1000), brake, health: h, totals }, null, 1))
console.log('DONE ' + JSON.stringify({ brake, requests: totals.requests, failed: totals.failed, errors: totals.errors, live: totals.live }))
process.exit(0)
