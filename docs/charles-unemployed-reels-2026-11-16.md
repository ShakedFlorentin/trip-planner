# What Toogo can take from @charles.unemployed (12 reels, read 2026-11-16)

**Who they are (their own claims):** Charles Liu, "I talk about apps, design, and tech", co-founder of Gleam (claims 500k+ users, unverified), 43.3K followers, 1,020 following. The recent reels (11-15 Nov 2026) are mostly web and UI design rules for AI-built interfaces: CSS tricks, accent colour, fonts, animation laws. One reel reached 336K likes, so the accent-colour series is the account's hit. Numbers are the account's own public counts, not proof the advice works for Toogo.

## How I read them
- 12 reels on the profile. No sign-in was used.
- **Captions: fully read** (post pages fetched from the signed-out browser tab; the full caption text came back for all 12).
- **Video text: not read.** Instagram covers videos with a sign-up overlay when signed out, and I did not remove it. The embed page returned only script code, no readable frames. The accent-colour reels give their actual "skill" only by comment-and-DM, so their detail is unknown; only the one-line caption claims are used.

## Reels read (captions)
| Shortcode | Topic | Key lesson |
|---|---|---|
| DfxOhZmyLXz | Ten CSS rules to give an AI agent | Inner radius = outer minus padding; alpha-colour borders; OKLCH palettes and gradients `in oklch`; icon stroke matches text weight; fade carousel edges with a mask; blur outgoing icon on swap; dark mode shows depth with lighter surfaces; `100dvh` not `100vh`; `mix-blend-mode: multiply` for product shots on white |
| DfphRvFBx54 | Animation and UX laws | Under 300 ms; slow in and slow out, never constant speed; anticipation; follow-through; Fitts (bigger, closer targets); Hick (fewer choices); Miller (about 7 items, chunk); Doherty (respond within 400 ms); Postel (accept messy input, return clean); Jakob (work like apps people know); frequency of use (the more often used, the less it animates) |
| Dfm33XyhRN3 | Sign-up/password UI techniques | Reward early, punish late (progress appears while typing, errors wait until done); inline validation; chunk long strings in groups; sound matches screen; texture needs a reason |
| DfuhfgpRQxa | Accent colour from the colour wheel (caption: "the trick is literally just the colour wheel") | Detail is in an unread skill file; only the caption claim |
| DfpgMtHhyNA | Accent colour | Do not pick the accent just because you like it |
| DfsTwyAxO_N | Accent colour | Rule of thumb: the accent goes on whatever you are selling |
| DfxOT_IyBP7 | Accent colour, gelato example | Example of the rule; no detail in caption |
| DfsT4vkRM9H | Fonts that do not look AI-made, part 1 | Skip Inter, Roboto, Arial, Instrument Serif, Fraunces, Playfair Display; the picks are paid Latin-only families |
| DfuhpYpxM96 | Fonts, part 2 | Skip Geist, Space Grotesk, Bricolage Grotesque, Instrument Sans, JetBrains Mono, Space Mono |

**Counts:** 12 reels found, 9 read (captions), 3 skipped, 0 with video text read.

## Skipped
- DJrbdK7hugY (May 2025): personal announcement of leaving a job.
- DIWt7j-O40r (Apr 2025): vlog about a 75-day challenge, caption only hashtags.
- DfsUJ5Wx4TO: Black Friday affiliate deals (Mac mini, 3D printers, an AI tool); the "comment DEALS" funnel is a sales pitch, not product advice.

## What Toogo should take
1. **A short CSS rules block for the agents** (DfxOhZmyLXz): Toogo is web in a WebView, so these apply directly. Checked in the repo: no `100vh` (11 uses of `100dvh` already), no `hsl(`/`oklch(` colours. Adoptable: nested radius, alpha borders, mask-faded carousels, dark-mode depth by lighter surfaces. Added to toogo-premium-feel. English strings and RTL are unaffected, but a fade mask must be checked mirrored.
2. **Motion budget** (DfphRvFBx54): under 300 ms, slow-in/slow-out, and the least animation on the most-used controls. Matches the four feedback levels already in toogo-premium-feel; the swipe and match pop is the one place for a richer motion.
3. **Targets and choices** (Fitts, Hick, Miller, Doherty, Jakob): bigger hit areas on swipe buttons, few choices per screen, respond within 400 ms (the skeleton rule from last round), standard iOS patterns. Added to premium-feel and first-run.
4. **Reward early, punish late** (Dfm33XyhRN3): for sign-up and password fields in Login: progress as they type, errors only on leaving the field. Toogo's sign-in needs the same wording in Hebrew and English.
5. **Accent colour goes on what you sell** (accent reels, captions only): one accent, on the primary action (the swipe or match, the add-to-trip result), not on decoration. Never on a credits or paywall button to push a purchase (rule 7, money model not decided). Also useful for store screenshots: the accent marks the one thing each screenshot is about.
6. **Fonts:** the AI-font list is Latin-only and mostly paid. Toogo uses system fonts (`-apple-system`, SF Hebrew, Noto Sans Hebrew), which is the native look and supports Hebrew; no change. Any display font would need Hebrew glyphs, so a Latin-only font would break the Hebrew-first layout.
7. **Caution on their growth trick:** "comment a word and I will DM you" is an engagement gate. Not adopted: one ask per caption (already in toogo-short-video) and no nagging (rule 7).

**Rules check:** no fake urgency (their Black Friday "until Dec 1" posts skipped); money model untouched; a place enters a trip only by swipe and match (nothing here changes it); every wording change needs an English string and a mirrored check.

## Files
- Changed: .claude/skills/toogo-premium-feel, toogo-first-run, toogo-store-listing, toogo-short-video, toogo-indie-launch (each a marked "Added 2026-11-16 from @charles.unemployed" section).
- Not changed (nothing relevant): toogo-growth-loops, toogo-app-review, toogo-credits-offer, agent files.
- Nothing committed.

## Processed reels (do not redo)
https://www.instagram.com/charles.unemployed/reel/ plus: DJrbdK7hugY, DIWt7j-O40r, DfxOhZmyLXz, DfxOT_IyBP7, DfuhpYpxM96, DfuhfgpRQxa, DfsT4vkRM9H, DfsTwyAxO_N, DfphRvFBx54, DfpgMtHhyNA, DfsUJ5Wx4TO, Dfm33XyhRN3.

## Signed-in pass (2026-11-16)
- 94 posts, all listed. 82 new posts checked by caption; **caption only, no frames read** (the agent cannot view screenshots). Four substantive: DffBKUZhy6B (list of design techniques), Dfh24cUh4KF (more terms), DfSbDWhR2bi (how to "unslop" designs), DfPruJSxggG (age-picker principles).
- Skipped (most of the rest): vlogs, job/hiring posts (DX0auMNs2XM, DYNzOHbhqzA), startup-life and money posts, "comment X for the skill" funnels (Dfm3jaFBzej, Dfh2dXSBJII, DfcnAJFhAa1, Dfi94NwEQdL AI-influencer funnel), format credits and "what next" posts with no content.
- Lessons (creator's claims): (1) Recognition over recall: give a few tappable prompts instead of an empty field (fits Add-a-place from a link and trip search). (2) Optimistic update: show the result at once, sync in the background (swipe/match, ticking an expense), with a clear failed state (matches the offline-queue work). (3) Human in the loop: anything that suggests changes asks before changing (planner suggestions must not touch bookings and expenses). (4) Layout stability, skeletons, origin-aware popups, ease-out for entering things, tabular figures, film grain on gradients to stop banding, tinted neutrals, empty states. (5) Unslop recipe: use a reference, then choose fonts and colours yourself to form a design system.
- Processed (added): the 82 new shortcodes of the profile grid were listed and their captions read; substantive ones: DffBKUZhy6B Dfh24cUh4KF DfSbDWhR2bi DfPruJSxggG. Caption list not stored per code beyond those named here.

## Frames pass (Step 2, 2026-11-16)
Watched (frames, OCR plus 2 frames viewed): DfxOhZmyLXz (10 niche CSS hacks: concentric radius, alpha borders, OKLCH palettes and gradients, matched icon weight, masked edges, blurred icon swaps, dark-mode depth, dynamic viewport, multiply blending; code chips too brief to copy), DfphRvFBx54 (12 animation principles plus UX laws: Miller, Postel, Jakob, frequency of use), DffBKUZhy6B (AI chat without slop: visible steps with times, user's own data, confirm before adding to calendar). Lessons went to toogo-frontend-craft and toogo-ux-ui-craft.
