---
title: Voice and copy rules
chapter: voice
explains:
  - t
---
- **Plural "we"** throughout ("we check before saving", "we read it"). Commit d43fc23 made booking import speak as "we"; old first-person singular strings remain in places (QA i18n list): fix when touched.
- **Plain, spoken Hebrew**, as people talk. The 255 original cards and UI were rewritten by agents to sound like people, not a translation. Keep it.
- **Short.** One idea per line. Buttons are verbs. Say what happens next after a form.
- **Honest.** No fake urgency, no "last chance", no shaming nags (rule 7). Hours, menus, baby and food facts can be wrong: say "check before you go".
- **Food wording:** "בלי חזיר ופירות ים" / "No pork or seafood". Never "kosher" or "kosher style" in app copy; never imply certification. Store keyword only.
- **No emoji** in the app. Icons are lucide.
- **Singular and plural:** handle n=1 (QA: "1 מקומות"). Names glued to prepositions ("לYuki") look wrong: rewrite the sentence.
- **Errors:** human words, not raw server text (QA: "ANTHROPIC_API_KEY missing" was shown). Say what to do.
- **Do not promise** anything not live (rule 6): no where-to-stay, no pay, no "notify when near".
- **Credits and money:** plain price, what it buys in trip terms ("up to 10 new places free per trip"), "no expiry" where Apple requires.
- **Partner links:** "Partner links will be marked as such" until IDs exist.

Related: [hebrew-and-english](hebrew-and-english.md), [copy-checklist](copy-checklist.md).
