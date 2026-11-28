# Planner fixtures

Run with `npm run test:plan` (one fixture: `node scripts/plan-test.mjs yokohama`; `VERBOSE=1` prints each plan).

Each `*.json` is `{ name, description, knownFailing?, days, units, fixed, expect }`. `days`, `units`, `fixed` are what
`plan()` takes; `days[].at` is an object couple → presence (the harness turns it into the Map). Always checked: every
unit sits on a day all its couples are present, in the unit's base (or within 30 km / a day trip's reach), not on a
closed weekday/date, and is never both placed and unplanned. `expect` adds: `noIssueKinds`, `emptyDays`, `onlyDays`
(id → allowed days), `unplanned` (id → reason), `placedMin`, `fillBefore`, `stable` (re-run with the result as `current`:
no unit may move). `knownFailing: true` reports a failure without failing the run.

## Adding a real fixture from a live dry run

POST `{trip_id, dry:true}` to `plan-trip` with the planner token (`x-plan-token`, see HANDOFF). The response has
`input: { units, fixed, days }` (days' `at` is already an object). Save that object as `scripts/plan-fixtures/real-<date>.json`
with a `name`, a `description` and an `expect` (e.g. `{"stable": true, "noIssueKinds": ["hours"]}`). It holds real
place names and hotel coordinates: keep ids only if you don't want them in the repo, and note `current` is the
live plan's day, so `stable` then checks the live plan against itself.

## Presence fixtures (stays)

A fixture with `presence` instead of `days` builds its days with `buildDays` (`supabase/functions/plan-trip/presence.ts`),
the same code `index.ts` runs: `presence: { startDate, numDays, couples, sleeps, dayWho?, flights?, capOf? }`, a sleep being
`{ party|null, checkIn, checkOut, city, point, label, key, confirmed, booked }`. Extra `expect` keys: `presence`
(`{ "<day>": { "<couple>": { base, start?, end?, estimate? } | null } }`) and `estimateDays` (the days whose times rest on a
stay with no hotel booking). The `stays-*` fixtures cover no hotels, some booked, all booked, and different dates per party.

## Where-to-sleep fixtures (no hotel)

A fixture with `trip` starts one step before `presence`, the way `index.ts` runs with no hotel booked:
`trip: { startDate, numDays, couples, cities: { <id>: { lat, lng, en, he } }, stays? | dayCities?, places }`. `stays` are
trip_stays rows (`{ city, check_in, check_out, party?, area?, lat?, lng?, booked? }`); without them `dayCities`
(`{ "<day>": "<city as written in day_info>" }`) stands in, as for a trip with no stays and no hotels at all. `places` are
`{ id, city, point, mins, category, priority, best?, couples? }`. The harness runs `stay.ts` (recommended area per stretch,
`sleepsFromStays` / `sleepsFromDays`), `buildDays`, then each place's base and day trip (`baseFor`), and plans. Extra
`expect` keys: `recommend` (`{ <city id>: <area key> }`), `dayTrips` (ids that must be day trips, placed, on days with
nothing back in town) with `dayTripDays` (at most that many days), `notFar`, and `oneBase` (each city's nights sleep at
one point: no hotel change inside a city). The recommendation for each stretch prints under the fixture's line.
Unit tests of `stay.ts` itself: `npm run test:stay`.

## A made-up trip with places (`trip-20-days.json`)

A 20-day, four-city, two-couple trip with 126 liked places, all invented people. It is generated, not written by hand:
`node scripts/plan-fixtures/gen/make-trip-20-days.mjs scripts/plan-fixtures/trip-20-days.json`. Change the generator
and run it again; do not edit the JSON. Never put real members' names in a fixture.

## Four couples (`four-couples.json`)

Four invented couples, 8 days, Tokyo then Kyoto, 42 places taken from the made-up trip above. One couple sleeps in
another part of Tokyo, one lands on day 3 with a baby, one flies home on day 7, and each place is liked by all four, by
three, by two or by one couple alone. It is there so a trip of more than two couples is planned in every run of the
tests. Generated: `node scripts/plan-fixtures/gen/make-four-couples.mjs scripts/plan-fixtures/four-couples.json`.

## The fixes test and the numbers

- `npm run test:plan-fixes` (`scripts/plan-fixes-test.mjs`): one test per planner fix of 2026-11-26 (meals, order on
  the map, hours and season, couples and days apart, real points, move/landing/departure days, baby and card facts),
  and `r1` to `r7` for the round-2 fixes of 2026-11-27 (a place both couples liked comes first, flags from the card's
  facts in `flags.ts`, a lone far place is not a day trip, meals on a day in another city, an early dinner on the day
  they fly home, known points before unknown ones, an "afternoon" restaurant as a late lunch),
  and `r8` to `r12` for round 3 (a place with no coordinates at its neighbourhood's station, an unknown point first or
  last in the day's order, a couple that flies out in the morning is not company for the day, a place left out goes
  into a day's free hours when the day's times take it, a shared morning market is the lunch of the couple with none).
  and `r13` to `r15` for round 4 (a sight with no hours whose card says "any" and calls it a path, a walk, a garden or
  a park is over by dusk; a day that starts by 14:15 gets a late lunch as its first stop, started by 14:45; one
  couple's own far place between two stops in the same part of town moves to another day or waits, so nobody rides
  out and back).
  and `r16` for round 5 (any stop that makes the day's line ride back across town moves to another day, the place of
  the fewest people first; one couple's own place, or a place of a couple alone that day, waits when no day takes it).
  and `r17` to `r19` for round 6 (no day keeps a ride out and back, also when every stop on it is shared: the day is
  timed again, a stop moves or changes places with one of another day, or the fewest, least wanted wait; a day with no
  meal gets one from a day with two, a stop that is not a meal giving way if the pace has no room; a lunch pushed out
  of the lunch hours by a stop that had to come first comes back into them, and that stop gives way).
  `node scripts/plan-fixes-test.mjs r3 r4` runs only those; `PLAN_DIR=<a copy of plan-trip>` runs them on another
  version (each must fail on the version before its fix).
- `npm run test:plan-cpu` (`node scripts/plan-cpu-test.mjs`, round 7): the planner's CPU time on a trip of 20 days and
  139 places (`real-japan.json` plus 27 made-up places with no day yet), each measurement in a new process, best of
  three, the whole process's CPU around `plan()`. It fails over 1200 ms (1600 before round 12). A Supabase edge function
  gets about 2 s of CPU for one request; the code before round 7 took about 4000 ms here, after it about 1100 ms, before
  round 12 about 905 ms and now about 790 ms. The numbers are of
  one machine (Apple silicon, Node 26): `PLAN_CPU_BUDGET=<ms>` sets another budget on a slower one, and
  `PLAN_DIR=<a copy of plan-trip>` measures another version. The goal of 800 ms is met, barely.
- `npm run test:plan-skip` (`node scripts/plan-skip-test.mjs`, round 12): a run asked to plan the input it has just
  planned gets the kept plan back (`memo.ts`), and that plan is the plan a new run gives, on every fixture here; any
  change in the input is planned again; the planner does not change what it is given. Round 13: the addresses a run may
  look up are read from `geo_cache` in one read (`primed` in `geo.ts`), and every lookup asks and answers as it did
  with one read for each. The run loop's wait (a change inside it costs no second run) is in `plan-error-test.mjs`.
- `node scripts/plan-metrics.mjs`: one row of numbers per fixture (places planned, meals filled, km, places after
  closing or after dark, and so on). `PLAN_DIR=<a copy of supabase/functions/plan-trip> node scripts/plan-metrics.mjs`
  runs the same fixtures on another version of the planner, for a before/after table. The copy needs `_shared` beside
  it (`../_shared/areas.ts`).
- `node scripts/plan-fixes-test.mjs r20` (round 9): the made-up 20-day trip planned as written, backwards and in five
  shuffles of its places must give the same places on the same days at the same times. `plan()` sorts the places by id
  first; before that the rows' order alone moved a real trip between 82 and 84 places on a day. (Round 10 replaced
  the sort by id with `inOrder()`: by what the place is, the id last.)
- `node scripts/plan-fixes-test.mjs r21` (round 10): the same made-up trip with every place under a new random id, ten
  times, must give the same places on the same days at the same times. The planner broke its ties by id; ids are
  random, so the same trip gave 95 to 97 places here (81 to 84 on a real trip). `PLAN_DIR=<a copy of the round-9
  plan-trip>` shows the test failing.
- `node scripts/plan-fixes-test.mjs r22` (round 11, for a round-10 step): one day, two couples, nine made-up places,
  one more than the day takes. A mall both couples liked at four stars must be on the day; a couple's own three-star
  market waits instead. This is the lift: a place left out is tried with one stop of the day taken off. The round-9
  code, or the current code with `lift()` switched off, leaves the mall out.
- `node scripts/plan-fixes-test.mjs r23` (round 11, for a round-10 step): a morning garden, and the museum they want
  most, which is reached too late after the garden. The museum stays and is on time, the garden gives way, and what is
  left out is said to wait for room (`full`), not to be closed. This is `mendLate()`. The round-9 code, or the current
  code with `mendLate()` switched off, takes the museum off and calls it closed.
- Not tested: the out-and-back last step (a meal gives way when nothing else undoes the ride back). No small made-up
  day sets it off; it needs a full day whose other days are full too. And no test says "a place both couples liked at
  four stars or more that fits in a plan of such places alone is in the full plan": it does not hold (round 11 tried
  laying those places out first and did not keep it; the planner page says why).

## Who a trip is planned for (`scripts/plan-parties-test.mjs`)

`npm run test:plan-parties` runs plan-trip's own `index.ts` (the dry path) on a made-up trip built in the script: six
days, Tokyo then Kyoto, 24 made-up places, made-up people. A stand-in for the Supabase client serves the rows; there is
no network and no database. The shapes: one, two and three people with no couples (the app's own trips: the vote rows
come as `couples: null, voted: [], yes: []`), one named couple, a couple and a party of one, a couple and a member with
no couple, and the where-to-sleep answer for a trip with no couples. Then two couples and a member with no couple:
that member's like counts as one more yes (a `~` name in the vote rows, see `parties.ts`), their no or silence takes
nothing off, they get no days of their own, and the `~` name reaches nothing the app reads. Each must plan its places, take nothing off, have
no out-and-back and no bad time, fill meals, and show the app no made-up couple name.
`PLAN_DIR=<another copy of supabase/functions/plan-trip>` runs it on that code (the copy needs `_shared` beside it).
