---
title: Which craft skill a lesson goes to
chapter: routing
---
Every kept lesson goes to exactly one craft skill, as a short rule with a one-line why and the reel link. Merge duplicates, keep the strongest version, note when two creators disagree, keep each skill readable on a phone. Full per-reel notes stay in `docs/<account>-reels-<date>.md`.

| Skill | Agent | Topics |
|---|---|---|
| `toogo-frontend-craft` | frontend | React, CSS, WebView and Capacitor, performance, offline, accessibility code, animation code |
| `toogo-backend-craft` | backend | Supabase, SQL, RLS, edge functions, AI cost and prompts, security, data |
| `toogo-ux-ui-craft` | ux, frontend | layout, visual design, motion feel, flows, onboarding, on-screen copy, design systems |
| `toogo-marketing-craft` | marketing, growth, content | positioning, brand, reels and hooks, launch, store listing, growth loops, pricing ideas |

## Narrow topic skills (detail there, one-line pointer in the craft skill)
- design, motion, feel, haptics, CSS: `toogo-premium-feel`
- onboarding, sign-up, permission asks: `toogo-first-run`
- store name, screenshots, keywords: `toogo-store-listing`
- reels, hooks, formats: `toogo-short-video`
- shipping, testers, feedback: `toogo-indie-launch`
- sharing loops, free vs paid: `toogo-growth-loops`
- App Review rejections: `toogo-app-review`
- credits, payments, paywalls: `toogo-credits-offer`

Narrow topic sections are marked `## Added <date> from @<account>` plus reel URLs. A new `toogo-*` skill only for a genuinely new topic.

## Agents
Add a short section to an agent only if the lessons change how it works. App code is never changed from a reel: ideas needing code go to the owner in the report.

Related: [filter-and-adapt](filter-and-adapt.md).
