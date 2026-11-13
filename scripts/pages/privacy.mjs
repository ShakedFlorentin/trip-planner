// The privacy notice and terms of use (/privacy/ and /en/privacy/), built with the guide pages by build-pages.mjs.
// Plain HTML that we wrote, in Hebrew and English. Keep both languages saying the same thing, and move UPDATED
// whenever something here changes. Linked from the sign-in screen, the app's menu and every guide page's footer.

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
      description: 'What Toogo keeps about you, who sees it, how to delete it, and the terms of using the app.',
      h1: 'Privacy and terms of use',
      lead: `In short: we keep only what we need to plan the trip with you, we don't sell anything about you, and there are no ads. Updated ${UPDATED.en}.`,
      body: `
<h2>Who we are</h2>
<p>Toogo is an app for planning a trip to Japan, in Hebrew and English. It is run by its founder, a private individual in Israel, and is still in a trial stage. For any question, request or complaint, write to us ${c}.</p>

<h2>What we keep</h2>
<ul>
<li><b>Your account:</b> your email address. A password is kept only as a one-way hash: nobody can read it. If you sign in with Google, Google also passes us the name and profile photo on your Google account.</li>
<li><b>The questionnaire:</b> who you travel with (including whether a baby is coming), which cities, what interests you, what you don't eat, your budget for a meal, your pace, and whether you've been to Japan.</li>
<li><b>The trip:</b> the places you added, what you liked and rated, the plan, the hotels, the bookings (flights, hotels and so on) and the documents you attach to them, the expenses and the packing lists.</li>
<li><b>Photos you send for a place:</b> kept aside until we check them. An approved photo appears on that place's card for everyone who uses Toogo.</li>
<li><b>Problem reports:</b> what you wrote, the screen you were on, the app version and your device and browser type.</li>
<li><b>On your phone:</b> a copy of the trip so the app works without signal, your settings, and, if you started without an account, your answers and likes until you sign in.</li>
</ul>

<h2>What we don't do</h2>
<ul>
<li>We don't sell or rent out anything about you.</li>
<li>We show no ads and use no tracking tools or advertising cookies.</li>
<li>We don't track your location.</li>
<li>We don't use your content to train AI models.</li>
</ul>

<h2>Who sees your trip</h2>
<p>Only the trip's members: whoever started it and whoever they invited. Members see what each of them added, the likes, and the trip's bookings, documents and expenses. If you make a share link for the plan, anyone with the link sees a copy of the day-by-day plan (with the trip's name only if you chose to include it), until you stop sharing.</p>

<h2>Who else handles it</h2>
<p>We use a few providers, and each gets only what it needs:</p>
<ul>
<li><b>Supabase:</b> the servers, the database and signing in. Everything above is stored with them, outside Israel.</li>
<li><b>Anthropic (Claude):</b> when you add a place from a link or a name, paste or upload a booking confirmation, or translate, that text or file is sent to Claude to make the card, the booking or the translation. Under Anthropic's commercial terms, it is not used to train their models.</li>
<li><b>Google:</b> only if you choose to sign in with Google.</li>
<li><b>GitHub Pages:</b> hosts the website and, like any website, sees your IP address.</li>
<li><b>Esri (ArcGIS):</b> sends the map tiles when you open a map, and sees your IP address and the area on the map.</li>
<li><b>Your browser or phone:</b> when you speak to the translator, your browser (Apple's or Google's, for example) recognises the speech, not us.</li>
<li><b>Sites you open:</b> when you tap a link to a hotel (Booking.com), a map or a place's website, you go to them and their terms apply. Some hotel links may earn us a commission, at no extra cost to you.</li>
</ul>

<h2>How long, and deleting</h2>
<p>We keep your information while your account exists. To delete your account and everything about you, write to us ${c} and we will delete it within 30 days. Places you added to a shared trip may stay with its other members, unless you ask us to remove those too. You can also ask to see or correct your information.</p>

<h2>Age</h2>
<p>Toogo is for people aged 18 and over. Information about a child or baby on the trip is only what their parents chose to enter.</p>

<h1 id="terms">Terms of use</h1>

<h2>The information in the app</h2>
<ul>
<li>Places are collected and checked with care, but opening hours, prices, menus and entry rules change. Check before you go.</li>
<li>Some content is written or summarised with AI and can be wrong.</li>
<li>"No pork or seafood" is not kosher certification. With an allergy, always ask at the place.</li>
<li>Information about travelling with a baby is general and is not medical advice.</li>
<li>The plan, the nights per city and the suggested areas are suggestions. The decisions, the bookings and the responsibility for them are yours.</li>
</ul>

<h2>Bookings</h2>
<p>We don't sell flights, hotels or tickets. You book directly with the provider, and its terms apply.</p>

<h2>What you upload</h2>
<ul>
<li>Upload only photos and content you are allowed to share.</li>
<li>When you send a photo for a place, you allow us to show it on that place's card in Toogo.</li>
<li>We may remove content that is offensive, wrong or unlawful, and block an account that misuses the app.</li>
</ul>

<h2>The service</h2>
<ul>
<li>Toogo is in a trial stage, is provided as is, and may change, break or stop.</li>
<li>As far as the law allows, we are not liable for harm caused by relying on its information or by a fault in the app.</li>
<li>These terms are governed by Israeli law.</li>
<li>When we change something important here, we update the date at the top and say so in the app.</li>
</ul>
`,
    }
  return {
    title: 'פרטיות ותנאי שימוש | Toogo',
    description: 'מה Toogo שומרת עליכם, מי רואה את זה, איך מוחקים, ותנאי השימוש באפליקציה.',
    h1: 'פרטיות ותנאי שימוש',
    lead: `בקצרה: אנחנו שומרים רק מה שצריך כדי לתכנן איתכם את הטיול, לא מוכרים שום מידע עליכם, ואין פרסומות. עודכן ב-${UPDATED.he}.`,
    body: `
<h2>מי אנחנו</h2>
<p>Toogo היא אפליקציה לתכנון טיול ליפן, בעברית ובאנגלית. היא מופעלת על ידי המייסד שלה, אדם פרטי בישראל, ועדיין נמצאת בשלב ניסיון. לכל שאלה, בקשה או תלונה, כתבו לנו ${c}.</p>

<h2>מה אנחנו שומרים</h2>
<ul>
<li><b>החשבון:</b> כתובת המייל. סיסמה נשמרת רק כגיבוב חד-כיווני, ואף אחד לא יכול לקרוא אותה. אם נכנסתם עם Google, היא מעבירה לנו גם את השם ואת תמונת הפרופיל שבחשבון Google שלכם.</li>
<li><b>השאלון:</b> עם מי אתם נוסעים (כולל אם מגיע תינוק), אילו ערים, מה מעניין אתכם, מה אתם לא אוכלים, התקציב לארוחה, קצב הטיול והאם הייתם כבר ביפן.</li>
<li><b>הטיול:</b> המקומות שהוספתם, מה אהבתם ודירגתם, התוכנית, המלונות, ההזמנות (טיסות, מלונות וכו') והמסמכים שצירפתם אליהן, ההוצאות ורשימות הציוד.</li>
<li><b>תמונות ששלחתם למקום:</b> נשמרות בצד עד שאנחנו בודקים אותן. תמונה שאושרה מופיעה בכרטיס של המקום לכל מי שמשתמש ב-Toogo.</li>
<li><b>דיווח על בעיה:</b> מה שכתבתם, המסך שבו הייתם, גרסת האפליקציה וסוג המכשיר והדפדפן.</li>
<li><b>בטלפון שלכם:</b> עותק של הטיול כדי שהאפליקציה תעבוד גם בלי קליטה, ההגדרות שלכם, ואם התחלתם בלי חשבון, גם התשובות והלייקים עד שתתחברו.</li>
</ul>

<h2>מה אנחנו לא עושים</h2>
<ul>
<li>לא מוכרים ולא משכירים שום מידע עליכם.</li>
<li>לא מציגים פרסומות, ולא משתמשים בכלי מעקב או בעוגיות פרסום.</li>
<li>לא עוקבים אחרי המיקום שלכם.</li>
<li>לא משתמשים בתוכן שלכם כדי לאמן מודלים של בינה מלאכותית.</li>
</ul>

<h2>מי רואה את הטיול</h2>
<p>רק חברי הטיול: מי שפתח אותו ומי שהוזמן אליו. חברי הטיול רואים מה כל אחד הוסיף, את הלייקים, ואת ההזמנות, המסמכים וההוצאות של הטיול. אם יצרתם קישור שיתוף לתוכנית, כל מי שיש לו את הקישור רואה עותק של התוכנית יום אחרי יום (עם שם הטיול רק אם בחרתם לצרף אותו), עד שתפסיקו לשתף.</p>

<h2>מי עוד מטפל במידע</h2>
<p>אנחנו נעזרים בכמה ספקים, וכל אחד מקבל רק את מה שהוא צריך:</p>
<ul>
<li><b>Supabase:</b> השרתים, מסד הנתונים והכניסה לחשבון. כל מה שמופיע למעלה נשמר אצלם, מחוץ לישראל.</li>
<li><b>Anthropic (Claude):</b> כשאתם מוסיפים מקום מקישור או לפי שם, מדביקים או מעלים אישור הזמנה, או מתרגמים, הטקסט או הקובץ נשלחים ל-Claude כדי להכין את הכרטיס, ההזמנה או התרגום. לפי התנאים העסקיים של Anthropic, המידע הזה לא משמש לאימון המודלים שלהם.</li>
<li><b>Google:</b> רק אם בחרתם להיכנס עם Google.</li>
<li><b>GitHub Pages:</b> מארח את האתר, וכמו כל אתר רואה את כתובת ה-IP שלכם.</li>
<li><b>Esri (ArcGIS):</b> שולחת את המפה כשאתם פותחים מפה, ורואה את כתובת ה-IP שלכם ואת האזור שבמפה.</li>
<li><b>הדפדפן או הטלפון שלכם:</b> כשאתם מדברים אל המתרגם, הדפדפן (למשל של Apple או של Google) מזהה את הדיבור, לא אנחנו.</li>
<li><b>אתרים שאתם פותחים:</b> כשאתם לוחצים על קישור למלון (Booking.com), למפות או לאתר של מקום, אתם עוברים אליהם והתנאים שלהם חלים. על חלק מהקישורים למלונות אנחנו עשויים לקבל עמלה, בלי שזה עולה לכם יותר.</li>
</ul>

<h2>כמה זמן, ואיך מוחקים</h2>
<p>אנחנו שומרים את המידע כל עוד החשבון קיים. רוצים למחוק את החשבון ואת כל המידע עליכם? כתבו לנו ${c}, ונמחק תוך 30 יום. מקומות שהוספתם לטיול משותף יכולים להישאר אצל שאר חברי הטיול, אלא אם תבקשו שנסיר גם אותם. אפשר גם לבקש לראות את המידע שלכם או לתקן אותו.</p>

<h2>גיל</h2>
<p>Toogo מיועדת לבני 18 ומעלה. מידע על ילד או תינוק בטיול הוא רק מה שההורים בחרו לכתוב.</p>

<h1 id="terms">תנאי שימוש</h1>

<h2>המידע באפליקציה</h2>
<ul>
<li>המידע על המקומות נאסף ונבדק בזהירות, אבל שעות פתיחה, מחירים, תפריטים ותנאי כניסה משתנים. כדאי לבדוק לפני שיוצאים.</li>
<li>חלק מהתוכן נכתב או סוכם בעזרת בינה מלאכותית, והוא יכול לטעות.</li>
<li>"בלי חזיר ופירות ים" הוא לא כשרות ולא תעודה. אם יש אלרגיה, תמיד שאלו במקום.</li>
<li>המידע על טיול עם תינוק הוא כללי, ולא מחליף ייעוץ רפואי.</li>
<li>התוכנית, חלוקת הלילות בין הערים והאזורים המומלצים הם הצעות. ההחלטות, ההזמנות והאחריות עליהן שלכם.</li>
</ul>

<h2>הזמנות</h2>
<p>אנחנו לא מוכרים טיסות, מלונות או כרטיסים. ההזמנה נעשית ישירות מול הספק, והתנאים שלו חלים עליה.</p>

<h2>מה שאתם מעלים</h2>
<ul>
<li>העלו רק תמונות ותוכן שמותר לכם לשתף.</li>
<li>כששולחים תמונה של מקום, אתם מרשים לנו להציג אותה בכרטיס של המקום ב-Toogo.</li>
<li>אנחנו רשאים להסיר תוכן פוגעני, שגוי או לא חוקי, ולחסום חשבון שמשתמש באפליקציה לרעה.</li>
</ul>

<h2>השירות</h2>
<ul>
<li>Toogo בשלב ניסיון, ניתנת כמו שהיא, ויכולה להשתנות, להשתבש או להיפסק.</li>
<li>ככל שהחוק מתיר, אנחנו לא אחראים לנזק שנגרם מהסתמכות על המידע או מתקלה באפליקציה.</li>
<li>על התנאים האלה חל הדין הישראלי.</li>
<li>כשנשנה כאן משהו חשוב, נעדכן את התאריך למעלה ונספר על כך באפליקציה.</li>
</ul>
`,
  }
}
