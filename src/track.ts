import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { settings } from './settings'
import { lang } from './i18n'

/**
 * Usage counting (supabase/sql/2026-11-13-events.sql): how people move through the app, so we can see where they stop.
 * Our own table, no outside tool. An event is a name and a few plain values; never anything a person typed. A random
 * id for this device (made here, kept in localStorage) ties a visit before sign-in to the account made after it.
 * Events wait in memory and go in small batches every few seconds, and when the app goes to the background.
 * app_settings features.counting = false stops sending (and the server ignores them too); so does the person's own
 * switch in Settings ("Help improve Toogo"), kept on this device.
 */

type Props = Record<string, string | number | boolean | null>
type Ev = { name: string; props: Props; at: string }

const uuid = (): string => {
  try {
    return crypto.randomUUID()
  } catch {
    // older browsers: a random v4 id by hand
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 3) | 8).toString(16)
    })
  }
}

function deviceId(): string {
  try {
    const v = localStorage.getItem('vid')
    if (v && /^[0-9a-f-]{36}$/.test(v)) return v
    const id = uuid()
    localStorage.setItem('vid', id)
    return id
  } catch {
    return uuid()
  }
}

const visitor = deviceId()
const session = uuid()
const MAX = 100
let queue: Ev[] = []
let timer: ReturnType<typeof setTimeout> | undefined
let sending = false
/** The person's own choice in Settings: on unless they turned it off on this device. */
export function countingOn(): boolean {
  try {
    return localStorage.getItem('counting') !== 'off'
  } catch {
    return true
  }
}

export function setCounting(on: boolean) {
  try {
    if (on) localStorage.removeItem('counting')
    else localStorage.setItem('counting', 'off')
  } catch {
    // private mode: the choice lasts until the app closes
  }
  // turned off: what was waiting is not sent either
  if (!on) queue = []
}

// the app on a developer's machine counts nothing
const off = () => import.meta.env.DEV || !settings().features.counting || !countingOn()

/** Counts one event. Values are short plain facts (a screen's name, a number), never what someone wrote. */
export function track(name: string, props: Props = {}) {
  if (off()) return
  queue.push({ name, props, at: new Date().toISOString() })
  if (queue.length > MAX) queue = queue.slice(-MAX)
  later(4000)
}

function later(ms: number) {
  if (!timer) timer = setTimeout(flush, ms)
}

async function flush() {
  timer = undefined
  if (sending || !queue.length || off()) return
  if (!navigator.onLine) return later(30_000)
  sending = true
  const batch = queue.splice(0, 30)
  let failed = false
  try {
    const { error } = await supabase.rpc('track', { batch: { visitor, session, events: batch } })
    failed = !!error
  } catch {
    failed = true
  }
  sending = false
  if (failed) {
    // back in line for a later try; the oldest go first when there are too many
    queue = [...batch, ...queue].slice(-MAX)
    return later(30_000)
  }
  if (queue.length) later(1000)
}

/** Where this open came from: a guide page (?city=), an invite, a shared plan, or the site that linked here. */
function source(): Props {
  const q = new URLSearchParams(location.search)
  let ref: string | null = null
  try {
    const h = document.referrer ? new URL(document.referrer).hostname : ''
    ref = h && h !== location.hostname ? h : null
  } catch {
    // no referrer
  }
  const from = q.get('city') ? 'guide' : q.get('invite') ? 'invite' : q.get('share') ? 'shared_plan' : ref ? 'link' : 'direct'
  return { from, city: q.get('city')?.slice(0, 20) ?? null, ref }
}

let opened = false
/** Once per open: where it came from, the language, iPhone app or website, and whether it was installed to the home screen. */
export function trackOpen() {
  if (opened) return
  opened = true
  let installed = false
  try {
    installed = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  } catch {
    // no media queries
  }
  track('open', {
    ...source(),
    lang,
    app: Capacitor.isNativePlatform() ? 'ios' : 'web',
    installed,
    version: String(import.meta.env.VITE_BUILD ?? 'dev').slice(0, 40),
    width: Math.round(window.innerWidth),
  })
}

// errors the app did not catch: the message and where, at most 5 an open (they help find what breaks on real phones)
let errors = 0
function onError(msg: string, where: string) {
  if (errors >= 5 || /ResizeObserver loop/.test(msg)) return
  errors++
  track('error', { msg: msg.slice(0, 200), where: where.slice(0, 120) })
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => onError(String(e.message ?? e.error ?? 'error'), `${(e.filename ?? '').split('/').pop()}:${e.lineno ?? 0}`))
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | undefined
    onError(String(r?.message ?? r ?? 'rejection'), 'promise')
  })
  // going to the background or closing: send what is waiting
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      clearTimeout(timer)
      void flush()
    }
  })
}
