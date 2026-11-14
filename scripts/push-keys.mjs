// Makes the notifications key pair (VAPID, see supabase/functions/_shared/webpush.ts) once. Writes both halves to the
// file given, as the notify function's secrets (supabase secrets set --env-file <file>), and prints only the public
// half, which goes into app_settings push_public_key. Keep the file out of git and delete it once the secrets are set.
// Usage: node scripts/push-keys.mjs <out.env>
import { writeFileSync } from 'node:fs'

const out = process.argv[2]
if (!out) throw new Error('usage: node scripts/push-keys.mjs <out.env>')
const b64u = (b) => Buffer.from(b).toString('base64url')
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
const pub = b64u(await crypto.subtle.exportKey('raw', pair.publicKey))
const { d } = await crypto.subtle.exportKey('jwk', pair.privateKey)
writeFileSync(out, `VAPID_PUBLIC_KEY=${pub}\nVAPID_PRIVATE_KEY=${d}\n`, { mode: 0o600 })
console.log(pub)
