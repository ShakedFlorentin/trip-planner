# @minutelet reels, 2026-11-17

**Who:** minutelet, "Your guide to system design, databases and engineering". 31 posts (all reels), 3,079 followers (Instagram header, 2026-11-17). Short backend / system-design explainers for vibe coders, mostly a numbered series "Ten things before 1,000 users" (races, N+1, error tracking, rate limiting, background jobs, spend alerts, rollbacks, live database, webhooks, backup restore), plus "you don't need X before 1,000 users" (microservices, separate backend, Redis, own auth, multi-region, sharding, 100% tests).

**How read:** signed in by owner, read only. Grid scrolled to the end: 31 of 31 listed; captions read for all 31 (from each post page). The reels tab holds the same 31. **Frames: 0.** The page HTML has no mp4 URL, screenshots come back as raw data I cannot view, and a private-API call to get the video URL was refused by the permission check, so I stopped. Nothing claimed "watched". Captions are one-liners; the real content is on screen and in voice, so rules below are caption claims plus standard practice.

| Shortcode | Topic | Lesson | Read |
|---|---|---|---|
| Det6xAWgLk4 | race condition (#1) | double actions must not double-write | caption |
| DeukQOYseNV | N+1 queries (#2) | one query, not one per row | caption |
| DewbxEfMU7r | error tracking (#3) | know about failures before users | caption |
| DexMyZHMkQT | rate limiting (#4), Dd4hqGsICuf leaky bucket | cap calls per user | caption |
| DezDx7aM6xT | background jobs (#5) | slow work off the request | caption |
| De0L00rsloZ | spend alerts (#6) | alert on cost | caption |
| De1nG1ysUml | rollbacks (#7) | way back after a bad deploy | caption |
| De2UIHaMzo2 | live database (#8) | do not test on the live DB | caption |
| De4gWi5MoJ_ | webhooks (#9), DeKNxtvsEUB idempotent | retries are normal | caption |
| De5AwFWMT75 | backups you never restored (#10) | restore once | caption |
| DfK_wV6IDMc | modular monolith (#1 of "don't need") | start with one app | caption |
| DfNjBEUIPLJ | no separate backend | one deploy | caption |
| DfR9e6Nozs0 | rent auth | do not roll your own | caption |
| DfQJALHI-sg | Redis | not needed early | caption (title only) |
| DfZg3TFsfkI | one region | next to the database | caption |
| DfXL4dAscAA | alerts not dashboards | one alert on checkout | caption |
| Dfc8o4psUQR | rewrite in Rust | app waits, language is not the issue | caption |
| DfiHv5asWhM, DeB4EprI88c | sharding | fix slow queries first | caption |
| DfmnLM4smm1 | tests | test what hurts | caption |
| Dffot2gMl5n | 99.99% uptime | time to notice matters | caption |
| DfHoiOAMrOR | safe deletes | three steps, last is undo | caption |
| DfIYjy1I3GS | dead code and AI | monthly dead-code review | caption |
| Deg-smBMExC | never trust the client | server enforces | caption |
| Dej4ffusB4f, DemJpnvsFwB | AI limits, prompt injection | limit AI actions | caption |
| DeMwZhPsrwd | normalisation | one place per fact | caption |
| DePv3I5MkWr | outage checklist | prepare before the call | caption (list is on screen, not read) |
| DeHtI4II4jp | abstractions help AI | not read in detail | caption |

## Skipped
None as funnels. Skipped as unfit: Redis, microservices, multi-region, sharding (Toogo is one Supabase project, small); listed only as "not now".

## What Toogo should take
Rules went to `toogo-backend-craft` (new section) and a series-format note to `toogo-marketing-craft`. Ideas for the owner (need code or setup): idempotency key on credit spend and expense saves; spend alert on Claude usage; restore drill for the database backup after the trip; check the AI edge functions limit per user.

## Not done
No frames read (see above); on-screen checklists (DePv3I5MkWr and the numbered series) unread. Re-run on those once a frame route works.

## Processed shortcodes (31)
DfmnLM4smm1 DfiHv5asWhM Dffot2gMl5n Dfc8o4psUQR DfZg3TFsfkI DfXL4dAscAA DfR9e6Nozs0 DfQJALHI-sg DfNjBEUIPLJ DfK_wV6IDMc DfIYjy1I3GS DfHoiOAMrOR De5AwFWMT75 De4gWi5MoJ_ De2UIHaMzo2 De1nG1ysUml De0L00rsloZ DezDx7aM6xT DexMyZHMkQT DewbxEfMU7r DeukQOYseNV Det6xAWgLk4 DemJpnvsFwB Dej4ffusB4f Deg-smBMExC DePv3I5MkWr DeMwZhPsrwd DeKNxtvsEUB DeHtI4II4jp DeB4EprI88c Dd4hqGsICuf
