---
title: The org map
chapter: org
---
Agents live in `.claude/agents/`, skills in `.claude/skills/`, books in `.claude/books/<agent>/`. A book exists for each agent that has one; check the folder.

| Agent | Owns | Skills loaded | Use when |
|---|---|---|---|
| atlas | routing, synthesis | toogo-rules | every owner request |
| product | what to build and why; specs in `docs/` | first-run, credits-offer, growth-loops | prioritising, requirements |
| ux (opus) | flows, polish, "AI look" audit | premium-feel, first-run, ui-sdk, ux-ui-craft | design review, before/after images |
| frontend | `src/` | ship-check, premium-feel, first-run, ui-sdk, frontend-craft | any UI code |
| backend | `supabase/functions`, `supabase/sql` | ship-check, supabase-prelaunch, backend-craft | server, SQL files, auth, credits |
| build | Capacitor, `ios/`, release builds | ship-check, app-review | native build |
| qa | tests in `scripts/`, screenshots (HE and EN) | ship-check, app-review, ui-sdk | verify before any "done" |
| security (opus, RO) | RLS, keys, edge auth | supabase-prelaunch, app-review | audits |
| legal (opus, RO) | privacy, terms, payment law | app-review, credits-offer | data, money, accounts |
| appstore (Dana) | App Review, listing, reviewer notes | app-review, store-listing, credits-offer | before any submission |
| growth | funnel, measures, loops | store-listing, short-video, growth-loops, marketing-craft | acquisition plans |
| marketing | brand, positioning, launch, video | short-video, store-listing, growth-loops, indie-launch, premium-feel, marketing-craft | brand and campaigns |
| content | HE and EN copy | store-listing, short-video, marketing-craft | any wording |
| cards (Noa) | place cards, research data, photos | rules | card quality |
| issue-fixer | "report a problem" box | rules | open reports |
| teacher | reel learning, four craft skills | learn-from-reels | owner sends a creator or reel link |

Unused base agents (devops, governance, reliability, reflection, tech) are not set up. Atlas's own roster text still lists them and omits marketing and teacher.

Related: [routing-rules](routing-rules.md).
