# What Toogo can take from @ayoships (28 reels, read 2026-11-12)

The account is Ayo Omolewa: 298K followers, YC W25, says 15+ apps and 387K+ App Store downloads. The older 20 reels are about growing a phone app without paying for ads. The 8 newest ones are different: he takes apart big apps (Tinder, TikTok, Duolingo, Candy Crush and four games) and shows their code on screen. Those 8 have a section of their own below.

How I read them: Instagram has no text version of these videos. I stepped through each video and read the burned-in captions word by word. For the screens, I made a contact sheet of every reel (one frame about every second) and zoomed in to full size on every frame that showed code, a document or an app screen. The onboarding reel has no voice, so I read every screen of it. Toogo is an iOS app built with Capacitor, so the App Store tips apply to it.

A first version of this report covered only 20 reels, because the profile's Reels tab loaded only 20. The main grid has 28. The older 20 show no code: every panel I zoomed into there was a web page, a list, an app screen or a chat.

## Worth doing, most useful first

### 1. Free pages that answer what people search for (reels 9, 3, 6)
- **What he says:** each problem your app solves gets its own small web page that answers it and links to the app. His example: a "split rent fairly" calculator page that sends people to a bill-splitting app. Google's Keyword Planner shows how many people search each phrase, by country, for free, with no ad spend. He says this brings him 50K downloads a month with no marketing spend.
- **Part two:** ChatGPT and Claude lean on comparison sites when someone asks for "an app like X". Listing the app as an alternative on AlternativeTo and SaaSHub is free. He calls this GEO (generative engine optimisation).
- **For Toogo:** we already hold the data: place cards, areas, where-to-stay. Pages like "where to stay in Kyoto", "kosher food in Osaka" or "5 days in Tokyo", in Hebrew and English, can be built from the cached data with plain code and no AI per view. That keeps the no-LLM rule for every-view features. Hebrew searches about Japan face very few competitors.
- **Also:** list Toogo on AlternativeTo and SaaSHub as an alternative to Wanderlog and TripIt.

### 2. Show the value before sign-up (reel 1, no voice, every screen read)
- **His four steps:** first a promise ("Sleep better, starting tonight.", one button). Then a quiz where "every answer shapes their plan", and each answer stays on screen as a chip. Then "Show the value before the price": a "Building your plan…" animation, then the person's own plan. Only after that comes the paywall, which shows exactly when they will be charged (today, day 5 reminder, day 7).
- **Toogo today:** sign-in comes first and the questionnaire after it (`src/App.tsx:95`, then `:107`).
- **What to adopt:** let a new person answer the questionnaire and see the first Discover cards or a rough day plan, then ask them to sign in "to save your trip". Toogo has no paywall, so that sign-in step plays the paywall's part.

### 3. Ask for App Store ratings at a good moment, and watch real sessions (reels 19 and "rating after a win")
- **Ratings, corrected:** one older reel shows his own window first ("How's the app?" with "I love it" / "Could be better" / "Maybe later"). Only "I love it" goes on to Apple's prompt; "Could be better" opens a "Help us improve" form.
  - A newer reel shows the catch. A game does the same thing with five stars already selected, and he puts Apple's rule on screen: Apple "will disallow custom review prompts".
  - So Toogo should not sort people by their answer before Apple's prompt.
  - Keep the part that is allowed, the timing. The game's code only asks after a win (`I.BattleWin`). For Toogo that means calling Apple's own prompt right after a good moment, such as a match or the first finished day plan.
  - Keep a feedback form as a separate thing anyone can open at any time.
  - Toogo has no rating prompt today. It needs a small Capacitor plugin for Apple's prompt.
- **Session replays:** he uses PostHog to watch how people move through the app. That shows why they leave, plus bugs and broken flows nobody reports.
  - Toogo has no analytics today. PostHog has a free tier.
  - Replays record what people type and see, so they need a privacy decision first.

### 4. Free public data as day-of-trip features (reel 10)
- **His example:** combine map data, live train times and event data into "plan your day around the last train home". He points to the free "Public APIs" list on GitHub.
- **For Toogo:** a "last train to your hotel from here: 23:41" line on the itinerary, plus weather and local events on trip days. Japan publishes open public-transport data. All of this is plain code over cached data, so it fits the no-LLM rule.

### 5. App Store name and a listing per country (reels 17, 14)
- **The name:** an app's name counts as a search term. "Lumora" gets no searches; "Blackjack Trainer – Lumora" does. The subtitle, keywords and even the text on the screenshots are all searched.
  - For Toogo: something like "Toogo – Japan Trip Planner".
- **Per country:** Apple has 175 stores, and each country can get its own name, subtitle and keywords. Apple Search Ads shows how popular a search term is, for free. He looks for terms that many people search but few apps target, then has AI translate them. He now shows up in 20+ stores.
  - For Toogo: a Hebrew listing for the Israel store, English for the rest, and maybe more languages later.

### 6. Ship fixes without waiting for App Store review (reel 16)
- **His point:** "over-the-air updates" push a code change to phones within seconds, without a new App Store review. Apple allows this for fixes and improvements but not for turning the app into something else.
- **Why it matters for Toogo:** the iOS app serves the web build from inside the app (`capacitor.config.ts`), so today every fix needs a full review.
- **What to use:** Capacitor has live-update services, Capgo or Ionic's. This fits how you publish fixes one by one.

## The 8 newest reels: code from big apps, and what Toogo can use

In each one he says he took the app apart ("reverse engineered") and shows short pieces of its code. Most of it is how these apps squeeze money out of people. Toogo should not copy those parts, but four ideas from the code fit Toogo well. Each runs in plain code on the phone, so it fits the no-AI-per-view rule.

### What each reel shows
- **Tinder** (closest to Toogo, since both are swipe and match).
  - Every swipe sends `photo_id`, `view_count` and `total_duration_ms`: which photo, how many times it was seen, and how long the person looked at it.
  - Tinder learns "your type" by averaging the photos you swipe right on.
  - It scores how popular each person is (`right swipe received ratio`). It uses that score to show some people a paid offer, tagged `upsell_superlikes_high_rsrr`.
  - Its photo picker scans up to 20,000 photos from the last 2 years and keeps the best 27.
- **TikTok.**
  - Each cached video carries guesses such as `rec_skip: 0.77` and `rec_finish: 0.15` (how likely you are to skip it or watch to the end).
  - Every feed request sends battery level, whether the phone is charging, screen brightness and over 50 other details.
  - A stored rule (`live_pull_lost_focus_video_feed`) pushes a live video when it thinks you're about to leave.
  - A "keep-warm" step (`app_start_predict_list`) guesses when you'll next open the app and gets content ready in advance.
- **Duolingo.**
  - A `churn` folder works out, every day, the odds you'll come back tomorrow (`latest_tomorrow_prob`).
  - It recognises your Wi-Fi networks to guess whether you're at home before it sends a reminder.
  - It checks whether your phone was on silent when a reminder arrived.
  - If reminders are off, it asks you to turn them on using what you care about most: a friend's streak, a streak freeze or the leaderboard.
- **Candy Crush.**
  - It downloads a 600,000-row table to the phone. After every move, it checks how close you are to winning ("pass proximity") against where they want you to be.
  - Then it calls `MakeEasierAction()` or `MakeHarderAction()`.
  - Losing streaks and quit counts feed its pricing model.
- **Subway Surfers.**
  - A rules engine checks up to 158 facts about each player: purchases, money spent, days played and so on.
  - The rules come from the server as JSON files. For example, an ad offer shows only when `HoursSinceLastAdWatch ≥ 168`. So the rules can change for anyone at any time without a new app version.
  - It runs 112 versions of the game as tests on players at once.
- **Block Blast.**
  - A small model running on the phone (XGBoost, fetched as a JSON file) predicts how much each player is worth in ads, using phone model, country and past ads.
  - The game then turns easier or harder on purpose (`MultiClearBoostThenKillTrait`).
- **Royal Kingdom.**
  - The game ships a hidden second copy of every level with about a third fewer moves (30 → 20).
  - A rule called `IsLowMatch` hands out pieces that won't match. In his test, the win rate fell from 52% to 12%.
  - Payers and non-payers see different prices for the same item ($6.99 vs $0.99).
- **A $100K-a-day game.**
  - One $40 purchase is reported to the ad networks as five purchases.
  - It asks for ratings with five stars already selected; this reel is behind the correction in item 3 above.

### Worth taking for Toogo
1. **Count how long someone looks at a card (Tinder).**
   - Toogo already learns each group's taste from yes/no swipes, in plain code (`learnTags` in `src/rank.ts`).
   - Adding the time spent on each card is a cheap extra signal: a long look before "no" still means some interest, and a quick "no" means none.
   - It stays on the phone, like the rest of the ranking.
2. **Get the day ready before it starts (TikTok's keep-warm).**
   - The night before each trip day, or whenever the phone has a good connection, save that day's plan, maps and card photos on the phone.
   - Then the app opens instantly in Japan, even with a weak signal.
   - Toogo already saves trip data on the phone for offline use, so this adds the photos and the next day's places to it.
3. **Change behaviour from the server without an App Store update (Subway Surfers, Block Blast).**
   - Keep small settings in a JSON file or table the app reads when it starts: how many cards per batch, which tips to show, feature switches.
   - A change then reaches everyone at once with no review. This goes well with item 6 above.
4. **Ask for notification permission by naming what the person gets (Duolingo).**
   - Toogo sends no notifications today.
   - If it adds them, ask at the moment it helps. For example, "We'll tell you when your partner likes the same place" just after a first swipe, or "We'll remind you of the last train" when a trip day is planned.
   - That works better than asking on the first screen.

### Not for Toogo
- **Charging people by profile:** Tinder's popularity upsell, Royal Kingdom's payer prices.
- **Rigged difficulty:** Candy Crush, Block Blast, Royal Kingdom.
- **Inflated purchase reports to ad networks.**
- **Tracking where people are through their Wi-Fi (Duolingo).**

They are the opposite of what a trip planner people trust should do. Showing the same hotel prices to everyone matters for the affiliate plan too.

## Making money: the affiliate first, credits second

### The plan
- **The affiliate stays the main income.** A traveller with no hotel gets a recommended area, then searches hotels there through Toogo's affiliate link. A share of a hotel stay is worth far more per traveller than credits.
- **Credits pay for the AI.** Today Toogo has a credit wallet. Free credits are added every day; a new place lookup, reading a booking and translating cost credits. Nobody can buy credits yet.
- **Credits will be sold on Toogo's website,** with a link from the app to the page where people buy them. Price them to cover the AI cost plus a little.

### What Apple allows (checked 2026-11-12 on Apple's App Review Guidelines page)
- **US App Store: allowed.**
  - Since a court order on 30 April 2025, apps on the US store may have buttons and links to buy on their own site.
  - Apple takes no commission on those web sales for now.
  - In August 2026 Apple asked the court for 5% to 15%. Epic is fighting it, and Apple's appeal is at the Supreme Court, probably not decided before 2027. So the US rate may change.
- **Israel and almost every other store: not allowed.**
  - Apple's guideline 3.1.1(a) says that outside the US store, apps "may not include buttons, external links, or other calls to action" toward a purchase method other than Apple's in-app purchase.
  - Some regions (the EU among them) have a special Apple permission for such a link, but with Apple fees and Apple's own wording.
  - Most Toogo users are Israelis on the Israel store, so the plain link would get the app rejected there.
- **Credits bought on the website can be used in the app** (guideline 3.1.3(b)), but only if the same credits are also sold through Apple's in-app purchase.
- **Telling people outside the app is always allowed:** email, the website, Instagram.

### So the setup that works
1. **The website sells credits** at one clear price for everyone.
2. **On the US store,** the "not enough credits" message shows a "Buy credits on toogo" link to that page. The app can tell which country's store the phone uses and show the link only there.
3. **On the Israel store and the rest,** the app sells the same credits through Apple's in-app purchase (Apple takes 15% at Toogo's size). The app says nothing about the website. People who find the website by email or Instagram can buy there, and their credits show up in the app.
4. **The trip pass** (a trip with no credit limit, shared by the whole group) can be sold the same way, as one purchase per trip.

### Fair rules for the credit offer, taken from the reels
- **Offer at the moment of need:** when someone runs out mid-lookup, show the offer right there.
- **Don't nag:** Subway Surfers waits a week (`HoursSinceLastAdWatch ≥ 168`) before showing the same offer again. Do the same.
- **Show the price and what it buys,** like the paywall in his onboarding reel that says exactly when you pay.
- **Never:**
  - different prices for different people;
  - cutting the free credits to push people to pay;
  - guessing who is about to leave and aiming offers at them;
  - fake urgency.

  People who feel tricked won't trust Toogo's hotel suggestions, and those carry the affiliate.

## Smaller tips that still apply

- **Design (reels 0 and 7).**
  - Build each screen in three layers: background, subject, buttons on top.
  - Use one colour that only ever means "tap this"; everything else stays plain.
  - Make one thing huge and everything else small, with nothing in between.
  - Make the subject oversized and overlap the headline.
  - A design pass on Toogo against these rules would be cheap to do.
- **Copy proven screens (reel 11).**
  - Libraries like Mobbin and ScreenDesign collect real screens from top apps. Paywalls and onboardings there have been A/B tested on millions of users.
  - Worth checking before redesigning a Toogo flow. For example: how Tinder does swipe-and-match, or how Airbnb puts places on a map.
- **Share links that open the right screen (reel 4).**
  - His tip: Apple App Clips. A small part of the app opens from a link, with no install. One restaurant app got 80% of its users this way.
  - Toogo already covers most of this: the public shared-plan page (`?share=`) opens before sign-in.
  - A later step: make the same link open straight inside the app for people who have it installed.
- **AI coding habit (reel 18).**
  - Tell the AI not to keep fallbacks or old versions beside new code, because it ends up confused about which version is live.
  - His other point, that apps should not ask the server for data every few seconds, is already fine in Toogo. It uses live database updates, and its only timers refresh a clock on screen.

## Not relevant to Toogo

- Reel 2: putting a website on the App Store. Toogo already did this with Capacitor.
- Reel 5: earning money by joining app bundles like Setapp.
- Reel 8: turning free AI research into paid features.
- Reel 12: making a paid app free for a few days on App Raven to collect ratings. Toogo is already free.
- Reel 13: first steps of building an app with AI.
- Reel 15: an advert for his own tool that submits apps to Apple.
