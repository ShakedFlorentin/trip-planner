// Free search pages (roadmap step 6): plain HTML made at build time from the library cards (data/pages/cards.json,
// npm run pages:data) and the city areas (supabase/functions/_shared/areas.ts). No AI and no app code per view.
// Per city, in Hebrew (/japan/<city>/) and English (/en/japan/<city>/): all places, food without pork or seafood, and
// where to stay; plus an index, sitemap.xml and robots.txt. Runs after `vite build` and writes into dist/.
import { build } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DIST = join(root, 'dist')
const SITE = 'https://shakedflorentin.github.io/trip-planner/'
// a city page needs this many places, or it is too thin to be worth a search result
const MIN_CARDS = 8

const load = async (file) => {
  const out = await build({ entryPoints: [join(root, file)], bundle: true, write: false, format: 'esm', platform: 'node' })
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
}
const { AREAS, areaOf } = await load('supabase/functions/_shared/areas.ts')
const { AFFILIATE_ID } = await load('src/affiliate.ts')
const { privacyPage } = await import('./privacy.mjs')
const { exported, cards } = JSON.parse(readFileSync(join(root, 'data/pages/cards.json'), 'utf8'))

// id → names, the AREAS key (Hebrew), and the tile photo (public/cities/<photo>.webp)
const CITIES = {
  tokyo: { he: 'טוקיו', en: 'Tokyo', areas: 'טוקיו', photo: 'tokyo' },
  kyoto: { he: 'קיוטו', en: 'Kyoto', areas: 'קיוטו', photo: 'kyoto' },
  osaka: { he: 'אוסקה', en: 'Osaka', areas: 'אוסקה', photo: 'osaka' },
  nara: { he: 'נארה', en: 'Nara', areas: 'נארה', photo: 'nara' },
  hakone: { he: 'הקונה', en: 'Hakone', areas: 'הקונה', photo: 'hakone' },
  nikko: { he: 'ניקו', en: 'Nikko', areas: 'ניקו', photo: 'nikko' },
  kobe: { he: 'קובה', en: 'Kobe', areas: 'קובה', photo: 'kobe' },
  hiroshima: { he: 'הירושימה', en: 'Hiroshima', areas: 'הירושימה', photo: 'hiroshima' },
  kanazawa: { he: 'קנאזאווה', en: 'Kanazawa', areas: 'קנאזאווה', photo: 'kanazawa' },
  takayama: { he: 'טקאיאמה', en: 'Takayama', areas: 'טקאיאמה', photo: 'takayama' },
  fukuoka: { he: 'פוקואוקה', en: 'Fukuoka', areas: 'פוקואוקה', photo: 'fukuoka' },
  nagoya: { he: 'נגויה', en: 'Nagoya', areas: 'נגויה', photo: 'nagoya' },
  sapporo: { he: 'סאפורו', en: 'Sapporo', areas: 'סאפורו', photo: 'sapporo' },
  okinawa: { he: 'אוקינאווה', en: 'Okinawa', areas: 'אוקינאווה', photo: 'okinawa' },
  daytrip: { he: 'טיולי יום', en: 'Day trips', areas: null, photo: 'fuji' },
}
const KINDS = [
  ['food', 'מסעדות', 'Restaurants'],
  ['cafe', 'בתי קפה וקינוחים', 'Cafés and desserts'],
  ['sight', 'אטרקציות', 'Sights'],
  ['experience', 'חוויות', 'Experiences'],
  ['shopping', 'קניות', 'Shopping'],
  ['nightlife', 'ברים וחיי לילה', 'Bars and nightlife'],
]
const EATS = new Set(['food', 'cafe', 'nightlife'])
const KOSHER = {
  friendly: ['רוב התפריט בלי חזיר ופירות ים', 'Most of the menu has no pork or seafood'],
  options: ['יש מנות בלי חזיר ופירות ים', 'Some dishes without pork or seafood'],
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const pick = (c, field, en) => (en ? c.en?.[field] ?? null : c[field] ?? null)
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])

// ---------------------------------------------------------------- page frame

const CSS = `
:root{--accent:#bc002d;--ink:#1b1b1f;--muted:#6b6b73;--card:#f3f2f7;--bg:#fff;--line:#e4e3ea}
@media (prefers-color-scheme:dark){:root{--ink:#f2f2f5;--muted:#a3a3ad;--card:#1d1d22;--bg:#111114;--line:#2c2c33}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Rubik,Arial,sans-serif}
a{color:var(--accent)}main,header,footer{max-width:860px;margin:0 auto;padding:0 16px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:14px;padding-bottom:6px}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:20px;color:var(--ink);text-decoration:none}
.brand img{width:30px;height:30px}.lang{font-size:14px}
h1{font-size:30px;line-height:1.2;margin:18px 0 6px}h2{font-size:22px;margin:30px 0 10px}
.lead{color:var(--muted);margin:0 0 14px}.crumbs{font-size:14px;color:var(--muted);margin-top:8px}
.cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:999px;margin:6px 0 4px}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.tabs a{padding:6px 12px;border-radius:999px;background:var(--card);color:var(--ink);text-decoration:none;font-size:14px}
.tabs a[aria-current]{background:var(--ink);color:var(--bg)}
.place{background:var(--card);border-radius:18px;padding:14px 16px;margin:10px 0}
.place h3{margin:0;font-size:18px}.ja{display:block;color:var(--muted);font-weight:400;font-size:14px}
.meta{color:var(--muted);font-size:14px;margin:2px 0 6px}.place p{margin:6px 0}
.badge{display:inline-block;font-size:13px;padding:2px 9px;border-radius:999px;background:rgba(188,0,45,.1);color:var(--accent);margin:2px 0}
.links{font-size:14px;display:flex;gap:14px;flex-wrap:wrap;margin-top:6px}
.cities{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:14px 0}
.city{position:relative;display:block;border-radius:18px;overflow:hidden;aspect-ratio:16/9;background:#333;color:#fff;text-decoration:none}
.city img{width:100%;height:100%;object-fit:cover;opacity:.8}.city span{position:absolute;inset-inline-start:14px;bottom:10px;font-size:22px;font-weight:700;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.city small{display:block;font-size:13px;font-weight:400}
.area{background:var(--card);border-radius:18px;padding:14px 16px;margin:10px 0}.area h3{margin:0 0 4px}
.note{font-size:14px;color:var(--muted);border-top:1px solid var(--line);margin-top:32px;padding-top:12px}
footer{font-size:13px;color:var(--muted);padding-bottom:40px}footer a{color:var(--muted)}
.legal h1{margin-top:40px}.legal li{margin:6px 0}.legal ul{padding-inline-start:22px}
`

const T = {
  he: {
    dir: 'rtl', lang: 'he', other: 'en', otherLabel: 'English',
    cta: 'תכננו את הטיול ב-Toogo, בחינם',
    home: 'יפן', maps: 'במפות', site: 'אתר', all: 'כל המקומות', food: 'בלי חזיר ופירות ים', stay: 'איפה לישון',
    note: 'המידע נאסף ונבדק בזהירות, אבל שעות, מחירים ופרטי תפריט משתנים. כדאי לבדוק לפני שיוצאים. "בלי חזיר ופירות ים" הוא לא כשרות ולא תעודה: הוא עוזר למי שלא אוכל חזיר ופירות ים.',
    updated: 'עודכן',
    privacy: 'פרטיות ותנאי שימוש',
  },
  en: {
    dir: 'ltr', lang: 'en', other: 'he', otherLabel: 'עברית',
    cta: 'Plan your trip in Toogo, free',
    home: 'Japan', maps: 'Maps', site: 'Website', all: 'All places', food: 'No pork or seafood', stay: 'Where to stay',
    note: 'Collected and checked with care, but hours, prices and menus change: check before you go. "No pork or seafood" is not kosher certification; it helps people who don\'t eat pork or seafood.',
    updated: 'Updated',
    privacy: 'Privacy and terms',
  },
}

const pathOf = (lang, ...parts) => (lang === 'en' ? 'en/' : '') + ['japan', ...parts].join('/') + '/'
const rel = (fromDepth) => '../'.repeat(fromDepth)

// legal: the privacy page, with no "plan your trip" button and no note about places
function page({ lang, path, title, description, h1, lead, body, crumbs, alt, jsonld, city, legal = false }) {
  const t = T[lang]
  const depth = path.split('/').filter(Boolean).length
  const up = rel(depth)
  const altPath = alt ?? path.replace(/^en\//, '')
  const otherPath = lang === 'he' ? 'en/' + altPath : altPath
  return `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="alternate" hreflang="${t.lang}" href="${SITE}${path}">
<link rel="alternate" hreflang="${t.other}" href="${SITE}${otherPath}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${path}">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#bc002d">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<header>
<a class="brand" href="${up}${pathOf(lang)}"><img src="${up}icon.svg" alt="" width="30" height="30">Toogo</a>
<a class="lang" href="${up}${otherPath}" hreflang="${t.other}">${t.otherLabel}</a>
</header>
<main${legal ? ' class="legal"' : ''}>
${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}
<h1>${esc(h1)}</h1>
${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
${legal ? '' : `<a class="cta" href="${up}?${city && city !== 'daytrip' ? `city=${city}&` : ''}lang=${lang}">${t.cta}</a>`}
${body}
${legal ? '' : `<p class="note">${esc(t.note)} ${t.updated}: ${exported}.</p>`}
</main>
<footer>© Toogo · <a href="${up}${lang === 'en' ? 'en/' : ''}privacy/">${t.privacy}</a></footer>
</body>
</html>
`
}

// ---------------------------------------------------------------- pieces

const mapsLink = (c, city) =>
  c.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name} ${CITIES[city].en} Japan`)}`

function placeCard(c, lang, city, { food = false } = {}) {
  const t = T[lang]
  const en = lang === 'en'
  const area = areaOf(CITIES[city].areas, c.area)
  const areaName = area ? (en ? area.en : area.he) : c.area
  const what = pick(c, EATS.has(c.category) ? 'serves' : 'todo', en) || pick(c, 'hype', en)
  const tip = pick(c, 'tip', en)
  const dishes = list(pick(c, 'dishes', en))
  const k = c.kosher && KOSHER[c.kosher]
  const kNote = pick(c, 'kosher_note', en)
  const price = pick(c, 'price', en) || c.price
  return `<article class="place">
<h3>${esc(c.name)}${c.name_ja ? `<span class="ja" lang="ja">${esc(c.name_ja)}</span>` : ''}</h3>
<div class="meta">${[areaName, price].filter(Boolean).map(esc).join(' · ')}</div>
${what ? `<p>${esc(what)}</p>` : ''}
${dishes.length ? `<p class="meta">${esc(dishes.join(' · '))}</p>` : ''}
${tip ? `<p>${esc(tip)}</p>` : ''}
${(food || EATS.has(c.category)) && k ? `<span class="badge">${esc(k[en ? 1 : 0])}</span>${kNote ? `<p class="meta">${esc(kNote)}</p>` : ''}` : ''}
<div class="links"><a href="${esc(mapsLink(c, city))}" rel="noopener" target="_blank">${t.maps}</a>${
    c.website_url ? `<a href="${esc(c.website_url)}" rel="noopener nofollow" target="_blank">${t.site}</a>` : ''
  }</div>
</article>`
}

const tabs = (lang, city, current) => {
  const t = T[lang]
  const items = [['', t.all], ['food-no-pork-seafood', t.food]]
  if (CITIES[city].areas && (AREAS[CITIES[city].areas] ?? []).some((a) => a.stay !== false)) items.push(['where-to-stay', t.stay])
  return `<nav class="tabs">${items
    .map(([slug, label]) => `<a href="${'../'.repeat(current ? 1 : 0)}${slug ? slug + '/' : ''}"${slug === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`)
    .join('')}</nav>`
}

const itemList = (name, items) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  itemListElement: items.slice(0, 50).map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: { '@type': EATS.has(c.category) ? 'Restaurant' : 'TouristAttraction', name: c.name, ...(c.address ? { address: c.address } : {}) },
  })),
})

function hotelSearch(area) {
  const q = new URLSearchParams({ ss: area.search })
  if (AFFILIATE_ID) q.set('aid', AFFILIATE_ID)
  return 'https://www.booking.com/searchresults.html?' + q
}

// ---------------------------------------------------------------- pages

const pages = []
const write = (path, html) => {
  const dir = join(DIST, path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  pages.push(path)
}

const byCity = new Map()
for (const c of cards) {
  if (!CITIES[c.city]) continue
  if (!byCity.has(c.city)) byCity.set(c.city, [])
  byCity.get(c.city).push(c)
}
const shown = [...byCity].filter(([, l]) => l.length >= MIN_CARDS).sort((a, b) => b[1].length - a[1].length)

for (const lang of ['he', 'en']) {
  const t = T[lang]
  const en = lang === 'en'
  const nameOf = (id) => (en ? CITIES[id].en : CITIES[id].he)
  const home = (depth) => `<a href="${'../'.repeat(depth)}">${t.home}</a>`

  // index
  write(
    pathOf(lang),
    page({
      lang,
      path: pathOf(lang),
      title: en ? 'Japan travel guide: places, food and where to stay by city | Toogo' : 'מדריך ליפן: מקומות, אוכל ואיפה לישון בכל עיר | Toogo',
      description: en
        ? `${cards.length} places in ${shown.length} Japanese cities, with what to order, what to know and where to stay.`
        : `${cards.length} מקומות ב-${shown.length} ערים ביפן: מה להזמין, מה כדאי לדעת ואיפה לישון.`,
      h1: en ? 'Japan, city by city' : 'יפן, עיר אחרי עיר',
      lead: en
        ? 'Places worth going to, food without pork or seafood, and the best areas to sleep in. In Toogo you plan it together, swipe on places and get a day-by-day plan.'
        : 'מקומות ששווה להגיע אליהם, אוכל בלי חזיר ופירות ים, והאזורים הכי טובים ללינה. ב-Toogo מתכננים ביחד, מצביעים על מקומות ומקבלים תוכנית יום-יום.',
      body: `<div class="cities">${shown
        .map(([id, l]) => `<a class="city" href="${id}/"><img src="${rel(en ? 2 : 1)}cities/${CITIES[id].photo}.webp" alt="" loading="lazy"><span>${esc(nameOf(id))}<small>${l.length} ${en ? 'places' : 'מקומות'}</small></span></a>`)
        .join('')}</div>`,
    }),
  )

  for (const [id, list0] of shown) {
    const city = nameOf(id)
    const base = pathOf(lang, id)
    const sorted = [...list0].sort((a, b) => Number(!!b.local_pick) - Number(!!a.local_pick) || a.name.localeCompare(b.name))

    // all places
    const sections = KINDS.map(([k, he, enName]) => {
      const l = sorted.filter((c) => c.category === k)
      return l.length ? `<h2>${esc(en ? enName : he)} (${l.length})</h2>${l.map((c) => placeCard(c, lang, id)).join('\n')}` : ''
    }).join('\n')
    write(
      base,
      page({
        lang,
        path: base,
        title: en ? `${city}: ${list0.length} places worth going to | Toogo` : `${city}: ${list0.length} מקומות ששווה להגיע אליהם | Toogo`,
        description: en
          ? `Restaurants, cafés, sights and shopping in ${city}, with what to order and what to know before you go.`
          : `מסעדות, בתי קפה, אטרקציות וקניות ב${city}: מה להזמין ומה כדאי לדעת לפני שהולכים.`,
        h1: en ? `${city}: places worth going to` : `${city}: מקומות ששווה להגיע אליהם`,
        crumbs: home(1),
        body: tabs(lang, id, '') + sections,
        jsonld: itemList(city, sorted),
        city: id,
      }),
    )

    // food without pork or seafood
    const food = sorted
      .filter((c) => EATS.has(c.category) && (c.kosher === 'friendly' || c.kosher === 'options'))
      .sort((a, b) => Number(b.kosher === 'friendly') - Number(a.kosher === 'friendly'))
    if (food.length >= 3) {
      const path = base + 'food-no-pork-seafood/'
      write(
        path,
        page({
          lang,
          path,
          title: en ? `Food without pork or seafood in ${city} | Toogo` : `אוכל בלי חזיר ופירות ים ב${city} | Toogo`,
          description: en
            ? `${food.length} places to eat in ${city} where you can order without pork or seafood, with what to ask for.`
            : `${food.length} מקומות לאכול ב${city} שאפשר להזמין בהם בלי חזיר ופירות ים, ומה לבקש.`,
          h1: en ? `Food without pork or seafood in ${city}` : `אוכל בלי חזיר ופירות ים ב${city}`,
          lead: en
            ? 'First the places where most of the menu has none, then places with good dishes without them. Fish with fins and scales counts as fine.'
            : 'קודם מקומות שרוב התפריט בהם בלי, ואחריהם מקומות שיש בהם מנות טובות בלי. דג עם סנפירים וקשקשים נחשב בסדר.',
          crumbs: `${home(2)} › <a href="../">${esc(city)}</a>`,
          body: tabs(lang, id, 'food-no-pork-seafood') + food.map((c) => placeCard(c, lang, id, { food: true })).join('\n'),
          jsonld: itemList(en ? `Food without pork or seafood in ${city}` : `אוכל בלי חזיר ופירות ים ב${city}`, food),
        city: id,
        }),
      )
    }

    // where to stay
    const areas = (AREAS[CITIES[id].areas] ?? []).filter((a) => a.stay !== false)
    if (areas.length) {
      const near = new Map(areas.map((a) => [a.key, sorted.filter((c) => areaOf(CITIES[id].areas, c.area)?.key === a.key)]))
      const ordered = [...areas].sort((a, b) => Number(!!b.pick) - Number(!!a.pick) || near.get(b.key).length - near.get(a.key).length)
      const path = base + 'where-to-stay/'
      write(
        path,
        page({
          lang,
          path,
          title: en ? `Where to stay in ${city}: the best areas | Toogo` : `איפה לישון ב${city}: האזורים הכי טובים | Toogo`,
          description: en
            ? `The ${areas.length} best areas to sleep in ${city}, their main station and what is close by.`
            : `${areas.length} האזורים הכי טובים ללינה ב${city}, התחנה הראשית שלהם ומה קרוב אליהם.`,
          h1: en ? `Where to stay in ${city}` : `איפה לישון ב${city}`,
          lead: en
            ? 'Sleep close to the places you want to see. In Toogo the plan picks the area for you from the places your group liked.'
            : 'כדאי לישון קרוב למקומות שרוצים לראות. ב-Toogo התוכנית בוחרת את האזור בשבילכם, לפי המקומות שהקבוצה אהבה.',
          crumbs: `${home(2)} › <a href="../">${esc(city)}</a>`,
          city: id,
          body:
            tabs(lang, id, 'where-to-stay') +
            ordered
              .map((a) => {
                const l = near.get(a.key)
                const top = l.slice(0, 4).map((c) => c.name)
                return `<section class="area">
<h3>${esc(en ? a.en : a.he)}${!en && a.en !== a.he ? `<span class="ja">${esc(a.en)}</span>` : ''}</h3>
<div class="meta">${en ? 'Station' : 'תחנה'}: ${esc(a.station)}${a.pick ? ` · ${en ? 'A good first base' : 'בסיס ראשון טוב'}` : ''}</div>
<p>${l.length ? esc(en ? `${l.length} of the places on our list are here${top.length ? `, including ${top.join(', ')}` : ''}.` : `${l.length} מהמקומות ברשימה שלנו נמצאים כאן${top.length ? `, ביניהם ${top.join(', ')}` : ''}.`) : esc(en ? 'Quieter for places, but easy to get around from.' : 'פחות מקומות מהרשימה, אבל נוח לצאת ממנו.')}</p>
<div class="links"><a href="${esc(hotelSearch(a))}" rel="noopener sponsored" target="_blank">${en ? `Hotels in ${a.en}` : `מלונות ב${a.he}`}</a></div>
</section>`
              })
              .join('\n'),
        }),
      )
    }
  }
}

// privacy and terms (scripts/pages/privacy.mjs), in both languages
for (const lang of ['he', 'en']) {
  const path = (lang === 'en' ? 'en/' : '') + 'privacy/'
  write(path, page({ lang, path, legal: true, ...privacyPage(lang) }))
}

// the cards a visitor swipes before signing in (src/guest.ts): one file per city, the same public fields as the pages
// plus what the deck needs to fit them to the questionnaire (search words, the baby line). No photos, no hours
mkdirSync(join(DIST, 'guest'), { recursive: true })
const guestIndex = {}
for (const [id, list0] of byCity) {
  const rows = list0.map((c) => ({ ...c, en: c.en ?? null }))
  writeFileSync(join(DIST, 'guest', `${id}.json`), JSON.stringify(rows))
  guestIndex[id] = rows.length
}
writeFileSync(join(DIST, 'guest', 'index.json'), JSON.stringify({ exported, cities: guestIndex }))

// sitemap and robots
const today = exported
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE}</loc></url>
${pages.map((p) => `<url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`,
)
if (!existsSync(join(DIST, 'robots.txt'))) writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`)
console.log(`pages: ${pages.length} (${shown.length} cities, Hebrew and English), sitemap.xml`)
