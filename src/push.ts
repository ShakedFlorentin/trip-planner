import { supabase } from './supabase'
import { settings } from './settings'
import { isEn } from './i18n'
import { isNative } from './native'
import { track } from './track'

/**
 * Notifications (roadmap step 13, supabase/sql/2026-11-14-push.sql, supabase/functions/notify). Web push: on the
 * website and on the app added to the home screen (on an iPhone only there, iOS 16.4 and later). The App Store app
 * has no web push; it gets Apple's push service later, with the Apple licence. Behind app_settings features.push and
 * the public key in push_public_key.
 *
 * Asked at a moment that says what it is for (PushAsk in views/Swipe.tsx): after liking places on a shared trip, or
 * right after a match. At most twice, a week apart; Settings can turn it on or off at any time.
 */
export type PushState = 'on' | 'off' | 'blocked' | 'home-screen' | 'unsupported'

const ASK_KEY = 'pushAsks'
const DAY = 86_400_000

const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const browserCan = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const unb64u = (s: string) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0))
}
const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => !!a && a.byteLength === b.length && new Uint8Array(a).every((x, i) => x === b[i])

async function current() {
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** Where this phone stands: on, off, blocked in the phone's settings, needs the home screen (iPhone), or no way. */
export async function pushState(): Promise<PushState> {
  const s = settings()
  if (!s.features.push || !s.push_public_key || isNative) return 'unsupported'
  if (ios() && !standalone()) return 'home-screen'
  if (!browserCan()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'
  try {
    return (await current()) ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

async function save(sub: PushSubscription) {
  const j = sub.toJSON()
  const { error } = await supabase.rpc('push_subscribe', { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_lang: isEn ? 'en' : 'he' })
  return !error
}

/** Asks the phone for permission and registers it. Has to run from a tap (iPhone allows the question only then). */
export async function enablePush(from: string): Promise<PushState> {
  if (!browserCan()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    track('push_refused', { from })
    return permission === 'denied' ? 'blocked' : 'off'
  }
  try {
    const key = unb64u(settings().push_public_key)
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    // a subscription made with an older key can't receive: replace it
    if (sub && !sameKey(sub.options.applicationServerKey, key)) {
      await sub.unsubscribe()
      sub = null
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    if (!(await save(sub))) return 'off'
    track('push_on', { from })
    return 'on'
  } catch (e) {
    console.error('push subscribe failed', e)
    return 'off'
  }
}

export async function disablePush(): Promise<PushState> {
  try {
    const sub = await current()
    if (sub) {
      await supabase.rpc('push_unsubscribe', { p_endpoint: sub.endpoint })
      await sub.unsubscribe()
    }
  } catch (e) {
    console.error('push unsubscribe failed', e)
  }
  track('push_off')
  return 'off'
}

let synced = false
/** Once per open: tells the server this phone's address again, under whoever is signed in now, in the app's language. */
export async function syncPush() {
  if (synced || (await pushState()) !== 'on') return
  synced = true
  const sub = await current()
  if (sub && !sameKey(sub.options.applicationServerKey, unb64u(settings().push_public_key))) return void enablePush('key')
  if (sub) await save(sub)
}

/** After this phone's swipe made a match: the others who liked it hear about it (the server checks it all again). */
export function notifyMatch(candidateId: string) {
  if (!settings().features.push) return
  void supabase.functions.invoke('notify', { body: { kind: 'match', candidate_id: candidateId } }).catch(() => {})
}

type Asks = { at: number[] }
const readAsks = (): Asks => {
  try {
    const v = JSON.parse(localStorage.getItem(ASK_KEY) ?? '') as Asks
    return Array.isArray(v?.at) ? v : { at: [] }
  } catch {
    return { at: [] }
  }
}

/** Whether to offer notifications now: possible here, not on yet, never answered "no" in the phone, asked under twice, a week apart. */
export async function mayAskForPush(now = Date.now()) {
  if ((await pushState()) !== 'off' || Notification.permission !== 'default') return false
  const { at } = readAsks()
  return at.length < 2 && (!at.length || now - at[at.length - 1] > 7 * DAY)
}

export function markPushAsked(now = Date.now()) {
  try {
    localStorage.setItem(ASK_KEY, JSON.stringify({ at: [...readAsks().at, now] }))
  } catch {
    // private mode: it may ask again next time
  }
}
