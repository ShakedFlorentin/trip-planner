# Privacy and terms drafts, 14 Nov 2026 (legal agent)

Drafts and review notes only: nothing here is published or live. Placeholders in [BRACKETS] are for the owner or a lawyer to fill. This is not legal advice; section 5 lists what a human lawyer must decide before launch.

Gate note from the legal agent: the pages, the AI vendor and the Supabase region were all chosen and built before this review. One item should have been checked when the vendor was chosen: `parse-booking` sends booking files to Anthropic in the US, and those files can contain passport numbers. Next time, bring legal in at the choice.

## 0. Corrections to the facts used in the brief
- **The wand and plan-trip use no AI.** `supabase/functions/plan-trip/index.ts:5` says "No AI here", and the wand (`src/App.tsx`) just runs the planner. The functions that call Claude are suggest-place, parse-booking and translate (sent from the user), plus card-facts and card-photos (run by the server on place data; card-photos also checks the cover frame of the post the user linked). Claude may also search the web (`web_search` in card-facts/facts.ts).
- **plan-trip sends place and hotel names or addresses to OpenStreetMap Nominatim** (`plan-trip/index.ts` ~line 303). The privacy page does not mention this.
- **Every Claude call is logged with the user's id** in the `ai_calls` table (`ai-log.ts`). The page does not say so, and no retention period is set.
- **Share coordinates are not really rounded.** They are cut to 5 decimals, about 1 m (`Share.tsx:26`). They are the place's location, not the user's, and hotels are left out. Card tips are on by default and the number of days is included.
- **The photo wording** is at `src/views/PlacePhotos.tsx:74` and `src/i18n/en-c.ts:321`.
- **A privacy page and terms already exist:** `scripts/pages/privacy.mjs`, built to /privacy/ and /en/privacy/, with the terms under #terms. They are good; what follows is fixes, not a rewrite.
- **Usage counting matches** `src/track.ts`. It also sends the city from a guide link, the hostname of the site the person came from, iOS or web, installed or not, and screen width. Signed in, it is tied to the account through `auth.uid()`. It is deleted after 12 months.

## 1. Changes to the existing privacy page (`scripts/pages/privacy.mjs`)
1. **Who we are** (add). HE: "האחראי על המידע: [OWNER NAME / BUSINESS DETAILS], [ADDRESS]. מייל: [CONTACT EMAIL]." EN: "Controller: [OWNER NAME / BUSINESS DETAILS], [ADDRESS]. Email: [CONTACT EMAIL]." `CONTACT_EMAIL` is empty today; Apple and GDPR both need a real contact.
2. **Anthropic bullet** (replace). HE: "Anthropic (Claude), ארה״ב: כשאתם מוסיפים מקום מקישור או לפי שם, קוראים אישור הזמנה (טקסט, PDF או צילום, שיכולים לכלול מספר דרכון) או מתרגמים, מה שהקלדתם או העליתם נשלח ל-Claude. Claude עשוי לחפש ברשת את שם המקום. אנחנו רושמים כל פנייה כזו עם מזהה החשבון שלכם, בלי התוכן." EN: "Anthropic (Claude), USA: when you add a place from a link or a name, read a booking (text, PDF or photo, which may include a passport number) or translate, what you typed or uploaded is sent to Claude. Claude may search the web for the place's name. We log each such call with your account id, without its content." Remove "keeps it only for a limited time" unless we can cite Anthropic's current retention terms.
3. **New provider** (add). HE: "OpenStreetMap (Nominatim): שמות וכתובות של מקומות ומלונות נשלחים מהשרת שלנו כדי למצוא את המיקום שלהם על המפה." EN: "OpenStreetMap (Nominatim): place and hotel names or addresses are sent from our server to find them on the map."
4. **Usage counting** (add the list). HE: "גם: שפה, גרסה, אייפון או אתר, רוחב מסך, האתר שממנו הגעתם, והודעות תקלה עד 200 תווים (שבמקרה עלולות לכלול טקסט מהמסך). פועל כברירת מחדל; מכבים ב'עזרה בשיפור Toogo' בהגדרות." EN: "Also: language, version, iPhone or web, screen width, the site you came from, and error messages up to 200 characters (which can by chance include text from the screen). On by default; turn off with 'Help improve Toogo' in Settings." The page currently says "It never includes what you type"; with the error message, that is not certain.
5. **Share link** (make it exact). HE: "הקישור מציג רק: שמות המקומות, הסוג, מיקום המקום, העיר של כל יום, מספר הימים, טיפים קצרים מהכרטיסים (אפשר לכבות), ושם הטיול רק אם בחרתם. בלי מלונות, הזמנות, הוצאות, שמות או הערות." EN: "The link shows only: place names, their kind, the place's location, a city per day, the number of days, short card tips (can be turned off), and the trip name only if you choose. No hotels, bookings, expenses, names or notes."
6. **International transfers** (new section). HE: "Supabase שומרת בפרנקפורט [VERIFY REGION]. Anthropic ו-GitHub בארה״ב. ההעברה נעשית לפי [MECHANISM: SCCs / DPF / consent]." EN: "Supabase stores data in Frankfurt [VERIFY REGION]. Anthropic and GitHub are in the USA. Transfers rely on [MECHANISM: SCCs / DPF / consent]."
7. **Legal grounds** (fix): the dietary answers and passport numbers are sensitive data. Add explicit consent as their ground, and decide the ground for the EU device id (see 5.2).
8. **Retention** (add). HE: "רישום פניות ה-AI: [PERIOD]. מסמכי הזמנה: כל עוד הטיול קיים." EN: "AI call log: [PERIOD]. Booking files: while the trip exists."
9. **Deleting your account** (replace once delete-account is live). HE: "מוחקים בהגדרות > מחיקת חשבון. טיול שרק אתם בו נמחק. בטיול משותף נשארים: מה שהוספתם, ושם התצוגה שלכם ליד הוצאות ששילמתם או שהייתם בחלוקה שלהן, כדי שהקבוצה תוכל לסגור חשבון. מקומות שהגיעו לספרייה המשותפת נשארים בלי קשר אליכם. קישורי השיתוף שיצרתם נמחקים." EN: "Delete in Settings > Delete account. A trip with only you is deleted. In a shared trip, these stay: what you added, and your display name next to expenses you paid or shared, so the group can settle up. Places in the shared library stay with no link to you. Share links you made are deleted." Until it goes live, keep "write to us". Also remove "unless you ask us to remove those too", or decide to honour such requests by hand: the built function keeps those places.
10. **Hotel links.** HE: "קישורי שותף יסומנו ככאלה." EN: "Partner links will be marked as such." Today's "may earn us a commission" is premature, because there are no partner IDs yet.
11. **Accessibility** (new, Israel): add an accessibility statement and contact. [LAWYER: is it required at this size?]

## 2. Terms of Use, first draft (to replace the #terms part)
**HE**
**השירות.** Toogo עוזרת לקבוצה קטנה לתכנן טיול: מחליקים על מקומות, מאצ׳ים נכנסים לתוכנית, ויש מקום להזמנות ולהוצאות. מפעיל: [OWNER NAME / BUSINESS DETAILS].
**חשבון והזמנות.** מגיל 18. פרטים נכונים, סיסמה שמורה. מי שמזמינים לטיול רואה את מה שבו. הזמינו רק אנשים שאתם סומכים עליהם.
**התוכן שלכם.** התוכן שלכם נשאר שלכם. מקום שהוספתם (שם, אזור, כתובת, תיאור) עשוי להיכנס לספרייה המשותפת. אתם נותנים לנו רישיון חינם, לא בלעדי, בכל העולם ולתמיד להציג אותו לכל המשתמשים, בלי השם שלכם. לתמונה שאושרה חל הנוסח שאישרתם בהעלאה.
**שימוש הוגן.** בלי תוכן פוגעני, פרטים של אחרים, ספאם, מקומות מומצאים, העתקה בכמויות או ניסיון לפרוץ.
**בינה מלאכותית.** חלק מהתכונות משתמשות ב-Claude. הצעות יכולות לטעות: בדקו שעות פתיחה והזמנות בעצמכם.
**לא ייעוץ.** זה לא ייעוץ נסיעות, הזמנה או ייעוץ כספי. אנחנו לא מוכרים טיסות או מלונות.
**הוצאות.** חלוקת ההוצאות היא מחשבון. היא לא מעבירה כסף, ואנחנו לא צד לחובות ביניכם.
**בלי אחריות.** השירות ניתן כמו שהוא. ככל שהחוק מתיר, האחריות שלנו מוגבלת ל-[LIABILITY CAP], ולא לנזק עקיף.
**שינויים.** על שינוי חשוב נודיע באפליקציה 14 יום מראש.
**דין.** דין ישראל, בתי המשפט ב-[COURT]. זה לא גורע מזכויות צרכן במדינה שלכם.
**קשר.** [CONTACT EMAIL].

**EN**
**The service.** Toogo helps a small group plan a trip: swipe on places, matches go into the plan, and bookings and expenses live alongside. Run by [OWNER NAME / BUSINESS DETAILS].
**Accounts and invites.** 18 and over. True details, keep your password private. Anyone you invite to a trip sees what is in it. Invite only people you trust.
**Your content.** Your content stays yours. A place you add (name, area, address, description) may enter the shared library. You give us a free, non-exclusive, worldwide, permanent licence to show it to all users, without your name. Approved photos follow the wording you accepted when uploading.
**Fair use.** No abusive content, other people's details, spam, made-up places, bulk copying or attempts to break in.
**AI.** Some features use Claude. Suggestions can be wrong: check opening hours and bookings yourself.
**No advice.** This is not travel, booking or financial advice. We don't sell flights or hotels.
**Expenses.** The split is a calculator. It moves no money, and we are not a party to debts between you.
**No warranty.** Provided as is. As far as the law allows, our liability is capped at [LIABILITY CAP], with no liability for indirect loss.
**Changes.** For an important change we tell you in the app 14 days ahead.
**Law.** Israeli law, courts of [COURT]. This does not remove consumer rights where you live.
**Contact.** [CONTACT EMAIL].

## 3. App Store privacy label (draft answers)
Tracking: **No** for every type (no ad tools, no data broker, no outside SDK in `track.ts`). ATT: not needed today.
- Contact Info, Email Address and Name: linked; App Functionality.
- User Content: Photos, Other User Content (trips, bookings, files, expenses) and Customer Support (problem reports): linked; App Functionality.
- Identifiers, User ID: linked; App Functionality and Analytics. Device ID (the random `vid`): linked once signed in; Analytics.
- Usage Data, Product Interaction: linked; Analytics.
- Diagnostics, Other Diagnostic Data (errors): linked; Analytics.

Open points: (a) Sensitive Info: the dietary answers can hint at religion; the lean is to declare it. (b) Financial Info: do expense debts count as "Other Financial Info"? (c) Is an app-made random id "Device ID" in Apple's sense? (d) Coarse location from IP: not declared because it is not used; confirm. (e) Affiliate links later: if a user id is passed to a partner, that can become tracking. (f) On by default with an opt-out still means it must be declared.

## 4. Credits: Israel and US (for the owner, not for the pages)
HE: באפליקציה בחנות האמריקאית מותר קישור לקנייה באתר. בישראל ובשאר המדינות רק רכישה של Apple בתוך האפליקציה, בלי קישור ובלי רמז לתשלום בחוץ, עם "שחזור רכישות", וקרדיטים בלי תפוגה.
EN: The US storefront may link out to web checkout. Israel and every other storefront need Apple in-app purchase, with no link or hint at paying elsewhere, a Restore Purchases button, and credits that never expire. (Apple 3.1.1, from the skill. Re-read the live text and the US fee status before building.)

## 5. For a human lawyer before launch
1. The controller's legal form (private person or registered business) and the details to publish.
2. EU testers: does storing the device id and counting by default need opt-in consent under ePrivacy Art. 5(3)? The agent thinks it probably does.
3. Dietary answers and passport numbers: the ground for processing them (GDPR Art. 9, Israel's Amendment 13 "special sensitivity"), and whether sending them to Anthropic in the US is lawful under Israel's transfer regulations and GDPR.
4. Whether an EU representative (Art. 27) is needed.
5. Whether the liability cap and the "irrevocable photo licence, also for whoever takes over Toogo" survive Israel's Standard Contracts Law and consumer law.
6. Choice of law and forum for EU and US consumers.
7. Credit refunds and cancellation (Israeli Consumer Protection Law, distance selling), and labelling partner links (Israel, and the FTC in the US).
8. The Israeli accessibility statement requirement.

## Not checked by the legal agent
The delete-account SQL and function (not in this worktree); the live Supabase region, flags, whether the events SQL is applied and whether the page is live; Anthropic's current retention and DPA terms; Apple's live guideline and label definitions; whether translate or parse-booking store the text or files on the server; `SharedPlan.tsx` beyond its RPC call and the `get_shared_plan` SQL; Info.plist and speech recognition in the iOS app.
