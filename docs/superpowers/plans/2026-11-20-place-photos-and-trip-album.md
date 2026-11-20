# Place photos in the review + trip album — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Travellers add place photos from the day-after review; the card shows approved traveller photos in "Earlier travellers"; the iOS app gets a private trip album (list + map) built from the phone's photo library.

**Architecture:** Place photos reuse the existing `photo_submissions` pipeline (upload → admin approval via `review-photo`) with one new read RPC and a source-aware approval rule. The album is iOS-only: a small Swift plugin (`TripPhotos`) lists photo ids/time/location for the trip dates, a pure TS matcher puts them on days and places, and the UI reads thumbnails on demand; nothing is uploaded.

**Tech Stack:** React + TypeScript (Vite), Capacitor 8 iOS (Swift, PhotoKit), Supabase (SQL, Deno edge functions), Leaflet; tests are `node scripts/*-test.mjs` bundled with esbuild (pattern: `scripts/rating-test.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-20-place-photos-and-trip-album-design.md` · Mockups: `docs/mockups/review-*.png`, `docs/mockups/map-*.png`

## Global Constraints

- Every UI string goes through `t('<Hebrew>')` with its English in a new `src/i18n/en-<feature>.ts`, spread into `EN` in `src/i18n/en.ts`.
- Every screen works RTL (Hebrew) and LTR (English); check both.
- Real trip untouched: no SQL applied, no edge function deployed, no signed-in real account. Prove with fixtures / the "Toogo Test" simulator with mocks. SQL goes in `supabase/sql/` as a file the owner applies.
- Load and follow the `toogo-rules`, `toogo-frontend-craft` / `toogo-backend-craft` and `toogo-ship-check` skills.
- Commit only your own files; never stash, reset or switch branches in the shared checkout.
- A traveller photo is public only after admin approval. Album photos never leave the phone.

## Review Focus

1. Rating saved but a photo upload fails → the rating stays saved, the failed photo stays picked with a retry; nothing is sent twice on retry. (Task 2 test.)
2. User hits the 20-waiting cap mid-send → the photos sent so far stay, the rest show the cap message. (Task 2 test.)
3. Album photo taken at 23:50 local time / 00:10 local → lands on the right trip day using the day's city tz, not the phone's tz. (Task 3 test.)
4. Limited Photos access or zero photos in the date range → album shows an empty state with "select more photos", never a blank screen. (Task 5 test.)
5. A card whose library row has no photos but whose trip copy has → member photo goes to the gallery only where `photos` is empty. (Task 1 test.)

---

### Task 1: Backend — traveller-photo read path and source-aware approval  *(agent: backend)*

**Files:**
- Create: `supabase/sql/2026-11-20-traveller-photos.sql`
- Create: `supabase/functions/review-photo/gallery.ts`
- Modify: `supabase/functions/review-photo/index.ts:54-62`
- Test: `scripts/review-photo-test.mjs` (+ `"test:review-photo"` in `package.json`)

**Interfaces:**
- Produces RPC `public.traveller_photos(library_ids uuid[]) returns table(library_id uuid, urls text[])` — approved `source = 'member'` rows only, `public_url` newest first, at most 12 per card, no user ids; `security definer`, `set search_path to ''`, granted to `authenticated` only, input capped at 200 ids (like `rating_summary`).
- Produces `galleryAfterApproval(source: 'member' | 'server', photos: string[] | null, url: string): string[] | null` — returns the new `photos` array, or `null` for "leave this row unchanged".

- [ ] **Step 1: Write the failing tests** in `scripts/review-photo-test.mjs`:
  - `server` + `['a']` + `'u'` → `['a','u']`; `server` + `['u']` + `'u'` → `['u']` (no duplicate)
  - `member` + `null` → `['u']`; `member` + `[]` → `['u']`
  - `member` + `['a']` → `null` (row unchanged)
- [ ] **Step 2: Run** `node scripts/review-photo-test.mjs` → FAIL (module missing).
- [ ] **Step 3: Implement** `galleryAfterApproval` in `gallery.ts`; in `index.ts` read the submission's `source` and apply it to the library row and to each trip copy separately (a copy is updated only when the result is not `null`).
- [ ] **Step 4: Run** the test → PASS.
- [ ] **Step 5: Write the SQL file:** `create or replace function public.my_pending_photos()` counting only `source = 'member'`; the `traveller_photos` RPC; a header comment with how to apply and a rollback section (pattern: `2026-11-16-library-poisoning.sql`). Do not apply it.
- [ ] **Step 6: Commit** `supabase/sql/2026-11-20-traveller-photos.sql supabase/functions/review-photo/ scripts/review-photo-test.mjs package.json`.

### Task 2: Frontend — photos in the day-after review, traveller row on the card  *(agent: frontend)*

**Files:**
- Modify: `src/views/PlacePhotos.tsx` (extract the upload; keep `PhotoReviewRow`; remove the `AddPhoto` sheet once unused)
- Create: `src/views/photoSend.ts`
- Modify: `src/views/Review.tsx` (photos section), `src/views/Ratings.tsx` (`CardRatings` photo row), `src/views/Swipe.tsx:873-880` (remove the card button)
- Create: `src/i18n/en-photos.ts`; Modify: `src/i18n/en.ts`; styles in `src/styles/ratings.css`
- Test: `scripts/photo-send-test.mjs` (+ `"test:photo-send"`)

**Interfaces:**
- Consumes RPC `traveller_photos(library_ids uuid[]) → {library_id, urls[]}[]` (Task 1; until applied the RPC errors — the row must simply not show).
- Produces `sendPhotos(files: File[], o: { tripId: string; libraryId: string }): Promise<{ sent: number; failed: File[]; capped: boolean }>` — uploads one by one with the existing path/insert/cleanup; stops at the cap error and reports `capped`.
- Produces `MAX_PHOTOS_PER_REVIEW = 5`.

- [ ] **Step 1: Write the failing tests** (stub `../supabase`): 3 files, 2nd upload errors → `{sent: 2, failed: [file2], capped: false}`; insert rejected by the cap policy on file 2 of 3 → `{sent: 1, failed: [file2, file3], capped: true}`; a removed storage object on a failed insert (remove called with that path).
- [ ] **Step 2: Run** `node scripts/photo-send-test.mjs` → FAIL.
- [ ] **Step 3: Implement** `sendPhotos` in `photoSend.ts` (reuse `toJpeg` moved there).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Review card** (mockup `review-*.png`): section "תמונות מהמקום" + "(לא חובה)"; two tiles — camera (`<input type=file accept="image/*" capture="environment">`) and gallery (`multiple`); picked 72 px squares with ✕; max 5; once ≥1 picked show the existing rights checkbox and its full text and "התמונות יופיעו בכרטיס אחרי שנאשר אותן."; Send stays enabled without photos; Send requires the checkbox only when photos are picked. Rating is saved first; then `sendPhotos`; failed files stay picked with "לא הצלחתי לשלוח {n} תמונות. אפשר לנסות שוב." and the card stays open; cap → its own message.
- [ ] **Step 6: Card** (mockup): in `CardRatings`, when urls exist: up to 3 squares (84 px) + "+N" tile, line "תמונות של מטיילים · אושרו על ידינו", then the notes; tap → full-screen viewer with swipe (reuse an existing viewer if there is one). No urls / RPC error → nothing. Remove the "הוספת תמונה" button from `Swipe.tsx`. Note: the shared checkout has uncommitted edits in `Swipe.tsx` from another session — touch only lines 873–880.
- [ ] **Step 7: Ship check** per `toogo-ship-check`: `npx tsc -b`, `npm run build`, all `test:*` scripts, Hebrew + English screenshots of the review card (empty, picked) and the card row in the Toogo Test simulator with mocked data; attach paths in the report.
- [ ] **Step 8: Commit** only the files above.

### Task 3: Album matcher (pure)  *(agent: frontend, album)*

**Files:**
- Create: `src/album/match.ts`
- Test: `scripts/album-test.mjs` (+ `"test:album"`)

**Interfaces:**
- Produces types `AlbumPhoto = { id: string; time: number /* epoch ms */; lat?: number; lng?: number }`, `AlbumStop = { placeId: string; name: string; day: number; lat: number | null; lng: number | null; start?: string /* "HH:MM" */; minutes?: number; hotel?: boolean }`, `AlbumDay = { day: number; date: string /* YYYY-MM-DD */; tz: string }`.
- Produces `matchPhotos(photos: AlbumPhoto[], days: AlbumDay[], stops: AlbumStop[], manual: Record<string, { day: number; placeId: string | null }>): AlbumResult` where `AlbumResult = { days: { day: number; places: { placeId: string; photoIds: string[]; from: number; to: number }[]; loose: { photoIds: string[]; guessPlaceId: string | null } }[] }`.
- Rules (from the spec, exact): day = trip day whose `date` equals the photo's local date in that day's `tz`; with location → nearest stop that day within **300 m**, else nearest stop of any day within 300 m (placed under the photo's day), else loose; without location → stop whose window `[start, start + minutes)` contains the local time, `minutes` unknown → until next stop's start, capped at **180** min; else loose with `guessPlaceId` = stop nearest in time; `manual` overrides everything. Photos outside all days are dropped.

- [ ] **Step 1: Write the failing tests:** 300 m in/out (299 m matched, 301 m loose); Tokyo-tz photo at 23:50 and 00:10 local fall on consecutive days; no-location photo inside a 90-min window matched, after it loose with the right guess; unknown minutes capped at 180; manual override wins; photo a day before the trip dropped; hotel stop matched and keeps `hotel`.
- [ ] **Step 2: Run** `node scripts/album-test.mjs` → FAIL.
- [ ] **Step 3: Implement** `matchPhotos` (haversine distance; `Intl.DateTimeFormat` with `timeZone` for local date/time).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `src/album/match.ts scripts/album-test.mjs package.json`.

### Task 4: `TripPhotos` iOS plugin  *(agent: frontend, album)*

**Files:**
- Create: `ios/App/App/TripPhotos.swift`; Modify: `ios/App/App/ShareInbox.swift:44` (register), `ios/App/App/Info.plist` + `ios/App/App/he.lproj` / `en.lproj` `InfoPlist.strings` (`NSPhotoLibraryUsageDescription`), Xcode project file to include the new Swift file
- Create: `src/album/photos.ts`

**Interfaces:**
- Swift `TripPhotosPlugin` (jsName `TripPhotos`), pattern of `WidgetData.swift`: `requestAccess() → { status: 'full' | 'limited' | 'denied' }`, `list({ from: number, to: number }) → { photos: AlbumPhoto[] }` (images only, sorted by time), `thumbnail({ id, size }) → { url }` and `image({ id }) → { url }` (JPEG written to the caches dir, returned through `Capacitor.convertFileSrc`-ready path; iCloud network fetch allowed), `pickMore()` (limited-library picker).
- TS `src/album/photos.ts`: `albumAvailable = isNative && platform === 'ios'` and typed wrappers; `loadManual(tripId)` / `saveManual(tripId, m)` using `@capacitor/preferences` (add the dependency).
- Usage text: he "Toogo משתמש בתמונות מתאריכי הטיול כדי לבנות לך אלבום. שום תמונה לא עולה לאינטרנט." / en "Toogo uses photos from your trip dates to build your album. No photo is uploaded."

- [ ] **Step 1:** Implement the plugin and wrapper; build the iOS target (`npx cap sync ios` then `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator build`) → BUILD SUCCEEDED.
- [ ] **Step 2:** In the simulator ("Toogo Test" only) add 3 photos with locations, call `list` from Safari Web Inspector or a debug hook → 3 rows with lat/lng.
- [ ] **Step 3: Commit** the files above.

### Task 5: Album screens (list + map)  *(agent: frontend, album)*

**Files:**
- Create: `src/views/Album.tsx`, `src/styles/album.css`, `src/i18n/en-album.ts`; Modify: `src/i18n/en.ts`, `src/views/Menu.tsx` (row "אלבום הטיול", only when `albumAvailable` and the trip has a start date)

**Interfaces:** Consumes Task 3 `matchPhotos` and Task 4 wrappers; days/tz from the trip's plan (`days[].hotels` → city `tz`, fallback the first city's `tz`); stops = the user's couple's items + `who` null + hotels.

- [ ] **Step 1:** First-time screen per `map-*.png`/`album-*.png` (title, three points, "אפשרו גישה לתמונות", "לא עכשיו"); denied → a line with a button to iOS Settings; limited → "לבחירת תמונות נוספות" calls `pickMore`.
- [ ] **Step 2:** List view: header, List|Map switch, "יפן · dates · N תמונות", privacy line, day sections, place grids (5 tiles, "+N"), pink loose box with "לשייך ל-X" / "לבחור מקום אחר" (sheet of the day's stops) saving through `saveManual`. Empty range → empty state with "לבחירת תמונות נוספות".
- [ ] **Step 3:** Map view: reuse the Places map's Leaflet setup and tiles (light/dark); day chips (single scroll line, no wrap); photo pins 56 px / selected 72 px with red border and count badge; dotted red route in visit order; bottom sheet with name, count, time span, photos; the privacy label must not cover a pin (place it in the map's top inline-start corner with pins kept clear by map padding).
- [ ] **Step 4:** Viewer: full screen, swipe within a place, `image({id})` on open.
- [ ] **Step 5: Ship check:** `npx tsc -b`, `npm run build`, `npm run test:album`, iOS build, Hebrew + English simulator screenshots of first-time, list, map, empty state.
- [ ] **Step 6: Commit** the files above.
