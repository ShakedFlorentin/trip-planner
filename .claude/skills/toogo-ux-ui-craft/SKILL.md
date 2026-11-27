---
name: toogo-ux-ui-craft
description: The UX/UI craft rulebook for Toogo, taught from creators' reels and checked against the house rules - layout, visual design, motion feel, flows, onboarding, on-screen copy, design system. Use when designing, building or reviewing any Toogo screen or flow.
---

# UX/UI craft (Toogo)

Short rules taught by the teacher agent from creators' reels, each with a why and its source. `toogo-rules` wins over anything here; narrow topics also live in `toogo-premium-feel` and `toogo-first-run`. Every screen is Hebrew (RTL) first with English, checked mirrored. Design reviews list every problem however small, with a before/after image per option (rules 1, 8). CSS and animation code details: `toogo-frontend-craft`. Creators' numbers are claims.

## Layout and look

- **One accent colour, on what the screen is about** (the swipe, the match, the add result), chosen for fit not liking, never on decoration and never to push a credits button. Why: the eye knows where to tap. @charles.unemployed https://www.instagram.com/charles.unemployed/reel/DfsTwyAxO_N/ (caption lines only)
- **Palette from the real subject:** for Japan, torii red, moss, paper white, one accent used like light. Why: feels true, not generic. @luca_radez https://www.instagram.com/luca_radez/p/DfSectlDDFi/ (owner decides)
- **One idea drives the whole look** (mark, palette, type, every touchpoint). Pick one for Toogo. https://www.instagram.com/reel/DfKL3ANARku/ (his claim)
- **Give each type a job:** screen title, numbers (times, prices), body. Any display face must carry Hebrew and be shown in both languages first. System fonts stay. https://www.instagram.com/luca_radez/p/DfxRuiRAESU/
- **Space, alignment and rhythm read as trust before words.** Same margins on every screen, mirrored in RTL. @theglidestudio https://www.instagram.com/theglidestudio/reel/DfyFShTounu/
- **Three layers per screen** (background, subject, buttons); one huge thing, everything else small; subject oversized overlapping the headline. @ayoships reels 0 and 7 (his claim).
- **Calm at the top, denser as you scroll;** no cards inside cards, no border on everything. See the AI-look audit in `toogo-premium-feel` section 4.
- **Icons:** one family, outline idle, filled selected, one stroke weight matching text. No decorative emoji.
- **One sheet shape** for places, plan items and bookings.
- **Reference first, then build:** look at real screens (Mobbin, Dribbble) for the flow you are about to design. @danh.app https://www.instagram.com/danh.app/reel/DfvTxL5ScLH/
- **Liquid Glass:** do not stack custom opaque backgrounds over system bars; ask the owner before mimicking glass. https://www.instagram.com/danh.app/reel/Dfor0jxSp3c/
- **Not adopted:** Android expressive shapes and wavy bars; AI-generated place photos (rule 5; a wrong picture of a real place).

## Motion feel

- **Four levels of feedback** (nothing, toast, animation, tuned animation): level 3-4 only for swipe, match, add to trip, the wand finishing, a credit spent. Details in `toogo-premium-feel`.
- **The more often used, the less it animates;** under 300 ms; slow in and out. https://www.instagram.com/charles.unemployed/reel/DfphRvFBx54/
- **Pick one motion personality** (calm or friendly) for splash, match pop and sheets: one curve family. Owner decides. https://www.instagram.com/theglidestudio/reel/Dfzkwu3hSj5/
- **The tapped card becomes the detail; back reverses it.** https://www.instagram.com/reel/DfwhC1riuuO/
- **Immediate response is the feel:** every tap gives feedback in one frame. https://www.instagram.com/theglidestudio/reel/Dfy7ig_B-FL/
- **Haptics:** light on swipe, medium on tab and sheet, success on match; never on scroll. `toogo-premium-feel`.
- **Finish small controls** (toggles, sliders): pressed state, settle, mirrored in RTL. https://www.instagram.com/aniakubow/reel/Dfhr3ySRqzw/

## Flows and laws

- **Fitts:** big close targets. **Hick:** few choices per screen. **Miller:** about seven items, chunk. **Doherty:** respond in 400 ms. **Jakob:** behave like iPhone apps people know. **Postel:** accept messy input. Same reel as the budget.
- **Preview before you swipe:** a city, district, place zoom on a candidate card shows where it is. A view only; a place joins the trip only by swipe and match (rule 3). Cheap version is a map zoom. https://www.instagram.com/luca_radez/reel/DfuQmy0ArN8/ (owner decides)
- **Human in the loop:** suggestions ask before changing the user's data.
- **Designed waiting states** with one sentence in both languages. https://www.instagram.com/aniakubow/reel/DfUzxobxFfa/
- **Nudges only for real events** (a match, a failed save), never to reopen the app or push credits. https://www.instagram.com/aniakubow/reel/DfHPbtSxa2q/
- **A popup grows from what was tapped.**

## Onboarding and first run

Full rules in `toogo-first-run`. Short form:
- **One real action before any ask:** swipe a few real cards, then sign-up, notifications, offers. @nels_ysng DduRXwgupNB.
- **Never an empty app:** a demo trip that cannot leak into a real trip.
- **Ask what the person wants as 3-4 chips** after the first look; it only reorders Discover. @danh.app https://www.instagram.com/danh.app/reel/DfjiPD2yHB8/
- **A sign-up page has one job:** a moving glimpse plus one field; then say what happens next. https://www.instagram.com/theglidestudio/reel/DfxznYFABmX/
- **A screen before each iOS permission prompt** showing what the person gets. Ask after a match, not on launch.
- **Reward early, punish late** in sign-up fields.
- **Apple and Google sign-in together** when added (owner's console setup needed).

## On-screen copy

- **One line: who it is for and what it does.** A stranger should say it after one glance, in both languages. https://www.instagram.com/theglidestudio/reel/Dfw1tros6ZG/
- **After a form, say what happens next in three short steps.** https://www.instagram.com/theglidestudio/reel/Dfxe6k1i2BG/
- **Honest feedback wording:** votes "are not a promise" (@danh.app). Hebrew strings are longer: test overflow.
- **Never fake urgency or scarcity;** no streak or loss messages (rule 7).

## Design system

- **Brand is the whole folder:** icon, name, subtitle, screenshots, share card, boarding-pass booking card, in one look. https://www.instagram.com/luca_radez/reel/DfXubRAAIgw/
- **Unslop recipe:** use a reference, then choose fonts and colours yourself so it forms a system. https://www.instagram.com/p/DfSbDWhR2bi/ (caption only)
- Mark test: 16 px app-icon and one-colour test before building touchpoints.

## Pointers

`toogo-premium-feel`, `toogo-first-run`, `toogo-frontend-craft` for the code side.

## Frames read

Seen in video frames, 2026-11-16.
- **Motion timing numbers** (@theglidestudio's own rule): a press about 0.16s, a reveal about 0.7s, a whole scene about 1.2s. Too slow and you wait, too fast and you miss it. Treat as starting values and check on a phone. Why: gives the team one shared yardstick. https://www.instagram.com/reel/Dfvja0XCyIi/
- **Carry, don't cut**: tapping a card makes it grow into the page, back shrinks it back to the same spot, a menu opens from the button that was tapped. For Toogo: a Discover card that opens into its detail and returns to the same place in the deck. https://www.instagram.com/reel/DfwhC1riuuO/
- **A demo screen recording is edited to three things**: only what matters on screen, big enough to read on a phone, a cursor/finger that leads the eye. Why: an unedited recording is unreadable. Use for Toogo store previews and reels. https://www.instagram.com/reel/Dfv1BkEO_YT/ (also in marketing)
- **AI chat that does not look like slop** (@charles.unemployed, "Day 5 of removing AI slop"): show the real steps with times ("Read your last 24 runs 1.2s", "Checking your calendar"), answer with the user's own numbers in two plain sentences, offer concrete chips as first prompts, and ask before writing ("Add 36 runs to your calendar?") then confirm what was added. Toogo use: any AI helper must name the trip data it used and ask before changing the trip. https://www.instagram.com/reel/DffBKUZhy6B/
- **Seat-picker pattern** (@luca_radez concept): sector map, then a view-from-the-seat preview with distances and one price button ("Change seat / Book"). Preview before commit; for Toogo the cheap version is a map zoom or photo preview before a hotel or area is chosen. https://www.instagram.com/reel/DfuQmy0ArN8/
- **Disney 12 plus UX laws in 30s** (@charles.unemployed): the UX half is Miller's law (chunk to about 7), Postel's law (accept messy input), Jakob's law (look like apps people know), frequency of use (make the most-used action the easiest). Named laws only, details were spoken. https://www.instagram.com/reel/DfphRvFBx54/

## Added 2026-11-26 from @ceciliakimdesign (captions only)
- **Mix design options by part:** keep the layout of one, background of another; show both with the same content, try subtle vs strong, keep the original beside the new. Why: fair comparison, no all-or-nothing. https://www.instagram.com/ceciliakimdesign/p/DfYAaElI95T/ (feeds rule 8 before/after images)
- **Check price screens with big text:** prices, terms and button on one screen. https://www.instagram.com/ceciliakimdesign/reel/DfsZN3jSSUV/
- Onboarding detail goes in `toogo-first-run`.

### Part 2 (2026-11-26, @ceciliakimdesign, captions, then 13 posts watched by frame the same day; her claims, nothing measured in Toogo)
- **In-between screens are retention screens:** empty, loading (bad wifi), error and offline are where people leave. Empty state is warm and points to one first step; loading uses a skeleton, not a spinner; error says what happened and what to do; offline says what still works. Hebrew + English for each (rule 1). https://www.instagram.com/ceciliakimdesign/reel/DdwxL5QSsNv/ , https://www.instagram.com/ceciliakimdesign/reel/DaOdJhcxPmC/
- **Test design options on the busiest screen** (for Toogo the day plan, not Home): every option shows it, with a one-line rationale; each round on a new page so kept designs stay untouched. Each option still gets a before/after image (rule 8).
  - **Seen in frames:** a named direction card with one sentence, e.g. "C5 · Deep Loch: evening water, one warm paper sheet" and "C2 · Still Pool: floating on white vellum over still water".
  - Her rounds were pages "16 Tangible Object Explorations", "17 Material Screens: Five Working Directions" and "18 Quiet Material: Five Calm Directions".
  - She then mixed the winners: dark water, frosted cards, film grain.
  - https://www.instagram.com/ceciliakimdesign/reel/DfFoykZSHF-/
- **AI design prompts end with "the goal is met when..."**, then a checklist the AI ticks off as finished.
  - **Her exact list, seen in frames:**
    1. No info shows up twice.
    2. Spacing in multiples of 4 (her gaps were 28, 48 and 68).
    3. Every shadow matches.
    4. Card corners 24, smaller pieces 16.
    5. Every button 44 pt.
    6. Nothing cut off at the biggest text size.
    7. Only brand colours (her 6 named tokens: Deep water, Abyss, Cobalt, Accent, Muted, Ink).
    8. No more than 2 fonts.
  - **Toogo already has** the 4-px `--s-*` scale and `--r-md` 16 / `--r-xl` 28. Write the Toogo list with these tokens, plus "long Hebrew strings wrap" and "mirrored in RTL".
  - **Also:** name a style ("Japandi"), not a vibe ("clean"). Say what must stay the same. Give feedback in px, as you would to a designer.
  - https://www.instagram.com/ceciliakimdesign/reel/De9ecPbRonZ/ , https://www.instagram.com/ceciliakimdesign/reel/DZtad9BSxPP/ , https://www.instagram.com/ceciliakimdesign/p/DcRaW5viV7p/
- **Premium motion = restraint.**
  - About 0.2 s, numbers that roll, one big celebration for the top moment (a match, trip ready), a small press-shrink, matching haptics and skeleton loading.
  - Pause heavy effects under Reduce Motion and Low Power.
  - Compare two timings side by side and name the difference in one sentence.
  - **Seen in frames:** 150 ms "too fast" against 400 ms "the sweet spot" for one screen reveal; she said "start at 400 ms", not "make it smoother". Use about 0.2 s for anything used often (`--dur-2` 0.22s) and up to about 0.4 s for one rare reveal.
  - Details in `toogo-premium-feel`.
  - https://www.instagram.com/ceciliakimdesign/reel/Dd9unmGyVmp/ , https://www.instagram.com/ceciliakimdesign/reel/Dcb6pEryfoj/
- **Neutrals with colour as punctuation.** Colour only the one or two things that matter, and use strong font contrast for hierarchy.
  - **Shadows tinted with the brand colour.** In frames: `opacity 0.24, radius 12, y 4`; a black shadow "looks muddy".
  - https://www.instagram.com/ceciliakimdesign/reel/DaD5bejpWQI/ , https://www.instagram.com/ceciliakimdesign/reel/DeCl4Ynyl68/
- **The 8-point UI review** (icons, contrast, corners, shadows, line spacing, type hierarchy, alignment, long text; slides read). Each item comes with a "keep the same" prompt; the full list is in `toogo-premium-feel`. Run it on the most-used screen first. https://www.instagram.com/ceciliakimdesign/p/DeFddsdI1Vy/
- **Leave the AI default look.**
  - **What it was:** a cream background, a serif "August, at a glance.", a dark green card and a yellow bar.
  - **Her way out:** colour from the category's meaning (finance = blue, for trust), rounder corners, and friendlier helper copy ("Say it naturally. Review every detail before saving.").
  - **Toogo's colour comes from Japan** (rule: palette from the subject above).
  - https://www.instagram.com/ceciliakimdesign/reel/DdHeJxgSG0Y/
- **One "Reorder" button that opens its own sheet** beats a drag handle and arrows on every row (less clunky). End with "Done" and a toast. The drag direction mirrors in RTL. https://www.instagram.com/ceciliakimdesign/reel/Dd4IkyvxooA/
- **Break tests, as UX:**
  - delete asks first (Keep / Delete);
  - closing an unsaved form asks (Keep editing / Discard);
  - back keeps your place in the list;
  - a new item is shown, not just "Saved";
  - a pasted messy amount is understood.
  Code in `toogo-frontend-craft`. https://www.instagram.com/ceciliakimdesign/p/De2FkoNo88G/
- **Space before colour:** a "cramped" screen is fixed by more padding, line height and section gaps first. Include in every review (rule 8). https://www.instagram.com/ceciliakimdesign/reel/DXKK8wSEVZB/
- **Main action at the bottom** (thumb reach, Fitts); the same in RTL. https://www.instagram.com/ceciliakimdesign/reel/DQIBAqcEWDF/
- **Big photos, gradient under white text** (only photos that pass rule 5; otherwise the icon tile). https://www.instagram.com/ceciliakimdesign/reel/DQXfGkwEajm/
- **Structure before style:** grayscale layout first, contrast check on every colour pair, 4px grid, 60-30-10. https://www.instagram.com/ceciliakimdesign/reel/DK-idHouyVH/
- **Ideas (owner):** a home or lock-screen widget for "today's plan / next place" against being forgotten (needs a native target, https://www.instagram.com/ceciliakimdesign/reel/DRxlSbykbeB/); one hand-drawn Japan-themed touch in empty states or badges; "hide amounts" toggle and draft kept after accidental close (code, see frontend).

## Added 2026-11-27 from @synsation_ (24 "Build for Good UX" reels watched by frame), @danh.app, @kunaluxui, @nels_ysng (captions); her claims, laws and legal figures not checked
Links: https://www.instagram.com/reel/<code>/ . Code side of these is in `toogo-frontend-craft`.
- **Errors say what happened, why, and one action; never raw text.** A raw Supabase or edge-function error is unreadable and leaks internals. Hebrew + English for each (rule 1). DYr7cKLIQo6
- **Put the error where it belongs:** inline under the field or tile that failed (best); a toast only for passing problems ("אין חיבור · מנסה שוב" / "No connection · Retrying"), never for something the user must act on; a blocking dialog only when an answer is needed (failed credit purchase). iOS has no native toast, so keep it rare. DY0IImqxNQ0
- **Pick the loader for the job:** skeleton when the layout is known; small spinner for short unknown waits; progress bar only when length is known; spinner inside the button for submit. DYcbCoiIKK1
  - **Skeleton debate (pick for Toogo):** @ceciliakimdesign (above) says skeleton not spinner; @synsation_ says some viewers hate skeletons and one study she cites found them feeling slowest on a bad connection. **Toogo:** skeleton only where it matches the real layout (trip day list, Discover card), with a slow shimmer; otherwise a spinner; on a long wait show real stage names. DbQ-cgmu56T
- **Honest waiting:** a progress bar is a measured past plus a guessed future; do not show a percentage that jumps or sits at 99%. Show "work" only when it is happening (the labour-illusion trick is fine only with real work). Matches the no-fake-delays rule. Dbhuh9EvNWZ, DYpn-PAImaj
- **Plan for Japan's networks** (subway, hotel Wi-Fi): every fetch has a state; each section loads and fails on its own with a Retry; show the cached plan at once, photos and travel times arrive later; show what has arrived, not one spinner. DZaLjn5uLCN, DY-yUBsMbml, DZIHbbIt5mc
- **Feedback sized to the stakes:** small action, the change itself confirms (tick stays ticked); money or a big moment (credits bought, trip planned) gets a clear full confirmation naming what was charged; the button shows "Processing…" so nobody taps twice. DZYfsYPv1-l
- **Empty states say why and give one next step;** never "Nothing here yet" alone. No search results: offer a suggestion (Hebrew and English spellings of Japanese names). DY5PkUjyhMv
- **A button has six states:** default, hover (mouse only), focus ring, pressed, loading inside the button, disabled. DcjkR2PSkml
  - **Disabled submit (disagreement):** she teaches both "block submit until valid" (DYyzrdpIixM) and "keep it enabled, scroll to the first bad field" (DcugS9HAFAj). **Toogo:** disable only when the missing thing is visible on the same screen (Previous on step 1); otherwise keep it enabled and scroll to the red field.
- **Tap targets at least 44 pt; the tap area may exceed the icon;** whole card tappable but a swipe or scroll must never open it; label tappable on a checkbox; real phone always. Dc2Z_OyBWtc
- **Hick and progressive disclosure:** fewer choices per screen, advanced planner settings behind an expand, but never bury a main feature. DayWu1zy-qz, DbFV7_6R8Rn
- **Take complexity off the user (Tesler):** pre-fill what the app knows (dates, travellers, hotel), accept any phone/amount/date format, live password checklist, character counters. DbKj0Ewuzlr, DYyzrdpIixM, DfDOHyUSMxD
- **Standard parts stay where people expect them (Jakob);** in RTL the back chevron and tab order mirror; do not mirror media controls or clocks. Be creative elsewhere. DZmMJ_HAHBj, DZ-c-4BMXIn
- **No roach motel:** cancelling or getting credits refunded is as easy as buying. DbbX47eSehN
- **Glass only as an accent** (blur is costly in the WebView). Dd49V2Ns1a4
- **One primary action per screen:** when every button shouts nothing stands out; group choices, reveal details later. Ask "can they finish this without thinking twice?" @kunaluxui DeX1eZ3oLPF, DYvpuPvIjKF
- **Type rules:** change one thing at a time for hierarchy (size, weight or colour); 45-75 characters a line; track only caps and tiny labels, and **no added letter spacing on Hebrew** (no case). @kunaluxui DfmcM-VhBz9
- **"Vibe-coded" tells to avoid:** purple-blue gradient, the "New: AI-powered" pill, generic stock icons, 10K+/99.9% stat rows. Fix with real references, one custom icon family, negative space and a few micro-interactions. @danh.app DgHlaPry1bg, DeRIxlVh_Ep, DeOj979Bu7U, DTh0R0Pkk33; @synsation_ DfqVp9YRPms; @nels_ysng DbVKtwiox1k, DesH8C4uzqX
- **Design system is input for AI agents:** clean token names, named states, usage rules and examples (a skill or DESIGN.md) stop drift. Candidate taste skills to try (owner installs): Vercel Web Design Guidelines, Emil Kowalski, Anti UI Slop, Taste Skill. @kunaluxui Dc6mU6OCbtk, DgOELuDhY3-
- **Validate with 5 real users in a week:** map the riskiest step, sketch several, prototype, test with 5, sort the patterns. Fits the Feb 2027 test plan. @kunaluxui DgF7HNroKdH
- **Onboarding before features:** if people do not get past the first screens nothing else matters. @danh.app DUAqphCko6F, DewCYNcBv5I (also `toogo-first-run`)
- **Ideas (owner):** a join-without-installing, read-only shared trip page (@synsation_ DW4fmFLEiI9, also growth); `<bdi>` etc. in frontend.
- **Not adopted:** blind-box, variable-reward and scarcity tricks (DKgSBreAQ3A; rule 7).
