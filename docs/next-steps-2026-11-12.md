# Toogo: how to earn, and the next steps (12 November 2026)

This follows the reels report ([ayoships-reels-2026-11-12.md](ayoships-reels-2026-11-12.md)). Every number here was read today from the code or the database, except where it says "rough".

## 1. How adding a place works today

One lookup (`supabase/functions/suggest-place/index.ts`) goes through these steps:

| Step | What happens | AI cost so far (all lookups) |
|---|---|---|
| Free checks | Same link in the last 30 days, or a place already in Toogo's library: the saved card is reused | $0 |
| Read the post | Plain code fetches the Instagram caption and up to 8 pictures, or the TikTok title | $0 |
| Research | Claude Haiku searches the web (up to 3 searches) and may read one Tabelog page | $0.67 (91%) |
| List | Claude names the places it found (up to 10) | $0.004 |
| Cards | One call per place writes the card; one more adds tags | $0.06 |

- **The research step is almost the whole bill.** 44 web searches at 1 cent each are $0.44 of the $0.73 spent on lookups so far.
- **The lookup already got cheaper on 11 November** (versions 36 to 39, tested on 10 real links, see the cost report). A single place now uses one search and one free read of its Tabelog page:
  - Single place: **about 2 cents** (the two real lookups since then cost $0.0196 and $0.0190). Before, it was 3 to 4 cents.
  - A post with several places: **about 4 cents** in the test (9 places, $0.041). The one real 9-place lookup cost 12 cents, on the version before the fix; no real list has run on the fixed version yet.
- **A saved answer is thrown away after 30 days** on the live version. After that the same link is researched again at full price. Step 1 below changes this to 6 months.
- **Every lookup grows Toogo's library.** A place a trip looks up is saved as a private card (47 so far). Once it is shared, the next person who adds it pays nothing and costs us nothing. The library has 237 live cards today.
- **Limits against abuse:** 30 lookups per person per day, 300 for all users together.

### Credits today
- Built, but switched off (`app_flags.credits` is false; nobody has ever been charged).
- A new place costs 4 credits; reading a booking and translating cost 1 each.
- Each person's free credits are topped up to 5 a day, which is one new place a day.
- A trip can hold shared credits, and our own trip is marked "no limit".
- There is no way to buy credits.

### Real use (one trip, so treat it as a first hint)
- 22 lookups in 15 days, all by one person. That is about 1.5 a day for the whole trip.
- Some days are bursts: 6 lookups on 29 October, 5 on 1 November.
- At that pace, and at today's cost per lookup, a whole trip costs us **about $1.50 in AI** (rough: 1.5 lookups a day for about 7 weeks, at 2 to 4 cents each).

## 2. The best way to earn

### Recommendation
1. **Hotel and ticket links (affiliate) are the main income.**
2. **A trip pass makes the AI pay for itself, with a profit.** One purchase per trip, shared by the whole group.
3. **Everything else stays free:** planning, swiping, translating, reading bookings.

### Why, in numbers per trip (rough)

| Way to earn | What one trip brings | Notes |
|---|---|---|
| Hotel link | About $15 for one 3-night booking of $390; about $70 if a 2-week trip is all booked through Toogo | Booking.com pays roughly 4% of the stay. That figure is from blogs, not from Booking; check it in the partner dashboard |
| Ticket links (Klook: teamLab, Shibuya Sky, rail passes) | About $2–5 per $50–100 of tickets | Klook pays about 5%, also from blogs |
| Trip pass at $7.99 | About $6 profit on the website, about $5.30 through Apple | After payment fees and about $1.50 of AI |
| Credit packs ($2.99 for 25 lookups) | About $1.50–2 per pack | After fees and $0.50–1 of AI. See below |

One hotel booking earns more than a trip's whole AI bill several times over. So the lookup should make people want to plan in Toogo, and the hotel link should earn.

### Why a trip pass and not credit packs
- **Nobody would buy a pack.** With one free place a day per person, a group of 4 gets 4 free lookups a day and uses 1.5.
- **People plan a trip once or twice a year.** "Unlimited new places for this trip, for all of you" is one clear decision. Counting lookups is not.
- **נעצתי saves places for free.** A per-save price would be compared with it. A per-trip price is compared with the cost of the trip.
- **The code is half there.** Trips can already be marked "no limit".

### How the pass would work (my suggestion, not decided)
- **Free:** the first 10 new places of each trip, for the whole group. This replaces "one a day". A daily drip makes people wait, which is close to the game tricks in the reels.
- **Pass:** $7.99 (about ₪29) per trip. Unlimited new places for everyone on the trip, inside the daily abuse limit.
- **The offer appears once,** when the 11th place is added, with the price and what it buys. After "not now" it stays quiet for a week.
- **Same price for everyone.**
- **Where it is sold:** on Toogo's website everywhere; a link from the app only on the US App Store; Apple's in-app purchase on the Israel store and the rest. The Apple rules are in the reels report, section "Making money".
- **Places already in Toogo's library stay free for everyone,** with or without a pass.

### Stop paying twice for the same research
- **The cheaper lookup is already live** (11 November): about 2 cents for a single place. "Name the place from the post first, then one search" was also tested that day and dropped: it cost $0.015 but lost facts on 3 of 7 links and misread 2 posts.
- **What is still wasted:** a saved answer expires after 30 days, so the same link on another trip a few months later is researched again and paid for again. The rule was set on 28 October with the reason "places don't move, but scores and hours do".
- **Why the rule is too blunt:** the post never changes, and most of the card (what the place is, where it is, what to order) does not either. Only opening hours, scores and closures age.
- **What reuse looks like today, months later:**

  | How the place is added | After 30 days |
  |---|---|
  | The same Instagram or TikTok link | Researched again, paid |
  | A typed name or a Google Maps link, for one of the 237 live library cards | Free, with no time limit |
  | A typed name for a place another trip looked up | Researched again, paid. That card stays private until two trips by two different people add the place |

- **Nothing has been lost yet:** the oldest saved lookup is from 28 October, so the first one expires on 27 November.
- **The fix is step 1 below.**

## 3. Next steps, in order

There are 4 users and 1 trip today. So the order is: make the product cheaper and easier to get into, then bring people, then charge.

### Now, before the trip (12–31 December)
Small pieces, published one at a time.

| # | Step | From | Done when |
|---|---|---|---|
| 1 | **A link is kept for good; hours are re-checked after 6 months,** only for a place that is matched into a trip. Design in section 5 | Your decision, 12 Nov | Built and tested on 13 real cards, see section 5. Not deployed: two function deploys and one database trigger wait for your go-ahead |
| 2 | **Share from Instagram straight into Toogo** (Toogo in the Share menu) | נעצתי comparison | Share → Toogo opens the add-place sheet with the link. Needs a new App Store build |
| 3 | **Apple's rating prompt** right after a match or a first finished day plan | Reels, item 3 | Apple's own prompt only, no question before it |
| 4 | **Settings from the server:** free allowance, pass price, batch size, feature switches | Reels, code idea 3 | Changing a value in the database changes the app without a new version. `app_flags` is the start of this |

### After the trip (January)
| # | Step | From | Done when |
|---|---|---|---|
| 5 | **Turn on where-to-stay** with the hotel search link | Your plan; waits for the trip | Live, with the affiliate ID still empty |
| 6 | **Free search pages** from the 237 live cards, in Hebrew and English ("where to stay in Kyoto", "kosher food in Osaka") | Reels, item 1 | Pages are live and listed on AlternativeTo and SaaSHub. This is also the live website the affiliate programmes ask for, and the place the pass is sold |
| 7 | **Apply to Booking.com and Klook** | Your plan | You sign in and apply; I put the IDs in the one setting (`src/affiliate.ts`) and add ticket links to cards that need booking |
| 8 | **Value before sign-up:** the quiz and first cards before login, then "sign in to save your trip", with Google and Apple sign-in | Reels, item 2 | A new person sees cards before making an account |
| 9 | **App Store name and listing per country** | Reels, item 5 | "Toogo – Japan Trip Planner" style name, Hebrew listing for Israel |

### When there are real trips (my guess: 50 or more)
| # | Step | From |
|---|---|---|
| 10 | **Trip pass:** website checkout, Apple in-app purchase, US-only link | Section 2 |
| 11 | **Card look time** in the ranking | Reels, Tinder code |
| 12 | **Get the next day ready on the phone** the night before | Reels, TikTok code |
| 13 | **Notifications that name the benefit:** "your partner liked the same place", "you are near a place you saved" | Reels, Duolingo code; נעצתי does the second one |
| 14 | **Over-the-air updates and session replays** | Reels, items 6 and 3. Replays need a privacy decision |

## 4. Decisions that are yours
1. **Free allowance:** 10 new places per trip (my suggestion), or keep one a day per person.
2. **Pass price:** $7.99 is my starting guess. Step 4 makes it changeable without a new app version.
3. **Payment company for the website.** Not every company serves Israeli businesses. It needs your business details, so this is yours to open; I can compare the options when step 10 comes.
4. **Old saved lookups: decided (12 Nov).** A link is kept for good, because the same link always points to the same places. Only a card's opening hours, or the place closing, can change, so that is the only thing re-checked, and only after 6 months. The design is in section 5.

## 5. Step 1 in detail: the link is kept for good, the hours are re-checked

### What is true today
- **A saved link answer** holds the full cards and expires after 30 days (6 months in the code on disk, not deployed).
- **Every card carries the date its facts were checked** (`facts_at`).
- **A facts lookup already exists** (`card-facts`): it finds opening hours, closed days and the visit length for a card that arrives without them. It ran twice so far, at about 1.2 cents each. It does not yet ask whether the place has closed for good.
- **A match puts the place into the trip** (a new row in `places`), and the planner uses the hours only from that point.

### The design
1. **The link never expires.** The same Instagram or TikTok link, or the same typed name, gives its saved cards for free on any trip, at any time.
2. **Hours are re-checked only when it matters.** When a place is matched into a trip and its facts are older than 6 months, `card-facts` checks it again: opening hours, closed days, and whether it has closed for good. The fresh facts go onto the trip's card and onto the shared library card, so the next trip gets them for free.
3. **Nothing runs on a schedule,** and cards that are only swiped are never re-checked.
4. **A place that has closed for good** is marked closed on the card and is left out of the day plan.

### Why at the match and not when the card is added
- A new trip gets all the library cards at once: 237 today. Re-checking each one when it is added would cost about $3 for the first trip after every 6 months, most of it for places nobody picks.
- At the match, a trip pays only for the places it will really visit: about 1.2 cents each, and only once per place per 6 months for all trips together.

### Built on 12 November (in the code, nothing live)
| Piece | Change | File |
|---|---|---|
| Lookup | The saved answer for a link or a name has no time limit | `supabase/functions/suggest-place/index.ts` |
| Re-check | A new hours-only check: is the place still in business, its hours, its weekly closing days. One call. A card that knows its own Tabelog page reads that page for no fee; any other card gets one search | `supabase/functions/card-facts/facts.ts` |
| Re-check | A card with facts older than 180 days gets the re-check; only what was found is written, to the trip's card and the library card; the trip is planned again | `supabase/functions/card-facts/index.ts` |
| Database | A trigger on a new match that calls the re-check for an old card. Written, **not applied** | `supabase/sql/2026-11-12-recheck-hours.sql` |
| Tests | 25 checks of the plain-code parts (which Tabelog page is the card's own, reading the answer). All pass: `npm run test:recheck` | `scripts/recheck-test.mjs` |

- **Closed for good needs no new field.** Such a card is marked closed on every weekday. The planner already gives no day to a place on a day it is closed (`plan-trip/plan.ts:226`), so it gets no day at all. This was read in the code, not run.
- **The re-check keeps the card unless it is clearly wrong.** The card's own hours go in with the question, and the answer is "same" unless what was read clearly says otherwise.

### Tested on real cards (a test function that writes nothing)
13 library cards, two weeks old, so the right answer for almost all of them is "no change".

| Kind of card | Cards | What it used | Cost each |
|---|---|---|---|
| Knows its own Tabelog page | 3 | The page, no search | **0.2–0.3 cents** |
| Everything else | 10 | One search | **1.2 cents** |

- **9 of 12 open places came back "same".**
- **3 changed:**
  - Chikamine: closing days Monday → Sunday and Monday, read from its own Tabelog page.
  - Menya Inoichi: the Wednesday closing day was dropped.
  - Shimojima Asakusabashi: 10:00–18:00, closed Sunday → 09:30–19:00, no closing day.

  The last two came out the same in both test rounds. I could not confirm them from another source.
- **Closed for good works:** Oedo Onsen Monogatari in Tokyo, which closed in 2021, came back "closed" from one search.
- **A street with no hours** (Ninenzaka) stayed without hours.
- **First round, before the "keep the card" rule:** 5 of the 9 searched cards changed their hours or closing days from a single search, and a street (Ninenzaka) was given opening hours. That is why the rule was added; with it, 2 of the same 9 changed.
- **The tests cost about $0.25 of Claude credit.**

### What it costs against a full research
| | Cost |
|---|---|
| Full new lookup of a single place | about 2 cents |
| Full facts lookup (up to 3 searches) | 1 to 3 cents |
| Re-check, card with its own Tabelog page | 0.2–0.3 cents |
| Re-check, any other card | 1.2 cents, of which 1 cent is the search fee |

- **Only 26 of the 237 live cards know their own Tabelog page** (572 of all 1,820 cards). For the rest, the 1-cent search fee is the floor.
- **A way under that floor, not built:** let the re-check read the place's own website or its Google Maps page for no fee. Today page reads are limited to Tabelog on purpose, because the address comes from a post's text. Widening that is a security decision.

### Not done
- **Nothing is deployed and nothing is committed.** Going live takes two function deploys (`suggest-place`, `card-facts`) and then the database trigger, each only after your go-ahead.
- **The write path is not run:** the test function ran the same re-check code but wrote nothing, so the update of the card, the library card and the plan has not run on live data.
- **No "closed" label in the app.** A place that closed for good drops out of the day plan, but the card does not say why. That is a design change, so it needs before and after images and the English version first.
- **A place matched long ago is not re-checked** when its facts pass 6 months while it sits in a trip; only a new match triggers it.
- **The test function `recheck-test` is still deployed.** It writes nothing and answers only with the internal token. It can be deleted from the Supabase dashboard.
- **Not urgent:** nothing is older than 6 months before late April 2027.

## Sources
- [Booking.com affiliate programme, 2026 teardown (track360)](https://track360.io/blog/booking-com-affiliate-partner-program-operator-teardown-2026)
- [How much Booking.com pays affiliates (reacheffect)](https://reacheffect.com/blog/how-much-does-booking-com-pay-affiliates/)
- [Klook affiliate programme (Travelpayouts)](https://www.travelpayouts.com/blog/klook-affiliate-program/)
- [נעצתי on the App Store](https://apps.apple.com/il/app/id6828148819)

### Review by a Sonnet subagent (12 Nov), and the fixes it made
A Sonnet subagent read the changes without editing anything. It found no loop, no way for a card's text to make the re-check read a site other than Tabelog, and no syntax problem in the trigger. It found these problems, all in the new code:

| # | Problem | What could go wrong | Fix |
|---|---|---|---|
| 1 | An answer "open, closed on all 7 days" was accepted | The place gets no day in any trip for 6 months | A 7-day list is ignored; only "closed for good" can close a place |
| 2 | A re-check whose answer could not be read left the card old | Every new match of that place pays for another check | The date moves once the check has run; only a failed call leaves the card as it is |
| 3 | The search tool was taken away in a continued round | The call might be refused, which then becomes problem 2 | The search stays available in every round, as in the live lookup |
| 4 | The first line with a label was read, not the last | An answer that repeats the format first could be misread | The last line wins |
| 5 | "Closed for good" from one search closed the place for every trip | One wrong or planted web page closes a place for everyone | It is written to that trip's card only; each trip checks for itself |
| 6 | A trip with an old copy re-checked a place another trip had just checked | Paying twice for the same place | A fresh library card is copied, with no AI call |
| 7 | A newer saved answer with no places hid an older good one, now for good | The link is researched again at full price | The newest answer that has places is used |

- **Not type-checked:** Deno is not on this Mac. The subagent read for type errors and found none.
- **Not verified by anyone:** how the API behaves in a continued round (problem 3), and that the database clock is UTC (the 180-day test assumes it; Supabase's default is UTC).
- **The fixes are in the code** (same Sonnet subagent). I read its changes line by line against the list above and they match. The unit tests grew from 25 to 28 checks and pass, and both functions still bundle.
- **One more thing it changed, as asked:** a saved answer is served only with cards that would be added today. A saved card with no description, or no address or neighbourhood, is left out, by the same rule the live lookup has used since 11 November. A saved answer with nothing left counts as not saved, and the link is researched again.
- **The real-card test was run again on the fixed code** (12 Nov, after the owner's go-ahead for the test function), on the same 13 cards:

  | | Result |
  |---|---|
  | Answers that could be read | 13 of 13, one call each |
  | Cards with their own Tabelog page (3) | The page only, no search, 0.24–0.29 cents each |
  | The other cards (10) | One search each, 1.16–1.23 cents each |
  | No change to hours or closing days | 10 of the 12 open places |
  | Changed | Chikamine (Sunday added to its closing days, from its own page) and Shimojima (09:30–19:00, no closing day), the same as in the earlier runs |
  | Closed for good | Oedo Onsen Monogatari came back "closed" again |

  - **One answer is not stable:** Menya Inoichi kept its Wednesday closing day this time; in the two earlier runs it was dropped. So one search does not always settle a closing day.
  - **Not exercised:** no call was paused and continued, so the fix for problem 3 has not run for real.
  - **This run cost about $0.13;** all the re-check tests today cost about $0.38 of Claude credit.
- **Never run on real data:** copying a fresh library card onto a trip's old copy (problem 6), and serving a saved answer through the weak-card rule.

## 6. Go-live plan for step 1 (to be run by a Sonnet subagent, only after the owner's go-ahead)

The changes are already in the code (section 5). A Sonnet subagent is reviewing them first, read-only. Going live is a separate job with its own go-ahead. This is the plan that job follows.

### Before anything
1. Every finding from the review is fixed or written down as accepted.
2. `npm run test:recheck` passes.
3. The changes are committed, so the live files can be compared with a commit.
4. The live source of `card-facts` and `suggest-place` is read back and compared with the last commit (`6766db7`), so the deploy changes only the lines in this diff.

### The order, and why
| # | Step | Safe on its own because | Check after |
|---|---|---|---|
| 1 | Deploy `card-facts` (`index.ts`, `facts.ts`, `ai-log.ts`), same sign-in setting as today | Until the trigger exists, the database only calls it for a card with no facts, which works exactly as before | Live source equals disk, byte for byte. The function starts. A call with no token answers 401 |
| 2 | Deploy `suggest-place` (`index.ts`, `ai-log.ts`, `../_shared/credits.ts`), same sign-in setting as today | Nothing is older than 30 days before 27 November, so no answer changes yet | Live source equals disk. One real lookup of a link already looked up comes back as saved, at no cost (step `cached` in `ai_calls`) |
| 3 | Apply `supabase/sql/2026-11-12-recheck-hours.sql` | The trigger only fires for a card with facts older than 180 days; there is none before late April 2027 | The trigger and function exist. A new match on today's cards makes no call (no new `card-facts` row in `ai_calls`) |
| 4 | One real run of the write path, on one card | It is one library card that is not live (`active = false`) and one copy of it in the owner's own trip | Set that card's facts date back 200 days, match it, and see: the hours re-checked, the date moved to today, one `recheck-…` row in `ai_calls`. Then put the card back as it was |

- **Step 4 writes to the live database,** so it is listed in the go-ahead on its own.
- **Stop at the first check that fails** and report; do not go on to the next step.

### Going back
| Step | How to undo |
|---|---|
| 1, 2 | Deploy the function again from commit `6766db7` |
| 3 | `drop trigger place_recheck_facts on public.places; drop function public.request_card_recheck();` |
| 4 | Restore the saved values of the one card |

### After it is live
- Replace the test function `recheck-test` with an empty stub, or delete it in the Supabase dashboard.
- The `ai_calls` log shows each re-check under `card-facts`, step `recheck-page` or `recheck-search`.

### Step 1 went live on 12 November 2026
Run by a Sonnet subagent from this plan, after the owner's go-ahead. Checked again afterwards from the main session.

| What | State |
|---|---|
| Commit | `d3943fe`, five files, local only (not pushed) |
| `card-facts` | Version 9, live source identical to the commit, byte for byte |
| `suggest-place` | Version 40, live source identical to the commit, byte for byte |
| Trigger `place_recheck_facts` | Exists on `places`; ordinary users cannot call its function |
| Trigger test (nothing kept) | A fresh card queued no call, a 200-day-old card queued exactly one |
| Copy path, real run | A trip card made old next to a fresh library card: answered "copied", no AI call |
| Re-check path, real run | Bar Tiaré with both rows made old: one search, 1.15 cents, "open", hours unchanged, both dates moved to today |
| Clean-up | Bar Tiaré restored exactly; no test rows left; the test function `recheck-test` replaced with an empty one |

- **No card is older than 6 months today,** so the re-check will not run for a real match before late April 2027.
- **Not seen yet:** a real lookup of an old saved link through the app (it needs a signed-in person), a paused-and-continued re-check call, and a place found closed for good in a real match.
- **The app has no "closed" label yet.**
- **To go back:** deploy both functions from `697fbdb`, and `drop trigger place_recheck_facts on public.places; drop function public.request_card_recheck();`.
