---
name: toogo-auto-handoff
description: Write a session handoff file so a fresh session (or this one after a compact) can continue Toogo work without re-deriving anything. Fires automatically when context reaches about 70% (the context-handoff-trigger hook injects a "CONTEXT HANDOFF" message). Also use it whenever the owner says "write a handoff", "handoff", "save state", "before you compact", "summarize where we are for the next session", even without the word handoff.
---

# Auto-handoff

Taken from the Siliqa repo's `auto-handoff` skill (HDLcompiler, 2026-11-27), fitted to Toogo.

Context is filling up. Once it compacts, the detail of what was decided, tried and ruled out is lost, and the next session redoes it or acts on a stale guess. A handoff file puts that state on disk while you still remember it. Write for a reader with zero memory of this session who must continue within a minute.

## Steps

1. **Gather facts, don't recall them.** Run `git status --short | head -40`, `git log --oneline -5` and note the branch, in every worktree you touched (RentCalc-main, side worktrees). Other sessions write to these checkouts, so say "as of <time>".
2. **Write the file** to `.handoffs/YYYY-MM-DD-HHMM-<topic-slug>.md` in the checkout you work in (create the folder; time from `date +%Y-%m-%d-%H%M`). `.handoffs/` is not committed.
3. **Sync Toogo HQ** (https://claude.ai/artifact/61a3uZC75rdJ7uBVMTrMAv): for each HQ task the handoff touches, read it first, then one `ArtifactData` batch with `if_version` moving `status` (todo/doing/done) and `detail` (progress + evidence + a `NEXT:` line). New owner questions go to the `questions` collection. Skip this step if nothing in HQ changed.
4. **Report in one line**: the path, the HQ rows synced, and the single next action. Then carry on with the current task: the handoff is insurance, not a stop sign.

Read-only on the repo except the one handoff file: no commit, stash or git changes. Never put secrets, passwords, keys or real trip member names in it (name the file or variable instead). Real trip data stays in the scratchpad; point to it by path.

## Template

```markdown
# Handoff — <topic> — <date time> (context at about <N>%)

## Goal
One or two sentences: what the owner is trying to achieve and why.

## State
- Branch / HEAD sha per worktree, and which files are mine vs. others'
- Done (with evidence: commit sha, test command + result, artifact version)
- In flight (half-edited files, running agents and background tasks with their IDs)

## Decisions & constraints
Choices the owner made or approved (quote their words), and the house rules that bind the next steps (toogo-rules, real trip untouched, no push without the owner). Give the reason, so the next session doesn't re-ask.

## Ruled out
What was tried and failed or was refused (including safety-check denials), and why. This is the part most often lost.

## Next steps
1. Concrete first action (exact command or file:line)
2. ...

## Open questions / blockers
What needs the owner, and what is unverified (say "unverified" rather than guessing).

## Key files
`path:line` — one-line why it matters.
```

## Quality bar

- Every "done" claim has evidence; otherwise it goes under open questions.
- Next steps run without reading the chat. "Continue the fix" fails; "run `npm run test:plan-fixes` in <worktree>, expect r12 to pass" passes.
- Under about 80 lines.
- To resume: read the newest file in `.handoffs/`, check its git claims against live `git status`, then act.
