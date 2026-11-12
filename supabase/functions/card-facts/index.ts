// Fills a new swipe card's planning facts (hours, closed days, visit length, best time, one Hebrew line) when it
// arrives without them, e.g. a place added from the Ptitim map. Called by the database (trigger card_needs_facts via
// pg_net, with the planner token) right after the card is inserted, so the trip planner never has to look anything
// up: it only reads the card. One Claude lookup per card; the library card is filled too, for every other trip.
// Also re-checks a card whose facts are older than six months when its place is matched into a trip (trigger
// place_recheck_facts): only the opening hours, the weekly closing days and whether the place closed for good.
import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { lookUp, recheck, type PlaceInfo } from './facts.ts'

type Card = PlaceInfo & {
  id: string
  trip_id: string
  library_id: string | null
  lat: number | null
  address: string | null
  facts_at: string | null
  en: Record<string, unknown> | null
  tags: string[] | null
  sources: string[] | null
  opens: string | null
  closes: string | null
  closed_weekdays: number[] | null
}

// facts older than this are re-checked when the place is matched (the same number is in the trigger's condition)
const STALE_DAYS = 180
// a place that closed for good is closed on every weekday: the planner then gives it no day, with no rule of its own
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const edge = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const body = (await req.json().catch(() => null)) as { candidate_id?: unknown } | null
  const cid = typeof body?.candidate_id === 'string' && UUID.test(body.candidate_id) ? body.candidate_id : null
  if (!cid) return json({ error: 'candidate_id missing' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // only the database calls this: it sends the planner token
  const token = req.headers.get('x-plan-token')
  const { data: expected } = await admin.rpc('get_planner_token')
  if (!token || token !== expected) return json({ error: 'bad token' }, 401)

  const work = fill(admin, cid, token)
  edge?.waitUntil(work)
  return json(await work)
})

async function fill(admin: SupabaseClient, cid: string, token: string) {
  const { data: c } = await admin
    .from('candidates')
    .select('id,trip_id,library_id,name,name_ja,city,area,category,lat,address,tip,baby_notes,hype,reality,time_needed,facts_at,en,tags,sources,opens,closes,closed_weekdays')
    .eq('id', cid)
    .maybeSingle<Card>()
  if (!c) return { skipped: 'no card' }

  const key = Deno.env.get('ANTHROPIC_API_KEY') || ((await admin.rpc('get_anthropic_key')).data as string | null) || undefined
  if (c.facts_at) {
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (c.facts_at.slice(0, 10) > cutoff) return { skipped: 'has facts' }
    return refresh(admin, new Anthropic({ apiKey: key }), c, cutoff, token)
  }
  const f = await lookUp(admin, new Anthropic({ apiKey: key }), c)
  if (!f) return { failed: true }
  const columns = {
    opens: f.opens,
    closes: f.closes,
    closed_weekdays: f.closed_weekdays,
    closed_dates: f.closed_dates,
    open_dates: f.open_dates,
    best_time: f.best_time,
    visit_mins: f.hours ? Math.round(f.hours * 60) : null,
    booking: f.booking,
    plan_line: f.line_he,
    baby_block: f.baby_he,
    facts_at: new Date().toISOString().slice(0, 10),
    facts_sure: true,
  }
  // the English plan line goes into the card's English text, next to whatever English it already has
  const english = { plan_line: f.line_en, baby_block: f.baby_en }
  await admin
    .from('candidates')
    .update({
      ...columns,
      en: { ...(c.en ?? {}), ...english },
      ...(c.address == null && f.address ? { address: f.address } : {}),
      // search words for a card that came without them (e.g. from the Ptitim map)
      ...(!c.tags?.length && f.tags.length ? { tags: f.tags } : {}),
      // coordinates are kept in the backend only, for the planner's distances and the map pins
      ...(c.lat == null && f.lat != null ? { lat: f.lat, lng: f.lng } : {}),
    })
    .eq('id', cid)
  // the library card it came from: every other trip's copy gets it on its next sync
  if (c.library_id) {
    const { data: lib } = await admin.from('place_library').select('en').eq('id', c.library_id).maybeSingle<{ en: Record<string, unknown> | null }>()
    await admin
      .from('place_library')
      .update({ ...columns, address: f.address, en: { ...(lib?.en ?? {}), ...english }, ...(f.tags.length ? { tags: f.tags } : {}) })
      .eq('id', c.library_id)
      .is('facts_at', null)
  }
  // a card already matched waits in the plan on defaults: plan again with the real hours
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/plan-trip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-plan-token': token },
    body: JSON.stringify({ trip_id: c.trip_id }),
  }).catch(() => null)
  return { filled: c.name }
}

/**
 * Re-checks a card whose facts are older than STALE_DAYS: the hours, the weekly closing days and whether the place
 * closed for good. What was not found stays as it is. The card's date moves to today whenever the check ran, an
 * answer that could not be read included, so a place nothing is found for is not paid for again on every match; a
 * call that failed leaves the card as it is. A library card another trip's re-check already refreshed is copied
 * instead, with no call.
 */
async function refresh(admin: SupabaseClient, client: Anthropic, c: Card, cutoff: string, token: string) {
  const replan = () =>
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/plan-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-plan-token': token },
      body: JSON.stringify({ trip_id: c.trip_id }),
    }).catch(() => null)
  if (c.library_id) {
    const { data: lib } = await admin
      .from('place_library')
      .select('opens,closes,closed_weekdays,facts_at')
      .eq('id', c.library_id)
      .maybeSingle<{ opens: string | null; closes: string | null; closed_weekdays: number[] | null; facts_at: string | null }>()
    if (lib?.facts_at && lib.facts_at.slice(0, 10) > cutoff) {
      await admin
        .from('candidates')
        .update({ opens: lib.opens, closes: lib.closes, closed_weekdays: lib.closed_weekdays, facts_at: lib.facts_at })
        .eq('id', c.id)
      await replan()
      return { copied: c.name }
    }
  }
  const r = await recheck(admin, client, c)
  if (!r) return { failed: true }
  const wasClosed = (c.closed_weekdays ?? []).length === 7
  const columns = {
    ...(r.status === 'closed'
      ? { closed_weekdays: EVERY_DAY }
      : {
          ...(r.opens && r.closes ? { opens: r.opens, closes: r.closes } : {}),
          // a card marked closed for good that is found open again loses the mark even when the days were not found
          ...(r.closed_weekdays ? { closed_weekdays: r.closed_weekdays } : r.status === 'open' && wasClosed ? { closed_weekdays: [] } : {}),
        }),
    facts_at: new Date().toISOString().slice(0, 10),
  }
  await admin.from('candidates').update(columns).eq('id', c.id)
  // closed for good goes on this trip's card only: one search result must not close a place for every trip, so each
  // trip that matches it checks for itself. What else was found goes to the library card too, unless another trip's
  // re-check got there first: every other trip's copy gets it on its next sync
  if (c.library_id && r.status !== 'closed') await admin.from('place_library').update(columns).eq('id', c.library_id).lte('facts_at', cutoff)
  // the place is already in the plan on the old hours: plan again
  await replan()
  return { rechecked: c.name, status: r.status, opens: r.opens, closes: r.closes, closed_weekdays: r.closed_weekdays, searches: r.searches }
}
