---
title: Known UX debts (QA round 2026-11-16, audit 2026-11-27)
chapter: debts
explains:
  - Swipe
  - PlacesMap
  - Itinerary
  - Settings
  - Translator
  - LoginCarousel
  - Guide
  - QuickFab
  - errorText
  - LoadError
  - LoadNote
  - Skeleton
  - say
  - OfflineBanner
---
Full list: `docs/qa-2026-11-16.md` (the top section is prioritised; "Full notes" below it is per screen). Per rule 8, list every problem however small. Items fixed in commit cfdb3cc are left out here; confirm anything below against the code before working on it, many are from read-only reviews.

## High (before more users)
- Discover: "not now" on all cards gives the wrong empty state and "show all" does nothing; drag starting on photo edges does nothing (photo-tap zones are 34% each side); undo race on double tap.
- Settings: changing trip dates silently shifts bookings, stays and items, no warning; failed rename keeps the value.
- Menu: "Switch trip" dead end for a one-trip user (list added in cfdb3cc; re-verify).
- Maps: places at identical coordinates cannot be opened.
- First run: 8 questions before the first card; invited users cannot skip them; sign-up sheet every 12 swipes; push asked after 3 likes; guest deck empty for day-trip-only answers.
- Dark mode: white tick on green about 2:1.
- English photo-licence line differs in meaning from Hebrew (owner decision on legal text).
- Translator mic and booking PDFs on the Android test build.

## Medium
- Places: raw city slugs; "Takes" shown in Hebrew in English; "Navigate" opens a pasted social link; English edit can overwrite Hebrew notes; places with no coordinates vanish from the map with no empty state.
- Itinerary: day strip does not scroll to today (`.active` vs `data-selected`); "now" repeated per owner; "mine" filter hides stops when the user is in no couple; "in 0 min".
- Replan: undated trip shows all days red; last-day message "trip over"; singular wording; no undo warning.
- Home: proposed stay shown as booked; Discover count wrong; no-start-date hero.
- Share: stop link revokes only newest; "1 מקומות".
- Bookings: pass sheet says "free used up" while loading; dead buy button with a price (store risk); overnight flight no "+1".
- Stays (parked until after the trip): linking a booking keeps default dates; no overlap check.
- Small screens (320 px): Lists tabs overflow; swipe buttons under the tab bar at 320x568; map guide button covered; Bookings title column about 46 px.
- RTL: not-now and undo icons; names glued to prepositions; breadcrumb arrow; English arrows in the wheel.

## Polish
Screen-reader names and focus in dialogs (`ShowFull`, Guide), tap targets under 44 pt, large text, login carousel pause (WCAG A), Android back closing the Menu and wheel, danger buttons not red, delete wording inconsistent, input borders about 1.8:1, switch-off nearly invisible, haptics (built since; the gaps left are in the 2026-11-27 audit below), motion polish, first-person singular strings, plural n=1 cases, Stays dates ignore app language.

## Audit against creators' rules, 2026-11-27
Read-only code audit of `src/views/*.tsx`, `src/App.tsx`, `src/offline.tsx`, `src/ui.tsx`, `src/toast.tsx`, `src/lib.ts` and the CSS against the rules in [11-learned-from-creators](11-learned-from-creators.md). Nothing was run on a phone or in a browser; no before/after images were made. Severity: **high** = cannot continue or sees raw error text; **medium** = confusing, wrong or hard to use; **low** = polish. Every fix ships Hebrew and English (rule 1). 35 breaks: 7 high, 13 medium, 15 low.

### High (7)
1. `src/views/AddPlace.tsx:421`: `t('שגיאה: {msg}', { msg: error.message })` toast when saving a card fails. Rule: errors never raw (`toogo-ux-ui-craft`). Sees "שגיאה:" followed by the database's English text, at the bottom of the screen, far from the sheet. Fix: `errorText(error.message)` shown as an inline line in the draft sheet above "Add".
2. `src/views/Bookings.tsx:436`: `t('שגיאה: {msg}', …)` toast on a failed booking save. Same rule plus placement. Sees raw database text; the form gives no sign which field. Fix: inline `err` in `BookingForm` with `errorText`, keep the sheet open.
3. `src/views/Bookings.tsx:414`: "העלאת הקובץ נכשלה: {msg}" with the storage error text. Sees the storage service's English text inside Hebrew. Fix: plain what/why/action ("הקובץ גדול מדי. אפשר עד N MB." / "The file is too large. Up to N MB.") at the file field.
4. `src/views/Essentials.tsx:134`: "אי אפשר לקרוא את ההזמנות: {msg}" with the raw error. Fix: `errorText` with a reading fallback and a Retry beside the note.
5. `src/views/Settings.tsx:389`: credits wallet shows `error.message` from `give_to_trip` as is; :414 the success line "הועברו N קרדיטים" uses the same red `.msg` as errors; :412 the button keeps "העברה לטיול" while sending. Rules: errors never raw; feedback sized to stakes ("Processing…" on money). Sees raw RPC text on a money action, success that looks like failure, and no sign the tap was taken. Fix: plain error line; success in a calm tick style naming the amount; button reads "מעבירים…" / "Moving…" while `sending`.
6. `src/views/Translator.tsx:291`: "לא הצלחתי להתחיל: {msg}" with the browser exception text (also first-person singular); :262 falls back to "שגיאה: {code}" for recognizer codes not in `ERRORS`. Fix: one plain line per case ("המיקרופון לא נפתח. בדקו את ההרשאה בהגדרות." / "The microphone did not open. Check the permission in Settings.") and a "no permission" state with a button to settings.
7. `src/App.tsx:641` `LoadError` (at :524 for the open trip; also the trip gate at :288): "אין חיבור לשרת. בדקו את האינטרנט." for any load failure of the open trip, including a deleted trip or a member who was removed; only Retry. Rules: what/why; no dead end (`toogo-ux-audit` answers). Sees a wrong reason and a Retry that can never work. Fix: tell offline from not found; for not found say "הטיול לא נמצא או שהוסרתם ממנו" / "This trip was not found or you were removed" with "לרשימת הטיולים" / "To my trips".

### Medium (13)
1. `src/App.tsx:355-384`: the wand shows a 30 s toast "מעדכנים את המסלול, כמה שניות…", then a toast "לא הצלחנו לעדכן את המסלול, נסו שוב" with no reason and no Retry button; on the 30 s deadline (:384) it says it failed although the planner may still finish. Rules: honest waiting, real stage names, error placement (toast only for passing problems), big moment gets full confirmation. Fix: status line on Plan with stages from `plan_state` and a Retry; on deadline say "still working, we will update when ready"; `hapticSuccess` at :382.
2. `src/views/Bookings.tsx:406`: wrong file type says "העלאת הקובץ נכשלה: PDF, JPG, PNG" (no what or why). Fix: "קובץ מסוג זה לא נתמך. אפשר PDF, JPG או PNG." / "This file type is not supported. Use PDF, JPG or PNG." at the field, before save.
3. `src/lib.ts:152` `errorText` falls back to "לא הצלחנו לשמור" for every unknown error, also where nothing was being saved: `src/views/Home.tsx:367` (invite link), `src/views/Bookings.tsx:619` (reading existing bookings), `src/views/Share.tsx:147`, `src/views/SharedPlan.tsx:161`. Sees the wrong "what happened". Fix: `errorText(message, fallback)` and pass the action's own line.
4. `src/views/TripPicker.tsx:35`: failure fallback "לא הצלחנו. נסו שוב." with no what or why when creating or joining a trip. Fix: "הקוד לא נמצא" / "the trip was not created" per action.
5. `src/toast.tsx:7` `say` supports only an undo action, and `mutate` (`src/lib.ts:157`) reports every failure as a 6 s toast while the sheet closes or stays with no inline mark. Rule: error placement. Fix: a Retry action option on `say` for passing failures; forms show their own `err`.
6. `src/views/Places.tsx:174-178`: map mode has no loading, `LoadNote` or empty state (only list mode at :181-196). Sees a bare map while loading or after a failure. Fix: same guards above the map.
7. `src/views/Itinerary.tsx:340`: `Skeleton rows={3}` draws 72 px separate tiles (`styles.css:1164`), not the timeline (time column, node, line). Rule: skeleton only where it matches the real layout; the day list is the named case. Fix: a timeline-shaped skeleton.
8. `src/views/Home.tsx:173`: one `LoadNote` at the top for four tables; sections (route, together) quietly disappear when theirs fails. Rule: each section fails on its own with Retry (Japan's networks). Fix: note and Retry inside each section.
9. `.pill` is 32 px (`src/styles.css:215`) with no line in `src/styles/tap.css`: emergency call, hotline and embassy links `src/views/Essentials.tsx:165,168,181,184`, also :249, :294, :298, :303, :308; `src/views/Bookings.tsx:308,315,879,884`; `src/views/Swipe.tsx:385,904`. Rule: tap ≥ 44 pt. Sees missed taps on the emergency numbers. Fix: `.pill { position: relative } .pill::after { inset: -6px 0 }` in tap.css, 8 px between neighbours.
10. Negative letter spacing applies to Hebrew: `src/styles.css:148` h2, :149 h3, :318 `.large-title` (every screen), :435 `.big`, :697 `.card-title h2`; `src/styles/plan.css:25,66,157,281`; `src/styles/onboard.css:35`; `src/styles/info.css:113,138`; `src/styles/match.css:37`. Rule: no added letter spacing on Hebrew. Sees letters squeezed in every large title. Fix: keep the tracking under `:lang(en)` only.
11. `src/offline.tsx:97`: "לוותר" (discard an unsent change) looks like the Retry link and deletes with no question; :87 the failed sheet says what failed but not why. Rule: destructive answer looks different and asks once (`toogo-ux-audit`). Fix: red text, one confirm ("Discard this change?" Keep / Discard), a why line from `errorText`.
12. `src/styles.css:272`: the invite-link input is 13 px; `src/views/Home.tsx:381` selects it on focus, so iOS zooms in. Fix: 16 px font, keep the visual size with padding.
13. `src/views/Search.tsx:145`: no results says only "אין תוצאות ל"{q}"", no suggestion; the query is not in `<bdi>`. Rule: empty states say why and give one step; search suggests spellings. Fix: "נסו כתיב אחר, למשל באנגלית" / "Try another spelling, e.g. in Hebrew" plus isolate `q`.

### Low (15)
1. List skeletons do not match their grouped 52 px rows: `src/views/Places.tsx:182`, `src/views/Bookings.tsx:89`, `src/views/Expenses.tsx:229`, `src/views/Essentials.tsx:207` (72 px tiles); `src/views/Baby.tsx:76`, `src/views/Lists.tsx:193` (56 px). Fix: a spinner, or a row-shaped skeleton inside one `.card`.
2. `src/views/Swipe.tsx:490-495`: deck skeleton shows 2 round buttons for the real 4; `src/styles.css:1173` `.sk-deck-lines` `align-items: flex-end` puts the lines on the left in Hebrew. Fix: 4 buttons, `align-items: flex-start`.
3. `src/views/Itinerary.tsx:151`: a failed tick is reverted with a toast and no Retry; :130 and :142 toasts carry a place name without `<bdi>`.
4. `src/views/Places.tsx:126`: 'למחוק את "{name}"?' with a Latin name in quotes, not isolated; :354 the area line has no `dir="auto"`.
5. Names without isolation: `src/views/Home.tsx:313` member chips with "(אני)", `src/views/Lists.tsx:185`, `src/offline.tsx:91`. Titles to check for `dir="auto"`: `src/views/Essentials.tsx:288`, `src/views/Stays.tsx:279,579`, `src/views/Home.tsx:560`, `src/views/AddPlace.tsx:692`.
6. `src/offline.tsx:124-130`: the banner does not say what still works offline; :129 "שולח…" is singular; :93 inline style instead of a class.
7. Icon strokes off the 1.75 family: `src/views/Swipe.tsx:413,421,475` (2.6), `src/App.tsx:559` wand (2), `src/styles.css:396` search icon (2.4).
8. `src/styles/plan.css:185`: the arrival `summary` is 42 px high.
9. `src/views/Settings.tsx:409`: `type="number"` with no `inputMode="numeric"`; :390 "אין לך מספיק קרדיטים" speaks to one person; :392 "הועברו {n} קרדיטים" has no form for 1.
10. `src/styles.css:196`: `.secondary` uses red text, so many grey buttons carry the accent and dilute the one red action.
11. `src/styles.css:200`: only `.primary`/`.secondary` have a pressed state; `.pill`, `.chip`, `.link` and icon buttons have none (six button states).
12. `--elev-*` shadows are black; the craft skill prefers brand-tinted shadows. Idea for the owner.
13. Haptics not yet covered: the wand finishing (`src/App.tsx:382`, success), a sheet snapping (needs `hapticMedium`), `.switch` toggles.
14. `src/views/Replan.tsx:95`: "סדר מחדש" singular imperative (known).
15. In-button "שומר…" is singular where the voice is plural "we": `src/views/AddPlace.tsx:801`, `src/views/Bookings.tsx:317,516`, `src/views/Expenses.tsx:640,720`, `src/views/ResetPassword.tsx:65`. Fix: "שומרים…".

### Already right (keep)
`Steps` in Add place (real stage names); `ImportSheet` reading inside the button, inline `err` and `aiError`; `ReadyLine` disabled offline but says why; `AddPlace` "Add" disabled with the reason on the same screen (:799); `ExpenseForm` decimal keypad; no fake percentages anywhere; cached rows shown first by `useTripTable`; `ErrorBoundary`; `SignOutSheet` red destructive button apart from the link; `translateError` and `aiError` plain lines.

## Method for a new review
Write the five-line brief and fill the audit table from `toogo-ux-audit`; list everything (rule 8), grouped by screen; for each proposed fix produce a before/after image in Hebrew and English (the owner reads on a phone); run the "AI look" audit from `toogo-premium-feel` per screen.

Related: [04-states-empty-loading-error](04-states-empty-loading-error.md), [06-accessibility](06-accessibility.md), `.claude/books/qa/`.
