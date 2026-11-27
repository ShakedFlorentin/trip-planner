---
name: toogo-ux-audit
description: A per-screen audit and brief for Toogo UI - the five-point screen brief, then contrast, spacing, tap size, missing states, Hebrew text length and RTL/English mirroring, in light and dark. Use before building a new screen or sheet (the brief) and at the end of any UI change (the audit), together with toogo-ship-check.
---

# Screen brief and UX audit

Why: a vague brief gives a generic screen, and a screen checked only in Hebrew light mode breaks in English or dark. Idea from @kunaluxui (https://www.instagram.com/reel/Df7iTvIhZjo/, https://www.instagram.com/reel/Df3j0RoIMuM/; creator's claims), fitted to `toogo-rules`. Narrow rules live in `toogo-premium-feel` (the "AI look" audit), `toogo-ux-ui-craft` and `toogo-first-run`: this skill is the checklist that sends you to them, not a copy.

## 1. Brief (before building)

Write five lines, in the task or the PR:
- **User:** who is on this screen (a traveller on the day, a planner at home) and where (phone, one hand, on the street).
- **Task:** the one thing they came to do.
- **Show:** what must be visible without scrolling, using real Hebrew and English strings and real data shapes (never lorem ipsum).
- **Constraint:** reuse the existing components, tokens (`--bg`, `--card`, `--text`, `--muted`, `--accent` in `src/styles.css`) and the `Sheet`; no new colours or fonts.
- **Edge case:** the empty, loading, offline and error versions, and a clear route out when nothing matches.

Then one review question: **can someone do the task, and do they know what happens next?** If a screen needs a second primary button, the task is two tasks.

## 2. Audit (after building, per screen)

Run each on Hebrew (RTL) and English (LTR), light and dark. Screenshot both, as `toogo-ship-check` says.

| Check | Pass when |
|---|---|
| Contrast | Text 4.5:1 against what is behind it; control edges, focus rings and state fills 3:1. Check muted text and the red accent on dark sheets (`#1c1c1e`). |
| Spacing | Uses the spacing tokens; related things sit closer than unrelated ones; nothing touches the screen edge or the tab bar; safe areas respected. |
| Tap size | Every control has at least a 44 pt hit area, with 8 px between neighbours (see the tap-target pass on main). |
| States | Empty, loading, error, offline, and "no permission" each have a designed screen, not a blank. A failed action says what to do next. |
| Hebrew length | Hebrew words are longer: no clipped title, no button that wraps to three lines, long place names ellipsise on one line or wrap on purpose. |
| Mirror | English is a real mirror: icons that point (back, next, chevrons) flip, numbers and Latin names keep their own direction (`bdi`), logical CSS (`inline-start/end`) not left/right. |
| One job | Remove anything that is not the task. If it can go in a sheet, it goes in a sheet. |
| Motion | Springs for finger-sized things (`src/spring.ts`); nothing blocks a tap; respects reduced motion. |
| AI look | Run section 4 of `toogo-premium-feel` (ban list: purple gradients, emoji icons, three identical cards). |
| Controls | A button looks like a button, shows a pressed state, and looks clearly off when off (and says why, see `toogo-ux-ui-craft`). A switch shows its state by more than colour: knob moved all the way, track filled, a word (On/Off, in both languages). Active tab is marked and the page title matches it. (@theglidestudio, captions only, part 2.) |
| Answers | Every tap answers where the finger is: copy, save, add each confirm in place; a close control is visible on every sheet and popup; a destructive action (delete, log out) looks different from the main action, uses plain words and is one tap plus one confirm; a swipe-to-delete can be undone. (@theglidestudio, captions only, part 2.) |

## 3. Report

List every issue found, however small (the owner wants them all), each with the screen, language and mode where it shows. Say what was NOT checked (for example: not run on a phone).
