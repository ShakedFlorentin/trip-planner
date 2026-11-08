# Design review of the iOS app (2026-11-07)

Every problem found by going through each tab on the iPhone 17 Pro simulator, in dark mode (the mode picked in the app's
settings), in Hebrew. Light mode and English were not checked. Nothing was changed while reviewing.

Marks: **Bug** = something is broken or covered. **Visible** = a user notices it. **Polish** = small detail.

## Across the whole app
1. **Fixed 2026-11-07** (keyboard plugin, `resize: 'native'`). **Bug.** On the money screen (עוד › כסף), scrolling to the end moves the whole app up about 70 pt. Cause: after any panel with a text field, iOS kept the page 68 pt short when the keyboard closed: the title "עוד"
   and the avatar sit under the clock, and a white strip appears under the tab bar.
2. **Fixed 2026-11-07** (pages with the + end lower; map zoom moved to the top). **Bug.** The red + button covers content on every tab where it shows: the last tip on Plan, the title of a place
   card (teamLab Planets), the amount of the first expense (385), and the map's zoom buttons.
3. **Visible.** Red means too many things: selected chips, the main buttons, every "מפה"/"ניווט" button, arrival times,
   people tags, the balance, the avatar, the active tab. A selected filter and an action button (הצעת מקום) look the same.
4. **Visible.** Six tabs; the labels are tiny. Apple's guideline is five at most.
5. **Visible.** Opening trip settings (the avatar) jumps to the Home tab, and closing settings leaves you there instead of
   where you were.
6. **Visible.** The avatar circle is the only way into settings, and nothing says it is settings.
7. **Visible.** The same "whose" filter has different words on each screen: Plan "שלנו / של כולם / הכל", Places "שלנו /
   אלמוג ושניר / של כולם / כל הזוגות", Bookings "הכל / אלמוג ושניר / שקד ומאור / של כולם". "של כולם", "הכל" and
   "כל הזוגות" are hard to tell apart.
8. **Visible.** The together icon is two rings on Home but the people icon in Bookings ("כולם ביחד" on a hotel).
9. **Polish.** The big title never shrinks while scrolling, so about 120 pt at the top is always taken by the title.
10. **Polish.** Rows of chips that scroll sideways are cut at the left edge with no fade to show there is more.
11. **Fixed 2026-11-07.** **Polish.** When the keyboard is open, iOS shows the web form bar (✓ ∨ ∧) above it, which looks like a website, not an app.

## Home (בית)
12. **Visible.** "6 משימות לפני הטיסה" next to "1/7 הושלמו" reads like a contradiction (6 or 7?). "נותרו 6 מתוך 7" says it once.
13. **Visible.** "0 מסעדות · 0 אטרקציות" shows zeros; empty counts are noise.
14. **Polish.** The two coloured squares (orange list, purple ticket) in "לפני הטיול" are the only filled colour icons in
    the app; everywhere else icons are line icons.
15. **Visible.** Tokyo shows twice in "המסלול" (15.12–18.12 and 26.12–31.12) with two different photos, which looks like two cities.
16. **Polish.** The fifth city tile sits alone on its row with an empty half next to it.
17. **Polish.** All city photos are night skylines with heavy colour tints (orange, red, purple, teal, blue); they look alike.
18. **Polish.** The trip code (76FD32A316) is underlined like a link; it is not clear whether tapping copies it.
19. **Polish.** No photo or picture at the top; the screen opens with plain text.

## Discover (גילוי)
20. **Visible.** The empty state is a grey paragraph in a black screen, with no picture and no button.
21. **Visible.** The filter chips stay visible when there are no cards left to filter.
22. **Visible.** "הצעת מקום" (an action) sits inside the filter row and looks like the selected filter "הכל".
23. **Visible.** The level bar (דרקון, XP 4860, 55♥) has no labels; the hearts and the bar are not explained.
24. **Polish.** "XP 4860" in the bar but "4860 XP" in the ranking; and "עוד XP 140 ל..." comes out in a jumbled order
    because of the Latin letters in Hebrew text.
25. **Polish.** In the ranking each row has one bar but two numbers (level progress and "טעם משותף"); which one the bar
    shows is not clear.
26. **Polish.** The city chips may list Tokyo twice (once per stay), and a chip is half hidden behind the separator.

## Plan (מסלול)
27. **Visible.** On a stop card the time sits in the middle of a wrapped title ("Shimokitazawa Vintage ~15:15 / Shops").
28. **Visible.** On a day marked "רק שקד ומאור", every stop repeats the red "שקד ומאור" tag.
29. **Visible.** Every stop has its own "ניווט" and "עריכה" buttons; with many stops the screen is mostly buttons.
30. **Visible.** The day strip scrolls away; once you scroll down you cannot change day or see which day you are on.
31. **Polish.** Some days have a dashed border in the day strip (13.12, 14.12, 29.12, 30.12) with no explanation.
32. **Polish.** The check circle sits at the far end of the line (left), not next to the start of the title.
33. **Polish.** "עוד 3 מקומות שאהבתם בעיר ולא נכנסו למסלול" uses a text triangle (◀) instead of an icon, and the last word wraps alone.
34. **Polish.** A Yokohama day lists two Tokyo places (with a "בטוקיו" pill); correct by the planner's rule, but it reads oddly under a Yokohama heading.

## Bookings (הזמנות)
35. **Visible.** A flight title has a right-pointing arrow (MUC → TLV) and the time line under it a left-pointing one
    (19:50 ← 00:35); the two arrows point opposite ways in one card.
36. **Visible.** The edit pencil is on the title row for flights but on its own row under the title for hotels.
37. **Visible.** Long hotel names break badly: "Mitsui Garden Hotel Shiodome Italia-" then "gai" alone on the next line.
38. **Polish.** "מסעדות" has no count while טיסות 8 and מלונות 7 do (zero is shown as nothing).
39. **Polish.** One flight (Lufthansa LH682) has no confirmation code while the others show one.

## Places (מקומות)
40. **Visible.** Four rows of controls before the first card: categories, list/map, whose, and "סידור המסלול מחדש".
41. **Visible.** "סידור המסלול מחדש" (re-plan the trip) is a Plan action placed on the Places screen.
42. **Visible.** "למסלול" and "במסלול" (add / already added) differ by one letter and look the same.
43. **Visible.** Cards with three buttons wrap the third onto its own row (Tokyo Joypolis, Don Quijote), so cards look ragged.
44. **Visible.** Tapping a place opens the edit form straight away ("עריכת מקום"); there is no plain view of the card first.
45. **Visible.** The tag line starts with "אחר" (other), which tells nothing, and wraps with "מאצ'" alone on a line.
46. **Polish.** Long tips are shown in full (Arima Onsen: 7 lines); no "more".
47. **Polish.** Neighbourhood headings are in English (Namba / Dotonbori) under Hebrew city headings.
48. **Polish.** The circle on each card (visited) is not explained.
49. **Visible.** The map opens on all of Japan with the pins piled into two dots; nothing shows how many places are there.
50. **Polish.** In the edit form the neighbourhood field is half width and cuts the text ("Namba / Sennichimae").
51. **Polish.** In the edit form the notes box shows three lines and cuts the rest.

## More (עוד)
52. **Visible.** The sub-tabs (כסף, רשימות, חירום, תרגום, תינוק) sit under two settings rows ("ההעדפות שלי",
    "תמונות לאישור"), so the main navigation of this tab is not at the top.
53. **Visible.** "עליכם להחזיר ₪11,213" in large red reads as an error, not a balance.
54. **Visible.** The Osaka hotel expense has a knife-and-fork icon; the Tokyo hotel has a bed.
55. **Visible.** Lists: a delete (trash) button on every row, always visible; easy to tap by mistake.
56. **Polish.** Lists: the progress bar is green, the only green bar in the app.
57. **Polish.** Lists: "כל מסך בנפרד (למשל טופס כניסה, ביטוח)" is unclear.
58. **Visible.** Emergency: the Japanese sentence is right-aligned (Japanese reads left to right) and breaks inside a word
    ("呼んでく / ださい").
59. **Fixed 2026-11-07 by the fix in 2** (checked 2026-11-08: the hotline buttons and the last row end above the tab bar). **Polish.** Emergency: the hotline card's buttons are half hidden under the tab bar at the end of the page.

## Trip settings (avatar)
60. **Visible.** The start date shows as "Dec 2026 12": English, and in the wrong order because of right-to-left.
61. **Visible.** The "מאצ'" explanation sits between "מספר ימים" and "השם שלי", where it does not belong.
62. **Visible.** One "שמירה" button in the middle saves the fields above it, while language and theme below change at once.
63. **Polish.** "הגדרות טיול" also holds personal things (my name, language, theme, sign out).
64. **Polish.** Theme order is כהה / בהיר / כמו בטלפון; the usual default (like the phone) comes last.
65. **Polish.** Three red actions in three styles: a pill (דיווח על בעיה), plain text (מעבר לטיול אחר), a pill (התנתקות);
    sign out looks the same as the harmless ones.

## Search
66. **Fixed 2026-11-07** (same keyboard fix as 1). **Bug.** With results, the search sheet's title "חיפוש" and "סגירה" are pushed under the clock.
67. **Visible.** A test place shows in results: "Ichiran Ramen (seed acbe95c8)" (in the trip's data).
68. **Polish.** The field capitalises the first letter (typed "ramen", got "Ramen").
69. **Polish.** The same places appear twice, under "מקומות" and under "גילוי".

## Add place (+)
70. **Polish.** The placeholder "קישור, או שם כמו Ichiran Shibuya" comes out with the English name at the wrong end.

## Found while discussing (2026-11-08)
71. **Visible.** On 12.12 the planner puts the Yokohama hotel check-in (14:00) between two Tokyo stops (Isetan 13:15,
    Shimokitazawa 15:15): Tokyo → Yokohama → Tokyo in two hours, about 40 minutes each way.
72. **Fixed in code 2026-11-08, not deployed yet** (booked tables and meals people put in or ticked count; fixture
    `meals-around-bookings`). **Bug.** The planner spaces full meals 3 hours apart only among its own stops: a booked restaurant, a stop a
    person added, or a ticked meal does not count (`Fixed` in plan-trip has no meal flag), so it can put a restaurant
    an hour after a booked brunch.
73. **Visible.** The same aquarium is in Places twice: "Osaka Aquarium Kaiyukan" and "Kaiyukan Aquarium" (two cards,
    two matches), each with its own tip.
74. **Visible.** (Raised by the user, 2026-11-08.) No guide to the app for new users. The first run asks the taste
    questions (Onboarding), then drops you on Home with nothing on how the app works (swipe, match, the plan, the +).
    The user's example: a short guide with a looping demo per step and "אחר כך".
75. **Missing.** (User.) No share extension: to add a place from TikTok, Instagram or Google Maps you copy the link
    and paste it into the app's +. With one, "Toogo" sits in the iPhone share sheet; the guide in 74 then shows how to
    pin it to the first row (the user's example).
76. **Missing.** (User.) No home-screen or lock-screen widgets (e.g. the next stop today, days to the flight).
77. **Missing.** (User.) No shortcuts: no quick actions on a long press of the app icon, and nothing for Siri or
    the Shortcuts app. First one the user asked for (2026-11-08): **quick "add an expense"** (long press on the icon,
    Siri / Shortcuts, and a button on the widget in 76), opening the expense form straight away.
    **Checked 2026-11-08 (naatz.app, the user's example "נעצתי"):** iPhone only, free; share a Reel/TikTok → place
    saved, grouped by country and city, shared trips, alerts when near a saved place. Its site doesn't say how it
    finds the place, but its privacy policy does: a retrieval service fetches the video's public data, then **AI
    providers** read the description, comments, a transcript of the speech, and images; a maps service finds the place.
    So it is not done without AI. Toogo today does the same with less: `suggest-place` reads the TikTok caption
    (public oEmbed) or the Instagram caption (embed page), then asks Claude Haiku; it doesn't read comments or speech.
    A way with almost no AI: plain code first (a 📍 line, an @venue account, a Maps link or a known name in the caption,
    matched against the place library), Claude only when that finds nothing, and each reel's answer saved by its id so
    the next person who shares it gets it free.
78. **Polish.** Lists: a Hebrew line with English names comes out jumbled: "להזמין Shibuya Sky ו-teamLab" shows as
    "Shibuya Sky-ו teamLab להזמין" (the "ו-" sticks to the wrong word). Same cause as 24.
79. **Polish.** Lists: each row has one circle but two statuses ("אלמוג ושניר: עוד לא · אנחנו: עוד לא"); which couple
    the circle ticks is not said.
80. **Polish.** Discovery ranking (and the level card above the deck): XP numbers come out in the wrong order in
    Hebrew: "XP 4860" instead of "4,860 XP", "עוד XP 140 לקאמי", and the last line breaks "10" from "XP". No thousands
    comma. Same cause as 24.
81. **Polish.** Search: Discover cards in Yokohama show the city as "yokohama" (lowercase English, no Hebrew name), and
    the row icons (pin, heart) are so faint they barely show.
82. **Polish.** Plan, landing card: "(7-Eleven, Lawson)" comes out as "(Eleven, Lawson-7)"; and the check-in line says
    "בדרך כלל מ-15:00" even when the hotel booking says 14:00 (Richmond Yokohama). Same bidi cause as 24.
