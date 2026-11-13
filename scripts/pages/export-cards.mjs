// Saves the live library cards the public pages and the visitors' Discover are built from: data/pages/cards.json
// (npm run pages:data).
// Only switched-on cards that we wrote (none added from a trip), and only fields fit for a public page: no photos (their
// licences aren't settled), no Instagram/TikTok or source links, no opening hours (they go stale; the app re-checks).
// Reads through Supabase's Management API: needs SUPABASE_ACCESS_TOKEN (a personal token, sbp_…), or a session whose
// network proxy adds it.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REF = 'wbofjfwbdewgnwjmcpnv'
const out = join(dirname(fileURLToPath(import.meta.url)), '../../data/pages/cards.json')
const sql = `
  select id, name, name_ja, city, area, category, price, hype, reality, tip, serves, dishes, todo, special, highlights,
         time_needed, kosher, kosher_note, audience, baby_notes, address, maps_url, website_url, tabelog_score,
         google_score, local_pick, verdict, baby_block, tags,
         en - 'plan_line' - 'baby_block' as en
    from public.place_library
   where active and added_from_trip is null
   order by city, category, name`
// without a token, a placeholder in the token's format: this session's network proxy puts the real one in its place
const token = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_' + '0'.repeat(40)
const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ query: sql }),
})
if (!r.ok) throw new Error(`export failed: ${r.status} ${await r.text()}`)
const rows = await r.json()
writeFileSync(out, JSON.stringify({ exported: new Date().toISOString().slice(0, 10), cards: rows }) + '\n')
console.log(`${rows.length} cards → data/pages/cards.json`)
