---
title: Where state lives
chapter: state
---
| What | Where |
|---|---|
| Project state, design, how-tos | `docs/HANDOFF.md` (newest at top), `docs/next-steps-2026-11-12.md`, `docs/TODO.md` |
| QA findings | `docs/qa-2026-11-16.md` |
| Legal drafts | `docs/legal-drafts-2026-11-14.md`, `docs/testers-agreement-he.md` |
| Store text | `docs/app-store-listing.md`, `docs/appstore/` |
| Reel notes | `docs/<account>-reels-<date>.md`; registry in `toogo-learn-from-reels` |
| Delete account handoff | `docs/handoff-2026-11-14-agents-and-delete-account.md` |
| Standing rules | `.claude/skills/toogo-rules/SKILL.md` |
| Agents, skills, books | `.claude/agents/`, `.claude/skills/`, `.claude/books/` |
| Owner's memory | the user's auto-memory `MEMORY.md` (decisions such as: no LLM per user, deploy after the trip, plan here and let org agents build) |
| Live config | Supabase project (`app_settings`, `app_flags`, edge functions, SQL applied by the owner); SQL files in `supabase/sql/` are records, not proof of what is live |
| Web app | GitHub Pages, deployed by pushing to `main` |

## Branches and worktrees
- Work on `main` in the worktree `/Users/maorsaadon/RentCalc/RentCalc-main`; the `RentCalc` checkout may be used by another session. Old notes mention `japan-trip` and `roadmap` branches: stale.
- Delete-account SQL and client live in another checkout and are not in main (QA note).
- Never `git add -A`: stage files by name.

## Drift
HANDOFF says some flags are on live that code defaults off (push). Read the live DB through the owner before claiming a state. A doc named in a brief may not exist: `data-map-2026-11-16.md` and `email-setup-2026-11-16.md` were not found in this checkout.

Related: [work-flow](work-flow.md).
