# Stress test, 14 Nov 2026: 50 simulated users (stopped at 22)

## Setup
- **Users:** 50 Haiku agents, each a person with a persona, in 17 groups of 2–4: 13 English groups and 4 Hebrew groups.
- **App:** the real built app (this branch) in headless Chromium, one phone-sized browser per user, against the **production** Supabase project.
- **Driver:** every network request each phone made was logged (`scratchpad/stress/requests.jsonl`), and the database was measured with `pg_stat_statements` before and after.
- **Flow:**
  - A creator signs up with an invite, creates a trip and invites their friends from Home.
  - Friends sign up through those links and join automatically.
  - Then everyone plans freely and talks in a group chat.
- **Free-user limits:** `features.trip_pass` was on during the run (10 free new places per trip), then switched back off. The agents could make up to 5 place lookups and 3 translations each.
- **Real trip:** untouched. All 17 table fingerprints (rows and md5) of the real trip, its 4 users and the library are identical before and after.

## Outcome: production saturated at ~20 concurrent users, so the run was stopped
Only 20 agents can run at once in this session, so 22 users took part over the run (pilot pair, then 20 in parallel). By minute 9 the backend was failing, and the run was stopped at minute 15 so the real users wouldn't sit on a dead app. **It recovered about 40 s after the load stopped.**

| minutes | active users | small GETs, median | p95 |
|---|---|---|---|
| 0–6 | 2 | 0.37 s | 0.96 s |
| 6–9 | ~20 joining | 0.43 s | 7.5 s |
| 9–12 | ~20 | **12 s** | 35 s |
| 12–15 | ~20 | **36 s** | 86 s |

- Peak load: ~540 requests/min (≈9/s). 2,911 requests in total, **320 MB** downloaded, 357 failed (13%).
- Failures:
  - Postgres `57014 statement timeout`
  - PostgREST `PGRST003` "Timed out acquiring connection from connection pool"
  - `ERR_FAILED` and connection resets
  - 40 of 78 pg_net calls to edge functions timed out
- Only **6 trips** formed (20 members); several joiners never got past sign-up or join.

## API calls per user
- An active user made **13–55 requests a minute**. The two heaviest users (U39, U01) made 526 and 429 requests, 291 and 255 of them full `candidates` reloads.
- By type: REST 2,175, RPC 473, Storage 18, edge functions 41, auth 21; 67 realtime sockets.
- **`GET candidates` was 29% of all requests and 315 MB of the 320 MB.** Each call returns the whole deck (~450 KB, `select('*')`), and the median call took 15 s under load.
- Opening the app once makes about 25 requests, and fetches `candidates` **twice** (≈900 KB).

## Database time (pg_stat_statements diff, 1,239 s of execution in 15 min)
| share | what |
|---|---|
| 472 s, 38% | `select * from candidates where trip_id=…` (903 calls) |
| 177 s + 51 s | Realtime WAL polling and subscription checks (`realtime.list_changes`, ~1,860 calls) |
| 124 s | `trip_place_couples` (534 calls) |
| 88 s | `track` (144 calls, 0.6 s average) |
| 65 s | `plan_place_couples` (365 calls) |
| 45 s | `card_interest` (29 calls, 1.5 s each) |
| 89 s | swipe inserts: 1.2–6.9 s **each**, because of their triggers |
| not counted | `sync_library` calls that timed out (Postgres doesn't record those); most of them did |

## Root causes, most important first
1. **Realtime refetch storm**, in `useTripTable` (`src/lib.ts:163-175`):
   - Every realtime event refetches the *whole* table, with no debounce.
   - When a new trip's first `sync_library` inserts ~240–500 `candidates`, each phone in that trip refetches all of them hundreds of times: U39 did 165 refetches in one minute.
   - The extra listener on `DELETE` has no trip filter, so a delete in *any* trip makes *every* open phone refetch that table. That grows with the square of the user count.
   - Fix: debounce or coalesce reloads (e.g. one per 500 ms), apply the row from the event instead of refetching, and select only the columns the deck needs.
2. **`sync_library` cost grows with cards × cards**, and it runs on every Discover open (`Swipe.tsx:128`):
   - Its `not exists (… same_place_name(c.name, l.name))` check can't use an index.
   - With a trip that already has its cards, it hits the 8 s timeout. This happened already with 2 users, and almost always under load.
   - Fix: compare a stored normalized-name column with an index, and/or run the sync only when the library changed (version stamp).
3. **Every swipe starts a full replan on the server:**
   - Trigger `swipes_replan` → `request_plan` → `net.http_post` to `plan-trip`.
   - Trigger `swipes_match` → `match_place`.
   - So a fast swiper sends a burst of plan-trip runs. Fix: run the replan with a debounce per trip (a queued flag, run at most every N seconds), or only when the plan screen is opened.
4. **Small connection pool:** `PGRST003` at ~9 requests/s says this compute size can't absorb the bursts above. Fixing 1–3 removes most of the load. A bigger compute add-on only moves the limit.
5. **`track` takes 0.6 s on average**: it is called on every screen change, and about 1 call in 200 also runs `events_cleanup()` inline.

## What the users hit (from 13 written reports)
- **Blocked:**
  - Sign-up spinner "Creating account…" for 15–40 s.
  - "Saving…" → "Loading…" → "Joining the trip…" for up to 5 min after the questionnaire.
  - "Couldn't add you to the trip" on join (U12).
  - The invite landing page stuck on "Loading…" (U21, at the peak).
- **Discover:** Like or Skip doesn't move the card ("20 left", Undo stays disabled). The "Server not responding · Sending 1 change…" banner stays for minutes, and likes appear later.
- **Plan:**
  - "We know the nights per city" stuck on "Checking how many nights are open…".
  - "Only flights, suggest something" → "Couldn't suggest a split right now".
  - Add a stay doesn't close on Save.
- **Duplicates:** list items added 2–3 times. Add gives no pending state while the server is slow, so people tap again (U40).
- **AI lookup:** "Searching, up to a minute…" never ended for 3 of 4 lookups. One finished in ~35 s (with "To Discover, for voting" then stuck on "Saving…"). One lookup's "What they serve" text came back in Hebrew in the English app.

### Bugs that are not about load
- **Your group's couples are hardcoded:** "Only Shaked and Maor" and "Only Almog and Snir" appear in every trip's "Whose" select (`COUPLE_AIRPORT` in `src/views/planUtils.ts:344`, `src/i18n/en-a.ts:98`).
- **Default list items are in Hebrew** in an English trip.
- **The questionnaire's diet step starts with everything on**, pork and seafood included. A kosher user can miss it.
- **The food step disables options after 3 picks without saying why.**
- **"Bars and nightlife" is below the fold** with no hint that the list goes on.
- **A new trip is always 14 days with Tokyo, Kyoto and Osaka:**
  - The cities picked in the questionnaire aren't used.
  - Tokyo comes back after being removed.
  - "13 nights" in a 10-day trip is not flagged.
- **Route options say "less comfortable" without saying why.**
- **The trip code on Home differs from the invite code**, which confused people.
- **A trip-pass hold can stay `reserved` forever** if the lookup dies mid-way (1 such row after the run). The trip then loses one free place. `reserved` holds need an expiry.

## Trip pass: is the free allowance enough?
Not answered by this run. No trip used more than 1 new place, because the AI lookups mostly died under load: 2 holds, 1 settled, total AI spend $0.018. The groups that did plan used the library cards (237–499 per trip) and added almost nothing new. That hints that 10 free places is plenty for most groups. To answer it properly, the test should be repeated after fixing causes 1–3.

## Clean-up
The stress accounts (21 users, 6 trips and their rows) are still in the database. `scratchpad/stress/cleanup.sql` removes exactly those: it is scoped by `toogo.stress.uNN@example.com` and aborts if any real user or the real trip is involved. It also deletes the 17 test invites.

## Run 3 (after fixes 1–3), 14 Nov, 12:02–12:08
- **Users:** 20 agents started (G01–G04, G12, G13); 17 got into the app and 6 trips formed before the brake. The brake stops everyone when the slowest 5% of small requests take over 5 s, or more than 15% fail.
- **Compared with run 1:**
  - 695 requests and **0 failures** (run 1: 13% failed).
  - **33 deck downloads, 10 MB** in total. In run 1, one phone made 165 deck loads in a minute.
- **Response times:** the median stayed at 0.2–0.3 s for five minutes. The brake tripped at 5 min 15 s, when the slowest 5% reached 5.4 s.
- **What slowed it:** the deck query (`select * from candidates where trip_id = …`).
  - It used 80% of database time: 89 calls averaging 4.2 s under load.
  - On an idle database the same query takes 64 ms for 496 cards (RLS ~15 ms), so the 4.2 s is waiting for CPU.
  - Each card is ~2.8 KB as stored and ~2.6 KB as JSON. The English text (`en`, ~880 characters) goes to Hebrew phones too, so a deck is ~1.3 MB of JSON built by Postgres.
  - The other half of the API traffic was the planner: ~33 `plan-trip` runs, which is one per trip per burst, as expected after fix 3.
- **Capacity:** the database is the Micro size: 60 connections, 224 MB shared buffers, shared burst CPU. Supabase says sizes up to Medium burst and then drop to a baseline; Large and above are dedicated.
- **Next, in order of effect:**
  1. Don't copy the library into every trip. Every trip holds a copy of 240–500 library cards (`sync_library`): 1.3 MB per deck download, and 500 rows written per new trip, each sent through realtime. Serve library cards from a static file (like the guide pages) and keep only the trip's own cards and votes in the database.
  2. Realtime by Broadcast per trip instead of Postgres Changes, with the changed row sent instead of a reload.
  3. A bigger compute size before a real launch: Small or Medium to absorb bursts, Large for steady load.
  4. RLS: `trip_id in (select my_trip_ids())` instead of `is_trip_member(trip_id)` per row (small gain).

## Scale test with scripted users (after the redesign), 14 Nov, 13:09–14:52
Scripted users in Node (`scratchpad/load/loadbot.mjs`), each a real account. Each one:
- signs up with an invite, then makes or joins a trip;
- opens the app with the same requests the new app sends (deck by revision, `sync_library`, `card_interest`, …);
- holds the trip's live channel;
- swipes every 3–6 s, now and then adds a list item or an expense, and reopens the app every few minutes.

No AI calls. Sign-ins are paced by Supabase's limit of 1,800 an hour per IP address. Brake: the slowest 5% over 5 s, or over 5% of requests failing.

| run | what | result | cause / fix |
|---|---|---|---|
| sign-up rush, 360 users | sign-up + swiping together | brake at ~38 active | new trips' first syncs |
| setup only, 300 users | creating trips, nobody swiping | broke at ~40 trips: 139 `sync_library` timeouts, lock waits up to 6.6 s | members' syncs of one trip waited on each other → **one sync per trip at a time** (applied) |
| 273 users sign back in, then waves | opening the app; then swiping | opening: all 273 fine (slowest 5% ~0.5 s); swiping: brake at 40 active | every swipe started a planner run (~30 requests): 1,164 of 1,299 requests in a minute → **planner on matches only** (applied) |
| the same, again | waves of 40 every 90 s | see below | |

| active users (each swiping every 3–6 s) | median | slowest 5% | failures |
|---|---|---|---|
| 40 | 0.17 s | 0.2 s | 0 |
| 80 | 0.17 s | 0.2 s | 0 |
| 120 | 0.17 s | 0.33 s | 0 |
| 160 | 0.2 s | 0.6 s | 0 |
| 200 | 0.8 s, then the brake | 8.8 s | 0 |

- **The limit now is the machine, not one query.** Postgres itself used ~73 s in 19 min (a swipe: 4 ms), and Supabase's own logs show the same climb at 200 (slowest 5% 7.6 s server-side). At the limit the API was serving ~60 requests a second in total, about 30% of them from the planner (one run of ~30 requests per match). On Supabase the API, auth and realtime run on the project's machine, here the smallest paid size with shared, bursting CPU.
- **Realtime let in ~200 connections and refused the rest** ("transport failure"): the plan's concurrent-connection limit. Every open phone is one connection.
- **What 160 active users means.** These users swipe nonstop. If ~5% of users are in the app at the busiest moment, 160 active is about 3,000 users. The ~200 open-phone limit is tighter: with 10% of 2,000 users having the app open at once, it is reached.
- **Next, in order:**
  1. The realtime limit: spend cap off (10,000 connections).
  2. A bigger compute size (Small/Medium for bursts, Large dedicated).
  3. The planner: one database call per run instead of ~30.
  4. The library as a static file instead of a copy per trip.
