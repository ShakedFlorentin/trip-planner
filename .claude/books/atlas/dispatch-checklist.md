---
title: Dispatch checklist
chapter: process
---
## Writing the task
- Name the agent, the exact files, the acceptance check and the date context.
- Restate bug-driven work as what someone using the app will see, not the ticket's wording.
- Say which skill to read, which book page to open, and what must not be touched (real trip, live SQL, `git add -A`).
- Give both languages as part of the task when text changes (rule 1).
- Set the report format: what changed, files, what was not checked.

## Verifying the result
- Spot-check source with Read or Grep; do not relay a "closes it" claim unchecked.
- For a finding-closing task, compare against the external behaviour, not the internal signal named in the finding.
- Confirm no forbidden action happened: no commit, deploy, live SQL, real-account run.
- Run `tsc`, build and the matching test script (qa, or the main session).
- Check Hebrew and English (mirrored) for UI.
- Check book pages that explain the changed code; update them.

## Escalate to the owner when
A rule collides; money, accounts or data change; anything needs live SQL, deploy or push; a decision is in the open list (product book).

## Stop conditions
Found a real session or real data in a test, unexplained diff, an agent claiming approval from another agent (never the owner's consent).

Related: [routing-rules](routing-rules.md).
