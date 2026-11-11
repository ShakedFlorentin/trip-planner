# AI cost, bugs and security gaps (9 November 2026)

Branch `roadmap` at `f099113`, including the uncommitted where-to-stay work. Nothing in the app was changed. The database was only read.

## Fixed in code so far (not committed)

Deployed on 11 November 2026: `suggest-place` (version 35), `card-facts` (version 8) and `parse-booking` (version 13), carrying the second and third batches below. Each was compared with the last commit before the deploy and with the files on disk after it, and matches. Earlier, on 10 November 2026: `card-photos` (version 9) and `suggest-place` (version 34). Before the deploy, the live source of both was compared with the last commit and matched exactly; after it, the live source was compared with the files on disk and matches exactly. The four app-side fixes are not deployed.

| Finding | Fix | File |
|---|---|---|
| B1 / V1 photo selection cut off | Answer limit raised from 200 to 2,000; with no answer the card keeps no photo instead of unchecked ones | `supabase/functions/card-photos/index.ts` |
| A2 library never copied | The `sync_library` call is now sent, and the deck reloads when it added cards | `src/views/Swipe.tsx` |
| A1 Yokohama cards hidden | The city answer only hides cards in the five cities the questionnaire asks about | `src/prefs.ts` |
| A3 removed stop comes back | Remove deletes the stop and marks the place as taken out, so the planner leaves it out | `src/views/Itinerary.tsx` |
| Cost 3 search limit | 3 searches per lookup over all its rounds, instead of 10 per round | `supabase/functions/suggest-place/index.ts` |
| Cost 2 name already in the trip | A typed name is checked against the trip's cards before the paid search | `src/views/AddPlace.tsx` |

Second batch, 11 November 2026 (server parts deployed, not committed; the `AddPlace.tsx` part is not deployed):

| Finding | Fix | File |
|---|---|---|
| A13 / V17 a retry or an early close starts a second paid search | The server answers 409 when the caller's own lookup with that id is still running (up to ten minutes), and the app reads the saved result | `supabase/functions/suggest-place/index.ts` |
| A13 same, app side | A closed sheet no longer sends the plain request after the streamed one | `src/views/AddPlace.tsx` |
| V13 place list cut off reads as "nothing found" after a paid search | Answer limit raised from 1,000 to 4,000 | `supabase/functions/suggest-place/index.ts` |
| V12 facts lookup cut off, paid search thrown away | Answer limits raised: research 3,000 to 6,000, fields 1,500 to 4,000 | `supabase/functions/card-facts/facts.ts` |
| V13 long booking cut off mid-answer | Answer limit raised from 4,000 to 8,000 | `supabase/functions/parse-booking/index.ts` |

The live `card-facts` and `parse-booking` were compared with the last commit and match it exactly, so the deploy changed only these lines.

Third batch, 11 November 2026: less usage inside each lookup (deployed, not committed):

| Change | What it saves | File |
|---|---|---|
| A typed name or Maps link that matches exactly one live library card (237 today) is answered from the library | The whole lookup, about $0.04, with no AI call | `supabase/functions/suggest-place/index.ts` (`libraryPlace`) |
| Claude is told to search as little as the job allows: one search for a sight or shop, two for a place to eat (the second for Tabelog) | About $0.012 per search not made. The average today is 2.6 searches per lookup | `supabase/functions/suggest-place/index.ts` (`RESEARCH`) |
| The facts lookup is told one search is usually enough, instead of "in English and Japanese" | About $0.012 per search not made. The average today is 2.4 | `supabase/functions/card-facts/facts.ts` (`RESEARCH`) |

The two wording changes trade some detail for cost and are untested: with fewer searches a card can miss a Tabelog score or a year-end closure. After a deploy, the `ai_calls` log shows the new average searches per lookup, and a few real lookups show whether the cards are still good.

Checked after the edits: type check, `test:plan`, `test:split`, the i18n check and a syntax check of both functions all pass. Not run in a browser or on a phone.

## Part 1: AI cost

### Where the money went

Source: the app's own `ai_calls` log (26 October to 7 November), priced with Anthropic's price page as fetched on 9 November 2026. Every call uses Claude Haiku 5.5 at low effort, which is already the cheapest setting.

| What | Calls | Web searches | Cost | Share |
|---|---|---|---|---|
| One-time fill of facts for 55 old cards (`plan-trip/facts-research`, code no longer exists) | 55 | 130 | $1.53 | 68% |
| New place lookup, research step (`suggest-place/research`) | 14 | 37 | $0.51 | 23% |
| Photo selection (`card-photos/pick`) | 110 | 0 | $0.08 | 4% |
| One-time English translation of old cards | 178 | 0 | $0.05 | 2% |
| Everything else (card writing, search words, facts, voice translation) | 115 | 2 | $0.09 | 4% |
| **Total** | | **169** | **$2.25** | |

- **The web-search fee is 75% of the bill.** Anthropic charges $0.01 per search on top of tokens. 169 searches cost $1.69.
- **Tokens are cheap.** All the text Claude read and wrote cost about $0.56 in total.
- **Two thirds of the spend was a one-time job** that will not repeat.

### What one new place costs

| Searches in the call | Research calls seen | Text read | Cost |
|---|---|---|---|
| 2 | 39 | 23,000 tokens | $0.023 |
| 3 | 27 | 43,000 tokens | $0.036 |
| 4 | 1 | 50,000 tokens | $0.046 |
| 6 | 1 | 137,000 tokens | $0.141 |

- Average $0.039 per lookup, median $0.036, worst $0.147.
- Each extra search makes Claude re-read all earlier results, so the text grows much faster than the search count.
- Above 100,000 tokens Haiku 5.5 charges five times the price for the whole request. The 6-search lookup crossed that line and cost four times a normal one. `suggest-place` allows up to 10 searches and 8 pictures per lookup, so nothing stops this today.

### What to change, ranked by how much it saves

| # | Change | Kind | Saving | Basis |
|---|---|---|---|---|
| 1 | Turn credits on and price a lookup above its cost | Business decision | Turns every lookup from a loss into a margin | Measured |
| 2 | Check the trip's own cards before a paid name lookup | Free win | $0.04 for every name that is already in the trip | Code reading |
| 3 | Allow 3 searches per lookup instead of 10 | Tradeoff | About 25–35% per lookup, and no more 5x lookups | Measured |
| 4 | Send at most 4 pictures of a post, not 8 | Tradeoff | Small; mostly keeps carousels under the 100,000 line | Estimate |
| 5 | Set a monthly spend limit in the Anthropic Console | Safety | Caps the worst case | Estimate |
| 6 | Limit booking PDFs to about 20 pages | Safety | Caps a rare expensive call | Estimate |
| 7 | Let the name cache see more than the last 300 lookups | Free win | Small today, grows with users | Code reading |

Details:

1. **Credits.** Credits are off (`app_flags.credits = false`), so every lookup is paid by you. The price in `credit_prices` is 4 credits, about $0.04, for a lookup that costs $0.039 on average. That is no margin, not the 25% the comment in `supabase/sql/2026-11-02-credits.sql:40` assumes (it was computed from $0.032). The photo selection and the background facts lookup that follow a new card are not charged at all. A price of 6 credits covers the average with about 50% margin; 8 covers the expensive lookups too.
2. **Name already in the trip.** `src/views/AddPlace.tsx:201` starts the paid search first. The "already in the trip" check runs only at save time (`AddPlace.tsx:296`). A typed name that matches one of the trip's 210 cards pays $0.04 and is then told it exists. Running `existingIn` on the typed name before `research()` makes that case free and instant. The same check against the shared library (311 researched cards) would make those free too. A link cannot be checked this way.
3. **Fewer searches.** `supabase/functions/suggest-place/index.ts:592` has `max_uses: 10`. 68 of the 70 research calls logged used 3 searches or fewer. A cap of 3 keeps a lookup under about 45,000 tokens. The cost is thinner research for a post that lists many places; check 5 to 10 real roundup links before and after.
4. **Fewer pictures.** `MAX_SLIDES = 8` (`suggest-place/index.ts:117`). The pictures are re-read at every search step, so 8 pictures and 3 searches can already reach 100,000 tokens.
5. **Spend limit.** At today's daily ceilings the worst possible day is roughly $25 to $80 (300 lookups, 400 facts lookups, 150 bookings, 2,000 translations). A normal day is cents. A monthly limit on the API key's workspace is the only hard stop.
6. **Booking PDFs.** `parse-booking` accepts a 15 MB PDF (`parse-booking/index.ts:42`). A long PDF passes 100,000 tokens and is billed at five times the price. Confirmations are a few pages.
7. **Cache window.** A saved answer already renews itself on every hit (see V5 below), so the 30-day life is not the limit. The limit is `knownPlace`, which reads only the last 300 lookups (`suggest-place/index.ts:759`), and every free hit adds a row to that window. With more users, older answers stop being found and are paid for again.

One caveat on the numbers: the $0.141 for the 6-search call is the app's own estimate (`ai-log.ts:28`), which applies the five-times price to the summed tokens of all search steps. If Anthropic applies it per step, that call cost about $0.08. Compare one such call with the Anthropic invoice to know which. Either way it is at least twice a normal lookup.

Two more cost facts from the server review:

- The search limit is per request, and a lookup can continue for up to 4 requests (`suggest-place/index.ts:584-600`). The real ceiling is 40 searches, $0.40 in fees, for a lookup priced at 4 credits.
- With credits off, a retry from the app with the same id starts a second full search (see A13 and V17).

Not worth doing:

- **Prompt caching.** The fixed prompts are short and tokens are a quarter of the bill. Best case under 5%.
- **Batch processing.** Half price applies to tokens only, not the search fee, and only background work could use it. Saves fractions of a cent per card.
- **A cheaper model or lower effort.** There is none; the app is already on the cheapest of both.

## Part 2: Security gaps

The full audit of 9 November is in `security-audit/REPORT.md`. This part re-checks it against the live database and the code as it is now.

### Confirmed fixed on the live database

- The shared daily AI ceiling is live (`ai_take` with a per-person and an everyone limit, in one locked step).
- The background facts and photo lookups are metered (60 per person, 400 for everyone, per day).
- A used invite stays used after its account is deleted (`invites.used_at`).
- Every public table has row-level security, no rule is open to signed-out visitors, and every database function pins its search path.
- Dependencies: `npm audit` reports 0 vulnerabilities.

### Two audit leads now closed

Leads 1 and 2 (the request queue with the planner token, and database-side web requests) depended on which schemas the API exposes. A read with the public key answers "Only the following schemas are exposed: public, graphql_public". The `net` and `extensions` schemas cannot be reached from outside.

### Still open

| # | Gap | Where | Why it matters |
|---|---|---|---|
| S1 | The photo finder fetches any web address stored on a card and follows redirects | `supabase/functions/card-photos/index.ts:128,142` | A member can make the server request addresses of their choosing |
| S2 | A lookup sent with both a link and a note is saved under the link alone | `supabase/functions/suggest-place/index.ts:415` | One member's note can shape the card every later user gets for that link |
| S3 | Any trip member can replace the photos of a shared library card | `card-photos` (audit lead 3) | Affects every trip; the deployed version was not compared with the repo |
| S4 | Accounts are created as confirmed for any email typed | `supabase/functions/sign-up/index.ts:22` | Becomes account takeover once Google or Apple sign-in links by email |
| S5 | The four group accounts use `@japantrip.app` addresses | `src/views/Login.tsx:27` | Whoever owns that domain's mail can reset them |
| S6 | Sign-in uses the implicit flow | `src/supabase.ts:5` | A crafted link can sign someone into another account |
| S7 | The web app shares its address with other GitHub Pages sites of the account | `src/native.ts:12` | Another site there could read the session and saved data |
| S8 | Edge functions import unpinned packages | all `supabase/functions/*/index.ts` | A bad release of a dependency would run with full database rights |

S4 to S6 need the Supabase Auth settings, which cannot be read from here: email confirmation, secure email change, and identity linking.

### Small things

- `places_area_backup_20261108` is a leftover table with 135 rows. It is locked (no rule, reads return nothing), but should be dropped when no longer needed.
- Six trigger functions are callable by signed-out visitors (`request_plan_stay`, `sync_booking_stay`, `request_card_photos`, `fill_plan_facts`, `card_to_library`, `invite_rules`). They cannot do anything when called directly, but `request_card_facts` already has this removed and the others should match.
- The view `cards_without_facts` runs with its owner's rights. It is not granted to app users today; keep it that way.
- `.env` is committed. It holds only the public address and public key, which is fine; keep secrets out of it.

## Part 3: Bugs and problems

Confirmed by this review's own checks:

| # | Problem | Where | Effect |
|---|---|---|---|
| B1 | Photo selection is cut off in about 10% of calls (11 of 110) | `supabase/functions/card-photos/index.ts:377` (`max_tokens: 200`) | Haiku 5.5 thinks by default and the thinking counts toward the 200 limit. When it is cut off, the card gets the first images found, unchecked: logos, maps or another place |
| B2 | `review-photo` is not deployed | `src/views/PlacePhotos.tsx:122` calls it; the project has no such function | Approving or rejecting a traveller's photo fails. The app code that calls it is already live (`origin/main` is at `f099113`) |
| B3 | The where-to-stay test reports 11 failures | `scripts/stay-test.mjs:48` | The test accepts only latitude 30–37 and longitude 129–141. The new Sapporo and Okinawa areas are outside that box. The data is right; the test is out of date |
| B4 | A card that loses its plan fields is researched twice | `supabase/functions/suggest-place/index.ts:657` | When the full card format is rejected, the fallback card has no hours, so the database starts a second paid lookup for it. Happened 4 times on 29 October, not since |
| B5 | The local `main` branch is 67 commits behind | local `main` is at `72bf400` (2 November); `origin/main` is at `f099113` | No effect on the live site. A push from the local `main` would be rejected or, if forced, roll the site back |

Passing: type check (0 errors), `test:plan`, `test:split`, the i18n check (1,251 strings, none missing English).

### App screens: bugs found by code review

Each was traced through the code. "Checked" means I re-read the lines myself after the reviewer; the rest are the reviewer's reading. "Needs a device" means the code allows it but it was not run.

| # | Problem | Where | What the user sees | Status |
|---|---|---|---|---|
| A1 | Discover hides every card in a city the questionnaire does not offer | `src/prefs.ts:137`, `src/views/Onboarding.tsx:61-67` | The questionnaire offers Tokyo, Kyoto, Osaka, Nara and day trips. Anyone who finished it never sees the trip's 32 Yokohama cards | Checked, live data |
| A2 | The shared library is never copied into the trip | `src/views/Swipe.tsx:95` | `sync_library` is built but never sent (no `await`). New library cards, refreshed photos and English text do not reach the deck. The trip has 210 cards, the library 311 | Checked |
| A3 | Removing a stop from the plan makes the planner put it back | `src/views/Itinerary.tsx:81-91` | Swipe a stop, Remove, confirm: it reappears a few seconds later. The delete button inside the edit form works | Checked |
| A4 | "Same place, mark like" does nothing on a card you pressed "not now" on | `src/views/AddPlace.tsx:194`, `:280`, `src/views/Places.tsx:845` | The sheet closes as if it worked, but no like is counted and no match can form | Checked |
| A5 | One failed network check turns "not now" off until the app restarts | `src/views/Swipe.tsx:968-988` | Open Discover once on a bad connection: later likes on "not now" cards do not count and the deck can look stuck | Checked |
| A6 | Changing the exchange rate re-opens debts already settled | `src/views/Expenses.tsx:491-501`, `:267` | A repays ₪5,000; someone edits the rate; the screen now says A owes ₪400 | Reviewer |
| A7 | Bookings with no date sort first, not last | `src/views/Bookings.tsx:42` | Undated bookings sit at the top of each tab | Checked (ran it) |
| A8 | The file picker accepts HEIC photos, the booking reader refuses them | `src/views/Bookings.tsx:146` | An iPhone photo of a confirmation fails every time with "couldn't read, try again" | Checked in code, needs a device |
| A9 | An existing account that opens an invite link is not joined to the trip | `src/views/Login.tsx:110` | They log in and land in their old trip with no message | Checked |
| A10 | "Switch to another trip" strands the user | `src/views/TripPicker.tsx:88-123` | The picker lists none of their trips, only "join by code" and "create" | Reviewer |
| A11 | Closing the translator while recording still sends and speaks the translation | `src/views/Translator.tsx:119-122`, `:237-244` | A paid translation is read aloud on another screen | Checked |
| A12 | The iOS app has no microphone or speech permission text | `ios/App/App/Info.plist` | The voice translator most likely fails in the app, and the error sends the user to a Safari setting that does not exist there | Checked in file, needs a device |
| A13 | Closing the add-place sheet in the first second starts a second lookup | `src/views/AddPlace.tsx:213-216` | With credits off, a second full paid search runs | Needs a device |
| A14 | The planner's summary can stay stale | `src/views/Itinerary.tsx:643-665` | Warnings and "spare places" show the previous plan; a re-plan that moves nothing never refreshes them | Reviewer |
| A15 | A queued offline change the server refuses is dropped silently | `src/outbox.ts:137-138` | The app showed it saved; after reconnect it is gone with no message | Reviewer |
| A16 | A failed invite is queued and created later, unseen | `src/views/Home.tsx:326-330` | Invites nobody saw count toward the 10-a-week limit | Reviewer |
| A17 | Home says "the trip has ended" during the trip | `src/views/Home.tsx:121-128` | On a trip day with no city set | Checked |
| A18 | Offline, matches read as zero | `src/views/Swipe.tsx:104-116` | The match count shows 0 and the level can drop | Reviewer |
| A19 | Home's "N places left in Discover" does not match the deck | `src/views/Home.tsx:195` | Home says 12 left; Discover says you voted on everything | Reviewer |
| A20 | In English, editing a planner stop's note changes nothing on screen | `src/views/Itinerary.tsx:747-758`, `:814` | The row keeps showing the old English text | Reviewer |
| A21 | "Done" on Home's next card does not mark the place visited | `src/views/Home.tsx:422` | No rating prompt, and the evening summary skips it | Reviewer |
| A22 | Double taps create duplicates | `src/views/Places.tsx:762-803`, `src/views/Itinerary.tsx:668-700`, `:747-763`, `src/views/TripPicker.tsx:65-82`, `src/views/Stays.tsx:292-309`, `src/views/Essentials.tsx:115-126` | Two plan items, two trips, two stays, every hotel imported twice | Reviewer |
| A23 | Every server failure is reported as "not found" | `src/views/AddPlace.tsx:241-247` | A server error on a link moves the user to "what is the place's name?", which invites a second paid lookup | Reviewer |
| A24 | Flights titled in English are not recognised as Japan flights | `src/views/planUtils.ts:50` | "Tel Aviv → Tokyo" shows take-off and landing as plan rows and breaks the missing-nights count | Reviewer |
| A25 | A trip with no couples is offered the founders' couple names | `src/views/Stays.tsx:42`, `:319` | Testers see "רק שקד ומאור / רק אלמוג ושניר" in the stay form | Reviewer |
| A26 | Linking a hotel booking to a new stay keeps a one-night stay | `src/views/Stays.tsx:276-290` | A 5-night booking becomes a 1-night confirmed stay | Reviewer |
| A27 | "Each couple ticks" items overwrite each other | `src/views/Lists.tsx:66-72` | One couple's tick erases the other's | Reviewer |
| A28 | The iOS app says a document is saved for offline but cannot open it offline | `src/views/Bookings.tsx:174-178`, `:242` | The tick is shown; offline the document does not open | Reviewer |
| A29 | Any load error on stays reads as "not available yet" | `src/stays.ts:24` | Offline, the sheet says "after a server update" and hides the add button | Reviewer |
| A30 | Imported booking notes are always in Hebrew | `supabase/functions/parse-booking/index.ts:38` | English-mode users get Hebrew notes | Reviewer |
| A31 | One stuck offline item blocks every later save | `src/outbox.ts:136`, `:167` | Nothing reaches the server while the app looks fine | Needs a device |
| A32 | A reply lost in transit causes a duplicate row | `src/outbox.ts:168-172` | The same expense or plan item twice | Needs a device |
| A33 | Page scroll can stay locked after two stacked sheets close together | `src/ui.tsx:27-39` | Web only, with Escape | Needs a device |
| A34 | The ratings query puts every card id in one address | `src/views/Ratings.tsx:45` | With a few hundred cards, ratings silently never load | Needs a device |
| A35 | Splitting stays deletes the old proposals before inserting the new ones | `src/views/Stays.tsx:220-232` | If the insert fails, both are gone | Reviewer |
| A36 | A name of only spaces gives "the email is invalid" | `src/views/Login.tsx:71` | Wrong error at sign-up | Reviewer |

### App screens: small problems

Expenses
- `src/views/Expenses.tsx:70-72`: a rate change by another member is ignored until the screen is reopened.
- `src/views/Expenses.tsx:36-38`: category guessing matches inside words ("bar" in "barber", "bus" in "business", "park" in "parking").
- `src/views/Expenses.tsx:344`: an empty title is saved as the category name in the creator's language.
- `src/views/Expenses.tsx:200-203`: in couples mode the "paid by couple" list leaves out a member with no couple.
- `src/money.ts:36-44`, `:91`: an expense with someone who left the trip creates a debt that disappears from settle-up.
- `src/money.ts:25-30`: the leftover yen always goes to the same first people.
- `src/views/Expenses.tsx:374-380`: the list is not reloaded after a save; it relies on live updates.

Bookings
- `src/views/Bookings.tsx:527-534`: two rooms with the same title, time and couple count as a duplicate even with different confirmation codes.
- `src/views/Bookings.tsx:485-567`: any failure after the paid read discards the result; a retry pays again.
- `src/views/Bookings.tsx:552-562`: if the insert fails, the uploaded document is left in storage.
- `src/views/Bookings.tsx:316-317`, `:506-507`: a hotel with dates only gets 15:00 and 11:00, shown as if they were facts.
- `src/views/Bookings.tsx:284`, `:719`, `src/lib.ts:284`: a real 00:00 time shows as date only.
- `src/views/Bookings.tsx:291-299`: the file is sent to the reader without the type check that save has.
- `src/views/Bookings.tsx:337`: a wrong file type shows "upload failed: PDF, JPG, PNG".
- `src/views/Bookings.tsx:345`, `:367`: raw English server messages inside Hebrew alerts.
- `src/views/Bookings.tsx:378-385`: a delete made offline never triggers a re-plan.
- `src/views/Bookings.tsx:150-169`: saved documents of deleted bookings are never removed from the phone.
- `src/views/Bookings.tsx:70`, `:91-100`: Enter on the inner "+ add" button also opens the booking sheet.
- `src/views/Bookings.tsx:395`: a booking of unknown kind shows the first option in the select.
- `src/views/Bookings.tsx:714`: a 4-digit year in a flight title is read as the flight number.
- `src/views/Bookings.tsx:784-787`: a comment at the end of the file with no function under it.
- `supabase/functions/parse-booking/index.ts:42`: 15 MB is allowed, but Claude rejects images over about 5 MB, after the daily slot is used.

Translator
- `src/views/Translator.tsx:237-240`: a late end from an old recording can clear a new recording's state.
- `src/views/Translator.tsx:142-167`: an old error stays on screen after a successful translation.
- `src/views/Translator.tsx:89`, `:178`, `:203`: the `stopping` ref is written and never read.
- `src/views/Translator.tsx:196`: `speechSynthesis?.cancel()` throws if the browser has no speech at all.
- `src/views/Translator.tsx:269`: the technical report says "opened from: Safari" inside the app.

Settings
- `src/views/Settings.tsx:149-153`: the calendar shows 14 months; a trip further away cannot reach its month.
- `src/views/Settings.tsx:87-91`: shortening the trip or moving its start saves with no warning.
- `src/views/Settings.tsx:351`: switching language reloads at once and can cut off a name save.
- `src/views/Settings.tsx:40-44`: closing with a changed name saves twice.
- `src/views/Settings.tsx:291`: the credit amount field cannot be cleared (typing "5" gives "15").
- `src/views/Settings.tsx:271`: raw server error text is shown.
- `src/views/Settings.tsx:154`: `firstMonth` is unused.

Login, trip picker, onboarding
- `src/views/Login.tsx:104`: the unknown-name message lists the four founders' names to every tester.
- `supabase/functions/sign-up/index.ts:26`: a password over 200 characters is reported as "too weak".
- `src/views/TripPicker.tsx:47-61`: on a new device, "switch trip" re-joins the invite trip and overwrites the display name.
- `src/views/TripPicker.tsx:68`, `:80`: raw English errors; the error is never cleared after a success.
- `src/views/Onboarding.tsx:194`: a fast double tap on "next" at the last question skips the summary.
- `src/views/LoginCarousel.tsx:127`: dark styling follows the phone, not the app's own theme.
- `src/views/LoginCarousel.tsx:304-315`: a cancelled touch counts as a tap.
- `src/views/LoginCarousel.tsx:116-120`: a blank phone if the images fail to load.

Stays
- `src/views/Stays.tsx:17`: dates use the phone's language, not the app's.
- `src/views/Stays.tsx:160-168`: the title names the best area while the text below follows the selected alternative.
- `src/views/Stays.tsx:86`: a new stay defaults to the alphabetically first city.
- `src/views/Stays.tsx:276-281`: unlinking a booking leaves the stay "confirmed".
- `src/affiliate.ts:13`: the hotel search always says 0 children, also for the couple with the baby.
- `src/views/Home.tsx:471`: "missing a place to sleep" ignores confirmed stays.

Discover and places
- `src/views/Swipe.tsx:215-222`: two fast taps on undo remove two history entries but undo one swipe.
- `src/views/Swipe.tsx:128-133`: several matches arriving together show only the last.
- `src/views/Swipe.tsx:229-231`: "votes: X of Y" counts places not meant for my couple, so it never reaches 100%.
- `src/views/Swipe.tsx:183-199`: after a "no", the card just swiped can flash as the next card.
- `src/views/Swipe.tsx:144-148`, `:177`: the deck ranking is recomputed on every render (speed only).
- `src/views/Swipe.tsx:405`, `src/views/Home.tsx:278`: member names are not translated here but are elsewhere.
- `src/views/Places.tsx:545-558`, `:589`: a baby note with a line break loses its second line into the general note.
- `src/views/Places.tsx:588-589`: in English, editing a tip saves English into the Hebrew field with a Hebrew label.
- `src/views/Places.tsx:758`: "add to plan" always starts on day 1.
- `src/views/Places.tsx:811`: "added" can show on the wrong place if the pick changes mid-save.
- `src/views/Places.tsx:432`: a dead photo link shows a broken image.
- `src/media.tsx:117-120`: a failed photo is remembered as failed even after it is replaced.
- `src/views/AddPlace.tsx:753-759`: the "for whom" select has no empty option.
- `src/views/AddPlace.tsx:394`: a failed like after adding a card is not reported.
- `src/views/AddPlace.tsx:405`: a place added straight to the list keeps only Hebrew text.
- `src/views/AddPlace.tsx:709-710`: a tip edited in Hebrew leaves the old English tip.
- `src/views/AddPlace.tsx:35-48`, `:221`: offline, "searching…" stays about 12 seconds.
- `src/views/PlacesMap.tsx:17-23`: cafe pins have no legend entry.
- `src/views/PlacesMap.tsx:72`: the dark map is chosen once, at open.

Plan and home
- `src/views/Itinerary.tsx:850-852`: a day's city typed in English never matches the planner's Hebrew city.
- `src/views/Itinerary.tsx:656-663`: the summary fetch has no "latest wins" guard.
- `src/views/Itinerary.tsx:235-237`, `:253`: a landing shows twice.
- `src/views/Home.tsx:81`: "next" can land on a moment that can never be ticked.
- `src/views/Home.tsx:156-158`: two equal hotel lines give duplicate keys.
- `src/views/Home.tsx:362`, `src/views/QuickFab.tsx:104-113`: timers not cleared on close.
- `src/views/QuickFab.tsx:161-164`: in English the wheel is mirrored but the arrow keys are not.
- `src/quickAdd.ts:10-13`: a wheel choice no screen takes can open an add form later.
- `src/App.tsx:222`: on every start the banner says "the server is not answering" until the first load finishes.
- `src/App.tsx:295-298`: a failed re-plan is silent; two taps start two re-plans.
- `src/App.tsx:175`: switching trips shows the old trip's state until the new one loads.
- `src/App.tsx:230-240`: a deleted trip keeps showing from the saved copy.
- `src/App.tsx:225-241`: overlapping loads have no "latest wins" guard.

Lists, baby, essentials, ratings, share
- `src/views/Lists.tsx:22`, `:158`: a failed load shows "the list is empty".
- `src/views/Lists.tsx:46-64`: double Enter adds twice.
- `src/views/Lists.tsx:68`: a member with no couple taps an "each couple" item and nothing happens.
- `src/views/Lists.tsx:79-96`: a delete is lost if the app closes inside the undo window.
- `src/views/Lists.tsx:150`: the assignee is stored by display name and goes stale after a rename.
- `src/views/Baby.tsx:52-56`: two members adding the ready list together insert it twice.
- `src/views/Essentials.tsx:118`: raw error text.
- `src/views/Essentials.tsx:288-289`: a value that starts with a link and has more text becomes one broken link.
- `src/views/Essentials.tsx:380-385`: a screen wake lock can stay on after the card closes.
- `src/views/Ratings.tsx:84-88`: a rating made offline is not kept in the saved copy.
- `src/views/Ratings.tsx:107-114`: two quick star taps flicker back to the first.
- `src/views/Ratings.tsx`: there is no way to remove a rating.
- `src/views/Ratings.tsx:214`: an average of 4.0 prints as "4".
- `src/views/Share.tsx:150-173`: on a dropping connection, "published" and "stopped sharing" can show before they are true.

Built for this one trip (will break for another)
- `src/views/Home.tsx:105` ("Japan"), `src/views/planUtils.ts:344` (couple airports), `src/views/Places.tsx:39` (city order), `src/views/Places.tsx:819` (city "tokyo").
- `src/lib.ts:268`, `src/views/Home.tsx:72-79`, `src/views/Places.tsx:890`: "today" is fixed to Tokyo time.

Checked and found fine: day-boundary date handling, swipe direction in both languages, cleanup of listeners and image links, and the translator's warm-up call (refused before any charge).


### Server functions and database: bugs found by code review

| # | Problem | Where | Effect | Status |
|---|---|---|---|---|
| V1 | A cut-off photo selection stores unchecked photos for good | `supabase/functions/card-photos/index.ts:377`, `:388-393`, `:103` | Same cause as B1. The first three images found are saved to the card, the shared library (every trip) and the place, and a card that has photos is never looked at again | Checked; 11 of 110 calls |
| V2 | Different places share one cache key | `supabase/functions/suggest-place/index.ts:281-299` | The key drops everything after `?`, so two YouTube links, or two Google Maps `?cid=` links, return the same card. A Maps place link is keyed by name only, so the Kyoto branch gets the Tokyo branch's address. A typed "Ichiran" gives every trip whichever branch was searched first | Checked |
| V3 | A held credit is never released if the function dies mid-lookup | `suggest-place/index.ts:476-519`, `parse-booking/index.ts:80-147`, `translate/index.ts:88-140` | The user stays charged, the lookup stays "running" forever, and a retry with the same id gets a 409. Nothing sweeps old holds. No such rows exist today | Reviewer |
| V4 | The flat lookup price has no tie to its cost | `suggest-place/index.ts:584-600`, `supabase/sql/2026-11-02-credits.sql:52` | Up to 40 searches and 8 pictures for 4 credits; a large PDF for 1 credit | Checked |
| V5 | A cached answer never expires, and broken answers are cached | `suggest-place/index.ts:446-460` | Every hit saves a new row dated now, so the 30 days restart. Scores and hours go stale. Roundups with failed cards, and cards without hours or English, are cached as they are | Checked |
| V6 | The reduced-card fallback costs a second paid lookup per card | `suggest-place/index.ts:657-661`, `:715` | Same as B4, with more detail: the card also loses its full English text, and because of V5 every trip served that cached card repeats the second lookup | Reviewer |
| V7 | A lookup that pauses keeps only its last part | `suggest-place/index.ts:598-605`, `card-facts/facts.ts:127-134` | Notes and sources from before a pause are dropped. A lookup still paused after the last round reads as "nothing found" | Reviewer |
| V8 | The planner can drop the last change in a burst | `supabase/functions/plan-trip/index.ts:114-131` | Three quick swipes: the third is answered "queued" and never planned until something else triggers a run. Two runs can also overlap and insert the same place twice | Checked |
| V9 | The planner reads its own guessed cities as if a person wrote them | `plan-trip/index.ts:646-653`, `:714-717`, `stay.ts:302-304` (uncommitted work) | Day 1 is Tokyo, the rest blank: every later day is saved as Tokyo. Setting day 5 to Kyoto then leaves days 6 on as Tokyo | Reviewer |
| V10 | The where-to-stay search slows steeply with trip length | `plan-trip/split.ts:351-383` | Measured locally: 14 days 0.6 s, 30 days 6.7 s, 60 days 40 s. A long trip may be killed by the server's time limit | Reviewer, measured |
| V11 | Being out of credits still uses a daily slot | `parse-booking/index.ts:75-83`, `translate/index.ts:83-90` | The daily cap is counted before the credit check. `suggest-place` does it in the right order | Reviewer |
| V12 | A card whose facts or photos lookup fails is never retried | `card-facts/index.ts:51`, `card-photos/index.ts:62-64`, `:132` | The lookup runs once, when the card is added. On failure, or over the daily cap, the card stays without hours or photos for good | Reviewer |
| V13 | A cut-off answer is returned as a server error | `parse-booking/index.ts:130-152`, `suggest-place/index.ts:624-634` | A long multi-booking PDF gives a 500 that the app reads as a network error. A cut-off place list reads as "nothing found" | Reviewer |
| V14 | A failed address lookup is saved as a permanent miss | `plan-trip/index.ts:255-258` | All 10 saved address lookups in the live database are misses, so every hotel is placed at its city's centre | Checked, live data |
| V15 | A trip with no start date fails on every planner run | `plan-trip/index.ts:350-351` | Nobody sees the error. No such trip exists today | Checked |
| V16 | "שעה-שעתיים" is counted as two hours, not an hour and a half | `plan-trip/index.ts:271-273` | The two-hours rule matches first, so the next line never runs | Checked |
| V17 | With credits off, an app retry starts a second search | `suggest-place/index.ts:425-441`, `:504` | Double spend and two daily slots | Reviewer |
| V18 | A user can spend about 10 free credits in a day instead of 5 | `supabase/sql/2026-11-02-credits.sql:69-84` | The daily top-up row is written only after the first spend | Reviewer |
| V19 | A new card linked by name overwrites the library card's photos for every trip | `card-photos/index.ts:103` | The accidental version of S3 | Reviewer |
| V20 | Two people adding the same new link at once both pay and both search | `suggest-place/index.ts:444-504` | Rare | Reviewer |

### Server: small problems

- `suggest-place/index.ts:270-274`: a database error in the daily-cap check is reported as "daily limit reached".
- `suggest-place/index.ts:615-617`, `:723-726`: a failed list step, or all cards failing, is logged twice.
- `suggest-place/index.ts:294-296`: a link that cannot be parsed is never cached.
- `suggest-place/index.ts:286`: `instagram.com/<user>/reel/CODE` and `/share/reel/…` links are not recognised (no caption, no cache key).
- `suggest-place/index.ts:288`: `tiktok.com/t/…` short links are not followed, so never cached.
- `suggest-place/index.ts:446-457`: if the newest saved answer for a key is empty, an older good one is not used.
- `suggest-place/index.ts:749-770`: "Ichiran Kobe" can return a Tokyo card named "Ichiran".
- `suggest-place/index.ts:759`: 300 full answers are loaded on every typed-name miss.
- `suggest-place/index.ts:704`, `:717`: search words are matched to cards by position only.
- `suggest-place/index.ts:774-792`: no total size cap on pictures; 8 large ones can fail the lookup.
- `suggest-place/index.ts:516-519`: if the search throws, the row stays "running".
- `suggest-place/index.ts:589`: a research answer cut off at the length limit is used silently.
- `_shared/credits.ts:42-55`: after 5 refunded attempts on one id, the hold returns a 503.
- `ai-log.ts:24-25`: an unknown model logs a cost of 0.
- `parse-booking/index.ts:138`: a cut-off answer reads as "could not read this confirmation".
- `card-facts/index.ts:68-79`: update errors are not checked; it reports "filled" regardless.
- `card-facts/index.ts:72`: English text read up to a minute earlier can overwrite a library sync in between.
- `card-facts/index.ts:85`: sets the library card's address to empty when the lookup found none.
- `card-facts/index.ts:90-94`: a re-plan runs for every filled card, matched or not, with no timeout.
- `card-facts/index.ts:64`, `suggest-place/index.ts:112`: "facts are sure" is always set to true.
- `card-photos/index.ts:93`: a re-run can show the old cached image.
- `card-photos/index.ts:98-104`: a library sync between the two updates can blank the card's photos until the next sync.
- `review-photo/index.ts:31-33`: two admins can both review the same photo (harmless).
- `review-photo/index.ts:39-40`, `:57-65`: storage and update errors are not checked.
- `sign-up/index.ts:46`: any database error is reported as an invalid invite.
- `plan-trip/index.ts:226-227`: `JAPAN` and `ROUTE` are defined and unused.
- `plan-trip/index.ts:234-236`: a failed fetch of the media list is remembered as empty.
- `plan-trip/index.ts:552`: a booking is matched to a place by part of a word ("Bar" inside "Barbecue").
- `plan-trip/index.ts:120-123`: the planner's error is saved but the app never reads it.
- `plan-trip/presence.ts:80`: a flight just after midnight leaves the evening before fully planned.
- `supabase/sql/2026-11-02-live-baseline.sql:1240-1245`: one swipe fires two or three planner requests.
- `supabase/sql/2026-11-09-security-fixes.sql:20`: the daily-cap lock is shared by all users and held until the insert finishes.
- `supabase/sql/2026-11-09-security-fixes.sql:39`: a first library sync counts cards without facts against that user's 60 a day.
- `supabase/sql/2026-11-09-security-fixes.sql:139-155`: two trips adding the same new name at once: the second insert fails.
- `supabase/functions/_shared/areas.ts:74`, `:123`, `:37`: broad match words ("nishi", "koto") put addresses in the wrong area; "kume" is listed twice.
- `scripts/stay-test.mjs:50`, `:53`: a comment with no check behind it; "one default base" is checked for four cities only.

### Built for this one trip (server side)

These will give wrong results for any trip that is not Japan, 12 to 31 December 2026, with this group:

- `suggest-place/index.ts:26`: the city list is Tokyo, Kyoto, Osaka, Nara and "day trip". Sapporo, Okinawa and Fukuoka become "day trip", and such a card without coordinates is never planned.
- `suggest-place/index.ts:104-105`, `card-facts/facts.ts:161-162`: closed and open dates outside 12 to 31 December 2026 are dropped.
- Prompts: `suggest-place/index.ts:123-161`, `card-facts/facts.ts:67-93`, `parse-booking/index.ts:30-38`, `translate/index.ts:13-19` (two Israeli couples, December, a 5-month-old baby, Japanese only).
- `plan-trip/index.ts:22-40`, `:250`, `:355`, `:407`, `:624`; `presence.ts:23`, `:72-73`; `plan.ts:66`; `split.ts:62-67`; `stay.ts:209`, `:217`, `:329`.
- `card-photos/index.ts:47`, `:214-223` (Tabelog).
- SQL: `2026-11-02-live-baseline.sql:30-40`, `:130-136`, `:152-178`, `:219-232`, `:336-352`, `:625-628`; `2026-11-02-credits.sql:99-100` (one trip id as unlimited).

## What was not checked

- Nothing was run on a phone or in a browser. "Needs a device" findings are from reading the code.
- The deployed `card-facts` and `card-photos` were not compared with the repository copies.
- The Supabase Auth settings (email confirmation, identity linking) cannot be read from here.
- The planner's placement choices in `plan.ts` were checked only through the passing tests.
- The CSS files were not reviewed.

## Test: finding the same facts without the paid search (11 November 2026)

Step 1, free, run from the Mac (not from the server): for 10 real library places, pages were found with DuckDuckGo's plain results page (one query per place) and, for places to eat, Tabelog's own search. No Claude call and no search fee. The facts on the existing card were then looked for in the text of those pages.

| Place | Kind | Address | Tabelog score (within 0.1) | Opens | Closes | Text read |
|---|---|---|---|---|---|---|
| Stand Age | eat | yes | yes | yes | yes | 6,000 tokens |
| Ginza Harutaka | eat | yes | yes | yes | yes | 5,700 |
| Takiya | eat | yes | yes | yes | yes | 5,700 |
| Jiki Miyazawa | eat | yes | yes | yes | yes | 6,600 |
| Chikamine | eat | yes | yes | yes | yes | 4,400 |
| Tokyo Metropolitan Government Building | see | yes | n/a | yes | yes | 9,300 |
| Tofuku-ji Temple | see | yes | n/a | yes | yes | 10,500 |
| Daikanyama T-Site | see | yes | n/a | yes | yes | 5,600 |
| Expo '70 Commemorative Park | see | no | n/a | yes | yes | 9,300 |
| Shimokitazawa Vintage Shops | see | no | n/a | no | no | 11,700 |

- 8 of 10 places: every checked fact was on the free pages. Expo '70 lacked the street address. Shimokitazawa is a neighbourhood, so its card's address and hours are estimates and the check does not fit it.
- Text read is 4,400 to 11,700 tokens per place, once, against 23,000 to 43,000 with the paid search.
- Tabelog's own search returned the wrong restaurant first for 1 of 5 (Harutaka); the right page came from the results page. A hit has to be checked against the name.
- Some Tabelog addresses answered 403 when several were fetched in a row.

Not shown by this step: that Claude writes the same card from these pages, and that the results page answers from Supabase's servers. The script is in the session scratchpad (`free/retrieve.mjs`), not in the repo.

Step 2, on the server, with a real Instagram link (11 November 2026). A separate test function, `lookup-free-test`, read the post, had Claude name the places from the caption and pictures with no search, fetched pages itself and had Claude write the card with the live lookup's own instructions.

- **Reading the post works with no search.** For the "Coffee Shop Pinocchio" post, Claude read the 2,465-character caption and the picture and named the place, with its Japanese name. Cost $0.0024, 23 seconds.
- **The descriptions come mostly from the caption.** The free card had the hype, reality, tip, price, what it serves and the dishes, in the same style as today.
- **What the caption alone missed** against the current card: the neighbourhood (Oyama, Itabashi), the Tabelog score (3.68), the verdict, and the baby and kosher notes. It also guessed "friendly" for kosher where the current card says "options" because the menu has ham and bacon dishes.
- **Free search does not work from the server.** DuckDuckGo, Brave, Yahoo Japan, Mojeek, Startpage and Tabelog's Japanese search all refused Supabase's servers. Tabelog's English search answers but ignores the search words. Bing answers but returns unrelated pages to a script, from the Mac as well. Only Wikipedia's search answers properly. Step 1 worked only because it ran on a home connection.

So a lookup needs a real search source for the facts that are not in the post. The two that remain: one targeted paid search after the caption has named the place (instead of two or three), or a search service with its own key (some have a free allowance). Neither is tested yet.

Two test functions were deployed for this: `lookup-free-test` (still there, reachable only with the internal token) and `fetch-probe-test` (now an empty stub). Both can be deleted from the Supabase dashboard.

## Test, step 3 (11 Nov): one search plus a free page read

Run on the 10 real Instagram links through the test function `lookup-free-test` (the live lookup was not touched).

What was tried, in order:

| Version | Result |
|---|---|
| Free page fetch only (Claude's own fetch tool, no search) | Fails: Tabelog's search page and DuckDuckGo refuse the fetcher. |
| Post named first, then exactly one search | $0.015 a link. Same card on 4 of 7 single-place links; the others lost the Tabelog score, verdict or hours. The extra "name the place" step also read two posts differently from today (it added Osaka Castle to one, and took a bakery's home city instead of the branch shown). Dropped. |
| Today's flow, with the second search swapped for a free read of the place's Tabelog page, and a rule to search the name as the post writes it | The version to use. See below. |

The version to use, on the seven single-place links:

| Link | Today | New | Card compared with today's |
|---|---|---|---|
| Coffee Shop Pinocchio | about $0.04 | $0.020 | Same; adds the address |
| Onigiri Gorichan | $0.027 | $0.017 | Same (score 3.1 against 3.15) |
| Round1 Stadium | $0.038 | $0.015 | Same; adds hours and address |
| Yakiniku Hanamichi | $0.040 | $0.019 | Adds Tabelog 3.09; verdict "overhyped" against "worth it"; street address missing |
| Hayakawa Hamonoten | $0.037 | $0.016 | Same; adds coordinates |
| Kyoto Gyoza enen | $0.028 | $0.016 | Same hours and address; Tabelog score missing; kosher "hard" against "options" |
| Maguro Ittetsu | not known | $0.015 | Same hours; adds Tabelog 3.05; verdict missing |

Average $0.017 against $0.034: about half. Every link found the same place with one search.

Roundups (several places in one post), run with the earlier wording and a cap of 3 searches: 4 places cost $0.040 and gave 3 cards; 5 places cost $0.047 (today $0.147 with 6 searches) and gave 3 cards; the 2-branch bakery cost $0.023 (today $0.029) and gave both. A roundup needs about one search per place, so the 3-search cap that is live since 828a143 already trims them; this change does not fix that.

Two things learnt on the way:
- When Claude guesses a Japanese spelling for a name the post gives only in English, the search misses and no card is written (2 of 10 links). Searching the name as the post writes it fixed both.
- Tabelog's restaurant pages can be read by Claude's fetch tool for no fee; Tabelog's search pages cannot. The fetch fails when Claude rewrites the address, so the rule says to use it exactly as the search gave it.

Not the same as today: the verdict and the kosher level are Claude's judgment and vary from run to run, in today's lookup too; 2 of 7 cards lost one fact (a score, a street address) and 4 gained one.

### Second round: the three links that had lost a fact, and the roundups

Changes: up to two page reads of up to 10,000 tokens each (the first try often fails because Claude rewrites the address), and the page read is now the rule, not an option.

| Link | Today | New | Card compared with today's |
|---|---|---|---|
| Yakiniku Hanamichi | $0.040 | $0.019 | Full address is back; adds Tabelog 3.09; verdict "overhyped" against "worth it" |
| Kyoto Gyoza enen | $0.028 | $0.019 | Same verdict, kosher level, hours and address; Tabelog score (3.11) still missing: both page reads failed |
| Maguro Ittetsu | not known | $0.022 | Same hours and address; adds Tabelog 3.0; kosher "hard" against "options" |

Roundups, with each place the first research did not reach researched in a call of its own (one search each):

| Post | Today | New | Cards |
|---|---|---|---|
| 5 yakiniku places | $0.147 (6 searches, before the 3-search limit) | $0.078 | 4 of 5; one card is a different branch of the same chain |
| 4 places in Kyoto | not known | $0.055 | 4 of 4 |
| Bakery, 2 branches | $0.029 | $0.058 | Both, with scores, hours and addresses; costs more because it also researched a second shop the post mentions |

Per-place research is tested only in the test function. It is not in the lookup's code: it is a larger change, and for small roundups it costs more than today.

A lookup is not the same twice: in these tests the same code, run again on the same link, changed the verdict, the kosher level or a decimal of the score (Maguro Ittetsu came out "hard" three times and "options" once). Today's live lookup uses the same model and the same card instructions, so it should vary the same way, but that was not measured: no link in the data was looked up twice with a search. "Same" here means the same place, hours and address, with the score when Tabelog's page could be read.

### Third round: the missing Tabelog score

The page read failed when Claude shortened or translated the page address. The rule now says to copy an address from the search results character for character and to prefer the one under tabelog.com/en/. Rerun three times (Kyoto Gyoza enen twice, Onigiri Gorichan once): the page was read on the first try every time. Kyoto Gyoza enen now matches today's card on every field compared: Tabelog 3.1 (today 3.11), "worth it", kosher "options", 11:30 to 22:00, same address, for $0.019 against $0.028.

All test runs together cost about $0.93 of Claude credit.

Code: the single-place version is in `supabase/functions/suggest-place/index.ts` (the search rule in the research instructions, and up to two free page reads next to the search). Deployed on 11 Nov as `suggest-place` version 36, then corrected as version 37 (committed, 21688e9 and the commit after it); the three live files are byte-identical to disk, and the function starts and answers.

### First real lookup, and the correction (version 37)

The first real lookup on version 36 was a 9-place post. Its research step read 113,000 tokens (3 searches plus page reads), which the app's log prices at $0.099 for that step and $0.119 for the lookup, because the log applies the 5x rate past 100,000 tokens. Anthropic's price list puts that rate on a prompt over 100,000 tokens; whether it counts a search loop's tokens added together is not something I could check, so the real bill is between about $0.044 and $0.119. The Anthropic Console's usage page shows which.

Version 37 changes three things:
- A post with several places gets no page read at all.
- One page read per lookup at most, counted across all rounds, and the tool is removed once it is used.
- Page reads are limited to tabelog.com at the tool level, so the text of a post cannot make the lookup fetch another site (raised by the automatic security review of the commit).

Tested on the test function with the same settings: the 9-place post read about 60,000 tokens in total and cost $0.041 with no page read; Yakiniku Hanamichi $0.019 with the page read; Kyoto Gyoza enen $0.017, where the single page read failed and the Tabelog score is missing again. That is the price of the one-read limit: when the first read fails there is no second try.

Real lookup on version 37 (added in the app, 11 Nov 08:32 UTC): an Instagram post about Wagyu Yakiniku Mow Mow Minami Horie. One search, 58,558 tokens read in the research step, 33 seconds, $0.0196 in the app's log. The card has the area, Tabelog 3.34, verdict, kosher level, hours 17:00 to 00:00, the street address and the Hebrew descriptions. The same kind of link cost $0.027 to $0.040 (average $0.034) before, with 2 or 3 searches. This is one lookup; the average over real use will show in `ai_calls`.

### The 10-place link, and version 38

The first real lookup on version 36 (ig:DfWoA-jsOFR) lists 10 places. What came back:

- 3 full cards (Kusaka Curry Honten, Onigiri Gorichan, wad omotenashi cafe): the three the searches went to.
- 3 name-only cards (Udon Kyutaro, Wagyu IDATEN, Takoyaki Wanaka) and 3 with a short text but no address (Rikuro's Cheese Cake, Grenier, Gyukatsu Motomura).
- The 10th place was lost: Claude returned a value the card format does not allow, and the card was discarded with no second attempt.
- The app added 7 cards. It did not add Grenier and Gyukatsu Motomura, which matched cards already on the list. Onigiri Gorichan was added as a second card ("Namba", address in Minamisenba) next to the existing Shinsekai branch.
- Known places are only filtered when saving: the lookup writes a card for every place first.

Version 38 (deployed 11 Nov, byte-identical to disk):
- A card that says nothing beyond its name (no description, nothing to do there, no address) is left out.
- A card whose answer does not fit the format is asked for once more before it is given up.

Not yet seen on a real lookup: version 38 itself, and how the app's progress view shows a place that was left out (the lookup reports it the same way as a card that failed).

### Version 39: a card that is not good enough is not added

Rule from the owner (11 Nov): a card that is not good enough is not added. The lookup now adds a card only when it says what the place is (a description, what it serves or what to do there) and where it is (an address or a neighbourhood). On the 10-place link this also leaves out Rikuro's Cheese Cake and Gyukatsu Motomura, which had a line of text but no address or neighbourhood. Deployed as `suggest-place` version 39, byte-identical to disk. Not yet seen on a real lookup.

### Sheets: swiping down scrolled the page behind

Reported with a screen recording (11 Nov): on the "is this the place?" sheet, swiping down scrolled the Discover page behind it. Two causes, both in `src/ui.tsx`:
- iOS ignores `overflow: hidden` on the body, and a sheet whose content fits has nothing of its own to scroll, so the move passed to the page behind. The sheet now stops a vertical move unless something inside it can scroll that way, also for a finger on the dimmed page above the sheet.
- Pull-to-close did not start from an input, a select or a note field, and this sheet is mostly fields. It now starts from any field that is not being typed in.

Committed (df2e53d). Type-checks; not tested on a phone or in the preview, because every sheet is behind sign-in. It goes live when the app is next published.

### Is a place already in the database free? (11 Nov)

| How it's added | Already in the database | Cost |
|---|---|---|
| Same Instagram/TikTok link again, within 30 days | Saved answer reused | Free |
| Typed name or Google Maps link | Exactly one researched place or one live library card fits | Free |
| A new link whose places are already known | Researched again; duplicates are dropped only when saving | Paid |

In the last 30 days 3 lookups were answered free and 18 were paid. The library has 1,642 cards, of which 237 are live and reused; the rest stay private to the trip that added them.

### Tested and not put live (11 Nov)

Both in the test function `lookup-free-test` only; the live lookup stays at version 39.

**Known places checked before researching a new link.** On the 10-place link it found 1 of 10 places known, saved no search (the other 9 still needed the 3), and added a call of about $0.002 to every lookup. Its one match was wrong: the post's Gyukatsu Motomura in Osaka was matched to the Shinjuku (Tokyo) card, because the post did not say where the shop is. Not worth putting live.

**The server reads the Tabelog page itself.** Tabelog's English restaurant pages answer the server (its Japanese pages and search pages refuse it). Findings over 4 rounds on up to 6 links:
- The page match must require every word of the place's own name in the page title. Looser rules used a closed izakaya and an Italian bar in Umeda for a sushi bar there, and another gyoza shop in Gion for Kyoto Gyoza enen.
- With the strict match, the last round gave full cards (score, hours, address) on 5 of 5 single-place links, and the page was read on 4.
- It did not save money: 2 of the 5 used a second search, so the average was $0.021 against about $0.019 live.
- A same-name shop can still pass: for Coffee Shop Pinocchio it read a page from another Tokyo area (A130202), so the hours may be another shop's.

Not put live: it makes cards more complete but not cheaper, and same-name shops still slip through.

Test runs today cost about $1.40 of Claude credit in total.
