// Notifications (roadmap step 13, supabase/sql/2026-11-14-push.sql). The app calls this right after its own swipe made a
// match; the others who liked that place get "it's a match with <name>", with the day it went into the plan when it
// did. Everything is checked here, not taken from the caller: that they are on the trip, that they liked the place, and
// that it is a match (the database's match_place made a place of it). Each person hears about a match once.
// Behind app_settings features.push. Keys: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (scripts/push-keys.mjs).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { featureOn } from '../_shared/settings.ts'
import { sendPush, type Vapid } from '../_shared/webpush.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SITE = Deno.env.get('APP_URL') ?? 'https://shakedflorentin.github.io/trip-planner/'
// how many people one person's swipes may notify in an hour
const PER_HOUR = 40

type Lang = 'he' | 'en'
function matchMessage(lang: Lang, who: string | null, place: string, day: number | null) {
  if (lang === 'en')
    return {
      title: who ? `It's a match with ${who}` : "It's a match",
      body: day ? `${place} is in your plan, on day ${day}` : `${place} is on your places list`,
    }
  return {
    title: who ? `מאצ׳ עם ${who}` : 'מאצ׳',
    body: day ? `${place} נכנס לתוכנית, ביום ${day}` : `${place} נוסף למקומות שלכם`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: auth } = await user.auth.getUser()
  if (!auth.user) return json({ error: 'not signed in' }, 401)
  const me = auth.user.id

  const body = (await req.json().catch(() => null)) as { kind?: unknown; candidate_id?: unknown } | null
  const cid = typeof body?.candidate_id === 'string' && UUID.test(body.candidate_id) ? body.candidate_id : null
  if (body?.kind !== 'match' || !cid) return json({ error: 'bad request' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  if (!(await featureOn(admin, 'push', false))) return json({ ok: true, sent: 0, off: true })
  const pub = Deno.env.get('VAPID_PUBLIC_KEY')
  const priv = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!pub || !priv) {
    console.error('VAPID keys missing')
    return json({ ok: true, sent: 0, off: true })
  }
  const vapid: Vapid = { publicKey: pub, privateKey: priv, subject: SITE }

  const { data: c } = await admin.from('candidates').select('id, trip_id, name').eq('id', cid).maybeSingle()
  if (!c) return json({ error: 'not found' }, 404)
  const { data: members } = await admin.from('members').select('user_id, display_name').eq('trip_id', c.trip_id)
  const mine = (members ?? []).find((m) => m.user_id === me)
  if (!mine) return json({ error: 'not a member' }, 403)

  const { data: votes } = await admin.from('swipes').select('user_id, liked, skipped').eq('candidate_id', cid)
  const liked = (votes ?? []).filter((v) => v.liked && !v.skipped).map((v) => v.user_id as string)
  if (!liked.includes(me)) return json({ ok: true, sent: 0, reason: 'not liked' })
  // a match is what match_place made a place of (it removes that place again when the match is undone)
  const { data: place } = await admin.from('places').select('id').eq('trip_id', c.trip_id).eq('candidate_id', cid).limit(1).maybeSingle()
  if (!place) return json({ ok: true, sent: 0, reason: 'no match' })
  const { data: item } = await admin.from('itinerary_items').select('day').eq('place_id', place.id).order('day').limit(1).maybeSingle()

  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await admin.from('notifications_sent').select('user_id', { count: 'exact', head: true }).eq('sent_by', me).gte('at', since)
  if ((count ?? 0) >= PER_HOUR) return json({ error: 'too many' }, 429)

  const onTrip = new Set((members ?? []).map((m) => m.user_id))
  const others = liked.filter((u) => u !== me && onTrip.has(u))
  if (!others.length) return json({ ok: true, sent: 0 })
  // claim each person's "told" row first: only the ones newly claimed are sent, so two calls never tell anyone twice
  const { data: claimed } = await admin
    .from('notifications_sent')
    .upsert(others.map((u) => ({ user_id: u, kind: 'match', ref: cid, sent_by: me })), { onConflict: 'user_id,kind,ref', ignoreDuplicates: true })
    .select('user_id')
  const to = (claimed ?? []).map((r) => r.user_id as string)
  if (!to.length) return json({ ok: true, sent: 0 })

  const { data: subs } = await admin.from('push_subscriptions').select('endpoint, user_id, p256dh, auth, lang').in('user_id', to).is('off_at', null)
  const who = mine.display_name?.trim() || null
  const go = item?.day ? `?go=plan&day=${item.day}&trip=${c.trip_id}` : `?go=places&trip=${c.trip_id}`
  let sent = 0
  await Promise.all(
    (subs ?? []).map(async (s) => {
      const text = matchMessage(s.lang === 'en' ? 'en' : 'he', who, c.name, item?.day ?? null)
      const r = await sendPush(s, { ...text, tag: 'match-' + cid, url: SITE + go }, vapid).catch((e) => {
        console.error('push error', e instanceof Error ? e.message : e)
        return 'failed' as const
      })
      const now = new Date().toISOString()
      if (r === 'ok') {
        sent++
        await admin.from('push_subscriptions').update({ used_at: now }).eq('endpoint', s.endpoint)
      } else if (r === 'gone') await admin.from('push_subscriptions').update({ off_at: now }).eq('endpoint', s.endpoint)
    }),
  )
  return json({ ok: true, sent })
})
