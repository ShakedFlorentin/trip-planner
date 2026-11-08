# Decisions on the design review (docs/design-review.md)

Agreed one item at a time with the user, starting 2026-11-07. Nothing is changed in the app until every item is decided.

**Implemented 2026-11-08** (the user asked to start on the decided list before the last items were discussed):
items 3, 4, 5, 7-10, 12-14, 16, 18-25, 27-31, 33-37, 39-44, 46-58, 60-63, 68-71 and the small finds 78, 80-82, in
Hebrew and English, checked on the simulator. Data: the 19 "אחר" places re-filed (8 attractions, 11 to the new "ברים
ולילה"), 135 places moved to 25 clean neighbourhoods (old values kept in `places_area_backup_20261108`), the Osaka hotel
expense to לינה and the flight expense to the new טיסה, match_place maps nightlife/experience and copies the baby line
only when someone said baby (`supabase/sql/2026-11-08-design-review.sql`). The 7 seed places were deleted (67).
plan-trip v23 deployed 2026-11-08 (the meal fix 72, "today is left alone" 41, nightlife); a run after it finished with
no error and no issues. **Not done yet:** the database-only tags (the meal-type tags under 45); and the items not discussed yet: 15, 73 (the two
Kaiyukan cards), 79's wording beyond the label, 74-77 (guide, share extension, widgets, shortcuts). Nothing is committed.

**To do at implementation, besides the items:** deploy the plan-trip fix (72, already in the code) to Supabase
together with the rest; delete the 7 test places (67) only after the user confirms.

**Every decision applies to English too** (user, 2026-11-08): the same layout mirrored left to right, and every new or
changed Hebrew wording gets its English text in the same change. Check each screen in English as well as Hebrew.

- **3. Too much red: full suggestion.** Red marks only the logo, the active tab, the + button and the one main button on
  each screen. Selected chips: neutral fill (light in dark mode, dark in light mode). מפה/ניווט: grey with a coloured
  icon. Arrival times: plain bold text. People tags: grey pill. Balance: normal colour (see 53). Delete and sign out get
  an icon and clear wording so they don't look like brand buttons (see 65). Backed by Material colour roles, Apple's
  deference principle and the 60-30-10 rule.
- **4. Six tabs: burger instead of עוד.** Tab bar: בית, גילוי, מסלול, הזמנות, מקומות (Discover stays, it is the user's
  favourite feature). A ☰ button in the top corner, where the avatar is now, opens a side menu: name and avatar on top,
  then כסף, רשימות, חירום, תרגום, תינוק, then settings, switch trip, report a problem, sign out. Also covers 6 and 52.
  Money shortcut on Home: already exists (Home's חירום / תרגום / הוצאות buttons).
- **5. Settings jumps to Home: bug, fix.** Settings (and the burger menu's screens) open as a sheet over the current
  page; closing returns to the same page and scroll position.
- **7. "Whose" filter wording: one filter everywhere.** Same chips, same order on Plan, Places and Bookings:
  הכל · שלנו · [each other couple's names] · ביחד. "שלנו" is always my couple (never our names) and includes the
  together items. "ביחד" replaces "של כולם" everywhere (also edit forms) and carries the two-ring icon. Plan gains the
  other-couple chips. Also covers 8 (people icon in Bookings becomes the rings).
- **9. Big title: iOS collapsing title.** Large title at the top; on scroll it shrinks into a small centred title in a
  slim bar pinned under the clock, with the ☰ button.
- **10. Cut chip rows: fade.** A soft fade at the edge where the row continues, only while there is more to scroll that
  way (both edges after scrolling).
- **12. Tasks count: say it once.** "לפני הטיסה: נותרו 6 מתוך 7 משימות" with the progress bar, no corner counter; when
  all done "הכל מוכן לטיסה ✓".
- **13. Zero counts: hide them.** The Home line counts bookings (flights, hotels, restaurants, attractions): show
  only types with a count; with no bookings, "עוד אין הזמנות. הוספה מאישור הזמנה ←".- **14. Coloured squares on Home: grey line icons.** All three rows of "לפני הטיול" (tasks orange, bookings purple,
  Discover red) lose the filled square and use thin grey line icons like the rest of the app.
- **15. Tokyo twice with different colours: skipped for now.** (Cause: tile colour comes from its position in the
  route, not the city. Suggested: colour by city, second tile titled "חזרה לטוקיו".)
- **16. Odd tile alone: last tile full width.** With an odd number of route tiles, the last spans the full row.
- **17. City photo tints: keep.** The full-photo tint is the intended Apple Music category style. (Correction: only
  Tokyo, Yokohama and Osaka are night skylines; the photo files are black-and-white.)
- **18. Trip code looks like a link: copy box.** No underline; the code in a small box with a copy icon, tap copies
  (as now) and the icon briefly turns into ✓.
- **19. Home opens with plain text: photo hero.** The top card becomes a large Apple Music-style tile: before the trip,
  the trip's first city (photo in its colour), its country, "עוד 38 ימים", the local clock; during the trip, the city
  of that day with the date. It follows each trip's own cities; a city with no photo gets the plain colour tile (no
  weak photo).
- **20. Discover empty screen: grey icon per case (ג).** Apple-style: a grey ~50pt line icon that fits the case (no
  logo), a bold title, one line, one red button. Cases: voted on everything → "הצבעת על כל המקומות" / למאצ׳ים שלכם
  (opens Places); filter hides all → "אין מקומות בסינון הזה" / הצגת הכל; preferences exclude all → "אף מקום לא מתאים
  להעדפות" / שינוי ההעדפות (opens them); none yet → "עוד אין מקומות לגלות" / הצעת מקום. The matches-preview idea was
  not taken.
- **21. Filter chips with nothing to filter: hide them,** except when a filter is the reason the screen is empty.
- **22. "הצעת מקום" in the filter row: becomes Discover's + button.** Same spot as the other tabs' +, below the ✕/♥
  buttons so it covers neither the card nor the votes; the chip row holds only filters.
- **23. Level bar labels.** Under the bar "עוד 140 XP לקאמי"; the numbers get labels under them: "XP" and "מאצ׳ים ♥"
  (the heart count is matches). Tap still opens the ranking.
- **24. XP order: one format everywhere,** number with a comma then XP (4,860 XP), isolated so Hebrew text around it
  doesn't jumble it (also in the ranking and "עוד … XP ל…").
- **25. Ranking bar: keep it as votes, label it.** The ranking's bar is cards voted (not level, unlike the top bar):
  write "הצבעות: 80 מתוך 120" next to it; under it, mine shows XP left to the next level, others show shared taste.
- **26. Discover city chips: withdrawn.** Checked on the simulator and in the code: each city shows once and no chip
  sits behind the separator. The half-cut chip was the row's edge, covered by 10 (fade).
- **27. Time inside a wrapped title: time above the title (א).** Small bold time on its own line above the name; the
  name gets full lines; times line up down the day.
- **28. Couple tag repeated on every stop: once in the day header.** Day header shows "רק שקד ומאור" as a grey pill with
  the one-ring icon; stops show a whose-tag only when they differ from the day (e.g. "ביחד" with two rings).
- **29. Buttons on every stop: navigate icon only, edit via the sheet or swipe.** עריכה comes off the card (tap opens
  the stop's sheet with עריכה; swipe already reveals edit and remove). ניווט becomes a small round arrow icon at the
  card's far end (left in Hebrew); the check circle stays at the start, next to the name. Plus: a one-time hint (first stop slides open a little and back the first time
  Plan opens), and the same swipe edit/remove on Places, Bookings, expenses and checklist rows (also covers 55).
- **55. Always-visible trash on checklist rows: moves into the swipe** (see 29).
- **30. Day strip scrolls away: pinned under the slim title bar, shrinking smoothly.** As you scroll, the big title
  collapses (see 9) and the day chips shrink gradually with the scroll (weekday and city fade out, the date stays),
  following the finger, not jumping; they grow back the same way. Reduce Motion: a plain switch. Current day
  highlighted; switch days from anywhere.
- **31. Dashed day border: one-ring icon instead.** The dashed frame meant "not together"; it becomes the small one-ring
  icon in the chip's corner (also on the selected day), with a first-time legend "◯ יום שלא כולם ביחד".
- **32. Check circle position: withdrawn.** The circle is already at the start of the line (right in Hebrew), like
  Reminders; the finding was wrong. (Mockups for 27-29 drew it on the wrong side; in the change it stays where it is.)
- **33. "עוד 3 מקומות שאהבתם…" row: one line, heart icon, iOS arrow.** Wording "3 מקומות שאהבתם, לא במסלול" (one
  place: "מקום אחד שאהבתם, לא במסלול"), heart icon at the start, chevron at the end (down closed, up open); the open
  list stays as today.
- **34. Yokohama day full of Tokyo places: header names the day's main city.** "יום שבת, 12.12 · טוקיו", with a line
  "לינה ביוקוהמה · <hotel>"; stops in the day's city lose the city pill (pill only for a third city).
- **35. Flight card arrows: boarding-pass layout.** Departure on the right (big code, time, date), arrival on the left
  (+1 in orange when next day), dashed line with the plane pointing to the destination, no arrows in text; flight
  number and couple on top, confirmation at the bottom; מפה stays.
- **36. Edit pencil in two places: removed from booking cards.** Tapping a booking already opens its edit form; plus the
  swipe from 29.
- **37. Hotel names breaking at the hyphen: break only at spaces** ("Italia-gai" stays together). Also, booking date
  ranges use "עד" instead of "←" (no arrows inside text, as in 35).
- **38. "מסעדות" tab without a count: withdrawn.** Zero stays hidden (same rule as 13).
- **39. Missing confirmation code: say so.** A booking with no code shows a dim line "אין מספר אישור" with a small
  "+ הוספה" that opens the edit form at that field. Same for hotels and any booking with a confirmation field.
- **40. Four rows of controls on Places: one row (option א).** The whose-filter becomes one chip at the start of the
  category row ("שלנו ▾"), opening a menu: הכל · שלנו · <other couples> · ביחד (names from 7). List/map becomes a
  floating "מפה" button centred above the tab bar (Airbnb style); on the map it reads "רשימה". "סידור המסלול מחדש"
  leaves this screen (see 41). Places start right under the title.
- **41. "סידור המסלול מחדש": a wand button in Plan's title bar (option ג).** Next to ☰; a tap shows a short message at
  the bottom "מעדכנים את המסלול, כמה שניות…". Not pull-to-refresh: a plan you like must not change by an accidental
  pull. The button leaves Places. (The planner never touches a stop a person added, moved or edited.)
  Mid-trip: re-planning also leaves **today** alone (it rearranges from tomorrow on), so a place visited this morning
  but not ticked can't be moved away. Past days, ticked stops, visited places and stops a person added, moved or
  edited are already never touched.
- **42. "למסלול" / "במסלול": a button vs a status line.** Not planned: a button "+ הוספה למסלול". Planned: no button;
  a line under the title with a check and the day, "במסלול: יום ג׳, 15.12 ‹"; a tap opens that day in Plan.
- **43. Card buttons wrapping: icons plus one worded button.** מפה, אתר and סרטון become small round icons (as ניווט in
  29); "+ הוספה למסלול" keeps its words at the other end. The row spans the card's full width; always one row.
- **44. Tapping a place: a read view first.** The tap opens the place card to read (photo, name, city · neighbourhood,
  tags, "במסלול: …" line, full tip and baby note, who liked it, map/site/video icons, "ביקרנו"); "עריכה" in the top
  corner opens today's form. Swipe-to-edit from 29 still works from the list.
- **45. Tag line: drop "אחר" and "מאצ׳".** "אחר" says nothing; "מאצ׳" is on 135 of 142 places. Real categories stay.
  Data: re-file the 19 "אחר" places: to אטרקציות (Kaiyukan, teamLab Planets, Tokyo Joypolis, Tokyo Toy Museum, Kyoto
  Botanical Gardens, Round1 Stadium, the Don Quijote Ferris wheel, Arima Onsen); to a **new category "ברים ולילה"**
  (Bar Benfiddich, Bar Trench, Sake Bar Yoramu, Golden Gai, Omoide Yokocho, Hozenji Yokocho, Jan Jan Yokocho, the
  Tenma izakaya alleys); look up Craftroom, Stand Age and Uchitaka first. Database change only at implementation.
- **Tags (raised by the user while on 45; fixes 72).** Every place gets tags **in the database only; users never see
  them**. They are what the planner and search work on: the meal type (full meal, breakfast, coffee/dessert, snack,
  bar), plus facts like ramen, with the baby, rainy day, open late, needs booking, length. Saved once per place
  (like opening hours), no AI per view. The planner keeps full meals 3 hours apart counting **every** meal of those
  people: its own stops, booked restaurants, stops added by hand, and meals ticked as eaten; coffee, dessert and
  snacks don't count as meals. Search matches tags as well as names (e.g. "ליום גשום" finds the aquarium).
- **46. Long tips: not shortened; a "what it is" line added.** (The two-line cut was rejected: a tip says what to do,
  not what the place is.) Under the name, the card's "what's special" line (`special`, 93 of 135 places), else its
  short description (`hype`, all 135); under it the full tip with a small light-bulb icon.
- **47. Neighbourhood headings: a few clean neighbourhoods, Hebrew name with the English small.** Today 111 headings
  for 135 places (most with one place; the same area spelled several ways). One-time data cleanup: each place gets
  one standard neighbourhood (Osaka: 22 headings become 4: Minami, Kita, Shinsekai and Abeno, Osaka Bay). Heading:
  Hebrew name, English name small beside it, count of places; in English only the English name. Exact address stays
  in the place card.
- **48. The "visited" circle: gone from the list; a nudge to rate and write a tip.** No circle on list cards. Mark
  "ביקרנו" by swiping to the side opposite edit/remove (like "read" in Mail) or with the button in the read view (44).
  A visited card shows "✓ ביקרנו · ★★★★☆" under the title. Ticking ✓ on a Plan stop also marks its place visited
  (today the two marks are separate). **Asking for a comment (user):** right after marking, a short sheet opens: "איך
  היה ב-<place>?", the stars, and the note box already open ("טיפ למטיילים הבאים: מה שווה, מה לדלג, איך היה עם
  התינוק"), with "שמירה" and "אחר כך". Skipped: the card line reads "✓ ביקרנו · + דירוג וטיפ". In the evening of a day
  with places visited and not rated, Home shows "איך היה היום?" with those places, one tap each. No push messages.
  Today the note hides behind a small link that appears only after stars are given.
- **49. Places map: opens on your city, with counts.** Today it fits all of Japan, so 102 places pile into 3 dots.
  Opens on today's city during the trip, the first city before it; a chip per city with its count (טוקיו 39, קיוטו
  29…). Nearby places merge into a circle with a number; a tap zooms in. Pins coloured by category, small legend
  (keep it from covering pins). Dark map in dark mode (the same provider's free Dark Gray style, base plus labels;
  CARTO's dark tiles now need a key). No +/− buttons: pinch to zoom. Map fills the screen; floating "רשימה" (40).
- **50. Edit form: city and neighbourhood as full rows with pickers.** Today the neighbourhood field is half width
  (cuts "Namba / Sennichimae"), "טוקיו" and "Odaiba" align to opposite sides in one row, and both are free text (how
  one area got spelled several ways, 47). Now: two full-width rows like iOS Settings, every value aligned to the
  app's side (right in Hebrew, left in English). Tapping "שכונה" opens that city's neighbourhoods from 47's clean
  list (Hebrew name, English small, count of places), with "אחרת…" at the end to type one. City is picked from the
  trip's cities the same way.
- **51. Edit form notes: boxes that grow; "שמירה" in the title row.** The box grows with the text (like Notes), no
  inner scrolling. "ביטול" and "שמירה" sit in the sheet's title row as on every iOS edit sheet (sides swap in
  English), so a long note can't push Save off the screen; "מחיקת המקום" stays at the bottom. On a trip with a baby,
  two boxes: "הערות" (the tip and your own notes) and "עם התינוק"; on a trip without a baby, only "הערות". Data fix
  (found while answering): a match copies the card's baby note also when nobody on the trip has answered "who's
  coming" yet (`2026-11-02-baby.sql`); copy it only when someone said baby.
- **52. "ההעדפות שלי" and "תמונות לאישור" in the ☰ menu (4).** "ההעדפות שלי" under the person's name at the top of
  the menu. "תמונות לאישור" is for the app builder only: it already shows only to accounts in `app_admins` (one
  account today, the builder's); in the menu's settings group, and only when photos are waiting, with a red count
  (today it shows "0 ממתינות"). Everyone else never sees it.
- **53. Money balance: a plain sentence, orange not red.** "אתם מחזירים לאלמוג ושניר" with one big amount under it
  (today the amount shows twice); orange when you owe, green when you're owed ("אלמוג ושניר מחזירים לכם"), like
  Splitwise; red stays for errors. "החזרנו"/"קיבלנו" becomes a plain full-width button, not the pink pill. Owing
  several couples: a line and button each.
- **54. Expense icons: category picked from the words, nothing picked in advance.** Found: the Osaka hotel is saved
  as food because the form opens with "אוכל" already picked; flights are "תחבורה", whose icon is a train. Now: typing
  "על מה" picks the category from a plain word list (Hebrew and English: מלון/hotel → לינה, טיסה/flight → טיסה,
  רכבת/מונית → תחבורה, ראמן/מסעדה → אוכל…), a tap still changes it, a small line "נבחר לפי מה שכתבתם". Nothing is
  picked in advance; no match and no pick saves as "אחר". New category "טיסה" with a plane icon. Data fix: the Osaka
  hotel becomes לינה.
- **55. Lists: no trash button; swipe to delete, with undo.** Delete by swiping the row, like Reminders and Plan (29);
  the red "מחיקה" shows on the left in Hebrew, the right in English. After deleting, a bar "נמחק: <item> · ביטול" for
  a few seconds. The row text gets the full card width.
- **56. Lists progress: a Toogo ring in each list tab (option א, compact).** The tab row keeps today's height; each tab
  shows a small ring (logo ring thickness), the list name (15) and how many are left in small grey (13): "לפני
  הטיסה 6", "ציוד 5". A finished list: full green ring and a green ✓. The thick green bar under the tabs goes; the
  rings replace the tab icons. Ring in Toogo red (from the logo, fits 3); the selected tab's ring gets a lighter
  track so it shows on the grey. (A plain thin bar and two card designs were rejected: too generic, then too big.)
- **57. Lists "each couple ticks" checkbox: two clear choices that open while typing.** With the field empty: the field
  and the + only. Once you type, under it, centred: "מי צריך לסמן?" with two equal boxes, text centred: "כל זוג
  לעצמו" (כמו ביטוח או טופס כניסה) / "מספיק שאחד יסמן" (כמו הזמנת מסעדה); then "מי אחראי?" with today's
  "כולם"/name picker (moved from beside the field). On a "כל זוג לעצמו" item your circle ticks your couple (see 79).
- **58. Emergency Japanese sentence: left-aligned, one sentence per line, speak and full screen.** Japanese aligned
  left (it reads left to right), each sentence on its own line ("助けてください！" / "救急車を呼んでください！"), no
  break inside a word; the Hebrew line stays right, the romaji left. Two buttons on the card: "השמעה" (the iPhone's
  own Japanese voice, free, works offline) and "להראות במסך מלא" (white, huge, English under it, screen kept awake,
  a tap closes). Same for every phrase card on the screen.
- **59. Hotline buttons under the tab bar: already fixed** by the page-end fix in 2; checked on the simulator 2026-11-08.
- **60. Trip dates: one Hebrew row and a range calendar.** "תאריך יום 1" ("Dec 2026 12", English and in the wrong
  order) and "מספר ימים" become one iOS-style row "תאריכים": "12 בדצמבר – 31 בדצמבר 2026" with "20 ימים" under it,
  written by the app (the same whatever the phone's language). A tap opens a range calendar, like Airbnb: pick the
  departure and return days; the week starts on Sunday, on the right in Hebrew and the left in English; under it
  "יציאה: שבת, 12.12 · חזרה: יום ה׳, 31.12". The day count is worked out from the two dates, not typed.
- **61. The match explanation leaves trip settings.** It was a second copy, between "מספר ימים" and "השם שלי". It stays
  only in Discovery › ranking, as a heading "איך עובד מאצ׳" and three numbered lines (couples vote together, only the
  couples sleeping in that city are asked, a place joins the plan when they all liked it), with the XP points on their
  own small line under it. The XP numbers there get fixed at the same time (80).
- **62. Trip settings: no save button; every change saves by itself.** Like iPhone Settings: name fields save when the
  keyboard or the sheet closes, with a short green "✓ נשמר" by the row; the dates save from the calendar's "סיום" (60);
  language and theme change at once as today, and the theme choices keep their icons (phone, sun, moon). The sheet
  becomes iOS-style grouped rows: "הטיול" (trip name, dates; note "השינוי כאן נראה אצל כל מי שבטיול") and "אני" (my
  name, language, theme). Today a changed name is lost with no warning when you tap "סגירה".
- **63. Personal things leave "הגדרות טיול".** Builds on 4: the ☰ menu holds name and initial on top with "ההעדפות
  שלי" (52), then כסף, רשימות, חירום, תרגום, תינוק, then הגדרות, מעבר לטיול אחר, דיווח על בעיה, and התנתקות in red
  in its own group at the bottom. The sheet is renamed "הגדרות" and keeps only what is saved: "הטיול" (name, dates),
  "אני" (my name, language, theme with icons), and "ארנק קרדיטים" as one row opening its own page (only while credits
  are on). In English the ☰ and the menu sit on the right.
- **64. Theme order: already right.** The review read the row left to right; in Hebrew "כמו בטלפון" is first (on the
  right), then בהיר, כהה; in English it is first on the left. No change.
- **65. Three red actions in three styles: solved by 63.** Report and switch trip become plain menu rows with icons;
  "התנתקות" is the only red one, alone in its own group at the bottom of the ☰ menu.
- **66. Already fixed 2026-11-07** (keyboard fix in 1).
- **67. Test places deleted 2026-11-08.** The 7 "(seed …)" places from the 22.10 check (Ichiran Ramen, Don Quijote,
  Shimokitazawa, Ginkaku-ji, Philosopher's Path, Kuromon Market, Umeda Sky Building) were deleted from the trip; none
  was in the plan.
- **68. Search field: no capital letter.** The field turns off iPhone's auto-capitals (typed "ramen" stays "ramen").
- **69. Search: each place once, with its plan date.** A place on the list shows once, under "מקומות"; if it is in the
  plan, its row says the date (the app's day format, e.g. "במסלול: יום ד׳, 16.12"), not the day number, and not as a
  separate row under "מסלול". Under it, "עוד בגילוי" lists only cards that are not places yet. Also fixes 81: Yokohama
  shows "יוקוהמה" (not "yokohama") and the row icons get darker.
- **70. "Add a place" field: reads right to left.** The hint becomes "קישור או שם, למשל Ichiran Shibuya" (right to left,
  English name at the end; in English "A link or a name, like Ichiran Shibuya" on the left). The field label "קישור או
  שם של מקום" goes, since the explanation above says it. "והתאמה לתינוק" in the explanation shows only when someone on
  the trip said baby (as 51).
- **71. Planner: check-in is "from", and another city goes in one stretch.** A hotel check-in is "from 14:00" (the
  booking's hour), not an appointment. On a landing day the first stop after the airport is the hotel, to leave the
  bags; the check-in itself goes when the day returns there. Places in another city than where the day's people sleep
  (Tokyo from Yokohama) go in one stretch: one ride there, one back, never with the hotel in between, and the rides
  count in the day. The landing card's check-in line uses the booking's hour, and "(7-Eleven, Lawson)" is fixed (82).
- **73. The aquarium twice: fixed in the data 2026-11-08.** One place, "Osaka Aquarium Kaiyukan" (the one planned on
  24.12), now with the duplicate's location, photos, facts and both tips; the duplicate place and card are deleted and
  its shared library row is retired (`active = false`), so no trip gets it again. No new duplicate check in the app.
- **15. A city keeps its colour; a second visit is "חזרה ל…": done 2026-11-08, automatic for every trip.** The tile
  colour comes from the city, not its place in the route (`cityColor` in cities.ts: the known cities fixed, any other
  city by its name), so a city seen twice looks the same; the later tile of a city already on the route is titled
  "חזרה לטוקיו" ("Back to Tokyo"). The Home hero uses the same colour.
- **79. One circle, two couples: done** with 57. On a "כל זוג לעצמו" item your circle ticks your couple; the line under
  it reads "הסימון שלכם · אלמוג ושניר: עוד לא" ("סימנו ✓" once they have). Checked on the simulator.
- **74. A guide for new users: a video, the first time the app opens.** The user wanted it on the very first open (not
  after the taste questions) and as a video in the promo's design that explains the app, not just shows it. A 36 s
  explainer (brand/toogo/kit/motion/guide/, Hebrew and English, mirrored): swipe on places → a match goes into the plan
  by itself → paste a TikTok link to add a place → everything else in ☰ → paste a booking confirmation. It plays once
  per device after the opening rings and before sign-in (`guideSeen` in localStorage), with "דלג", then "מתחילים" /
  "שוב"; ☰ › "מדריך" plays it again. App copies in public/guide/ (720x1280, ~1.4 MB).
- **Video look for the app.** The user asked for the app to look like the promo video's app: the itinerary day is a
  city photo banner with simple grey rows (time, title, one grey line, red tick), places are rows with photo, name,
  "area · category" and a heart (details in the place sheet), bookings are rows with a red icon tile and the code in a
  chip (boarding pass in the booking sheet). The bottom bar is the video's flat iOS bar; search moved to the top bar.
  The day strip is already small the moment it pins under the bar.
