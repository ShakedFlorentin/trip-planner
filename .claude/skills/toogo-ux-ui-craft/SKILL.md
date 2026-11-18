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
