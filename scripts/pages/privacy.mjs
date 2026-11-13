// The privacy notice and terms of use (/privacy/ and /en/privacy/), built with the guide pages by build-pages.mjs.
// Plain HTML that we wrote, in Hebrew and English. Keep both languages saying the same thing, and move UPDATED
// whenever something here changes. Linked from the sign-in screen, the app's menu, Settings and every guide page's
// footer. Compared on 13 Nov 2026 with Wanderlog, TripIt, Polarsteps, Tripadvisor, Mindtrip and Layla, and with
// Israel's Privacy Protection Law (Amendment 13): what to tell people, their rights, and how long things are kept.

// where people write to us. Empty: the page sends them to the app's "report a problem" box
export const CONTACT_EMAIL = ''
export const UPDATED = { he: '13 בנובמבר 2026', en: '13 November 2026' }

const contact = (lang) =>
  CONTACT_EMAIL
    ? `${lang === 'en' ? 'at' : 'במייל'} <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`
    : lang === 'en'
      ? 'through "Report a problem" in the app\'s menu'
      : 'דרך "דיווח על בעיה" בתפריט של האפליקציה'

export function privacyPage(lang) {
  const c = contact(lang)
  if (lang === 'en')
    return {
      title: 'Privacy and terms of use | Toogo',
      description: 'What Toogo keeps about you, who sees it, how long, how to delete it, and the terms of using the app.',
      h1: 'Privacy and terms of use',
      lead: `In short: we keep only what we need to plan the trip with you, we don't sell anything about you, and there are no ads. Updated ${UPDATED.en}.`,
      body: `
<h2>Who we are</h2>
<p>Toogo is an app for planning a trip to Japan, in Hebrew and English. It is run by its founder, a private individual in Israel ("we"), and is still in a trial stage. For any question, request or complaint, write to us ${c}. We answer within 30 days, usually much sooner.</p>

<h2>What we keep</h2>
<ul>
<li><b>Your account:</b> your email address and the name you show to your group. A password is kept only as a one-way hash: nobody can read it. If you sign in with Google, Google also passes us your Google account ID and the name and profile photo on it.</li>
<li><b>The questionnaire:</b> who you travel with (including whether a baby is coming), which cities, what interests you, what you don't eat, your budget for a meal, your pace, and whether you've been to Japan.</li>
<li><b>The trip:</b> the places you added, what you liked and rated, the plan, the hotels, the bookings (flights, hotels and so on) and the documents you attach to them, the expenses and the packing lists. Booking documents can include passport or ticket numbers: they are stored privately, for your trip's members only.</li>
<li><b>Places you add:</b> the place itself (its name, area, address and description, not your notes, likes or who added it) is also kept in Toogo's shared place library. Once another trip adds the same place, it can be shown to everyone who uses Toogo.</li>
<li><b>Photos you send for a place:</b> kept aside until we check them. An approved photo appears on that place's card for everyone who uses Toogo. We save every photo as a new image file, which drops the location data phones add to photos.</li>
<li><b>Problem reports:</b> what you wrote, the screen you were on, the app version and your device and browser type.</li>
<li><b>How the app is used:</b> which screens are opened, how far people get from the first screen to a saved trip, which outside sites are opened (the site's name only), and errors in the app. It is tied to a random code made on your device, and to your account once you sign in. It never includes what you type. You can turn it off in Settings.</li>
<li><b>On your phone:</b> a copy of the trip so the app works without signal, your settings, and, if you started without an account, your answers and likes until you sign in.</li>
</ul>

<h2>Personal details in your answers</h2>
<p>Some answers say something personal: what you don't eat may hint at religious practice, and a baby on the trip is family information. We use them only to fit the places and the plan to you. They are seen only by you, your trip's members where the app shows them, and the providers below.</p>

<h2>Why we use it, and whether you must give it</h2>
<p>Only to run Toogo for you: to choose your cards and build the plan, to let your group plan together, to keep the app working offline, to fix problems and to improve the app. No law requires you to give us any of it. Without an account or the questionnaire some things won't work, such as saving a trip or a plan that fits you.</p>
<p>For visitors from the EU, the legal grounds are: providing the service you asked for (your account and trips); your choice (signing in with Google, photos you send); our legitimate interest in keeping the app working and improving it (problem reports, and usage counting, which you can turn off); and legal duties.</p>

<h2>What we don't do</h2>
<ul>
<li>We don't sell or rent out anything about you.</li>
<li>We show no ads, and use no outside tracking tools or advertising cookies. The usage counting above stays with us.</li>
<li>We don't ask for your phone's location. Like any website, the services below see your IP address, which shows roughly where you are.</li>
<li>We don't use your content to train AI models.</li>
<li>We don't send marketing emails unless you choose to get them.</li>
</ul>

<h2>Cookies</h2>
<p>Toogo doesn't use cookies. The app keeps your sign-in, your settings, the offline copy of your trip and the random device code in your browser's own storage on your device. Clearing this site's data in your browser removes them.</p>

<h2>Who at Toogo looks at your information</h2>
<p>Nobody reads your trips, bookings or documents as a matter of routine. We look only when you ask us to (for example, the part of your trip a problem report is about), to investigate a security problem or abuse, or when the law requires it. Photos you send for a place are checked by us before anyone else sees them.</p>

<h2>Keeping it safe</h2>
<p>Everything travels encrypted (HTTPS) and is stored encrypted by our database provider. Database rules let only a trip's members read that trip. If a breach puts your information at risk, we will tell you, and report it to the Privacy Protection Authority as the law requires.</p>

<h2>Who sees your trip</h2>
<p>Only the trip's members: whoever started it and whoever they invited. Members see what each of them added, the likes, and the trip's bookings, documents and expenses. If you make a share link for the plan, anyone with the link sees a copy of the day-by-day plan (with the trip's name only if you chose to include it), until you stop sharing. People who already opened it may have kept a copy.</p>

<h2>Who else handles it</h2>
<p>We use a few providers. Each gets the part of your information its job needs:</p>
<ul>
<li><b>Supabase:</b> the servers, the database and signing in. Everything above is stored with them, in Frankfurt, Germany (in the EU).</li>
<li><b>Anthropic (Claude), in the United States:</b> when you add a place from a link or a name, paste or upload a booking confirmation, or translate, that text or file is sent to Claude to make the card, the booking or the translation. Under Anthropic's commercial terms, it keeps it only for a limited time and does not use it to train its models.</li>
<li><b>Google:</b> only if you choose to sign in with Google.</li>
<li><b>GitHub Pages:</b> hosts the website and, like any website, sees your IP address.</li>
<li><b>Esri (ArcGIS):</b> sends the map tiles when you open a map, and sees your IP address and the area on the map.</li>
<li><b>Speech recognition:</b> when you speak to the translator, your browser recognises the speech. Depending on the browser, your voice may be sent to Google or Apple for that.</li>
<li><b>Sites you open:</b> when you tap a link to a hotel (Booking.com), a map or a place's website, you go to them and their terms apply. A hotel link may tell the hotel site that you came from Toogo, and may earn us a commission, at no extra cost to you.</li>
</ul>
<p>Like any online service, these providers keep short technical logs: IP address, browser type and time.</p>

<h2>How long we keep it</h2>
<ul>
<li>Your account, answers and trips: while your account exists.</li>
<li>Usage counting: 12 months.</li>
<li>Problem reports: up to 2 years.</li>
<li>Photos waiting for review: until we check them. A photo we don't approve is deleted.</li>
<li>Our database provider's backups keep a copy for a limited time after something is deleted.</li>
</ul>

<h2>Your rights</h2>
<p>You can ask to see your information, to get a copy of it, to correct it or to delete it, to limit how we use it or object to it, and to take back a consent you gave. You can turn off usage counting in Settings yourself. Write to us ${c}. If you're unhappy with our answer, you can complain to Israel's Privacy Protection Authority or, in the EU, to your local data protection authority.</p>

<h2>Deleting your account</h2>
<p>Write to us ${c} and we will delete your account and your information within 30 days. What stays: places you added to a shared trip stay with its other members, and approved photos stay on place cards, unless you ask us to remove those too. Usage counting already sent stays without your account attached, until its 12 months end. Backups expire on their own.</p>

<h2>Age</h2>
<p>Toogo is for people aged 18 and over. Information about a child or baby on the trip is only what their parents chose to enter. If you think a child gave us information, tell us and we will delete it.</p>

<h1 id="terms">Terms of use</h1>
<p>By using Toogo you agree to these terms and to the privacy notice above. If you don't agree, please don't use the app, and tell us why.</p>

<h2>The information in the app</h2>
<ul>
<li>Places are collected and checked with care, but opening hours, prices, menus and entry rules change. Check before you go.</li>
<li>Some content is written or summarised with AI and can be wrong.</li>
<li>"No pork or seafood" is not kosher certification. With an allergy, always ask at the place.</li>
<li>Information about travelling with a baby is general and is not medical advice.</li>
<li>The plan, the nights per city and the suggested areas are suggestions. The decisions, the bookings and the responsibility for them are yours.</li>
</ul>

<h2>Bookings and other sites</h2>
<p>We don't sell flights, hotels or tickets. You book directly with the provider, and its terms apply. We don't control other sites and are not responsible for what they offer or do.</p>

<h2>Your account</h2>
<ul>
<li>Give true details, keep your password to yourself, and tell us if someone else got into your account.</li>
<li>You are responsible for what is done in your account.</li>
</ul>

<h2>What you upload</h2>
<ul>
<li>Upload only photos and content that are yours or that you're allowed to share. They stay yours.</li>
<li>When you send a photo for a place, you allow us, free of charge and not exclusively, to show it on that place's card in Toogo. You can ask us to take it down at any time.</li>
<li>Not allowed: hateful, insulting or threatening content; sexual or violent content; someone else's private details; spam or advertising; and information you know is false, such as made-up places.</li>
<li>Saw something like that? Report it from the app's menu and we'll deal with it as fast as we can. We may remove content and block accounts that break these rules.</li>
</ul>

<h2>Using Toogo fairly</h2>
<ul>
<li>Use Toogo for planning your own trips and those of the people you travel with.</li>
<li>Don't copy the places or the guide pages in bulk, by hand or with bots, and don't reuse them for business.</li>
<li>Don't try to break into, overload or disrupt the app, and don't pretend to be someone else.</li>
</ul>

<h2>What is ours</h2>
<p>The name Toogo, the app, its design, the place library and the guide pages belong to us. You're welcome to use them for your trips and to share single places with friends.</p>

<h2>Ideas you send us</h2>
<p>Ideas and suggestions you send help us improve. We may use them freely, with no payment or duty to you.</p>

<h2>Paid features</h2>
<p>Toogo is free during the trial. If we start selling something, such as a pass for a trip, we will show the price and what it includes before you pay. Refunds follow Israeli consumer law; purchases made through the App Store are refunded through Apple.</p>

<h2>The service and our responsibility</h2>
<ul>
<li>Toogo is in a trial stage, is provided as is, and may change, break or stop.</li>
<li>As far as the law allows, we are not responsible for indirect loss, such as a missed reservation or a changed plan, and our total responsibility is limited to what you paid us in the 12 months before the claim.</li>
<li>This does not limit responsibility for intent or gross negligence, or any right the law does not let us limit.</li>
</ul>

<h2>Ending</h2>
<p>You can stop using Toogo at any time and ask us to delete your account. We may suspend or close an account that breaks these terms.</p>

<h2>Law and changes</h2>
<ul>
<li>These terms are governed by Israeli law, and the courts of Tel Aviv-Jaffa decide disputes. If one part is found invalid, the rest still applies.</li>
<li>For an important change, we will tell you in the app at least 14 days before it takes effect, and update the date at the top. Small fixes of wording apply right away.</li>
</ul>
`,
    }
  return {
    title: 'פרטיות ותנאי שימוש | Toogo',
    description: 'מה Toogo שומרת עליכם, מי רואה את זה, לכמה זמן, איך מוחקים, ותנאי השימוש באפליקציה.',
    h1: 'פרטיות ותנאי שימוש',
    lead: `בקצרה: אנחנו שומרים רק מה שצריך כדי לתכנן איתכם את הטיול, לא מוכרים שום מידע עליכם, ואין פרסומות. עודכן ב-${UPDATED.he}.`,
    body: `
<h2>מי אנחנו</h2>
<p>Toogo היא אפליקציה לתכנון טיול ליפן, בעברית ובאנגלית. היא מופעלת על ידי המייסד שלה, אדם פרטי בישראל ("אנחנו"), ועדיין נמצאת בשלב ניסיון. לכל שאלה, בקשה או תלונה, כתבו לנו ${c}. נענה תוך 30 יום, ובדרך כלל הרבה קודם.</p>

<h2>מה אנחנו שומרים</h2>
<ul>
<li><b>החשבון:</b> כתובת המייל והשם שאתם מציגים לקבוצה. סיסמה נשמרת רק כגיבוב חד-כיווני, ואף אחד לא יכול לקרוא אותה. אם נכנסתם עם Google, היא מעבירה לנו גם את מזהה החשבון שלכם ב-Google, ואת השם ותמונת הפרופיל שבו.</li>
<li><b>השאלון:</b> עם מי אתם נוסעים (כולל אם מגיע תינוק), אילו ערים, מה מעניין אתכם, מה אתם לא אוכלים, התקציב לארוחה, קצב הטיול והאם הייתם כבר ביפן.</li>
<li><b>הטיול:</b> המקומות שהוספתם, מה אהבתם ודירגתם, התוכנית, המלונות, ההזמנות (טיסות, מלונות וכו') והמסמכים שצירפתם אליהן, ההוצאות ורשימות הציוד. במסמכי הזמנה יכולים להופיע מספרי דרכון או כרטיס: הם נשמרים באופן פרטי, רק לחברי הטיול שלכם.</li>
<li><b>מקומות שהוספתם:</b> המקום עצמו (השם, האזור, הכתובת והתיאור, בלי ההערות שלכם, בלי הלייקים ובלי מי הוסיף אותו) נשמר גם בספריית המקומות המשותפת של Toogo. ברגע שטיול נוסף מוסיף את אותו מקום, הוא יכול להופיע לכל מי שמשתמש ב-Toogo.</li>
<li><b>תמונות ששלחתם למקום:</b> נשמרות בצד עד שאנחנו בודקים אותן. תמונה שאושרה מופיעה בכרטיס של המקום לכל מי שמשתמש ב-Toogo. כל תמונה נשמרת כקובץ חדש, וכך נמחק ממנה המיקום שהטלפון מוסיף לתמונות.</li>
<li><b>דיווח על בעיה:</b> מה שכתבתם, המסך שבו הייתם, גרסת האפליקציה וסוג המכשיר והדפדפן.</li>
<li><b>איך משתמשים באפליקציה:</b> אילו מסכים נפתחים, עד לאן מגיעים מהמסך הראשון ועד טיול שמור, אילו אתרים חיצוניים נפתחים (רק שם האתר), ותקלות באפליקציה. המידע מקושר לקוד אקראי שנוצר במכשיר שלכם, ולחשבון אחרי שאתם מתחברים. הוא אף פעם לא כולל את מה שאתם כותבים. אפשר לכבות את זה בהגדרות.</li>
<li><b>בטלפון שלכם:</b> עותק של הטיול כדי שהאפליקציה תעבוד גם בלי קליטה, ההגדרות שלכם, ואם התחלתם בלי חשבון, גם התשובות והלייקים עד שתתחברו.</li>
</ul>

<h2>פרטים אישיים בתשובות</h2>
<p>חלק מהתשובות אומרות משהו אישי: מה שאתם לא אוכלים יכול לרמוז על שמירת מסורת, ותינוק בטיול הוא מידע משפחתי. אנחנו משתמשים בהן רק כדי להתאים לכם את המקומות ואת התוכנית. רואים אותן רק אתם, חברי הטיול במקומות שהאפליקציה מציגה אותן, והספקים שמפורטים בהמשך.</p>

<h2>למה אנחנו משתמשים במידע, והאם חובה למסור אותו</h2>
<p>רק כדי להפעיל בשבילכם את Toogo: לבחור את הכרטיסים ולבנות את התוכנית, לאפשר לקבוצה לתכנן ביחד, לשמור על האפליקציה עובדת גם בלי קליטה, לתקן תקלות ולשפר את האפליקציה. אין חובה לפי חוק למסור לנו את המידע. בלי חשבון או בלי השאלון חלק מהדברים לא יעבדו, למשל שמירת טיול או תוכנית שמתאימה לכם.</p>
<p>למבקרים מהאיחוד האירופי, הבסיס החוקי הוא: מתן השירות שביקשתם (החשבון והטיולים); הבחירה שלכם (כניסה עם Google, תמונות ששלחתם); האינטרס הלגיטימי שלנו לשמור על האפליקציה תקינה ולשפר אותה (דיווחים על בעיות, והספירה, שאפשר לכבות); וחובות לפי חוק.</p>

<h2>מה אנחנו לא עושים</h2>
<ul>
<li>לא מוכרים ולא משכירים שום מידע עליכם.</li>
<li>לא מציגים פרסומות, ולא משתמשים בכלי מעקב חיצוניים או בעוגיות פרסום. הספירה שלמעלה נשארת אצלנו.</li>
<li>לא מבקשים את המיקום של הטלפון שלכם. כמו כל אתר, השירותים שבהמשך רואים את כתובת ה-IP שלכם, שמראה בערך איפה אתם נמצאים.</li>
<li>לא משתמשים בתוכן שלכם כדי לאמן מודלים של בינה מלאכותית.</li>
<li>לא שולחים מיילים שיווקיים, אלא אם בחרתם לקבל אותם.</li>
</ul>

<h2>עוגיות (Cookies)</h2>
<p>Toogo לא משתמשת בעוגיות. האפליקציה שומרת את הכניסה לחשבון, ההגדרות, העותק של הטיול לשימוש בלי קליטה והקוד האקראי של המכשיר באחסון של הדפדפן עצמו, במכשיר שלכם. ניקוי הנתונים של האתר בדפדפן מוחק אותם.</p>

<h2>מי אצלנו מסתכל על המידע שלכם</h2>
<p>אף אחד לא קורא את הטיולים, ההזמנות או המסמכים שלכם כדבר שבשגרה. אנחנו מסתכלים רק כשאתם מבקשים (למשל, החלק בטיול שדיווח על בעיה מתייחס אליו), כדי לבדוק בעיית אבטחה או שימוש לרעה, או כשהחוק מחייב. תמונות ששלחתם למקום נבדקות על ידינו לפני שמישהו אחר רואה אותן.</p>

<h2>איך המידע מוגן</h2>
<p>כל המידע עובר מוצפן (HTTPS) ונשמר מוצפן אצל ספק מסד הנתונים. כללי מסד הנתונים מאפשרים רק לחברי טיול לקרוא את הטיול שלהם. אם תהיה פריצה שמסכנת את המידע שלכם, נודיע לכם, ונדווח לרשות להגנת הפרטיות כפי שהחוק מחייב.</p>

<h2>מי רואה את הטיול</h2>
<p>רק חברי הטיול: מי שפתח אותו ומי שהוזמן אליו. חברי הטיול רואים מה כל אחד הוסיף, את הלייקים, ואת ההזמנות, המסמכים וההוצאות של הטיול. אם יצרתם קישור שיתוף לתוכנית, כל מי שיש לו את הקישור רואה עותק של התוכנית יום אחרי יום (עם שם הטיול רק אם בחרתם לצרף אותו), עד שתפסיקו לשתף. מי שכבר פתח את הקישור יכול היה לשמור עותק.</p>

<h2>מי עוד מטפל במידע</h2>
<p>אנחנו נעזרים בכמה ספקים. כל אחד מקבל את החלק מהמידע שהוא צריך לעבודה שלו:</p>
<ul>
<li><b>Supabase:</b> השרתים, מסד הנתונים והכניסה לחשבון. כל מה שמופיע למעלה נשמר אצלם, בפרנקפורט שבגרמניה (באיחוד האירופי).</li>
<li><b>Anthropic (Claude), בארצות הברית:</b> כשאתם מוסיפים מקום מקישור או לפי שם, מדביקים או מעלים אישור הזמנה, או מתרגמים, הטקסט או הקובץ נשלחים ל-Claude כדי להכין את הכרטיס, ההזמנה או התרגום. לפי התנאים העסקיים של Anthropic, היא שומרת אותם רק לזמן מוגבל ולא משתמשת בהם לאימון המודלים שלה.</li>
<li><b>Google:</b> רק אם בחרתם להיכנס עם Google.</li>
<li><b>GitHub Pages:</b> מארח את האתר, וכמו כל אתר רואה את כתובת ה-IP שלכם.</li>
<li><b>Esri (ArcGIS):</b> שולחת את המפה כשאתם פותחים מפה, ורואה את כתובת ה-IP שלכם ואת האזור שבמפה.</li>
<li><b>זיהוי דיבור:</b> כשאתם מדברים אל המתרגם, הדפדפן מזהה את הדיבור. בהתאם לדפדפן, הקול שלכם יכול להישלח לשם כך ל-Google או ל-Apple.</li>
<li><b>אתרים שאתם פותחים:</b> כשאתם לוחצים על קישור למלון (Booking.com), למפות או לאתר של מקום, אתם עוברים אליהם והתנאים שלהם חלים. קישור למלון יכול לספר לאתר המלונות שהגעתם מ-Toogo, ואנחנו עשויים לקבל עליו עמלה, בלי שזה עולה לכם יותר.</li>
</ul>
<p>כמו כל שירות ברשת, הספקים האלה שומרים יומנים טכניים קצרים: כתובת IP, סוג הדפדפן ושעה.</p>

<h2>כמה זמן שומרים</h2>
<ul>
<li>החשבון, התשובות והטיולים: כל עוד החשבון קיים.</li>
<li>הספירה של השימוש באפליקציה: 12 חודשים.</li>
<li>דיווחים על בעיות: עד שנתיים.</li>
<li>תמונות שמחכות לבדיקה: עד שאנחנו בודקים אותן. תמונה שלא אושרה נמחקת.</li>
<li>הגיבויים של ספק מסד הנתונים שומרים עותק לזמן מוגבל אחרי שמשהו נמחק.</li>
</ul>

<h2>הזכויות שלכם</h2>
<p>אפשר לבקש לראות את המידע שלכם, לקבל עותק שלו, לתקן אותו או למחוק אותו, להגביל את השימוש בו או להתנגד לו, ולבטל הסכמה שנתתם. את הספירה אפשר לכבות לבד בהגדרות. כתבו לנו ${c}. אם התשובה שלנו לא מספקת אתכם, אפשר להתלונן ברשות להגנת הפרטיות, ובאיחוד האירופי ברשות להגנת מידע של המדינה שלכם.</p>

<h2>מחיקת החשבון</h2>
<p>כתבו לנו ${c}, ונמחק את החשבון ואת המידע שלכם תוך 30 יום. מה נשאר: מקומות שהוספתם לטיול משותף נשארים אצל שאר חברי הטיול, ותמונות שאושרו נשארות בכרטיסי המקומות, אלא אם תבקשו שנסיר גם אותם. ספירה שכבר נשלחה נשארת בלי קשר לחשבון שלכם, עד שעוברים 12 החודשים שלה. הגיבויים פגים מעצמם.</p>

<h2>גיל</h2>
<p>Toogo מיועדת לבני 18 ומעלה. מידע על ילד או תינוק בטיול הוא רק מה שההורים בחרו לכתוב. אם אתם חושבים שילד מסר לנו מידע, ספרו לנו ונמחק אותו.</p>

<h1 id="terms">תנאי שימוש</h1>
<p>השימוש ב-Toogo הוא הסכמה לתנאים האלה ולמדיניות הפרטיות שלמעלה. אם אתם לא מסכימים, אל תשתמשו באפליקציה, ונשמח לשמוע למה.</p>

<h2>המידע באפליקציה</h2>
<ul>
<li>המידע על המקומות נאסף ונבדק בזהירות, אבל שעות פתיחה, מחירים, תפריטים ותנאי כניסה משתנים. כדאי לבדוק לפני שיוצאים.</li>
<li>חלק מהתוכן נכתב או סוכם בעזרת בינה מלאכותית, והוא יכול לטעות.</li>
<li>"בלי חזיר ופירות ים" הוא לא כשרות ולא תעודה. אם יש אלרגיה, תמיד שאלו במקום.</li>
<li>המידע על טיול עם תינוק הוא כללי, ולא מחליף ייעוץ רפואי.</li>
<li>התוכנית, חלוקת הלילות בין הערים והאזורים המומלצים הם הצעות. ההחלטות, ההזמנות והאחריות עליהן שלכם.</li>
</ul>

<h2>הזמנות ואתרים אחרים</h2>
<p>אנחנו לא מוכרים טיסות, מלונות או כרטיסים. ההזמנה נעשית ישירות מול הספק, והתנאים שלו חלים עליה. אין לנו שליטה על אתרים אחרים, ואנחנו לא אחראים למה שהם מציעים או עושים.</p>

<h2>החשבון שלכם</h2>
<ul>
<li>מסרו פרטים נכונים, שמרו את הסיסמה לעצמכם, וספרו לנו אם מישהו אחר נכנס לחשבון שלכם.</li>
<li>אתם אחראים למה שנעשה בחשבון שלכם.</li>
</ul>

<h2>מה שאתם מעלים</h2>
<ul>
<li>העלו רק תמונות ותוכן שהם שלכם או שמותר לכם לשתף. הם נשארים שלכם.</li>
<li>כששולחים תמונה של מקום, אתם מרשים לנו, בלי תשלום ובלי בלעדיות, להציג אותה בכרטיס של המקום ב-Toogo. אפשר לבקש שנוריד אותה בכל זמן.</li>
<li>אסור: תוכן שנאה, העלבה או איום; תוכן מיני או אלים; פרטים פרטיים של אדם אחר; ספאם או פרסום; ומידע שאתם יודעים שהוא שקרי, כמו מקומות מומצאים.</li>
<li>ראיתם משהו כזה? דווחו מהתפריט של האפליקציה, ונטפל בזה הכי מהר שנוכל. אנחנו רשאים להסיר תוכן ולחסום חשבונות שעוברים על הכללים.</li>
</ul>

<h2>שימוש הוגן</h2>
<ul>
<li>השתמשו ב-Toogo כדי לתכנן את הטיולים שלכם ושל מי שנוסע איתכם.</li>
<li>אל תעתיקו את המקומות או את דפי המדריך בכמויות, ביד או בעזרת בוטים, ואל תשתמשו בהם לעסק.</li>
<li>אל תנסו לפרוץ לאפליקציה, להעמיס עליה או לשבש אותה, ואל תתחזו למישהו אחר.</li>
</ul>

<h2>מה שלנו</h2>
<p>השם Toogo, האפליקציה, העיצוב, ספריית המקומות ודפי המדריך שייכים לנו. אתם מוזמנים להשתמש בהם לטיולים שלכם ולשתף מקומות בודדים עם חברים.</p>

<h2>רעיונות ששולחים לנו</h2>
<p>רעיונות והצעות ששולחים לנו עוזרים לנו להשתפר. אנחנו רשאים להשתמש בהם בחופשיות, בלי תשלום ובלי התחייבות כלפיכם.</p>

<h2>תכונות בתשלום</h2>
<p>Toogo חינמית בשלב הניסיון. אם נתחיל למכור משהו, כמו כרטיס לטיול, נציג את המחיר ואת מה שכלול בו לפני התשלום. החזרים לפי חוק הגנת הצרכן; קנייה דרך ה-App Store מוחזרת דרך Apple.</p>

<h2>השירות והאחריות שלנו</h2>
<ul>
<li>Toogo בשלב ניסיון, ניתנת כמו שהיא, ויכולה להשתנות, להשתבש או להיפסק.</li>
<li>ככל שהחוק מתיר, אנחנו לא אחראים לנזק עקיף, כמו הזמנה שהוחמצה או תוכנית שהשתנתה, והאחריות הכוללת שלנו מוגבלת למה ששילמתם לנו ב-12 החודשים שלפני הדרישה.</li>
<li>זה לא מגביל אחריות על כוונה או רשלנות חמורה, או כל זכות שהחוק לא מאפשר להגביל.</li>
</ul>

<h2>סיום</h2>
<p>אפשר להפסיק להשתמש ב-Toogo בכל זמן ולבקש שנמחק את החשבון. אנחנו רשאים להשעות או לסגור חשבון שעובר על התנאים.</p>

<h2>דין ושינויים</h2>
<ul>
<li>על התנאים חל הדין הישראלי, ובתי המשפט בתל אביב-יפו מכריעים במחלוקות. אם חלק מהתנאים יימצא לא תקף, השאר עדיין חלים.</li>
<li>על שינוי חשוב נספר באפליקציה לפחות 14 יום לפני שהוא נכנס לתוקף, ונעדכן את התאריך למעלה. תיקוני ניסוח קטנים חלים מיד.</li>
</ul>
`,
  }
}
