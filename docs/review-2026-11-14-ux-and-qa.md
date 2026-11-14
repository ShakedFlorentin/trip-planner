# Review of Toogo, 14 Nov 2026: UX agent and QA agents

Run on `main` (after the Plan fixes). Findings are marked VERIFIED (seen on screen or run) or SUSPECT/FROM CODE (read only). Nothing here is fixed yet unless it says so. Two QA reviews (Plan and planner; sign-in, sharing and data safety) are still running and will be added.

## Decisions only the owner can make
1. **Rule 3 break (UX):** the add-a-place sheet has "ישר לרשימה" (straight to the list) that writes a place into the trip without swipe and match (`src/views/AddPlace.tsx:428,451`). The Places tab picks it by default (`Places.tsx:238`), and the manual place form does the same (`Places.tsx:611`). Remove, or an exception?
2. Keep XP and levels at the top of Discover?
3. On a landing day, name the day after the city you land in or the city you sleep in? (Plan now: photo and share use the city of most stops; the chip and the bed line use the sleeping city.)
4. Home says "66 more places in Discover" while Discover says "20 left". Which number is meant?
5. One colour for the like heart everywhere? (green in Discover, red in Places)
6. Is guest mode switched on in the live settings? (`Guest.tsx:38` asks questions before the first swipe.)
7. Install `@capacitor/haptics`? (iOS ignores `navigator.vibrate`, so nothing buzzes today.)
8. English dates are day/month (en-GB, "Sat 14/11"): intended?
9. Hebrew money shows "₪120.50" (symbol first). Hebrew convention is "120.50 ₪". Intended?
10. Dynamic Type does nothing in the app (fixed px sizes, 10 px tab labels). Expected?
11. Day trips in the share preview read "Day 2 · Day trip" (the agent meant to skip that label and keep the sleeping city; the code compares with the wrong spelling, 'טיולי יום' vs 'טיול יום'). Keep it as it reads now, or use the sleeping city?

## UX review (opus UX agent)
### The 5 changes that would help a traveller most
1. **Plan day: the first stop starts half a screen down** (about y=610 of 874). Order is photo (160 pt), date heading that repeats the chip, who chip, hotel line, note, filter row. During the trip: slim band or no photo, drop the date heading, one quiet line for who/hotel/note. VERIFIED.
2. **Bookings: flight rows have no departure time** ("11.12 · TLV → MUC"), names cut off ("שקד ומ…"), and the red "+ הוספה" really means "add the confirmation code". Put the time on the sub-line, show names in full or initials, rename the button to "+ קוד אישור" / "+ Confirmation code", drop the identical red icon tile when the list is already filtered to Flights. VERIFIED.
3. **The floating + covers content on every tab:** the bags row icon (Plan), the Expenses tile (Home), the last row's "+ הוספה" (Bookings). On Places it sits beside the floating "מפה" button, which covers row text; on Discover it competes with the swipe buttons. (Scroll-hide is already in; still not fixed while standing still.) Direction: end-of-list padding the height of the +, hide it on Discover, make map button and + one control on Places. VERIFIED.
4. **The re-plan wand: one tap, no undo, next to Search** (`App.tsx:275`). Deleting uses the browser `confirm()` everywhere with no undo (`Itinerary.tsx:104`, `Bookings.tsx:353`). During the trip the wand should change future days only, or ask "Re-plan from tomorrow?" with an Undo toast. FROM CODE.
5. **No haptics on iPhone** (see decision 7). FROM CODE.

### Other problems, by screen
**Plan**
- One day, three city answers: chip says Yokohama, photo says Tokyo, share preview said Yokohama (share fixed since). VERIFIED.
- The bags row has no time and its red suitcase icon sits where the done-circle sits on other rows, so it looks tappable. VERIFIED.
- "Only Shaked and Maor" has a circle icon that looks like a radio button; the "Together" two-circle icon is unclear. VERIFIED.
- The small dots on the 12-14 date chips are not explained. VERIFIED.
- The person filter row is cut off at the edge with no hint that it scrolls. VERIFIED.
- Hebrew bed line leaves a hanging "·" at the end of the first line. VERIFIED.
- The landing title wraps to two bold lines; put the flight number on the sub-line. VERIFIED.
- The wand has only an icon, no text. VERIFIED.

**Home**
- Hero image has a maroon tint with maroon text: weak contrast; Plan uses black-and-white photos, so the two screens treat photos differently. VERIFIED.
- "יפן" and "עכשיו ביפן" are hard-coded (`Home.tsx:108,120`); any other trip would say Japan. FROM CODE.
- 66 vs 20 places (decision 4). VERIFIED.
- Emergency is the third tile and sits under the +. VERIFIED.

**Discover**
- The XP/level bar ("דרקון 4,860 XP", "XP" in English) takes the top slot. VERIFIED.
- A card with no photo shows a 240 pt green tile with a cup icon: leaving the photo out is right, but the tile should be shorter. VERIFIED.
- Like heart green here, red in Places. VERIFIED.
- "¥, כ-700 ין לאדם" shows the currency twice. VERIFIED.
- The "ברשתות" checkbox is tiny and unclear. VERIFIED.
- The "נפסלו 116" chip uses a harsh word. VERIFIED.
- Green, blue and red chips on one card: too many colours. VERIFIED.
- Filter chips cut off at the edge. VERIFIED.

**Places**
- Two black selected-looking chips side by side ("שלנו" dropdown and "הכל 140"): unclear which is the filter. VERIFIED.
- The heart's meaning next to Discover's like is unclear. VERIFIED.
- Section headers repeat the name in both languages ("שינג'וקו Shinjuku"). VERIFIED.

**Bookings**
- Each row is a `div` acting as a button with real buttons inside; VoiceOver reads it badly and "+ הוספה" has no label (`Bookings.tsx:76,97`). FROM CODE.

**Share**
- "19 ימים" for 12-31 Dec (20 days): the count is days that have stops, not days of the trip. VERIFIED.
- Days say "Day 1" where Plan uses dates. VERIFIED.
- "Publish link" is only at the very end, after the whole preview. VERIFIED.

**Across the app**
- Tab labels are a fixed 10 px (`styles.css:330`). FROM CODE.
- Selected states come from class names, not ARIA (`AddPlace.tsx:448`). FROM CODE.
- Raw server errors in `alert('שגיאה: …')` (`AddPlace.tsx:420`). FROM CODE.
- Guest flow asks questions before the first swipe (`Guest.tsx:38`). FROM CODE.

### Good, keep it
RTL mirroring (tab order, top bar, chevrons, "~" before estimated times); one person filter on Plan and Bookings; travel time as a range ("20-35 min ride") and "~" on estimates; the sticky slim header with the dates strip; Places photos; the wand is a button not pull-to-refresh; the trip opens from a saved copy when offline; Home shows "Next" and today's bookings on trip days; the share copy says plainly what the link leaves out.

Not checked by the UX agent: English Home, Discover, Bookings, Places; dark mode; Settings, Expenses, Translator, Emergency, Login, onboarding, trip picker; a real VoiceOver pass; large text; measured contrast.

## QA: Hebrew, English and layout
Verified: `i18n-check` passes (1392 keys, 0 missing English, 0 Hebrew outside `t()`); no placeholder mismatches, no marketing words; the English wording is plain.
1. Add-place "found several places" sheet (`game.css:33`) and photo-rights checkbox (`styles.css:673-674`) still get the global `input {width:100%; min-height:44px; padding; border}`: the same bug the share sheet had. SUSPECT.
2. Dynamic Type does nothing (decision 10); fixed `--top-h 44px`, `--tabbar-h 50px`. VERIFIED by grep.
3. Discover `.left-count` (`styles.css:715`, `ltr.css:15`): absolute, about 22 px wide; Hebrew "נשארו 12" overflows left, English "12 left" likely under the 44 px undo button. SUSPECT.
4. `Stays.tsx:451`: `t('{n} מתוך {total} לילות פנויים', { n: total, total: free })` has `total` and `free` the wrong way round or badly named. SUSPECT.
5. `Stays.tsx:18`: `shortDate` uses the phone's language, not the app's `locale`. VERIFIED.
6. `Itinerary.tsx:928-930`: plan warnings ("Closed on this date", "Closed on Mondays", "Open only 09:00-17:00") are hard-coded English outside `t()`, so the i18n check cannot see them; the plural adds "s".
7. English plurals: Settings.tsx:367 "1 credits", AddPlace.tsx:684 "1 more searches", Itinerary.tsx:767 "1 first steps after landing".
8. `.undo-bar` (`styles.css:1028`, from `Lists.tsx:234`) sits at bottom 24 px over the tab bar; its link is 36 px; a long item name is cut. SUSPECT.
9. Tap targets under 44 px: `.booking-edit` 28, `.menu-me-text .link` 28, `.no-conf .link` 28, `.chip` 36, `.segmented button` 34, pills 36, `.plan-add` 36, `.actions.compact .action` 36, `.round-icon` 36. VERIFIED by grep.
10. Tab label grey `#8e8e93` at 10 px is about 3:1 on near-white, under 4.5:1 (light and dark). SUSPECT.
11. Title inputs lack `dir="auto"` (`Itinerary.tsx:815`, `Bookings.tsx:379`) while the name/location inputs have it.
12. Stray English key `': עוד לא' => ': not yet'`; "בוצע" and "סיום" are both "Done"; "להעביר לטיול" and "העברה לטיול" are both "Give to the trip".
13. English dates are en-GB numeric (decision 8).
14. Fine on purpose: `.phrase-ja`/`.phrase-ro` left-aligned; like/nope stamps not flipped (swipe-right = like in both languages); chevrons all flip correctly.
Not checked: anything rendered; Login, Onboarding, Guide, SharedPlan, Translator, Ratings, Say line by line; safe areas, keyboard, VoiceOver in RTL.

## QA: money, expenses and offline writes
`split-test`, `table-test`, `rating-test`, `i18n-check` pass, but none of them touches the money code (`split-test` is the night-splitting planner). No test exists for `src/money.ts`, `src/outbox.ts`, `src/views/Expenses.tsx`.
1. **Duplicate expense after a lost reply** (`outbox.ts:168-172`): the first send has no client id; if the server saves it and the reply is lost, the retry gets a new id and is saved twice. SUSPECT.
2. **"Infinity" / "1e400" pass `parseAmount`** (`Expenses.tsx:55-58,336-337`) and become `amount: null`: online an alert, offline the row is dropped. "0x10" reads as 16, "1e3" as 1000. No upper bound. VERIFIED.
3. **Small debts hidden differently in the ¥ and ₪ views** (`money.ts:84-95`): the noise filter drops transfers under 100 minor units (¥100 vs ₪1). A ¥150 expense split by 2: the ₪ view says the other owes ₪2, the ¥ view says "all settled". Small debts can add up and never show. VERIFIED.
4. **Rejected offline rows vanish silently** (`outbox.ts:136-138`): any non-OK reply except 401/5xx (400, 403, 404, 408, 429) is dropped with only `console.warn`; 408/429 are retryable. A deterministic 5xx on one row blocks everything behind it forever. SUSPECT.
5. This phone's saved rate wins over a partner's later change while the screen is mounted (`Expenses.tsx:72`): two phones can show different balances. SUSPECT.
6. A split with someone not in the member list is not zero-sum for the people shown; an empty `split_among` makes the payer's total vanish (the DB has no check I could find) (`money.ts:36-44,91`). VERIFIED on the function. (The delete-account work in the other folder touches this.)
7. One trip-wide rate applies to every expense and settlement at display time; any member can change it with no confirmation or history, which silently changes past balances and past repayments (`money.ts:22,39`). VERIFIED.
8. Couples mode: "כמה כל זוג שילם" omits a member with no couple, though they appear in the transfers (`Expenses.tsx:201-204`).
9. A blank description is saved as the category label in the saving phone's language, so the partner sees the wrong language (`Expenses.tsx:344,236`).
10. Row amounts show "₪12.5" while the hero shows "₪12.50" (`Expenses.tsx:247`).
11. "שילמו {amount}" lacks `<bdi dir="ltr">` (`Expenses.tsx:202`).
12. Symbol-first money in Hebrew (decision 9).
13. "¥500", "500 ₪", "1.234,50" give NaN with the misleading "needs an amount above zero"; "12,345" is read as 12345; Arabic-Indic digits give NaN.
14. Category guessing is a plain substring match: "bus" matches "Busan", "bar" matches "Barcelona", "park" matches "parking" (`Expenses.tsx:36-39`). Cosmetic: a tap overrides it.
15. The duplicate-expense check is a live GET with no timeout; the button stays on "שומר…" on a stalled connection; two identical offline expenses are not flagged.
16. The date has no check against the trip dates and the day header has no year; `japanToday()` can be a day ahead of the phone's date.
17. Editing an old expense whose payer is not in `members`: the select shows the first member while state keeps the old id.
18. The leftover agora or yen always goes to the lowest-sorted id.
19. ILS transfers round to whole shekels after the noise filter: up to ₪0.49 per pair stays outstanding, shown in details but not on the card.
20. `t(display_name)` and `t(couple)` run typed names through the translation lookup.
21. Category and quick-split chips have no `aria-pressed`.
22. Delete uses the browser `confirm()` with no undo.
23. Only JPY and ILS exist; a euro, dollar or franc expense must be entered by hand.
24. Could not check DB constraints (`amount > 0`, currency, non-empty `split_among`, precision): no `CREATE TABLE public.expenses` in `supabase/sql`.
Not checked: anything rendered; outbox with a real network drop; the live DB; `swipe.tsx`; `tableStore.ts` realtime merge (whether a row can show twice).

## QA: Plan tab, planner and bookings
`plan-test` passes, `recheck-test` passes 28/28, `stay-test` ends "all good" (the 11 known Japan-box failures were not re-reported). The planner files were read from the last commit.
1. **Flight titles are not recognised, so landing and departure times are ignored** (`plan-trip/presence.ts`, `JAPAN` and `ROUTE`, `flightOf`). `JAPAN` only has airport codes plus Haneda, Narita, Kansai: no Tokyo, Osaka, Japan, no Hebrew names. "TLV → Tokyo", "TLV-NRT" (inbound) and "טוקיו" are all ignored, so the arrival day plans a full day from 9:30 and the departure day to 21:30. `split.ts` has a wider list (Itami, Chitose, Naha...), so the planner and the stay splitter see different flights. Should be one shared airport and city list in Hebrew and English. VERIFIED. (Your own flight "LH714 MUC → HND" is recognised; titles typed another way are not.)
2. **`hotelBase` gives the wrong city or none** (`plan-trip/index.ts:50-67`): it checks `yokohama|kanagawa` before `hakone`, so a Hakone address that says "Kanagawa" becomes Yokohama; it returns null for Roppongi, Akihabara, Shinagawa Prince, "The Prince Gallery", and a null city means those nights get no stay. VERIFIED.
3. **A trip with no start date breaks the planner** (`index.ts run()`: `new Date(trip.start_date + 'T00:00:00Z')` throws on null), so every replan trigger fails. Should return quietly. VERIFIED.
4. Linking a hotel booking to a stay seems to carry over the wrong dates or city (`Stays.tsx` `link()` / `save()`). SUSPECT.
5. The check-in row (15:00) is shown before a 22:00 landing on the same day (`planUtils.ts`); on a hotel-switch day the check-in moves to the end only when a later item exists. VERIFIED.
6. `stayInJapan` (`planUtils.ts` `JAPAN`) has no English Tokyo, Japan or Osaka and no OKA, and returns null for a one-day trip; Home uses it (about lines 465-500). VERIFIED.
7. A red-eye or late landing (23:30) gives start = end = 26.5 h, so the arrival day has no usable window; the landing counts only when `tonight && !last`; a hotel booked from the night before landing ignores the flight. VERIFIED.
8. A whole-day ticket (00:00-23:59) shows "00:00" in some places and not others (`hm()` in `Bookings.tsx`). VERIFIED.
9. Phantom stays after a booking is deleted: the `bookings_stay` trigger fires on insert and update only; the FK is `on delete set null`, so a confirmed stay stays with `booking_id` null and the planner keeps planning around a hotel that is gone (`supabase/sql/2026-11-02-trip-stays.sql:69,140-145`). SUSPECT.
10. `sync_booking_stay` ignores a booking whose `hotel_base` is null (same file, line 128): edit a booking so the city can't be found and the old stay keeps the old dates. SUSPECT.
11. `saveSplit` (`Stays.tsx`) deletes the stays then inserts the new ones, not atomic: a failed insert leaves the trip with no stays, and each step triggers a replan. SUSPECT.
12. `shortDate` in `Stays.tsx` uses the device locale, not the app language. (Also found by the language QA.)
13. `useStays` (`src/stays.ts`) sets `available: !error`: a transient error makes the app act as if the table doesn't exist and fall back to hotel bookings, silently. SUSPECT.
14. `Bookings.tsx` has a `role=button` row with a nested button; keydown on the inner one can bubble to the row. A dangling doc comment at the end of the file. SUSPECT.
15. `usePlanSummary` (`Itinerary.tsx`) has no reset when the trip changes and no race guard; a slow answer for the previous trip can overwrite the current one. SUSPECT.
16. Saves in StayForm, ItemForm and DayForm fail silently in both languages (the sheet closes or stays with no error text). SUSPECT.
17. Geocoding sleeps between calls against a 60 s lease (`LEASE_MS`); a trip with many new stays can outlast it, and a second planner run can start on the same trip. SUSPECT.
18. `hhmm` in `plan.ts` uses `% 24`: 26.5 h prints as 02:30 with no "next day" cue. SUSPECT.
19. `flightParts` regex and the ImportSheet dedup/`wallClock`: flights across midnight may show an arrival date before the departure date. SUSPECT, not reproduced.
Not checked: UI and screenshots; live database; `split.ts` and `stay.ts` mostly; an end-to-end edge function run; time zones; trips of 20+ days.

## QA: sign-in, onboarding, settings, Discover, sharing and data safety
Read review only (nothing executed against the live database by the QA agent). `rank-test`, `look-test`, `rating-test`, `table-test`, `split-test` pass; they do not cover these findings. The main session then checked two items on the live database with read-only catalog queries (14 Nov, 20:3x).

**Checked live, so not a problem today**
- **`get_anthropic_key()` (reported as a blocker):** on the live database neither `anon` nor `authenticated` can execute it (same for `get_planner_token`). The key is not exposed. The repo has no `revoke` statement for it (drift between repo and live): add one to a SQL file so a rebuilt database stays safe.
- **`members_update_self` (item 6):** `authenticated` can update only the `display_name` column of `members`, so nobody can move their row to another trip or change `couple` through the API. Not exploitable. Still no length limit on `display_name`.

**Still real**
1. **Account lifecycle dead ends (App Review):** no account deletion on `main` (the work is uncommitted in the old folder); no leave-trip (`members` has no DELETE policy, "מעבר לטיול אחר" only clears the current trip); no forgot-password flow (no `resetPasswordForEmail`/`updateUser`/`PASSWORD_RECOVERY`), so a forgotten password is a dead end. VERIFIED (read).
2. **Rule 3 and rule 4:** places reach the trip without swipe and match (`AddPlace.tsx:428` "ישר לרשימה"; `Places.tsx:611` `PlaceForm` inserts with only a name; the `places_all` policy lets any member insert through the API), and weak cards get in (`AddPlace.tsx:343` needs only name and city; `sync_library` filters only on `active`; the Swipe deck has no weak-card filter; `ImportShared` inserts with no address or description). VERIFIED (read).
3. **TripPicker:** no busy/disabled state, so a double tap on "יצירת טיול" makes two trips; the raw Hebrew DB message ("יותר מדי ניסיונות…") shows in the English UI; if `my_invite` errors the auto-join falls to the manual picker with no message (the invite code that fails silently); no list of your own trips; the only sign-out button is on the trip picker, none in Settings or the menu.
4. **Outbox:** a failed write (403, 400, 409, 429) is dropped with only `console.warn` after the user saw "saved"; a replayed POST with no id (expenses, places) can duplicate; the previous user's queued bodies stay in localStorage after sign-out. (Same as the money QA findings 1 and 4.)
5. **`place_library` poisoning (SUSPECT):** `card_to_library` activates a card once two different trip creators add the same name; two accounts can promote an arbitrary card to every trip, and text and photo URLs are copied without the weak-card and photo-quality rules.
6. **Swipe (SUSPECT):** `knownMatches` is keyed `id + who`, so when a couple's match becomes everyone's, or members/couples change, old matches may celebrate again; undo then re-like of a match is silent; `notNow` loses its look data if the write fails. (Checked OK: double-swipe guard, the no-couples threshold matches the DB, no refetch loop.)
7. `notify` sends "it's a match" to everyone who liked the place, not only the couple it is for; after an undo and redo nobody is notified again.
8. `Login.tsx` hard-codes four group names mapped to `@japantrip.app` emails; the error "לא מכירים את השם…" lists them and the bundle exposes the group's account emails.
9. `shared_plans.trip_id` has no foreign key: after a trip is deleted the public link stays live and nobody can revoke it; snapshot content is not enforced by the DB (size under 200000 only).
10. `useProfile` on an offline first load sets `profile = null`, so dietary hiding may be missing until it loads. SUSPECT.
11. `sign-up` function: no rate limit; 410/409 answers work as oracles for invite codes and emails; accounts get `email_confirm: true` with no email ownership check (someone holding an invite can pre-register another person's address); `bad_request` is shown as "email invalid" for other causes.
12. `track()` is open to anon with 300 events per hour per client-chosen uuid, so rotating ids floods `events`; timestamps can be backdated one day.
13. `join_trip`: a re-join silently renames; attempts count on success too; `create_trip` has no per-user limit and no trip name length check.
14. The `docs` bucket policies and size limit are not in the repo; `Bookings.tsx:317,526` has no client size check and takes the extension from `file.name`.
15. Settings: trip name and my name have no length limit; analytics counting is on by default (opt-out): check the privacy label and ATT answers.
16. App Review still open: Sign in with Apple missing while Google sign-in sits behind the web-only `google_signin` flag; no demo account; the page behind `privacyUrl()` was not read.
17. SSRF (SUSPECT, grep only): `suggest-place` and `card-photos` fetch user-supplied URLs with the service role; no private-IP guard found.

**Checked and fine (read):** the shared plan snapshot holds only place name, category, the card tip, rounded lat/lng, a city per day and the optional trip name (no bookings, hotels, addresses, expenses, names or typed notes); no `dangerouslySetInnerHTML`/`innerHTML`; hrefs go through `safeUrl`, the public page sanitizes through `clean()`; RLS is on every table in the baseline list; every security definer function in the repo sets `search_path`; the AI functions have per-user and global caps, membership checks and credit hold/settle/refund; photo-submissions bucket is jpeg only, 6 MB, own folder, 20 pending, admin approval; no secrets or keys in `src`, scripts or the Capacitor config.
Not checked: live policies beyond the two queries above; any UI run; `Review.tsx`, `Report.tsx`, `MatchPop.tsx`, `LoginCarousel.tsx`, the Onboarding save path, the credits SQL (`give_to_trip` abuse); realtime was read, not run.

## Still running
Backend agent: planner fix for the landing day (it is editing `presence.ts` and `plan.ts`; Plan QA finding 1 touches the same `JAPAN` list, so it should be one change with that fix, not two).
