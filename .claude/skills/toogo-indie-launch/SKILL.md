---
name: toogo-indie-launch
description: Habits for shipping a small solo-built app fast and getting it to the store and its first users - launch-week checklist, feedback door, tester recruiting, handing work between AI chats. Use when planning the App Store launch, recruiting testers, setting up support and feedback, or starting or handing over a long Claude session.
---

# Indie launch habits (Toogo)

Source: @danh.app, a solo developer (Andrew Do, 304 followers, says he is building small iPhone apps toward 10K MRR: Haven, Rallio, Mealo). Reels read 2026-11-16 by frame and burned-in caption; his voice was not heard. These are one small builder's habits, not measured results. Full notes: `docs/danh-app-reels-2026-11-16.md`.

## 1. Launch-week checklist
- App Review basics first: privacy policy and terms in the app and in store fields, numbered reviewer notes, demo account, in-app purchase metadata. The table is in `toogo-app-review`. Source: https://www.instagram.com/danh.app/reel/Dfy_BeWSnqN/
- Pick the release mode on purpose in App Store Connect (he shows "schedule the release" next to the review result, second 77-84 of the same reel). Release after approval, by hand, on a day the owner is free to watch: `toogo-rules` 6 and 9 still apply (the owner deploys and commits).
- Plan a launch moment only after approval. His own sample calendar entry is "UGC event: app launch with 12 creators"; Toogo has no creator budget, so the equivalent is the owner's own short videos (`toogo-short-video`).

## 2. A feedback door from day one
Three doors on one Support screen: suggest (public ideas with votes), report a problem (private), contact. Source: https://www.instagram.com/danh.app/reel/DfrQoL-SwEG/ . His captions say "forgot to add ... feedback" as one of his "10 mistakes". Toogo has the private report (`src/views/Report.tsx`); the public board needs the owner's privacy decision (`toogo-growth-loops`). The Settings "Help improve Toogo" switch stays as is.

## 3. Testers
- He found testers hard to get for Google Play: a personal developer account created after 13 Nov 2023 needs a closed test with 12 testers for 14 continuous days before production (the screen he shows, https://www.instagram.com/danh.app/reel/Dfbz5SzShIi/). A commenter says an organisation account skips the wait; that is unchecked. **Toogo is iPhone-only, so this does not apply unless Android is ever added.** For iPhone, TestFlight is the route, and the owner's own friends and the Japan trip group are the first testers.

## 4. Working with AI chats without losing the thread
- One project per chat group, a short shared context block (Goal / Decision / Next) copied into a new chat, so a new chat starts informed. Reel https://www.instagram.com/danh.app/reel/Dfg9aefyz10/ (Claude Projects shows exactly this: "Goal: offline-first notes app, Decision: sync with SQLite, Next: build search screen").
- Name chats by project, owner and current task ("Fun App Codex", "Rallio Claude Tennis analysis feature"; reel https://www.instagram.com/danh.app/reel/DfeYopuS4gb/). Toogo already has the equivalent: `docs/HANDOFF.md`, handoff docs per session and the agent org. Keep each handoff short and dated; do not add a second system.

## Do not
- Leave the "to be created" placeholders in reviewer notes on the day of submission.
- Copy his Google Play steps, his subscription prices or any "comment X to get my guide" funnel.

## Added 2026-11-16 from @theglidestudio (captions read)
- **Tell testers what happens next** (https://www.instagram.com/theglidestudio/reel/Dfxe6k1i2BG/): after a tester applies, send three lines: we read it, we reply, here is the first step. No silence after a form.
- **Real, small capacity is fine; fake scarcity is not** (https://www.instagram.com/theglidestudio/reel/Dfz1-7dP0o8/ limits its free trial to four startups). A tester round capped for a true reason (e.g. only as many as the owner can answer) may say so once, plainly. No countdowns, no "last spots" (toogo-rules 7).
- **Launch timing** (https://www.instagram.com/theglidestudio/reel/DfzQLl2o_6j/): December is crowded for everyone; Toogo's launch window is after the Japan trip anyway (toogo-rules 6). Plan the first video series ahead so it is ready, not rushed.

## Added 2026-11-16 from @charles.unemployed (captions read)
- **"Give this to your AI agent" rules block** (https://www.instagram.com/charles.unemployed/reel/DfxOhZmyLXz/): a short bullet list of concrete design rules the agent follows in every UI it builds works better than "make it nice". Keep one such list for Toogo (the CSS rules in toogo-premium-feel) and point the frontend agent at it for every screen.

## Added 2026-11-26 from @ceciliakimdesign (captions only)
- **First user test, no helping:** five-second test, give a task not a tour, ask them to think aloud, watch the first tap, stopwatch the main task (for Toogo: reach a match and open the plan), write down every word they ask about, then reword it in Hebrew and English. Why: you see what the owner can no longer see. https://www.instagram.com/ceciliakimdesign/reel/DerlGknRC37/
- **Make your own case perfect first;** overbuilding for everyone broke her core use. https://www.instagram.com/ceciliakimdesign/reel/DcrmDVTSgfx/

## Added 2026-11-27 from @danh.app, @nels_ysng, @kunaluxui (captions; their numbers are claims)
- **Ship the messiest simple v1 and learn from real use;** features are not value, UX details compound, structured feedback, shipping teaches fastest. @danh.app https://www.instagram.com/reel/DUF0IHukmsp/ , https://www.instagram.com/reel/Dd_OH4_h-VH/
- **Test on a real phone every day** and put UI work in early. @nels_ysng https://www.instagram.com/reel/DasNnFROctO/ , https://www.instagram.com/reel/Dac0F0DOhzg/
- **Check that notifications work when daily use is low** (only for real events, rule 7). @nels_ysng https://www.instagram.com/reel/Dcorz64Oq9P/
- **An in-app feedback board** is a good door, but outside tools need the owner's privacy decision. @danh.app https://www.instagram.com/reel/DfUFbPFS7iz/
- **Claude Code habits:** keep CLAUDE.md maintained, Plan mode, parallel subagents on separate branches (our worktree flow), MCPs for outside data. Already how this org works. @nels_ysng https://www.instagram.com/reel/DdR8LreOk-N/ , https://www.instagram.com/reel/DdW_qmXulCC/
- **Solo costs to budget** ($99 a year Apple, AI tools, backend). @danh.app https://www.instagram.com/reel/DTcnbnNklsk/
- **Handoff:** write down decisions that affect the build and review the real build after it ships. @kunaluxui https://www.instagram.com/reel/DdmMR9jFs3L/
