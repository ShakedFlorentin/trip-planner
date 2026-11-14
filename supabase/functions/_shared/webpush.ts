// Web Push with nothing but WebCrypto and fetch (runs in Supabase's Deno and in Node 20+ for the tests):
// the message is encrypted for the phone (RFC 8291, aes128gcm) and the request is signed with our VAPID key (RFC 8292),
// so the push service (Apple's, Google's or Mozilla's) passes it on without being able to read it.
// Tested in scripts/push-test.mjs against an independent decoder (http_ece).

export type PushSubscription = { endpoint: string; p256dh: string; auth: string }
/** The VAPID key pair: the public key as the 65-byte raw point, the private one as the 32-byte scalar, both base64url. */
export type Vapid = { publicKey: string; privateKey: string; subject: string }

const te = new TextEncoder()

export const b64u = (b: Uint8Array) => {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export const unb64u = (s: string) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0))
}
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of parts) {
    out.set(p, i)
    i += p.length
  }
  return out
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8))
}

/** The encrypted body for one phone: salt, record size, our one-time public key, then the sealed message. */
export async function encrypt(sub: PushSubscription, payload: Uint8Array, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const uaPublic = unb64u(sub.p256dh)
  const authSecret = unb64u(sub.auth)
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error('bad subscription keys')
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, pair.privateKey, 256))
  const ikm = await hkdf(authSecret, shared, concat(te.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // one record: the message, then 0x02 for "last record", no padding
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(payload, new Uint8Array([2]))))
  const rs = 4096
  const header = concat(salt, new Uint8Array([rs >>> 24, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255, 65]), asPublic)
  return concat(header, sealed)
}

/** The VAPID token for one push service (its origin), valid for 12 hours. */
export async function vapidToken(endpoint: string, vapid: Vapid, now = Math.floor(Date.now() / 1000)) {
  const pub = unb64u(vapid.publicKey)
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: vapid.privateKey, ext: true }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const part = (o: unknown) => b64u(te.encode(JSON.stringify(o)))
  const body = part({ typ: 'JWT', alg: 'ES256' }) + '.' + part({ aud: new URL(endpoint).origin, exp: now + 12 * 3600, sub: vapid.subject })
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(body)))
  return body + '.' + b64u(sig)
}

/**
 * Sends one message to one phone. 'gone' means the phone no longer takes messages on this address (the app was
 * removed, or notifications turned off) and the address should not be used again.
 */
export async function sendPush(sub: PushSubscription, message: unknown, vapid: Vapid, ttlSeconds = 12 * 3600): Promise<'ok' | 'gone' | 'failed'> {
  const body = await encrypt(sub, te.encode(JSON.stringify(message)))
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${await vapidToken(sub.endpoint, vapid)}, k=${vapid.publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
      Urgency: 'normal',
    },
    body,
  })
  await res.body?.cancel()
  if (res.ok) return 'ok'
  if (res.status === 404 || res.status === 410) return 'gone'
  console.error('push refused', new URL(sub.endpoint).host, res.status)
  return 'failed'
}

/** A new VAPID key pair, made once and kept as the function's secret (scripts/push-keys.mjs). */
export async function newVapidKeys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  return { publicKey: b64u(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))), privateKey: jwk.d! }
}
