---
title: Learned from creators, rule map
chapter: index
explains:
  - errorText
  - aiError
  - say
  - Skeleton
  - LoadNote
  - LoadError
  - Steps
  - MatchPop
  - hapticSuccess
  - Sheet
---
One line per rule taken from creators' reels (26-27 Nov 2026): where this book uses it, where it lands in Toogo, and which skill holds the full rule with its sources. The skill wins if this page and the skill disagree. Creators' claims are not measured in Toogo.

| Rule | Chapter | Toogo screens / components | Skill |
|---|---|---|---|
| Errors: what, why, one action; never raw text | 04, 07 | `errorText`, `aiError`, AddPlace, BookingForm, Settings wallet, Translator | toogo-ux-ui-craft |
| Error placement: inline > toast (passing) > dialog (needs answer) | 04 | form `err` lines, `say`, `ask`, wand toast in App | toogo-ux-ui-craft |
| Loader for the job; skeleton only where it matches (day list, Discover deck) | 04 | `Skeleton`, Itinerary, Swipe deck, `Loading` | toogo-ux-ui-craft (house decision) |
| Long waits show real stage names; no fake % | 04, 08 | `Steps` (AddPlace), ImportSheet, wand, planner | toogo-ux-ui-craft |
| Japan's networks: each section fails on its own with Retry; cached plan first | 04 | `LoadNote`, Home sections, `useTripTable` cache | toogo-ux-ui-craft |
| Offline says what still works | 04 | `OfflineBanner`, `ReadyLine` | toogo-ux-ui-craft |
| "No permission" is a state | 04 | PushAsk, Translator mic, location | toogo-ux-audit |
| Feedback sized to stakes; "Processing…" on money | 04, 07, 09 | Settings credits, Pass, wand finish | toogo-ux-ui-craft |
| Empty states: why + one step; search suggests spellings | 04, 07 | `EmptyState`, Search | toogo-ux-ui-craft |
| Button six states; pressed on every button | 02 | `.primary` `.secondary` `.pill` `.chip` `.link` | toogo-ux-ui-craft, toogo-premium-feel |
| Disabled only when the missing thing is visible | 02 | sheet Save buttons, Onboarding Next | toogo-ux-ui-craft (house decision) |
| Tap ≥ 44 pt; area may exceed the icon | 06 | `src/styles/tap.css`, `.pill` gap | toogo-ux-ui-craft |
| One primary action; main action at the bottom | 02 | every `Sheet`, Home | toogo-ux-ui-craft |
| Hick / progressive disclosure | 02, 08 | ReplanSheet settings, Onboarding | toogo-ux-ui-craft |
| Tesler: pre-fill, accept any format | 08, 09 | BookingForm defaults, ExpenseForm amount, AddPlace paste | toogo-ux-ui-craft |
| Jakob; RTL mirrors back/tabs, not media or clocks | 03 | `flip-ltr`, Translator speak, countdown | toogo-ux-ui-craft |
| Names isolated with `<bdi>` in toasts and confirms | 03, 07 | Places delete, Itinerary toasts, Home members | toogo-ux-audit |
| No roach motel | 09 | credits refund, leave trip, delete account | toogo-ux-ui-craft |
| Glass only as accent | 01 | `--glass-*` floating controls | toogo-ux-ui-craft |
| No added letter spacing on Hebrew; 45-75 chars | 01, 03 | `.large-title`, `h2`, plan and onboarding titles | toogo-ux-ui-craft |
| Tabular figures; numbers roll ~0.2 s | 01, 05 | Expenses balances, credits | toogo-premium-feel |
| Neutrals, colour as punctuation; tinted shadows (idea) | 01 | `.secondary` red text, `--elev-*` | toogo-ux-ui-craft |
| Space before colour | 01, 02 | every review | toogo-ux-ui-craft |
| Vibe-coded / AI-look tells | 01, 07 | icon strokes, copy | toogo-ux-ui-craft, toogo-premium-feel |
| Break tests (delete asks, unsaved close asks, back keeps place, new item shown) | 02, 09 | `askDelete`, sheets, lists | toogo-ux-ui-craft |
| Motion: ~0.2 s often, ≤ 0.4 s one rare reveal | 01, 05 | `--dur-2`, `MatchPop` | toogo-premium-feel (house reading) |
| Carry, don't cut; popup grows from the tap | 05, 08 | Discover `Card` detail | toogo-premium-feel |
| One big celebration | 05, 08 | `MatchPop` (later: plan ready) | toogo-premium-feel |
| Haptics match something visible; via `src/haptics.ts` | 05 | `hapticLight`, `hapticSelect`, `hapticSuccess` | toogo-premium-feel |
| Reduce Motion and Low Power pause heavy effects | 05 | `reducedMotion`, CSS media rules | toogo-premium-feel |
| One real action before any ask; never an empty app | 08 | Guest, `GuestCards`, Onboarding | toogo-first-run |
| Chips, not forms; reward early, ask late | 08 | Onboarding, sign-up sheet after swipes | toogo-first-run |
| Sign-in built early, shown after first swipes; Apple + Google | 08 | Login, `GuestImport` | toogo-first-run |
| Five-line brief before any change | 08 | every flow change | toogo-ux-audit |
| Audit table (contrast, spacing, tap, states, Hebrew length, mirror, one job, motion, AI look, controls, answers) | 06, 10 | every review | toogo-ux-audit |
| Switch state by more than colour | 06 | `.switch`, Settings | toogo-ux-audit |
| Destructive answer looks different, asks once; swipe delete undoable | 02, 06 | `SwipeRow`, offline discard | toogo-ux-audit |
| 8-point UI review on the busiest screen (day plan) | 01 | Itinerary | toogo-premium-feel |

The breaks found against these rules are in [10-ux-debts](10-ux-debts.md), section "Audit against creators' rules, 2026-11-27". Rules not adopted (blind box, scarcity, variable reward) stay out under `toogo-rules` 7.
