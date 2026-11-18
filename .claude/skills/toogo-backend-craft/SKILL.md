---
name: toogo-backend-craft
description: The backend craft rulebook for Toogo, taught from creators' reels and checked against the house rules - Supabase, SQL and row-level security, edge functions, AI prompts and cost, security and data. Use when building or reviewing Toogo server code, SQL or functions.
---

# Backend craft (Toogo)

Short rules taught by the teacher agent from creators' reels, each with a why and its source. `toogo-rules` and `toogo-supabase-prelaunch` win over anything here. Reels are thin on backend craft: most of this is from Apple's rules, Supabase and Anthropic talks the scouts read, and the big-app teardowns. Creators' numbers are claims. Nothing here authorises SQL, a deploy or a planner run on the real trip (rule 6, memory "real trip untouched").

## AI cost and prompts

- **Per-user work is plain code or cached data; Claude is for one-off, cacheable jobs** (adding a place from a link, reading a booking). Why: rule 2, and credits only cover AI cost plus a little. Big apps score every user with models (Tinder, Block Blast, TikTok); Toogo does not.
- **Rank on the phone, not on the server.** Taste learning (`learnTags` in `src/rank.ts`) runs from swipes with no call. Extra signals (time on a card) join it the same way. Source: @ayoships Tinder teardown, `docs/ayoships-reels-2026-11-12.md`.
- **Say which features use AI** in the app and in the review notes (wand, suggest-place, plan generation). Source: @nels_ysng, `docs/nels-and-scouts-2026-11-14.md`. See `toogo-app-review`.
- **Credits bought in the app may not expire; one price for everyone.** No per-person prices, no cutting free credits to push buying. See `toogo-credits-offer`.

## Config and rules from the server

- **Small settings in a JSON file or table the app reads at start** (cards per batch, which tips show, feature switches). Why: a change reaches everyone with no App Review. Source: @ayoships Subway Surfers reel. Use for neutral switches only, never to tune offers per player (rule 7).
- **Over-the-air updates for fixes, not for changing what the app is** (Capgo or Ionic live update for Capacitor). Needs the owner's decision and a deploy; idea only. @ayoships.

## Security and data

- **Row-level security on every table; test while signed in as a normal user.** Why: the service key must never reach the client (checked 2026-11-14: it does not). Full checks: `toogo-supabase-prelaunch`. Source: Supabase talks via the architecture scout.
- **Run Supabase locally and push in small chunks** as a separate step; never against the real trip. Same scout.
- **Link fetches validate every hop** (private, internal and metadata addresses refused; failed lookup refuses). Already shipped; keep it for any new fetcher.
- **Share links keep private places out** (`?share=` snapshot). Keep that filter in any new public surface.
- **Delete account inside the app is mandatory** (Apple 5.1.1(v)): the server side must remove the user's data. Built, uncommitted, not applied; see the delete-account handoff doc. Source: @nels_ysng.
- **Never track by Wi-Fi network, battery, brightness or device fingerprints** (what Duolingo and TikTok do). Why: opposite of a trip app people trust. @ayoships.
- **Public feedback boards and replay tools are outside tools:** the owner's privacy decision first (Settings says "no outside tools"). Replays record what people type. @danh.app, @ayoships.

## Billing

- **Israel and every store except the US: Apple in-app purchase only;** web buy link only on the US store; credits bought on the web may be used in the app only if Apple's purchase also sells them. See `toogo-credits-offer`.
- **RevenueCat: one offering per app version.** Changing the default offer broke a live app during review. Source: @nels_ysng DeNL5P3Oagz.

## Data

- **Only add a card that says what and where** (rule 4); report how many were left out. Public-data features (last train, weather, events) come from cached open data, not live per-user calls. Idea from @ayoships reel 10; owner chooses.

## Not for Toogo

Rigged difficulty, popularity-based upsells, inflated purchase reports to ad networks, different prices by profile (@ayoships teardowns).

## Frames read

Seen in video frames, 2026-11-16. No backend lesson came out of the 13 reels watched.
- **AI answers must name what data they used** (from the AI-chat reel https://www.instagram.com/reel/DffBKUZhy6B/): the edge function should return the list of sources it read (counts, dates) along with the text so the UI can show them; and any write the AI suggests is returned as a proposal the user confirms, never applied by the function. Fits rule 2 (one-off, cacheable calls only).
