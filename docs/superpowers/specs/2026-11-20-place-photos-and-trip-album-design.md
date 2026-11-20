# Place photos in the review, and the trip album — design

Date: 2026-11-20 · Owner approved the screens: `docs/mockups/review-*.png`, `docs/mockups/map-*.png` (Hebrew and English).

## Why

Two separate things, both from looking at CopyPasteTrip (an Israeli site selling ready Hebrew trips):

1. **Place photos.** Travellers' own photos make a card trustworthy, like Google Maps or a shop's reviews. The card
   shows what earlier travellers rated, wrote and photographed; adding a photo belongs to the moment you review a place
   you visited, not to the card.
2. **Trip album.** A memory album: your own trip photos sorted by day and place, shown as list and on a map with a small
   photo on each place (CopyPasteTrip shows photos on the map this way). It is private: it never leaves the phone.

## Goals

- The place card shows travellers' approved photos inside the "Earlier travellers" box, next to the stars and notes.
- The day-after place review on Home ("How was it at …?") lets you add photos: take one or pick from the gallery.
- Every traveller photo is approved by an admin before anyone else sees it (as today).
- In the iOS app, an album built from the phone's photo library: photos from the trip dates, placed by their location
  (or by time when there is none) under the right day and place; a list view and a map view.

## Non-goals

- No album on the website. The web shows nothing for it (no entry point).
- No uploading of album photos, no sharing the album, no album for trip mates.
- No photo editing, captions, likes or comments.
- No change to how admins approve (the existing "Photos to approve" row in the ☰ menu stays).

## Anti-goals (would make it a failure even if it works)

- An album photo leaves the phone, or another person can see it.
- A traveller photo shows publicly before an admin approved it.
- A weak or wrong photo becomes a card's first, big photo (house rule: no photo is better than a weak one).
- The album copies the library: it must not fill the phone or the app's storage.
- Anything touches the real trip's data, bookings or expenses before the owner tests it (house rules).

## Constraints

- Phones run the web build today; the iOS app (Capacitor 8, `ios/`) is the same web build with native plugins.
  App Store release is planned for February 2027.
- iOS removes a photo's location when a website picks it, so the album is iOS-app only.
- Every UI change is done in Hebrew (RTL) and English (LTR mirror + strings).
- Code is built by the matching org agent (frontend, backend); this session plans and runs the checks.
- Real trip untouched: prove with fixtures / the "Toogo Test" simulator, never a signed-in real account.

## How it works today (what this changes)

- `src/views/PlacePhotos.tsx` `AddPhoto`: a sheet with one file input and a rights checkbox. It re-draws the photo as
  a JPEG ≤1600 px (which also drops its location), uploads it to the private `photo-submissions` bucket at
  `<trip>/<user>/<uuid>.jpg`, and inserts a `photo_submissions` row (`pending`). RLS: only a trip member, only for a
  place on their trip, at most 20 waiting.
- The button that opens it is on the card, in the actions row with Maps and Website (`src/views/Swipe.tsx` ~875).
- Admin approves through the `review-photo` edge function, which copies the file to the public `card-photos` bucket,
  sets `public_url`, and **appends it to the card's `photos`** (library row and every trip copy) — the card's main
  gallery.
- `src/views/Ratings.tsx` `CardRatings` shows "Earlier travellers": average, count, a few anonymous notes
  (`rating_summary`).
- `src/views/Review.tsx` is the day-after review card on Home: stars, one quick question, Send / Not now.

## Approaches considered

### Place photos

Only one sensible way: move the existing upload into the review card and show approved photos in `CardRatings`.
A new photo system would duplicate a working, RLS-checked pipeline.

### Album (iOS)

1. **Own small native plugin (Swift, PhotoKit) — chosen.** Fetches only assets in the trip's date range, returns
   id, time, location; thumbnails on demand. Nothing copied, full control of what is read.
2. `@capacitor-community/media` — rejected: no date filter (as far as known), returns encoded images for everything,
   heavy on a library with thousands of photos; location not confirmed.

Owner picked the own-plugin route by approving the design.

## Design — place photos

**Card (view only).** The "Add photo" button leaves the card's actions row. Inside "Earlier travellers"
(`CardRatings`), when the place has approved traveller photos: a row of up to 3 squares (84 px) and a "+N" tile, then
the line "Photos from travellers · checked by us", then the notes. Tap a photo → full-screen viewer (swipe between
them). No photos → the row is not there (no empty state).

**Review card on Home.** Below the quick question, a new optional section "Photos from the place (optional)" with two
tiles: camera (take now) and gallery (pick, several at once). Picked photos show as 72 px squares with an ✕. Once at
least one is picked, the existing rights text and checkbox appear (keep its full wording) and the line "The photos show
on the card once we approve them." Send saves the rating as today and uploads the photos with the existing path and
row. Sending without photos works exactly as today. If the rating saved but a photo failed, say so and keep the photo
for retry; do not lose the rating.

**Limits.** At most 5 photos per review send; the existing 20-waiting cap still applies (show its message when hit).

**Data.** Approved photos for a card are needed by everyone, but `photo_submissions` rows are readable only by their
owner and admins. Add a read path that returns, per library card, the approved `public_url`s (newest first, capped) —
no user ids. Builder chooses: a `security definer` RPC like `rating_summary`, or folding them into `rating_summary`.

**Two kinds of rows in one queue.** `photo_submissions` also holds photos the `card-photos` function found on the web
(`source = 'server'`, filed under the trip creator); those are how cards get their main gallery. Only
`source = 'member'` rows are travellers' photos.

**Where approved photos show (owner decided 2026-11-20).** `review-photo` splits by `source`: a `server` photo is
appended to the card's main `photos` gallery as today. A `member` photo always shows in the travellers row; it goes
into the main gallery **only when the card has no photo at all** (library row and trip copies with empty `photos`),
so a card without a picture gets one, and a card with photos keeps its chosen ones on top. Member photos already
appended stay. The new read path
returns `source = 'member'` approved rows only.

**The 20-waiting cap (my call).** `my_pending_photos()` counts only `source = 'member'` rows, so server-found photos
filed under the trip creator never block them from sending their own.

## Design — trip album (iOS app only)

**Entry.** A "Trip album" row (where: builder's call — the ☰ menu next to other trip rows, or the end of the plan), shown
only when running in the iOS app and the trip has a start date. Web: hidden.

**First time.** A pre-permission screen (title "Your trip album", three points: only photos from the trip dates; the
location shows where you took it; nothing is uploaded), then "Allow access to Photos" → the iOS prompt, or "Not now".
Works with full and with limited Photos access (limited: only the photos the user allowed; offer iOS's "select more").
Info.plist gets `NSPhotoLibraryUsageDescription` in Hebrew and English.

**Matching rules (my calls).**
- *Time zone:* trips have no time-zone field. A photo's local time uses the `tz` of the city the user sleeps in that
  day (the planner's `days[].hotels` → place → city); fallback the trip's first city's `tz`.
- *Whose plan:* the user's own couple's items plus shared items (`who` null) — the album is personal.
- *Places:* the trip's matched places **and** its hotels (a hotel row is labelled as the hotel).
- *Visit window:* from the item's `time` to `time` + the card's visit length (`time_needed` / facts visit length);
  if unknown, until the next item's start, capped at 3 hours.

For each photo in the trip's date range (start date → last day):
1. Its day = the trip day of its local date.
2. With a location: the nearest place planned that day within 300 m; else the nearest of the trip's places within
   300 m; else "no place" for that day.
3. Without a location: if its time falls inside a planned visit that day, that place; else "no place", with a guess
   ("probably on the way to X") from the closest planned visit in time.
4. The user's own choices ("Add to X" / "Choose another place") override and are remembered.
The match is computed on the phone; nothing is sent.

**Stored (my call).** In native storage (Capacitor Preferences / UserDefaults), not the web view's localStorage, which
iOS can clear; it survives app updates, not a reinstall (then matching runs again; only manual choices are lost).
Only a small map on the phone: photo id → day, place id, chosen-by-user flag, plus a last-scanned time.
No image data is stored by the app. Rescan when the album opens (new photos from the trip appear).

**List view.** Header "Trip album", "List | Map" switch, "Japan · dates · N photos", the line "Stays on your phone
only. No photo is uploaded." Per day: title, date and count; per place: name, count and a 5-tile grid (one big,
"+N" on the last). Then a pink box "N photos from this day without a place" with the guess and two buttons.

**Map view.** Day chips (All days, Day 1…). The day's places with photos are small photo pins (56 px, white border,
red count badge); the selected place is larger (72 px) with a red border; the day's route as a dotted red line. A
bottom sheet shows the selected place's name, count, time span and its photos. Reuses the Leaflet map and tiles the
Places map already uses (light and dark).

**Viewer.** Tap a photo → full screen, swipe within the place; full-size image fetched from the library on demand.

**Native plugin (`TripPhotos`).** `requestAccess()`, `list({from, to})` → `[{id, time, lat?, lng?}]` sorted by time,
`thumbnail({id, size})` and `image({id})` → a file URL in the app's cache usable by the web view. iCloud-only photos:
allow network fetch for thumbnails; show a grey tile while loading.

## Rollout

- Place photos: web and app; build on `main`, ship after the owner tests on the phone (small client change + one
  read RPC + an edge-function change).
- Album: iOS app only; ships with the App Store version. Does not need to wait for the trip to end, since the web
  never shows it.
- Mark the matching Toogo HQ tasks done after a confirmed ship.

## Left to the builder

- Exact components and file split; the full-screen viewer (reuse one if it exists).
- Grid and pin sizes may move a few px for fit; keep the look in the mockups.
- How thumbnails are cached and cleared.
- Strings in `i18n` for both languages; RTL/LTR mirroring of the map sheet and chips.

## Open questions for the owner

None.
