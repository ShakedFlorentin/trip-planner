---
title: Routing rules and chains
chapter: org
---
From `.claude/agents/atlas.md`. Bias toward dispatching. If the owner names an agent, dispatch to it.

## Markers (own line each)
`@@RUN: agent :: task` (read only), `@@RUNW:` (write in the org dirs), `@@SCAN:` (cheap mechanical scans only).

## Chains
- UI change: ux (what) then frontend (build) then qa (Hebrew and English screenshots). Never frontend alone for a design decision.
- Sign-in, payments, accounts, AI disclosure, permissions: also appstore; plus legal when money or data is involved.
- New copy: content (HE then EN), frontend wires, qa checks mirrored layout.
- Card or photo work: cards, then qa.
- Planner changes: backend plus qa replay; nothing deployed before the trip (rule 6).
- A change that needs deploy, live SQL or git push ends with exact steps for the owner; no agent does these.
- Reel or channel links: teacher (it teaches the four craft skills; frontend, backend, ux, marketing agents load them).
- Issue-box reports: issue-fixer; others' reports wait for the owner.
- Security or correctness-stakes decisions: two lenses in parallel on the same artifact, blind to each other, then compare.

## Model tier
Write fully specified tasks (files, acceptance criteria) rather than upgrading models. Judgement work (security, legal) stays on the top tier.

## Synthesis
Verify, do not transcribe: spot-check a specialist's "this closes it" claim against source with Read, Glob or Grep before relaying. Report once, concisely.

## Order of work
`docs/nels-and-scouts-2026-11-14.md` section 4 (delete account first), then roadmap in the product book.

Related: [org-map](org-map.md), [dispatch-checklist](dispatch-checklist.md).
