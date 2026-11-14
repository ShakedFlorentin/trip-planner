// Offline support: the app shell and static files are cached; Supabase (data, auth, realtime) is never touched,
// because the app keeps its own copy of the data. Paths are relative to this file, so it works under /<repo>/.
// The build (vite.config.ts) fills in the file list and version below.
const VERSION = '/*VERSION*/dev'
const PRECACHE = /*PRECACHE*/[]
const SHELL = 'shell-' + VERSION
const TILES = 'tiles'
// room for the places' own area each day (src/ready.ts saves today's and tomorrow's) on top of whatever was viewed
const MAX_TILES = 600
// place photos: our storage (cards) and Google's (media.json). Kept once seen, and saved ahead by src/ready.ts
const PHOTOS = 'photos'
const MAX_PHOTOS = 400
const NAV_TIMEOUT = 4000

const url = (p) => new URL(p, self.registration.scope).href

self.addEventListener('install', (e) => {
  // 'reload' skips the browser's HTTP cache so a fresh deploy is never precached half-stale
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(url(p), { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  // only old shells go: 'tiles', 'photos' and the page's saved booking documents live on
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const u = new URL(req.url)
  if (u.hostname.endsWith('tile.openstreetmap.org') || (u.hostname === 'server.arcgisonline.com' && u.pathname.includes('/tile/')))
    e.respondWith(tile(req))
  else if (isPhoto(u)) e.respondWith(photo(req))
  else if (u.origin !== self.location.origin) return
  // the guide pages (japan/…, en/japan/…) and privacy/ (built by scripts/pages) are plain pages: the network serves them as is
  else if (req.mode === 'navigate' && /\/(en\/)?(japan|privacy)(\/|$)/.test(u.pathname)) return
  else if (req.mode === 'navigate') e.respondWith(page(req))
  else e.respondWith(asset(e, req, u))
})

// Network first, so a deploy shows up on the next open; the cached page when the network is down or hangs
// (an eSIM with a bar of signal but no data would otherwise leave a blank screen for a minute).
async function page(req) {
  const cache = await caches.open(SHELL)
  try {
    const res = await Promise.race([
      // past the HTTP cache: GitHub Pages lets it keep the page for 10 minutes, so a deploy could take that long
      // to reach the phone. 'no-cache' revalidates, a tiny 304 when nothing changed. A navigation request can't
      // take options, so fetch its URL
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }),
      new Promise((_, no) => setTimeout(() => no(new Error('slow')), NAV_TIMEOUT)),
    ])
    // only the app's own page is kept as the offline copy (a link to some other page must not replace it)
    if (res.ok && new URL(req.url).pathname === new URL(url('./')).pathname) cache.put(url('./'), res.clone())
    return res
  } catch {
    return (await cache.match(url('./'))) || Response.error()
  }
}

// Hashed build files never change, so the cache wins; media.json and the icons are served from the cache and
// refreshed in the background for next time.
async function asset(e, req, u) {
  const cache = await caches.open(SHELL)
  // ignoreVary: a server that answers with "Vary: Origin" made the saved copy miss the module script's request (it
  // carries an Origin header, the precache request did not), so the app could not start offline. The files are
  // the same either way: a build's file names change with its content
  const hit = await cache.match(req, { ignoreVary: true })
  if (hit && u.pathname.includes('/assets/')) return hit
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone())
      return res
    })
    .catch(() => undefined)
  if (hit) {
    e.waitUntil(fresh)
    return hit
  }
  return (await fresh) || Response.error()
}

// A place's photo: a public file in our Supabase storage, or one of Google's (lh3) from media.json
function isPhoto(u) {
  return (u.hostname.endsWith('.supabase.co') && u.pathname.startsWith('/storage/v1/object/public/')) || u.hostname === 'lh3.googleusercontent.com'
}

// Photos: the saved copy first (they never change under the same address), else the network, kept for next time.
// Asked for with CORS so the copy is a real one, not an opaque blob that counts for megabytes; a host that refuses
// CORS still shows the photo, just not saved.
async function photo(req) {
  const cache = await caches.open(PHOTOS)
  const hit = await cache.match(req.url)
  if (hit) return hit
  try {
    const res = await fetch(req.url, { mode: 'cors' })
    if (res.ok) {
      await cache.put(req.url, res.clone())
      const keys = await cache.keys()
      for (const k of keys.slice(0, Math.max(0, keys.length - MAX_PHOTOS))) await cache.delete(k)
    }
    return res
  } catch {
    try {
      return await fetch(req)
    } catch {
      return Response.error()
    }
  }
}

// Map tiles: whatever was viewed once works offline, up to MAX_TILES (oldest dropped first).
async function tile(req) {
  const cache = await caches.open(TILES)
  const hit = await cache.match(req.url)
  if (hit) return hit
  try {
    // <img> tiles arrive as opaque no-cors responses, which count for megabytes of quota each; OSM and Esri allow CORS
    const res = await fetch(req.url, { mode: 'cors' })
    if (res.ok) {
      await cache.put(req.url, res.clone())
      const keys = await cache.keys()
      for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TILES))) await cache.delete(k)
    }
    return res
  } catch {
    return Response.error()
  }
}

// Notifications (src/push.ts, supabase/functions/notify): the message comes encrypted for this phone; show it, and
// open the app where it points when it is tapped, in the open window if there is one.
self.addEventListener('push', (e) => {
  let m = {}
  try {
    m = e.data ? e.data.json() : {}
  } catch {
    m = { title: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(m.title || 'Toogo', {
      body: m.body || '',
      tag: m.tag || undefined,
      icon: url('icon-192.png'),
      badge: url('icon-192.png'),
      data: { url: m.url || self.registration.scope },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = e.notification.data?.url || self.registration.scope
  // only our own pages: a message can't send the phone anywhere else
  const to = new URL(target, self.registration.scope)
  const href = to.href.startsWith(self.registration.scope) ? to.href : self.registration.scope
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope))
      if (open) {
        open.postMessage({ type: 'open', url: href })
        return open.focus()
      }
      return self.clients.openWindow(href)
    }),
  )
})
