---
title: The funnel today
chapter: funnel
explains:
  - inviteInUrl
  - Login
  - TripPicker
  - Onboarding
  - PushAsk
---
## Entry points
- Invite link `?invite=<code>`: read by `inviteInUrl` (`src/views/Login.tsx`). Sign-up is invite-only (one-time, 30 days) through edge function `sign-up`; `TripPicker` auto-joins the invited trip.
- Shared plan `?share=<slug>`: opens `SharedPlan` before login; "Plan a trip like this" copies places as candidates.
- Guide pages (`scripts/pages`, e.g. `/japan/`): the button opens the app on the page's city and language.
- Direct / installed app.

## Steps after sign-in
1. Questionnaire (`Onboarding`): 8 questions before the first card. QA calls this against the first-run rule (one real action first).
2. Create or join a trip (`TripPicker`).
3. Swipe; match; plan.
4. Push is asked after the third like on a multi-person trip or after a match pop-up (`PushAsk`), at most twice a week apart. QA flags "after 3 likes" as early.

## Known leaks (QA 16 Nov)
- Invite plus Google loses the invite; email sign-ups skip the questions; invited users cannot skip them.
- A signed-in user opening an `?invite` link: nothing happens.
- Join code is about 40 bits with 10 tries an hour: fine now, not for open sign-up.

## Where it is measured
Events `open` (source: guide / invite / shared_plan / link / direct), `quiz_done`, `sign_up`, `sign_in`. See [what-is-measured](what-is-measured.md).

Related: [guest-mode](guest-mode.md), [open-sign-up-plan](open-sign-up-plan.md).
