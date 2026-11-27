---
title: Craft gaps, where the code breaks a toogo-frontend-craft rule
chapter: gaps
explains:
  - LoadNote
  - ErrorBoundary
  - hapticLight
  - shortDate
  - useTripTable
  - parseAmount
---
Read-only audit, 2026-11-27, of `src/` against `toogo-frontend-craft` (and the code-side parts of `toogo-ux-ui-craft`). Not run on a device. Pure look issues are the ux agent's. Fix order: high first. Each line: where, rule, effect for the user, severity, smallest fix. Line numbers drift: search the quoted text.

## High
1. `views/Settings.tsx:389` | Errors never raw | a failed credit transfer shows the server's English text in a Hebrew screen | high | map to one plain line (offline, not enough credits, try again), with English.
2. `views/Bookings.tsx:436` and `:414` | Errors never raw | a failed booking save or document upload shows `שגיאה: <server text>` | high | use `errorText`/`failure()`-style mapping; keep the `23505` branch.
3. `views/AddPlace.tsx:421` | Errors never raw | a failed place save prints raw error text | high | same mapping; one plain Hebrew and English line.
4. `main.tsx:60` + `ErrorBoundary.tsx` | Per-section errors, one tile never blanks the page | a render error in one tab or card blanks the whole app, the user must reload | high | wrap each `TripApp` tab body in a small boundary with a Retry line.
5. `vite.config.ts` (no `manualChunks`), `App.tsx:22` | Performance: bundle | one ~1.5 MB script loads before anything shows, slow on weak Japanese signal; each deploy re-downloads it | high | `lazy()` the rarely used sheets and `PlacesMap` (`views/Places.tsx:13`); split `leaflet`.

## Medium
6. `views/Essentials.tsx:134` | Errors never raw | failed hotel import prints server text | medium | plain line.
7. `views/Translator.tsx:290-291` | Errors never raw | speech-start failure shows the browser's `err.message` | medium | fixed plain line, keep one-tap retry.
8. `styles.css:148,149,318,435,697`, `styles/plan.css:24,25,66,157,281`, `styles/onboard.css:35`, `styles/info.css:113,138` | No letter-spacing on Hebrew | negative tracking squeezes Hebrew titles and big times | medium | zero it for `html:lang(he)`, keep for English only.
9. `styles.css:272` (`.invite-link input` 13px) | 16px inputs | iOS zooms the screen when the invite link field is focused | medium | `font-size: var(--fs-input)`; keep it `readOnly`.
10. `views/Swipe.tsx:689` | Photos: first card `fetchpriority`, no lazy on the first card | the first Discover photo can arrive late, the screen looks empty first | medium | `loading="eager" fetchpriority="high"` for the top card only.
11. `sw.js:22` | Offline: all-or-nothing `addAll` | one failed asset leaves no offline shell | medium | cache each asset with `Promise.allSettled`.
12. `tableStore.ts:231` | Every fetch has a state | reads cap at 1000 rows silently; a big list looks complete but is cut | medium | count and show "showing the first 1000" or page the read.
13. `views/Itinerary.tsx:339`, `views/Home.tsx:173` | Per-section loading and Retry | one failed table (bookings) shows one note for the whole plan; the plan rows could stay with only the failed part retrying | medium | one `LoadNote` per table (`daysError`, `itemsError`, `bookingsError`).
14. `views/Bookings.tsx` (BookingForm), `views/Expenses.tsx` (ExpenseForm) | Break test: closing an unsaved form asks "Discard changes?" | an accidental swipe-close loses a typed booking or expense | medium | `ask()` on close when the form is dirty, with Hebrew and English.
15. `views/Itinerary.tsx:130,142`, `views/MatchPop.tsx:57,68`, `views/Stays.tsx:333,443,447` | `<bdi>` for English names | an English or Japanese name inside a `t('...{name}')` toast or label can reorder punctuation in Hebrew | medium | wrap at the JSX site or isolate vars in `t()` (`src/i18n.ts`).
16. `views/Swipe.tsx` (swipe write) | Optimistic update with rollback | if a swipe write is refused the card is gone with no sign | medium | on `failedChanges` for `swipes`, put the card back and say so (check first, not verified).

## Low
17. `views/Stays.tsx:20` `shortDate` | i18n plumbing | dates follow the browser language, not the app language | low | pass `locale` from `i18n.ts`.
18. `styles.css:215` (`.pill` 32px), `:478` (`button.chip` 36px) | Hit areas 44 pt | small tap targets on pills and chips | low | pad the hit area to 44 px (`::after` or padding) without changing the look.
19. primary save buttons (Bookings, Expenses, Places, Itinerary forms) | Buttons: loading inside the button and `aria-busy` | only `SignOutSheet:54` and `AddPlace.tsx:688` set `aria-busy`; screen readers get no "busy" | low | `aria-busy={busy}` plus `disabled` on submit buttons.
20. `views/Settings.tsx:409` | Right keyboard per field | a number field without `inputMode` opens the wrong keypad on some phones | low | `inputMode="numeric"`.
21. `views/Login.tsx` (9 inputs in Login, Onboarding, Settings, 6 with `autoComplete`) | Forms: autocomplete | password managers and Apple autofill miss fields | low | add `autoComplete` to the rest.
22. `views/Login.tsx`, `views/ResetPassword` | Reward early, punish late | errors can appear on submit only, no live progress for a strong password | low | inline checklist while typing, errors after leaving the field.
23. `styles.css` (no `::selection`, no `caret-color`) | Brand native controls | default blue selection and caret, off-brand | low | one line each with `--accent`.
24. `views/PlacesMap.tsx`, `views/AreaMap.tsx` | Every fetch has a state | map tiles that fail offline show grey squares, no note | low | `tileerror` handler and one sentence.
25. `views/Home.tsx:418`, `views/Ratings.tsx:277`, `media.tsx:135` | Reserve space | images without `width`/`height` or `aspect-ratio` can shift rows when they load | low | set `aspect-ratio` on the image boxes (check each).
26. `views/Lists.tsx` (`SwipeRow`, `src/swipe.tsx`) | Accessibility: every control has a name | edit and delete exist only by swipe, so VoiceOver users cannot reach them | low | add a named "more" button path.
27. `App.tsx` (no `history.pushState`) | Back keeps your place | iOS swipe-back leaves the app and sheets do not close | low | push one history entry per sheet (touches many views; plan first).
28. `styles/match.css:14` (`match-in` 0.42 s), `styles/guide.css:78` (0.45 s) | Motion budget | slightly over the ~0.4 s ceiling for a rare reveal | low | trim to 0.4 s or leave: both are rare moments.
29. `styles/info.css:104`, `styles.css:872,1122,1164`, `styles/game.css:52`, `styles/album.css:85,131` | Respect reduced motion | check each infinite animation has its own `prefers-reduced-motion` line (19 blocks for 26 keyframes; not matched one by one) | low | verify and add the missing ones.
30. `.claude/skills/toogo-premium-feel` section 1 | Skill disagrees with code | says haptics are not installed; `src/haptics.ts` and `@capacitor/haptics` 8.0.2 exist | low | tell the teacher to update the skill (not edited here).

## Counts
High 5, medium 11, low 14, total 30.

## Not checked
Real device behaviour, whether each `prefers-reduced-motion` block covers its keyframes, contrast ratios, hit areas beyond the two CSS lines found, per-form dirty-close behaviour (searched for "Discard" and found none, forms not opened), item 16 (read from structure, not run), the built bundle size is from `dist` dated 2026-11-18.
