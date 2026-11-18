---
title: i18n process (src/i18n)
chapter: process
explains:
  - t
  - setLang
---
Code: `src/i18n.ts` (`t`, `setLang`) and the dictionaries `src/i18n/en-*.ts`.

## How it works
- `t('עברית', vars?)`: the Hebrew text is the key; the English comes from `src/i18n/en-*.ts` (files split by screen group: a, b, c, shared, money, plan2, safety, ux, redesign, fixc). Placeholders use `{name}`.
- The choice lives on the phone (localStorage `lang`); switching reloads. `index.html` sets `<html lang dir>` before first paint; `src/styles/ltr.css` has the left-to-right fixes (`.flip-ltr` for arrows).
- Hebrew that is data (stored, compared, regex) carries `// he-only` and is shown through `t()`.

## Adding a string
1. Use `t('...')` in the view; never raw Hebrew in JSX.
2. Add the English to the right `en-*.ts` file, same key.
3. Run `node scripts/i18n-check.mjs --list`: it must report 0 missing and 0 Hebrew outside `t()`.
4. Look at it in English (LTR) on a screenshot.

## Rules
- Changing the Hebrew key text changes the key: update the English entry too.
- Content writes copy; frontend wires it. Content does not edit `src/`: hand the strings over, or ask Atlas.
- Pluralisation is by hand (n=1 cases are a known gap).

## Not checked here
The current number of strings and whether the check script passes today.

Related: [hebrew-and-english](hebrew-and-english.md).
