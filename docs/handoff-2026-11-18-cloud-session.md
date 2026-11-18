# Handoff, 2026-11-18: cloud session "Commit changes"

For the Mac session (and anyone after it). Everything below is on branch `claude/commit-changes-lmx6io`, which was
merged with `main` at `9c86ec0` on 18 Nov, so the agent org (`.claude/`) is there too. Nothing from this session was
pushed to `main`, applied to the live database or deployed. In this session the owner said: agents don't commit or
push, but the main session may (to the session branch).

## 1. Ship now (before the trip): map, hotel counting, three UI fixes
Cherry-pick onto `main` in this order, after the two map commits the Mac already has (`185bade`, `c2a4d12`):

| Commit | What |
|---|---|
| `912c0d3` | Hotel button: `hotel_shown` once per card per open; `hotel_tap` gets `partner: 'booking'` and `linked` (whether a partner ID was in the link). For the tap rate on Toogo HQ. |
| `ede1d55` | Dark map everywhere: `src/ready.ts` saves the colour street map for offline (it saved the grey tiles in dark mode, so the Places map could be blank offline); the card map in More details (`AreaMap.tsx`, `places.css`) darkens in CSS. Also the qa book: `page.route` misses the realtime websocket, use `routeWebSocket`. |
| `87e394c` | Esri credit above the tab bar, city chips 12px from the screen edge, dark sheets on #1c1c1e so their edge shows. |
| `ebf824b` | The credit fix that works: z 1000 inside the map (it was painted under the tile pane), at inline-end so it clears the legend in Hebrew. |
| (next commit) | The season note on the swipe card may run to 4 lines (3 on screens under 700px). Harmless without seasonal data, but it belongs with section 3, so it can wait. |

How the map works now (`185bade`, `c2a4d12`): one colour Esri street map in both modes; dark mode inverts and
hue-rotates the tile pane in CSS (`@media (prefers-color-scheme: dark)`, which `themeOverride` also applies to
`data-theme="dark"`), so it follows a theme change at once with no JS.

Checked in the cloud (mocked preview build, 390x844, Hebrew and English, light and dark, Supabase mocked, Esri tiles
replaced by a generated image): dark map switches at once in all 5 phone/app theme combinations; credit visible in all
4 map screens and hidden under a sheet; chips 12px; dark sheets pass; `hotel_shown` sent once, `hotel_tap` props right.
tsc, build, i18n-check, test:stay pass.

On the phone, ask the owner to check: colours in dark mode, switching dark mode with the map open, the credit just
above the tab bar, chips off the edge, a dark sheet's top edge, and whether small white streets are readable in dark
(qa's one worry: they become nearly black on dark land; the real tiles have grey road edges the test image lacked).
Push to `main` only after the owner says it looks right. Toogo HQ task t41 tracks it.

## 2. Toogo HQ (https://claude.ai/artifact/61a3uZC75rdJ7uBVMTrMAv)
- New **Partners** page (tag icon): a card per partner (Booking.com, Klook) with status, assumed commission, open
  questions, where the links go, sign-up link; status, follow-up date and notes are editable. Live numbers from
  `events`: hotel button seen (devices, 30 days), taps, tap rate, taps per day. Commission shows "Not connected", not 0.
  Data: collection `partners` (docs `booking`, `klook`), SQL key `partners` in the page's query.
- Tasks added: t41 (map, now), t42-t48 (affiliate, after the trip: apply to Booking.com and Klook 5 Jan, Klook reminder
  19 Jan, partner ID in the app, Klook links, first partner report; t47 = hotel counting), t49 (season notes, apply
  after the trip, due 8 Jan). Milestone m10: apply to Booking.com and Klook, 5 Jan.
- The page doesn't notify sessions; tell the owner to mention changes in chat.

## 3. After the trip: seasonal card notes (built, NOT applied)
Owner's ask: cards gave weather and season advice for December only; every trip should see advice for its own dates.
Spec: `data/seasonal-2026-11-18/SPEC.md`. Seasons: winter Dec-Feb, spring Mar-May, summer Jun-Aug, autumn Sep-Nov. A trip
gets the season covering most of its days (tie: the season it starts in); no start date, nothing shown.

Commits: `fe3fe99` (app: `src/season.ts`, Swipe card and More details, `test:season`), `132af54` (server), `3a60879`,
`00c9036`, `157ab53` (the cards), `28b84c9` (English "Best in autumn", season order), plus the 4-line commit.

- `seasonal jsonb` on `place_library` and `candidates`: per-season notes (he/en), `only` (season-only places, shown as
  "בעיקר בחורף" / "Best in winter" on other trips), `dated` (facts tied to dates, shown only when the trip overlaps).
- 271 live library cards rewritten so their general text holds in any month (203 winter notes, 110 cards with dated
  facts). Source: `data/seasonal-2026-11-18/out-{a,b,c}.json`. Notes for other seasons from general knowledge are
  flagged in `unsure`. Hase-dera, Kodai-ji, Nabana no Sato and Roppongi Hills Christmas Market were left out (owner's
  call, unsure facts).
- New cards: `card-facts` and `suggest-place` research for the trip's own dates (was hard-coded 12-31 Dec 2026) and
  return season notes; no extra Claude calls, caps unchanged.
- Apply order: 1) `supabase/sql/2026-11-16-library-poisoning.sql`, 2) `2026-11-18-seasonal-notes.sql`,
  3) `2026-11-18-seasonal-cards-apply.sql` (generated by `scripts/seasonal-apply.mjs`, backs up every touched row),
  4) deploy card-facts and suggest-place, 5) the app. **4 and 5 before 2 break adding a place** (AddPlace writes
  `seasonal`). Neither SQL file has been run on any database.
- Checked: tsc, test:season (with tie, year boundary, no dates), seasonal-apply-test, seasonal-research-test,
  suggest-guard and guard tests, i18n-check; qa screenshots of a winter and a spring trip (right note, dated only when
  overlapping, mirrored, buttons don't move).
- Owner's open decisions: dated notes look different from season notes in More details (orange, info icon) - keep?
  A closure during the trip shows only in More details, not on the swipe card - add it? Some dated ranges are
  estimates ("early December" = 1-10 Dec); a few winter notes mention Christmas without the word December (Red Brick
  Warehouse, Umeda Sky, Sapporo White Illumination, Queen's Square, Kagura Wednesday, Kakifune, Daimaru Kyoto).

## 4. Other open items
- **Affiliate plan:** the owner's own email of 18 Nov ("Affiliate Monetization | Booking.com ו-Klook") has the plan and
  two draft partnership emails. All affiliate work is after the trip (tasks t42-t48). `src/affiliate.ts`
  `AFFILIATE_ID` is the one place for the Booking.com partner ID.
- **Map without Japanese labels:** the owner doesn't want kanji on the map. Esri's street map shows Japanese names at
  street zoom and has no setting for it. Proposed: OpenFreeMap (free, no key, vector tiles; labels can prefer Hebrew,
  then English, then Latin spelling, never kanji; needs MapLibre, bigger bundle; its dark style is unfinished; terms
  for paid apps unclear). Later option: Apple MapKit JS after Apple Developer enrolment (250k map views a day free).
  The owner hasn't decided yet; the cloud session couldn't reach the tile servers to try it.
- **qa, older and unfixed:** in Hebrew the stay row shows "Shinjuku" ahead of "טוקיו" (bidi order of a Latin area name).
- **qa book:** `01-safe-testing.md` now names `routeWebSocket`; on 18 Nov a first run reached the real realtime host
  with the public key and a fake token (no account). Every run since blocks and logs all non-localhost hosts.
