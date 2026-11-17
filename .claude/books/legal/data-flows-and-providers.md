---
title: Data flows and providers
chapter: privacy
explains:
  - track
  - outboxFetch
  - notifyMatch
---
| Provider | What it gets | Where |
|---|---|---|
| Supabase (project in one region, believed Frankfurt, VERIFY) | All trip data, accounts, files, events, push subscriptions | database, storage `docs`, `card-photos` |
| Anthropic (Claude), US | Links or names for places, booking files (text, PDF, photo; may include passport numbers), translator sentences with baby age and diet in prompts | `suggest-place`, `parse-booking`, `translate`; also `card-facts` and `card-photos` on place data |
| OpenStreetMap Nominatim | Place and hotel names or addresses (server side) | `plan-trip` |
| GitHub Pages | Site hosting and visitors' requests | web app |
| Push services (Apple, Google, Mozilla) | Push endpoint and encrypted payload; lock screen shows names and place | `notify`, `src/push.ts` |
| Instagram, TikTok | Embeds on cards | iframes |
| Google | Maps links, `lh3` photo host | links and images |
| Booking.com, Klook (later) | Outbound partner clicks | `src/affiliate.ts`, ID empty |

## Facts to keep straight
- Every Claude call is logged with the user id, without content (`ai_calls`, `ai-log.ts`).
- Anthropic is not the only place: the owner can technically read everything through the Supabase dashboard (testers' agreement says so).
- Server pushes go to any https address a user saves (QA, fix before public launch).
- No ad tools, no data broker, no outside SDK in tracking.

## Open
Transfer mechanism (SCCs, DPF or consent) for US providers; whether sending passport-bearing files to Anthropic is lawful (the legal agent says it should have been reviewed at vendor choice). Anthropic's current retention and DPA terms: not read.

Related: [consents](consents.md), [lawyer-questions](lawyer-questions.md).
