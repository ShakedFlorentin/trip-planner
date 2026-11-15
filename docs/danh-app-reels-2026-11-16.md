# What Toogo can take from @danh.app (17 reel links, 12 different reels, read 2026-11-16)

**Who he is (his own claims):** Andrew Do, a solo developer. The bio says "Goal of 10k MRR building apps" and lists Haven (an agentic video editor), Rallio (a social tennis app, "the Strava of tennis") and Mealo (a meal planner). He has 304 followers and 45 following. The account is new: the oldest reel is dated 9 Sep 2026, "My journey to $10K MRR begins" 6 Oct 2026, and the rest are from the last 6 weeks. The three apps are shown at $0, so there is no revenue proof. Everything below is one beginner-to-mid builder's habits, not measured results.

## How I read them
- Instagram has no text version. The Reels tab showed 12 links; the main grid added 5 more (3 pinned-style older reels and 2 from the last two weeks). Total 17 links. 5 of them are the same video posted twice (same length, same caption), so there are 12 different reels. No sign-in was asked for; the page only shows a "sign up" banner, which I did not touch. I did not follow, like, comment or open any link from a caption.
- **Method change, said plainly:** the built-in browser pane was hidden, and its screenshots kept returning a stale picture of another page, so I could not read frames through it. I used the separate Playwright browser instead: it opened each reel, stepped the video by 1 s (every second, in two passes), drew each frame at full 1080x1920 and saved it. I then read the frames with the Tesseract text reader, and kept lines it read with decent confidence. I did not look at the frames myself.
- What that means for accuracy: the burned-in captions are mostly one or two words at a time, and the reader caught many but not all of them. Screens with documents (Apple's pages, App Store Connect, app screens) were read well. The talking-head reels (ads, career advice, AI tools) came out with only fragments. I did not hear any audio. Post captions were read from the page text.
- View counts below are what Instagram showed on his Reels tab, matched to reels by position.

## Worth doing, most useful first

### 1. Get App Review basics right before the first submission (reel 1, https://www.instagram.com/danh.app/reel/Dfy_BeWSnqN/, read)
- **What he shows:** his own rejection ("Please update your privacy policy and terms of use"), and a fix list: Privacy Policy and Terms of Use rows in Settings and in the store fields; **reviewer notes as numbered steps** ("1. Sign in with the demo account, 2. Tap Record..., 3. Upgrade lives under Profile, Membership (sandbox), 4. Camera is used for scans only"); in-app purchase products marked "Missing Metadata" (monthly, yearly, lifetime) that must be filled before submit; a feedback habit; and Apple's "request an expedited review" form for a critical bug fix or a dated event (steps to reproduce, or the event date). 3.6K views, his best.
- **Toogo today:** **partly.**
  - Privacy and terms: a row exists in Settings (`openExternal(privacyUrl())`, `src/views/Settings.tsx:96`, page built by `scripts/pages/privacy.mjs`). The store fields and a support URL are still on the "Before you submit" list in `docs/app-store-listing.md`.
  - Reviewer notes: drafted as a paragraph with "demo account, to be created" (`docs/app-store-listing.md:153-161`). No numbered steps yet.
  - In-app purchase metadata: nothing to fill yet; Toogo has no in-app purchase.
  - Expedited review: not mentioned in any doc.
- **Done in skills:** `toogo-app-review` (new section), `toogo-indie-launch`, `toogo-credits-offer` (one line).

### 2. A feedback door with three parts, from day one (reel 3 and reel 4, https://www.instagram.com/danh.app/reel/DfrQoL-SwEG/, read)
- **What he shows:** part of "10 mistakes I made building apps" (his caption says he "needed a better way for people to share feedback and vote on what they wanted next"). Mealo's Support screen has: suggest and vote on ideas (a public board, sorted by Trending; posts and profile are public; "Votes help us prioritise; they are not a promise of delivery"), report a problem (private, in Settings), and a warning that AI-generated lists need a double-check.
- **Toogo today:** **partly.** The private door exists: `src/views/Report.tsx`, table `reports`, status and a reply come back to the sender. There is no public ideas board or vote. Settings says "no outside tools", and his board is an outside tool (Fider), so it needs the owner's privacy decision first.
- **Done in skills:** `toogo-growth-loops`, `toogo-indie-launch`.

### 3. A share card made for Instagram Stories, and a trophy case (reel 17, https://www.instagram.com/danh.app/reel/DdELXgxSBNf/, read)
- **What he shows:** Rallio: after a match, "Share Activity" makes a card ("Andrew vs Opponent 6-3, 6-4" with the app name) and offers Instagram Story, Clipboard, More. Also a trophy case ("First Match, First Win, 10 Matches", progress 1/10) and a match page with cheers and comments.
- **Toogo today:** **doesn't.** There is a share sheet (`src/native.ts` uses `@capacitor/share`, `src/views/Share.tsx`) and a shared plan page (`?share=`), but no image card, no Story target and no milestones in `src/`. This is the "trip wrapped" idea already in `toogo-growth-loops`, now with a concrete model. Fits `toogo-rules` if free and without streaks.
- **Done in skills:** `toogo-growth-loops`.

### 4. A short list of reasons for the first screens (reels 2, 9; https://www.instagram.com/danh.app/reel/DfvTxL5ScLH/, https://www.instagram.com/danh.app/reel/DfjiPD2yHB8/, read)
- **What he shows:** UI tips: study reference apps (Mobbin, Dribbble on screen), put micro-animations on a few key moments (click, transition, check mark, screen change), keep the rest unnoticed. A sign-in screen with "Continue with Apple / Continue with Google". Rallio's first question after the first look: "What brings you to Rallio?" with four choices.
- **Toogo today:** **partly.** Feedback levels and Mobbin are already in `toogo-premium-feel`. Haptics are still not installed (no `@capacitor/haptics` in `package.json`). `src/views/Onboarding.tsx` has no "what do you want" question. Apple and Google sign-in are not built (wanted by the owner, needs the owner's console setup).
- **Done in skills:** `toogo-premium-feel`, `toogo-first-run`.

### 5. Read Apple's own rules before polishing the look (reel 5 and 6, https://www.instagram.com/danh.app/reel/Dfor0jxSp3c/, read)
- **What he shows:** the Liquid Glass reel reads Apple's WWDC25 and developer pages: "standard components pick up the new look automatically"; "reduce custom backgrounds in controls and navigation elements".
- **Toogo today:** **partly / not applicable.** Toogo's screens are web content inside the Capacitor shell, so they do not pick up the new look by themselves. Nothing was changed. Whether to imitate it in CSS is the owner's design call.
- **Done in skills:** `toogo-premium-feel`.

### 6. Hooks and format for the owner's own short videos (reels 1, 2, 5; view counts as above)
- The two best reels open with a blunt line ("Apple rejected my app because it SUCKED", "Your app SUCKS") and then give steps over real screen recordings, with word-by-word captions and "save THIS ONE" at the end. A numbered series ("10 mistakes I made building apps") gives a reason to follow. The same content posted twice got about 130 and about 1.3K views (reels 9 and 10), so reposting is worth trying.
- **Toogo today:** `toogo-short-video` existed from articles; this is the first first-hand account. Account is tiny, so the evidence is weak.
- **Done in skills:** `toogo-short-video`.

### 7. In-app events and competitor product pages (reel 2, https://www.instagram.com/danh.app/reel/DfvTxL5ScLH/, read)
- He walks through Duolingo's listing, including an in-app event card ("Trick or Streak, HAPPENING NOW"). **Toogo today:** `docs/app-store-listing.md` does not mention in-app events. Worth checking Apple's current rules, after the Japan trip. Copy the placement, not the streak framing.
- **Done in skills:** `toogo-store-listing`.

## Skills changed or created
- Changed (each has a marked "Added 2026-11-16" section with reel URLs): `.claude/skills/toogo-app-review/SKILL.md`, `toogo-first-run`, `toogo-growth-loops`, `toogo-store-listing`, `toogo-premium-feel`, `toogo-short-video`, `toogo-credits-offer`.
- Created: `.claude/skills/toogo-indie-launch/SKILL.md` (launch-week checklist, feedback door, testers, handing work between AI chats).
- Nothing committed.

## What to skip, and why
- **Custom star box before Apple's prompt** (reel 3, second 11: "Enjoying Mealo? Tap star to rate it on the App Store. Not Now"). Home-made rating screens in front of Apple's prompt are the pattern Apple disallows, and Toogo's rule is Apple's prompt only. Toogo already does it the allowed way: `src/rating.ts` with `ios/App/App/AppReview.swift`.
- **Streak and event pressure** (Duolingo "Trick or Streak"): conflicts with the no fake urgency, no nagging rule (`toogo-rules` 7).
- **Google Play closed-test rule** (12 testers, 14 days; reel 14, https://www.instagram.com/danh.app/reel/Dfbz5SzShIi/): Toogo is iPhone-only. Kept as one line in `toogo-indie-launch`. A commenter's claim that an organisation account skips it is unchecked.
- **Subscription prices** ($4.99, $39.99, $79.99): his apps, not a basis for Toogo's credit pricing.
- **Career advice reels** (reels 9, 10, 15; stay curious, "don't outsource your own judgment"): not about building Toogo.
- **Meta ads reel** (reel 7, caption only): Toogo has no ad budget, and his captions on screen were too few to read; the post caption says only that testing an image and two videos "taught me something unexpected".
- **Claude and Codex chat tips** (reels 11, 13): mostly what Toogo already does with `docs/HANDOFF.md` and the agent org; one line kept in `toogo-indie-launch`.
- **A public Fider board** as-is: privacy decision first (see item 2).

## All 17 reels
Position = Reels tab order, then the grid-only ones. "read" means the video was stepped through at 1 s; most text on talking-head reels is fragments only.

1. https://www.instagram.com/danh.app/reel/Dfy_BeWSnqN/ — "Apple rejected my app over its privacy policy": 10-mistakes part, App Review basics, notes, IAP metadata, expedite. read
2. https://www.instagram.com/danh.app/reel/DfvTxL5ScLH/ — UI design tips: references, Duolingo listing and event, micro-animations, "good UI goes unnoticed". read
3. https://www.instagram.com/danh.app/reel/DfrQoL-SwEG/ — 10 mistakes part: forgot to add feedback; Mealo rating box; support and vote board. read
4. https://www.instagram.com/danh.app/reel/DfrQmKfy39J/ — same video as 3, different post. read (same frames)
5. https://www.instagram.com/danh.app/reel/Dfor0jxSp3c/ — "POV: your mobile app UI SUCKS", Apple's Liquid Glass pages. read
6. https://www.instagram.com/danh.app/reel/Dforz_gS3xS/ — same video as 5, different post. read (same frames)
7. https://www.instagram.com/danh.app/reel/DfmHAznyNKB/ — testing an image and two videos for Meta ads; talking head, a few words only. read, mostly unreadable; judged mainly from the post caption
8. https://www.instagram.com/danh.app/reel/DfMXFIHS-UE/ — same video as 7, different post. not separately read
9. https://www.instagram.com/danh.app/reel/DfjiPD2yHB8/ — career advice: experience and evidence you can build; shows Rallio onboarding question. read
10. https://www.instagram.com/danh.app/reel/DfjiLpUyvbG/ — same video as 9, different post. not separately read
11. https://www.instagram.com/danh.app/reel/Dfg9dmrS443/ — Claude Projects shared context between chats. caption-only (same video as 12)
12. https://www.instagram.com/danh.app/reel/Dfg9aefyz10/ — same: Orbit Notes shared context, "context dump" copied to a new chat. read
13. https://www.instagram.com/danh.app/reel/DfeYopuS4gb/ — naming Codex chats by project, owner and task; Rallio "Pending App Store Connect review". read
14. https://www.instagram.com/danh.app/reel/Dfbz5SzShIi/ — finding testers for Rallio on Google Play (12 testers, 14 days). read
15. https://www.instagram.com/danh.app/reel/DeEQ16uBGdF/ — advice for software engineers in 2026; "don't outsource your own intelligence". read, captions word by word
16. https://www.instagram.com/danh.app/reel/DeoT5k8Bg9q/ — "My journey to $10K MRR begins", Mealo meal plan screens. read, few captions
17. https://www.instagram.com/danh.app/reel/DdELXgxSBNf/ — "i built the strava of tennis called Rallio" (9 Sep 2026): activity share card, trophies. read
