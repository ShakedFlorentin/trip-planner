---
title: Service worker and updates
chapter: shell
explains:
  - page
  - keep
  - asset
  - tile
  - photo
  - comingBack
---
Web app only. The iOS app carries its files inside and has no worker (`isNative` check in `src/main.tsx`); it updates through TestFlight / App Store.

## public/sw.js
Version and precache list are filled by the build (`vite.config.ts`). Supabase (data, auth, realtime) is never touched; the app keeps its own data copy.
- `page(e, req)`: navigations are network first with `cache: 'no-cache'`. After `NAV_TIMEOUT` (4 s) the cached shell is shown at once and the request keeps running so the next open is current (this was the "friends keep the old version" bug).
- `keep(res)`: the cached shell is replaced only by html that names `assets/index-` (a hotel or train Wi-Fi login page must never become the app).
- `asset`: hashed build files come from cache (`ignoreVary: true`, because a `Vary: Origin` answer made the module script miss offline).
- `tile` and `photo`: map tiles (cap `MAX_TILES` 600) and place photos (`MAX_PHOTOS` 400), kept once seen and pre-saved by `ready.ts`. Cache names `tiles`, `photos`, `docs` survive updates; only `shell-*` caches are deleted on activate.
- Guide pages (`japan/`, `privacy/`) are served by the network as plain pages.

## Update on return (`src/main.tsx`)
On `visibilitychange` visible or `pageshow` persisted, `comingBack` asks the worker to update, and if hidden for 10 s or more, online, and the home html names a different `assets/index-*.js` than the running one, reloads, unless a field has text in it (`typing`). Unsent changes wait in the outbox.

## Known gaps
`addAll` is all-or-nothing; 1.2 MB re-download each deploy; every push to main auto-deploys (rule 6: owner publishes file by file); splash never leaves if an asset fails.

Test: `node scripts/sw-test.mjs` (fake worker scope, slow network, captive-portal page). Manual: sign-out clears Cache Storage (see [01-app-shell](01-app-shell.md)).

## Craft rules (`toogo-frontend-craft`, performance)
- **Cached shell first** (`page`, 4 s) is the "show the saved thing at once" rule on a weak signal. Keep `NAV_TIMEOUT` short; do not lengthen it.
- **Bundle:** the build makes one ~1.5 MB `index-*.js` (checked in `dist`, 2026-11-18); only `Album` is `lazy`. Leaflet (`PlacesMap`, `AlbumMap`) and rarely used sheets are in the first load. Splitting them cuts the 1.2 MB re-download per deploy that the Known gaps name. See [15-craft-gaps](15-craft-gaps.md).
- **`addAll` is all-or-nothing:** one missing asset leaves the user with no offline shell. Cache assets one by one with `Promise.allSettled`.
- **Image hints:** the worker caches `photo` once seen; the first Discover photo should be fetched early (`fetchpriority`), not lazy.
