# Builds guide.html: a 31.75-second, 1080x1920 Toogo explainer (the in-app guide) in the promo's look, whose every frame is
# a pure function of the time in the URL (guide.html#t=3.2&lang=he). render.sh screenshots it 30 times a second with
# headless Chrome and ffmpeg joins them. Steps: swipe places → a match joins the plan → add a place from a TikTok link
# → a booking from its confirmation email, then the rings and the name.
import os
HERE = os.path.dirname(os.path.abspath(__file__))
LETTERS = open(os.path.join(HERE, "letters.txt")).read()

HTML = r"""<!doctype html><html><head><meta charset="utf-8"><title>Toogo guide</title><style>
:root{--red:#bc002d;--ink:#1f1a17;--cream:#faf7f2;--card:#f2f2f7;--muted:#636366;--ok:#1a6f2e}
*{box-sizing:border-box}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:var(--cream);color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Hebrew',system-ui,sans-serif}
.abs{position:absolute}
#dots{left:0;right:0;top:58px;display:flex;justify-content:center;gap:14px;opacity:0}
.dot{width:16px;height:16px;border-radius:8px;background:#ddd6cc}
.dot.on{width:48px;background:var(--red)}
#cap{left:50px;right:50px;top:104px;height:196px;text-align:center}
.cap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:76px;font-weight:800;
  line-height:1.12;letter-spacing:-.01em;opacity:0}
.cap em,.sub em{font-style:normal;color:var(--red)}
.cap svg{width:72px;height:72px;vertical-align:-10px;margin:0 6px}
#subs{left:50px;right:50px;top:306px;height:132px;text-align:center}
.sub{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:500;
  line-height:1.32;color:var(--muted);opacity:0}
.sub em{font-weight:700}
#phone{left:150px;top:470px;width:780px;height:1400px;border-radius:110px;background:#111;padding:16px;opacity:0;
  box-shadow:0 40px 90px rgba(0,0,0,.25)}
#screen{position:relative;width:100%;height:100%;border-radius:96px;background:#fff;overflow:hidden}
.status{position:absolute;top:30px;left:70px;right:70px;display:flex;justify-content:space-between;font-size:30px;font-weight:600;z-index:40}
.view{position:absolute;top:110px;left:0;right:0;bottom:160px;padding:0 40px}
.head{display:flex;align-items:center;gap:16px;margin:4px 0 24px}
.title{font-size:58px;font-weight:800;flex:1}
.hb{width:78px;height:78px;border-radius:50%;background:var(--card);display:flex;align-items:center;justify-content:center;flex:none}
.hb svg{width:40px;height:40px;fill:none;stroke:var(--ink);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.banner{position:relative;height:206px;border-radius:36px;overflow:hidden;margin-bottom:24px}
.banner img{width:100%;height:100%;object-fit:cover}
.banner .lbl{position:absolute;bottom:22px;inset-inline-start:28px;color:#fff;font-size:44px;font-weight:800;
  text-shadow:0 2px 12px rgba(0,0,0,.5)}
.row{display:flex;align-items:center;gap:24px;background:var(--card);border-radius:30px;padding:24px 30px;margin-bottom:16px}
.row .time{font-size:32px;color:var(--muted);font-weight:600;min-width:100px;font-variant-numeric:tabular-nums}
.row .what{flex:1;font-size:38px;font-weight:700}
.row .sub2{display:block;font-size:28px;color:var(--muted);font-weight:500;margin-top:4px}
.row.new{background:#fdf0f1}
.chk{width:56px;height:56px;border-radius:50%;border:4px solid #c6c6c8;flex:none}
.ric{width:60px;height:60px;border-radius:18px;background:var(--red);flex:none;display:flex;align-items:center;justify-content:center}
.ric svg{width:36px;height:36px}
.thumb{width:120px;height:120px;border-radius:24px;overflow:hidden;flex:none}
.thumb img{width:100%;height:100%;object-fit:cover}
.heart{width:64px;height:64px;flex:none}
.badge{display:inline-block;margin-top:8px;padding:4px 16px;border-radius:20px;background:#e3f3e6;color:var(--ok);font-size:26px;font-weight:700}
.badge.red{background:#fde3e7;color:var(--red)}
.chips{display:flex;gap:14px;margin-bottom:24px}
.chip{padding:12px 28px;border-radius:30px;background:var(--card);font-size:32px;font-weight:700}
.chip.on{background:var(--ink);color:#fff}
.bk{background:var(--card);border-radius:30px;padding:28px 32px;margin-bottom:18px;display:flex;gap:26px;align-items:center}
.bk .ic{width:84px;height:84px;border-radius:24px;background:var(--red);flex:none;display:flex;align-items:center;justify-content:center}
.bk .t{font-size:38px;font-weight:800}
.bk .s{font-size:28px;color:var(--muted);margin-top:4px}
.bk .code{margin-inline-start:auto;font-size:28px;font-weight:700;font-family:ui-monospace,'SF Mono',monospace;
  background:#fff;border-radius:14px;padding:8px 14px;white-space:nowrap}
.bk.new{background:#fdf0f1}
.sec{height:100px;border-radius:30px;background:#fdf0f1;color:var(--red);font-size:34px;font-weight:800;display:flex;
  align-items:center;justify-content:center;gap:16px;margin-bottom:26px}
.sec svg{width:42px;height:42px;fill:none;stroke:var(--red);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.tabs{position:absolute;left:0;right:0;bottom:0;height:160px;border-top:1px solid #e5e5ea;display:flex;justify-content:space-around;
  padding:18px 20px 0;background:rgba(250,250,250,.95)}
.tab{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:24px;font-weight:600;color:#8e8e93;width:140px}
.tab svg{width:52px;height:52px;fill:currentColor}
.tab.on{color:var(--red)}
.av{width:64px;height:64px;border-radius:50%;border:4px solid #fff;color:#fff;font-size:28px;font-weight:800;display:flex;
  align-items:center;justify-content:center;margin-inline-end:-14px}
/* discover */
.deck{position:relative;height:730px}
.card{position:absolute;left:0;right:0;top:0;height:684px;border-radius:44px;background:#fff;overflow:hidden;
  box-shadow:0 16px 44px rgba(0,0,0,.16);transform-origin:50% 100%}
.hero{position:relative;height:460px}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero .shade{position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,0) 40%,rgba(0,0,0,.75))}
.ctitle{position:absolute;bottom:28px;inset-inline:32px;color:#fff}
.ctitle h2{margin:0;font-size:56px;font-weight:800;line-height:1.1}
.cmeta{font-size:28px;opacity:.92;margin-top:6px;font-weight:600}
.liked{display:inline-flex;gap:10px;align-items:center;background:rgba(255,255,255,.94);color:var(--red);font-size:26px;
  font-weight:800;padding:8px 18px;border-radius:24px;margin-bottom:14px}
.liked svg{width:28px;height:28px}
.stamp{position:absolute;top:50px;padding:6px 22px;border:7px solid;border-radius:18px;font-size:54px;font-weight:900;opacity:0;
  background:rgba(255,255,255,.14)}
.stamp.like{left:36px;color:#30d158;border-color:#30d158;transform:rotate(-14deg)}
.stamp.nope{right:36px;color:#ff453a;border-color:#ff453a;transform:rotate(14deg)}
.cinfo{padding:24px 32px}
.tags{display:flex;gap:12px}
.tg{padding:8px 20px;border-radius:20px;background:var(--card);font-size:26px;font-weight:700}
.fact{font-size:29px;color:var(--muted);margin-top:16px;line-height:1.35}
.fact b{color:var(--ink);display:block;font-size:27px}
.votes{display:flex;justify-content:center;gap:80px;margin-top:26px}
.vote{width:126px;height:126px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  box-shadow:0 10px 26px rgba(0,0,0,.14);background:#fff}
.vote.like{background:var(--red)}
.vote svg{width:58px;height:58px}
#match{position:absolute;inset:0;background:rgba(20,16,14,.5);display:flex;align-items:center;justify-content:center;opacity:0;z-index:30}
.mbox{width:610px;background:#fff;border-radius:50px;padding:40px 40px 44px;text-align:center}
.mbox img{width:100%;height:250px;object-fit:cover;border-radius:30px;display:block}
.mbox h3{font-size:84px;color:var(--red);margin:22px 0 4px;font-weight:900}
.mbox p{font-size:34px;margin:0;font-weight:600}
.mavs{display:flex;justify-content:center;margin:22px 0 18px;padding-inline-start:14px}
.mnext{font-size:30px;font-weight:800;color:var(--red)}
/* plan */
#pill{position:absolute;left:50%;top:0;z-index:25;background:var(--ink);color:#fff;font-size:32px;font-weight:700;
  padding:16px 30px;border-radius:40px;display:flex;gap:12px;align-items:center;white-space:nowrap;opacity:0;
  box-shadow:0 14px 34px rgba(0,0,0,.25)}
#pill svg{width:32px;height:32px}
/* sheets */
.backdrop{position:absolute;inset:0;background:rgba(0,0,0,.4);opacity:0;z-index:20}
.sheet{position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:56px 56px 0 0;padding:22px 44px 70px;z-index:21;
  transform:translateY(120%);box-shadow:0 -10px 40px rgba(0,0,0,.15)}
.grab{width:90px;height:10px;border-radius:5px;background:#d1d1d6;margin:0 auto 30px}
.sheet h4{font-size:50px;font-weight:800;margin:0 0 14px}
.help{font-size:30px;color:var(--muted);line-height:1.4;margin:0 0 30px}
.field{position:relative;background:var(--card);border-radius:28px;padding:0 30px;font-size:32px;height:104px;display:flex;
  align-items:center;gap:16px}
.field svg{width:38px;height:38px;fill:none;stroke:#8e8e93;stroke-width:2.4;stroke-linecap:round;flex:none}
.ph{color:#aeaeb2}
.val{font-weight:600;white-space:nowrap}
.callout{position:absolute;top:-88px;left:50%;background:#1c1c1e;color:#fff;font-size:30px;font-weight:600;padding:18px 34px;
  border-radius:20px;opacity:0;white-space:nowrap}
.callout::after{content:'';position:absolute;bottom:-14px;left:50%;margin-left:-14px;border:14px solid transparent;border-bottom:0;border-top-color:#1c1c1e}
.btn{margin-top:26px;height:104px;border-radius:30px;background:var(--red);color:#fff;font-size:38px;font-weight:800;display:flex;
  align-items:center;justify-content:center;gap:10px;position:relative}
.btn span{position:absolute}
.found{margin-top:30px;opacity:0}
.found .row{margin:0;background:#fff;border:3px solid #e5e5ea}
.srcb{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:5px 16px;border-radius:16px;background:var(--ink);color:#fff;font-size:24px;font-weight:700}
.added{margin-top:20px;text-align:center;font-size:32px;font-weight:800;color:var(--ok);opacity:0}
.lab{font-size:28px;font-weight:700;color:var(--muted);margin:0 0 12px}
.mail{position:relative;background:var(--card);border-radius:28px;padding:26px 30px;font-size:30px;line-height:1.5;height:226px;
  direction:ltr;text-align:left}
.mail .mv{opacity:0}
.mail .mv b{font-size:31px}
#fab{position:absolute;bottom:196px;inset-inline-end:44px;width:124px;height:124px;border-radius:50%;background:var(--red);
  box-shadow:0 14px 30px rgba(188,0,45,.35);display:flex;align-items:center;justify-content:center;z-index:5}
#fab svg{width:58px;height:58px}
#tap{position:absolute;width:140px;height:140px;margin:-70px 0 0 -70px;border-radius:50%;background:rgba(31,26,23,.22);
  z-index:50;opacity:0;left:0;top:0}
/* the phone's shadow would stop hard at the frame's bottom edge; in the app the cream continues below the video */
#fade{left:0;right:0;top:1876px;height:44px;background:linear-gradient(rgba(250,247,242,0),#faf7f2 85%);pointer-events:none}
#logo{left:0;top:0}
#tag{left:60px;right:60px;top:1330px;text-align:center;font-size:58px;font-weight:700;opacity:0}
#tag2{left:60px;right:60px;top:1420px;text-align:center;font-size:40px;font-weight:500;color:var(--muted);opacity:0}
</style></head><body>

<div id="dots" class="abs"></div>
<div id="cap" class="abs"></div>
<div id="subs" class="abs"></div>

<svg id="big" class="abs" width="1080" height="1920" viewBox="0 0 1080 1920" style="left:0;top:0;pointer-events:none">
  <g id="bigrings">
    <circle id="br1" cx="-56" cy="0" r="38" fill="none" stroke="#bc002d" stroke-width="20"/>
    <circle id="br2" cx="56" cy="0" r="38" fill="none" stroke="#bc002d" stroke-width="20"/>
  </g>
</svg>

<div id="phone" class="abs"><div id="screen">
  <div class="status"><span>9:41</span><span>●●● ▮</span></div>

  <div class="view" id="vDisc">
    <div class="head" id="hDisc"></div>
    <div class="deck" id="deck"></div>
    <div class="votes" id="votes"></div>
  </div>

  <div class="view" id="vPlan">
    <div class="head" id="hPlan"></div>
    <div class="banner"><img src="nara.webp"><div class="lbl" id="planCity"></div></div>
    <div id="planRows"></div>
  </div>

  <div class="view" id="vPlaces">
    <div class="head" id="hPlaces"></div>
    <div class="chips" id="chips"></div>
    <div id="placeRows"></div>
  </div>

  <div class="view" id="vBook">
    <div class="head" id="hBook"></div>
    <div class="sec" id="secBtn"></div>
    <div id="bookRows"></div>
  </div>

  <div id="fab"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg></div>
  <div class="tabs" id="tabs"></div>
  <div id="pill"></div>

  <div class="backdrop" id="addBack"></div>
  <div class="sheet" id="addSheet"></div>
  <div class="backdrop" id="mailBack"></div>
  <div class="sheet" id="mailSheet"></div>
  <div id="match"></div>
  <div id="tap"></div>
</div></div>
<div id="fade" class="abs"></div>

<svg id="logo" class="abs" width="1080" height="1920" viewBox="0 0 1080 1920" style="pointer-events:none">
  <g transform="translate(108 520) scale(1.6)">
    <g id="sym">
      <circle id="r1" cx="214" cy="142" r="38" fill="none" stroke="#bc002d" stroke-width="20"/>
      <circle id="r2" cx="326" cy="142" r="38" fill="none" stroke="#bc002d" stroke-width="20"/>
    </g>
    <g transform="translate(76.86 199.44) scale(0.74)">
LETTERS
    </g>
  </g>
</svg>
<div id="tag" class="abs"></div>
<div id="tag2" class="abs"></div>

<script>
const q = new URLSearchParams(location.hash.slice(1));
const T = parseFloat(q.get('t') || '0');
const LANG = q.get('lang') === 'en' ? 'en' : 'he';
const HE = LANG === 'he';
document.documentElement.lang = LANG; document.documentElement.dir = HE ? 'rtl' : 'ltr';

const S = {
  he: {
    cap: ['ככה <em>Toogo</em> עובד', 'מחליקים<br>על מקומות', 'מאצ׳ נכנס<br>למסלול לבד', 'ראיתם מקום<br>בטיקטוק?', 'אישור הזמנה?<br>מדביקים, וזהו'],
    sub: ['מתכננים טיול עם חברים, בלי בלגן',
          'ימינה אהבתי, שמאלה דלג.<br>מה שכולם בקבוצה אהבו הופך ל<em>מאצ׳</em>',
          'המסלול מסתדר לבד לפי הימים,<br>שעות הפתיחה ואיפה שישנים',
          'מדביקים את הקישור ב״הוספת מקום״,<br>והמקום נכנס לרשימה עם תמונה',
          'מייל אישור או PDF של טיסה, מלון או רכבת,<br>וההזמנה נכנסת לבד'],
    tabs: ['בית', 'גילוי', 'מסלול', 'הזמנות', 'מקומות'],
    disc: 'גילוי',
    cards: [['osaka.webp', 'דוטונבורי', 'אוסקה · אוכל רחוב', ['אוכל', 'בלילה', 'זול'], 'מה מגישים', 'טאקויאקי וראמן לאורך התעלה'],
            ['tokyo.webp', 'שיבויה סקיי', 'טוקיו · תצפית', ['נוף', 'שקיעה'], 'מה מיוחד', 'כל טוקיו מגובה 230 מטר'],
            ['nara.webp', 'פארק נארה', 'נארה · האיילים', ['טבע', 'חינם', 'ילדים'], 'מה עושים שם', 'מאכילים איילים ליד המקדש הגדול']],
    liked: 'נועה ודן אהבו', like: 'אהבתי', nope: 'דלג',
    match: 'מאצ׳!', matchTxt: 'כולם אהבו את <b>פארק נארה</b>', matchNext: 'נכנס למסלול ↓',
    names: ['נ', 'ד', 'מ'],
    planTitle: 'יום 4', planCity: 'נארה',
    plan: [['09:00', 'רכבת לנארה', 'מקיוטו · 45 דק׳'], ['10:00', 'טודאי־ג׳י', 'הבודהה הגדול'],
           ['13:00', 'נאראמאצ׳י', 'צהריים בעיר העתיקה'], ['18:30', 'חזרה למלון', 'מלון בקיוטו']],
    added: ['11:30', 'פארק נארה', 'מאצ׳', 'פתוח עד 17:00'],
    pill: 'פארק נארה',
    placesTitle: 'מקומות', chips: ['הכל', 'טוקיו', 'אוסקה', 'נארה'],
    places: [['tokyo.webp', 'שיבויה סקיי', 'טוקיו · תצפית', 0], ['osaka.webp', 'דוטונבורי', 'אוסקה · אוכל רחוב', 1],
             ['nara.webp', 'פארק נארה', 'נארה · האיילים', 1]],
    newPlace: ['fuji.webp', 'פגודת צ׳ורייטו', 'פוג׳י · נוף', 'חדש · מטיקטוק'],
    addTitle: 'הוספת מקום', addHelp: 'הדביקו קישור מאינסטגרם, טיקטוק או גוגל מפות, או כתבו שם של מקום.',
    addPh: 'קישור או שם של מקום', link: 'tiktok.com/@japan.trips/video/7351…', paste: 'הדבקה',
    addBtn: 'הוספה', addBusy: 'קוראים את הסרטון…', src: 'סרטון בטיקטוק', rating: '★ 4.7', addDone: '✓ נוסף לרשימה',
    bookTitle: 'הזמנות', secBtn: 'הוספה מאישור הזמנה',
    books: [['✈', 'טיסה לטוקיו', 'תל אביב ← נריטה · 12.3', 'LY091'], ['▬', 'שינקנסן', 'טוקיו ← קיוטו · 14.3', 'N7-14']],
    newBook: ['⌂', 'מלון בקיוטו', '3 לילות · צ׳ק־אין 15.3', 'HX72Q'],
    mailHelp: 'מדביקים את מייל האישור או מצרפים PDF / צילום מסך, וההזמנה נוספת לבד.',
    mailLab: 'טקסט האישור', mailBtn: 'קריאה והוספה', mailBusy: 'קורא את האישור…',
    tag: 'מתכננים את הטיול ביחד', tag2: 'עכשיו תורכם',
  },
  en: {
    cap: ['How <em>Toogo</em> works', 'Swipe<br>through places', 'A match joins<br>the plan by itself', 'Saw a place<br>on TikTok?', 'Got a booking?<br>Just paste it'],
    sub: ['Plan a trip with friends, minus the mess',
          'Right means like, left means skip.<br>What the whole group likes is a <em>match</em>',
          'The plan sorts itself by day,<br>opening hours and where you sleep',
          'Paste the link in “Add place” and it<br>joins your list, photo and all',
          'A flight, hotel or train confirmation,<br>email or PDF: the booking adds itself'],
    tabs: ['Home', 'Discover', 'Plan', 'Bookings', 'Places'],
    disc: 'Discover',
    cards: [['osaka.webp', 'Dotonbori', 'Osaka · Street food', ['Food', 'At night', 'Cheap'], 'What they serve', 'Takoyaki and ramen along the canal'],
            ['tokyo.webp', 'Shibuya Sky', 'Tokyo · Views', ['Views', 'Sunset'], 'What’s special', 'All of Tokyo from 230 metres up'],
            ['nara.webp', 'Nara Park', 'Nara · The deer', ['Nature', 'Free', 'Kids'], 'What you do there', 'Feed the deer by the great temple']],
    liked: 'Noa and Dan liked it', like: 'LIKE', nope: 'SKIP',
    match: 'Match!', matchTxt: 'Everyone liked <b>Nara Park</b>', matchNext: 'Going into the plan ↓',
    names: ['N', 'D', 'M'],
    planTitle: 'Day 4', planCity: 'Nara',
    plan: [['09:00', 'Train to Nara', 'From Kyoto · 45 min'], ['10:00', 'Todai-ji', 'The Great Buddha'],
           ['13:00', 'Naramachi', 'Lunch in the old town'], ['18:30', 'Back to the hotel', 'Hotel in Kyoto']],
    added: ['11:30', 'Nara Park', 'Match', 'Open till 17:00'],
    pill: 'Nara Park',
    placesTitle: 'Places', chips: ['All', 'Tokyo', 'Osaka', 'Nara'],
    places: [['tokyo.webp', 'Shibuya Sky', 'Tokyo · Views', 0], ['osaka.webp', 'Dotonbori', 'Osaka · Street food', 1],
             ['nara.webp', 'Nara Park', 'Nara · The deer', 1]],
    newPlace: ['fuji.webp', 'Chureito Pagoda', 'Fuji · Views', 'New · from TikTok'],
    addTitle: 'Add place', addHelp: 'Paste a link from Instagram, TikTok or Google Maps, or type a place’s name.',
    addPh: 'A link or a place’s name', link: 'tiktok.com/@japan.trips/video/7351…', paste: 'Paste',
    addBtn: 'Add', addBusy: 'Reading the video…', src: 'TikTok video', rating: '★ 4.7', addDone: '✓ Added to the list',
    bookTitle: 'Bookings', secBtn: 'Add from a confirmation',
    books: [['✈', 'Flight to Tokyo', 'Tel Aviv → Narita · Mar 12', 'LY091'], ['▬', 'Shinkansen', 'Tokyo → Kyoto · Mar 14', 'N7-14']],
    newBook: ['⌂', 'Hotel in Kyoto', '3 nights · check-in Mar 15', 'HX72Q'],
    mailHelp: 'Paste the confirmation email or attach a PDF or screenshot, and the booking is added for you.',
    mailLab: 'Confirmation text', mailBtn: 'Read and add', mailBusy: 'Reading the confirmation…',
    tag: 'Plan the trip together', tag2: 'Now it’s your turn',
  },
}[LANG];

// ---------- build the DOM ----------
const $ = (id) => document.getElementById(id);
const N = S.cap.length;
$('cap').innerHTML = S.cap.map((c, i) => `<div class="cap" id="c${i}"><span>${c}</span></div>`).join('');
$('subs').innerHTML = S.sub.map((c, i) => `<div class="sub" id="s${i}"><span>${c}</span></div>`).join('');
$('dots').innerHTML = [1, 2, 3, 4].map((i) => `<i class="dot" id="d${i}"></i>`).join('');

// the app's tab glyphs (App.tsx TABS), in the promo's flat bar
const TAB_D = [
  'M10.7 3.6a2 2 0 0 1 2.6 0l7.3 6.2a1 1 0 0 1-1.3 1.5l-.3-.3V19a2 2 0 0 1-2 2h-2.5a.5.5 0 0 1-.5-.5V16a2 2 0 0 0-4 0v4.5a.5.5 0 0 1-.5.5H7a2 2 0 0 1-2-2v-8l-.3.3a1 1 0 0 1-1.3-1.5Z',
  'M12.6 2.4c.4-.3 1-.2 1.2.3.6 2 1.9 3.3 3.2 4.7 1.6 1.7 3 3.6 3 6.6 0 4.4-3.6 7.5-8 7.5s-8-3.1-8-7.3c0-2.6 1.1-4.5 2.6-6.1.4-.4 1-.2 1.2.3.3 1 .9 1.9 1.7 2.3.2-3.4 1.6-6.3 3.1-8.3Z',
  'M8 2.5a1 1 0 0 1 1 1V5h6V3.5a1 1 0 1 1 2 0V5h1.5A2.5 2.5 0 0 1 21 7.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-11A2.5 2.5 0 0 1 5.5 5H7V3.5a1 1 0 0 1 1-1ZM5 10v8.5c0 .3.2.5.5.5h13c.3 0 .5-.2.5-.5V10ZM7 12h2.5v2.5H7Zm3.75 0h2.5v2.5h-2.5Zm3.75 0H17v2.5h-2.5ZM7 15.5h2.5V18H7Zm3.75 0h2.5V18h-2.5Z',
  'M4 5.5h16A1.5 1.5 0 0 1 21.5 7v2.6a.6.6 0 0 1-.5.6 1.8 1.8 0 0 0 0 3.6.6.6 0 0 1 .5.6V17a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 17v-2.6a.6.6 0 0 1 .5-.6 1.8 1.8 0 0 0 0-3.6.6.6 0 0 1-.5-.6V7A1.5 1.5 0 0 1 4 5.5ZM14.25 7.5h1.5v2h-1.5Zm0 3.5h1.5v2h-1.5Zm0 3.5h1.5v2h-1.5Z',
  'M12 2a7.5 7.5 0 0 1 7.5 7.5c0 5.6-6 11.1-6.8 11.8a1 1 0 0 1-1.4 0C10.5 20.6 4.5 15.1 4.5 9.5A7.5 7.5 0 0 1 12 2Zm0 4.6a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Z',
];
S.tabs.forEach((n, i) => {
  const d = document.createElement('div'); d.className = 'tab'; d.id = 'tab' + i;
  d.innerHTML = `<svg viewBox="0 0 24 24"><path d="${TAB_D[i]}"/></svg>${n}`; $('tabs').appendChild(d);
});
// a screen's large title with search and ☰ at the other end, like the app's top bar
const head = (id, title) => { $(id).innerHTML = `<span class="title">${title}</span>` +
  `<span class="hb"><svg viewBox="0 0 24 24"><path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM21 21l-5.2-5.2"/></svg></span>` +
  `<span class="hb" id="${id}m"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span>`; };
head('hDisc', S.disc); head('hPlan', S.planTitle); head('hPlaces', S.placesTitle); head('hBook', S.bookTitle);
const HEART_D = 'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 4 4.5 7.2 4.5c1.9 0 3.4 1 4.8 2.8 1.4-1.8 2.9-2.8 4.8-2.8 3.2 0 5.6 3.2 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z';
const COLORS = ['#bc002d', '#1f1a17', '#8e6c4a'];

// discover: three cards, the top one last in the DOM
$('deck').innerHTML = S.cards.map((c, i) => `<div class="card" id="card${i}"><div class="hero"><img src="${c[0]}"><div class="shade"></div>
  <span class="stamp like" id="sl${i}">${S.like}</span><span class="stamp nope" id="sn${i}">${S.nope}</span>
  <div class="ctitle">${i === 2 ? `<span class="liked"><svg viewBox="0 0 24 24"><path d="${HEART_D}" fill="#bc002d"/></svg>${S.liked}</span>` : ''}
  <h2>${c[1]}</h2><div class="cmeta">${c[2]}</div></div></div>
  <div class="cinfo"><div class="tags">${c[3].map((x) => `<span class="tg">${x}</span>`).join('')}</div>
  <div class="fact"><b>${c[4]}</b>${c[5]}</div></div></div>`).reverse().join('');
$('votes').innerHTML = `<span class="vote" id="vNope"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="#ff453a" stroke-width="3" stroke-linecap="round"/></svg></span>` +
  `<span class="vote like" id="vLike"><svg viewBox="0 0 24 24"><path d="${HEART_D}" fill="#fff"/></svg></span>`;
$('match').innerHTML = `<div class="mbox" id="mbox"><img src="nara.webp"><h3>${S.match}</h3><p>${S.matchTxt}</p>
  <div class="mavs">${S.names.map((n, i) => `<div class="av" style="background:${COLORS[i]}">${n}</div>`).join('')}</div>
  <div class="mnext">${S.matchNext}</div></div>`;

// plan
$('planCity').textContent = S.planCity;
const rowHTML = (r, id, end) => `<div class="row" id="${id}"><span class="time">${r[0]}</span><span class="what">${r[1]}<span class="sub2">${r[2]}</span></span>${end || '<span class="chk"></span>'}</div>`;
const HOUSE = '<span class="ric"><svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4Z" fill="#fff"/></svg></span>';
$('planRows').innerHTML = rowHTML(S.plan[0], 'p0') + rowHTML(S.plan[1], 'p1') +
  `<div class="row new" id="pNew"><span class="time">${S.added[0]}</span><span class="what">${S.added[1]}<span class="sub2"><span class="badge red">♥ ${S.added[2]}</span> <span class="badge" id="hours">${S.added[3]}</span></span></span>` +
  `<svg class="heart" viewBox="0 0 24 24"><path d="${HEART_D}" fill="#bc002d"/></svg></div>` +
  rowHTML(S.plan[2], 'p2') + rowHTML(S.plan[3], 'p3', HOUSE);
$('pill').innerHTML = `<svg viewBox="0 0 24 24"><path d="${HEART_D}" fill="#ff5a7a"/></svg>${S.pill}`;

// places
$('chips').innerHTML = S.chips.map((c, i) => `<span class="chip${i ? '' : ' on'}">${c}</span>`).join('');
const HEART = (on) => `<svg class="heart" viewBox="0 0 24 24"><path d="${HEART_D}" fill="${on ? '#bc002d' : 'none'}" stroke="#bc002d" stroke-width="1.8"/></svg>`;
const placeRow = (p, id, extra) => `<div class="row${extra ? ' new' : ''}" id="${id}"><span class="thumb"><img src="${p[0]}"></span><span class="what">${p[1]}<span class="sub2">${p[2]}</span>${extra || ''}</span>${HEART(p[3] === 1)}</div>`;
$('placeRows').innerHTML = placeRow(S.newPlace, 'plNew', `<span class="badge red">${S.newPlace[3]}</span>`) +
  S.places.map((p, i) => placeRow(p, 'pl' + i)).join('');
$('addSheet').innerHTML = `<div class="grab"></div><h4>${S.addTitle}</h4><p class="help">${S.addHelp}</p>
  <div class="field" id="addField" style="margin-top:96px"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
  <span class="ph" id="addPh">${S.addPh}</span><bdi class="val" dir="ltr" id="addVal">${S.link}</bdi>
  <div class="callout" id="paste">${S.paste}</div></div>
  <div class="btn" id="addBtn"><span id="addBtnA">${S.addBtn}</span><span id="addBtnB">${S.addBusy}</span></div>
  <div class="found" id="found"><div class="row"><span class="thumb"><img src="fuji.webp"></span><span class="what">${S.newPlace[1]}<span class="sub2">${S.newPlace[2]} · <bdi dir="ltr">${S.rating}</bdi></span>
  <span class="srcb">♪ ${S.src}</span></span></div></div><div class="added" id="added">${S.addDone}</div>`;

// bookings
const MAIL = '<svg viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
$('secBtn').innerHTML = MAIL + `<span>${S.secBtn}</span>`;
const bkHTML = (b, id, cls) => `<div class="bk${cls || ''}" id="${id}"><span class="ic"><span style="color:#fff;font-size:46px;font-weight:800">${b[0]}</span></span><span><div class="t">${b[1]}</div><div class="s">${b[2]}</div></span><span class="code">${b[3]}</span></div>`;
$('bookRows').innerHTML = bkHTML(S.books[0], 'bk0') + bkHTML(S.books[1], 'bk1') + bkHTML(S.newBook, 'bkNew', ' new');
$('mailSheet').innerHTML = `<div class="grab"></div><h4>${S.secBtn}</h4><p class="help">${S.mailHelp}</p>
  <p class="lab">${S.mailLab}</p><div class="mail"><div class="callout" id="paste2" style="top:70px">${S.paste}</div><div class="mv" id="mailVal">
  <b>Booking confirmed ✓</b><br>Hotel Gion Kyoto<br>Check-in Mar 15, 15:00 · 3 nights<br>Confirmation: HX72Q</div></div>
  <div class="btn" id="mailBtn"><span id="mailBtnA">${S.mailBtn}</span><span id="mailBtnB">${S.mailBusy}</span></div>`;

// ---------- motion helpers ----------
const clamp = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const inCubic = (x) => x * x * x;
const inOut = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const outBack = (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const inOutWin = (t, a, b, c, d) => Math.min(seg(t, a, b), 1 - seg(t, c, d));   // fade in a→b, out c→d
const press = (t, a) => 1 - 0.1 * Math.sin(Math.PI * seg(t, a, a + 0.25));       // a button dips when tapped
const DIR = HE ? -1 : 1;    // screens slide toward the reading direction
const C = 2 * Math.PI * 38;
function draw(el, p) {
  el.setAttribute('stroke-dasharray', C); el.setAttribute('stroke-dashoffset', C * (1 - p));
  el.style.opacity = p > 0 ? 1 : 0;
}
// the ☰ menu step that stood at 22.75–27.0 s was cut: from the cut on, the timeline jumps 4.25 s ahead, so the
// bookings step follows the TikTok step with the same slide (every time below is on the original timeline)
const CUT = 22.75, GAP = 4.25;
const t = T < CUT ? T : T + GAP;

// ---------- captions, sub-lines and the step dots ----------
const CAPS = [[0.1, 0.5, 2.3, 2.6], [2.8, 3.2, 9.0, 9.3], [9.45, 9.85, 15.45, 15.75], [15.9, 16.3, 22.4, 22.7],
              [27.2, 27.6, 31.15, 31.45]];
CAPS.forEach((w, i) => {
  const v = inOutWin(t, ...w); const el = $('c' + i);
  el.style.opacity = v; el.style.transform = `translateY(${(1 - outCubic(seg(t, w[0], w[1]))) * 40}px)`;
  const sw = [w[0] + 0.25, w[1] + 0.25, w[2], w[3]];
  const sv = inOutWin(t, ...sw); const se = $('s' + i);
  se.style.opacity = sv; se.style.transform = `translateY(${(1 - outCubic(seg(t, sw[0], sw[1]))) * 30}px)`;
});
const step = CAPS.reduce((k, w, i) => (i > 0 && t >= w[0] - 0.15 ? i : k), 0);
for (let i = 1; i <= 4; i++) $('d' + i).classList.toggle('on', i === step);
$('dots').style.opacity = inOutWin(t, 2.8, 3.2, 31.15, 31.45);

// ---------- opening: two rings draw, one steps up, then they make way for the phone ----------
const bigOut = seg(t, 2.1, 2.6);
draw($('br1'), inOut(seg(t, 0.25, 0.85))); draw($('br2'), inOut(seg(t, 0.45, 1.05)));
const hop = outBack(seg(t, 1.25, 1.7), 2);
const crouch = Math.sin(Math.PI * seg(t, 1.08, 1.27)) * (t < 1.27 ? 1 : 0);
$('br2').setAttribute('transform', `translate(56 ${-28 * hop + 5 * crouch}) scale(${1 + .08 * crouch} ${1 - .1 * crouch}) translate(-56 0)`);
$('bigrings').setAttribute('transform', `translate(540 ${1000 - 300 * inOut(bigOut)}) scale(${3.2 * (1 - 0.5 * inOut(bigOut))})`);
$('bigrings').style.opacity = 1 - seg(t, 2.3, 2.6);

// ---------- the phone ----------
const phIn = outCubic(seg(t, 2.35, 3.05)), phOut = inOut(seg(t, 31.35, 32.0));
$('phone').style.opacity = t < 2.35 || t > 32 ? 0 : 1;
$('phone').style.transform = `translateY(${(1 - phIn) * 1500 + phOut * 1600}px)`;

// screens slide along: discover → plan → places → bookings
const VIEWS = ['vDisc', 'vPlan', 'vPlaces', 'vBook'], TT = [0, 9.3, 15.8, 27.0];
const sl = TT.map((a) => inOut(seg(t, a, a + 0.5)));
VIEWS.forEach((v, k) => {
  const p = (k > 0 ? 1 - sl[k] : 0) - (k < 3 ? sl[k + 1] : 0);
  $(v).style.transform = `translateX(${p * 820 * DIR}px)`;
  $(v).style.visibility = Math.abs(p) >= 1 ? 'hidden' : 'visible';
});
const scr = t < 9.45 ? 0 : t < 15.95 ? 1 : t < 27.15 ? 2 : 3;
const activeTab = [1, 2, 4, 3][scr];
for (let i = 0; i < 5; i++) $('tab' + i).classList.toggle('on', i === activeTab);

// a finger tap: a soft circle where the tap lands
const screenBox = $('screen').getBoundingClientRect();
const TAPS = [[4.35, 'vLike'], [5.85, 'vNope'], [16.9, 'fab'], [18.55, 'paste'], [19.2, 'addBtn'],
              [27.9, 'secBtn'], [28.75, 'paste2'], [29.35, 'mailBtn']];
const tap = TAPS.find(([a]) => t >= a && t < a + 0.45);
if (tap) {
  const r = $(tap[1]).getBoundingClientRect(), p = seg(t, tap[0], tap[0] + 0.45);
  $('tap').style.left = (r.left + r.width / 2 - screenBox.left) + 'px'; $('tap').style.top = (r.top + r.height / 2 - screenBox.top) + 'px';
  $('tap').style.opacity = 0.9 * (1 - p); $('tap').style.transform = `scale(${0.45 + 0.75 * outCubic(p)})`;
}

// ---------- step 1: swipe right (like), left (skip), right again → match ----------
function swipe(i, a, sign) {   // drag a→a+.55, fly off a+.55→a+.9
  const drag = inOut(seg(t, a, a + 0.55)), fly = inCubic(seg(t, a + 0.55, a + 0.9));
  const dx = sign * (190 * drag + 900 * fly);
  const el = $('card' + i);
  el.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
  el.style.opacity = 1 - seg(t, a + 0.75, a + 0.9);
  const st = clamp(Math.abs(dx) / 120);
  $(sign > 0 ? 'sl' + i : 'sn' + i).style.opacity = st;
  return t >= a + 0.9;
}
const goneA = swipe(0, 3.9, 1), goneB = swipe(1, 5.4, -1); swipe(2, 6.95, 1);
const upB = outCubic(seg(t, 4.45, 4.8)), upC = outCubic(seg(t, 5.95, 6.3));
const under = (lvl) => `translateY(${lvl * 20}px) scale(${1 - lvl * 0.05})`;
if (t < 5.4) $('card1').style.transform = under(1 - upB);
if (t < 6.95) $('card2').style.transform = under(2 - upB - upC);
$('vLike').style.transform = `scale(${press(t, 4.35) * press(t, 6.9)})`;
$('vNope').style.transform = `scale(${press(t, 5.85)})`;
const mt = inOutWin(t, 7.85, 8.15, 9.0, 9.3);
$('match').style.opacity = mt;
$('mbox').style.transform = `scale(${0.7 + 0.3 * outBack(seg(t, 7.85, 8.3), 2)})`;

// ---------- step 2: the match flies into day 4, the rows make room ----------
const pNew = $('pNew');
const gap = pNew.offsetHeight + 16;
const room = inOut(seg(t, 11.0, 11.5));
['p2', 'p3'].forEach((id) => $(id).style.transform = `translateY(${-gap * (1 - room)}px)`);
const ni = outCubic(seg(t, 11.35, 11.8));
pNew.style.opacity = ni; pNew.style.transform = `scale(${0.92 + 0.08 * ni})`;
pNew.style.boxShadow = `0 0 0 ${5 * (1 - seg(t, 14.3, 15.2))}px #bc002d`;
const hr = outBack(seg(t, 12.3, 12.65), 2.4);
$('hours').style.transform = `scale(${t < 12.3 ? 1 : 0.8 + 0.2 * hr})`;
$('hours').style.boxShadow = `0 0 0 ${4 * inOutWin(t, 12.3, 12.5, 13.6, 14.0)}px #30d158`;
$('p3').style.boxShadow = `0 0 0 ${5 * inOutWin(t, 13.2, 13.45, 14.6, 15.0)}px #bc002d`;
// the pill drops from the top, then lands where the new row opens
const pr = pNew.getBoundingClientRect();
const landY = pr.top + pr.height / 2 - screenBox.top;
const pd = outBack(seg(t, 10.3, 10.75), 1.4), pm = inOut(seg(t, 10.85, 11.4));
const pillY = -80 + 300 * pd + (landY - 220 - 30) * pm;
$('pill').style.opacity = Math.min(seg(t, 10.3, 10.45), 1 - seg(t, 11.3, 11.5));
$('pill').style.transform = `translate(-50%, ${pillY}px) scale(${1 - 0.15 * pm})`;

// ---------- step 3: + → paste a TikTok link → the place joins the list with its photo ----------
$('fab').style.transform = `translateX(${(1 - sl[2] - sl[3]) * 820 * DIR}px) scale(${press(t, 16.9)})`;
$('fab').style.visibility = t < 15.8 || t > 27.5 ? 'hidden' : 'visible';
const sh = inOut(seg(t, 17.1, 17.6)) - inOut(seg(t, 21.2, 21.65));
$('addSheet').style.transform = `translateY(${(1 - sh) * 120}%)`;
$('addBack').style.opacity = sh;
const pasteV = inOutWin(t, 18.0, 18.2, 18.6, 18.75);
$('paste').style.opacity = pasteV; $('paste').style.transform = `translateX(-50%) scale(${0.85 + 0.15 * outBack(seg(t, 18.0, 18.25))})`;
const pasted = t >= 18.65;
$('addPh').style.display = pasted ? 'none' : 'inline'; $('addVal').style.display = pasted ? 'inline' : 'none';
$('addField').style.boxShadow = `0 0 0 ${4 * inOutWin(t, 18.65, 18.8, 19.0, 19.3)}px #bc002d`;
const busy = t >= 19.35 && t < 20.25;
$('addBtn').style.transform = `scale(${press(t, 19.2)})`;
$('addBtnA').style.opacity = busy ? 0 : 1; $('addBtnB').style.opacity = busy ? 1 : 0;
if (busy) $('addBtn').style.background = '#d4667e';
const fo = outCubic(seg(t, 20.25, 20.65));
$('found').style.opacity = fo; $('found').style.transform = `translateY(${(1 - fo) * 30}px)`;
$('added').style.opacity = outCubic(seg(t, 20.6, 20.9));
const plNew = $('plNew'), pgap = plNew.offsetHeight + 16;
const proom = inOut(seg(t, 21.5, 21.95));
[0, 1, 2].forEach((i) => $('pl' + i).style.transform = `translateY(${-pgap * (1 - proom)}px)`);
const pni = outCubic(seg(t, 21.8, 22.25));
plNew.style.opacity = pni; plNew.style.transform = `scale(${0.92 + 0.08 * pni})`;
plNew.style.boxShadow = `0 0 0 ${5 * (1 - seg(t, 27.5, 27.6))}px #bc002d`;

// ---------- step 4: a confirmation email pasted → the hotel joins the bookings ----------
$('secBtn').style.transform = `scale(${press(t, 27.9)})`;
const ms = inOut(seg(t, 28.05, 28.5)) - inOut(seg(t, 30.0, 30.45));
$('mailSheet').style.transform = `translateY(${(1 - ms) * 120}%)`;
$('mailBack').style.opacity = ms;
const p2 = inOutWin(t, 28.55, 28.7, 28.85, 29.0);
$('paste2').style.opacity = p2; $('paste2').style.transform = `translateX(-50%) scale(${0.85 + 0.15 * outBack(seg(t, 28.55, 28.75))})`;
$('mailVal').style.opacity = outCubic(seg(t, 28.9, 29.1));
const mb = t >= 29.5 && t < 30.05;
$('mailBtn').style.transform = `scale(${press(t, 29.35)})`;
$('mailBtnA').style.opacity = mb ? 0 : 1; $('mailBtnB').style.opacity = mb ? 1 : 0;
if (mb) $('mailBtn').style.background = '#d4667e';
const bn = outCubic(seg(t, 30.35, 30.8));
$('bkNew').style.opacity = bn; $('bkNew').style.transform = `translateY(${(1 - bn) * 120}px)`;
$('bkNew').style.boxShadow = `0 0 0 ${5 * bn}px #bc002d`;

// ---------- end card: the logo (the promo's, 11 s later) ----------
const E = 11;
draw($('r1'), inOut(seg(t, 20.9 + E, 21.5 + E))); draw($('r2'), inOut(seg(t, 21.1 + E, 21.7 + E)));
const lh = outBack(seg(t, 21.95 + E, 22.4 + E), 1.9);
const lc = Math.sin(Math.PI * seg(t, 21.75 + E, 21.95 + E)) * (t < 21.95 + E ? 1 : 0);
$('r2').setAttribute('transform', `translate(326 ${142 - 28 * lh + 4 * lc}) scale(${1 + .08 * lc} ${1 - .1 * lc}) translate(-326 -142) rotate(90 326 142)`);
$('r1').setAttribute('transform', 'rotate(90 214 142)');
const rise = inOut(seg(t, 22.45 + E, 23.1 + E));
$('sym').setAttribute('transform', `translate(0 ${93.75 * (1 - rise)})`);
['t', 'o1', 'o2', 'g', 'o3'].forEach((id, i) => {
  const p = outCubic(seg(t, 22.75 + E + i * 0.08, 23.25 + E + i * 0.08));
  const el = $(id); let y = 40 * (1 - p);
  if (id === 'o2') y -= 14 * outBack(seg(t, 23.45 + E, 23.85 + E), 2.2);
  el.setAttribute('transform', `translate(0 ${y})`); el.style.opacity = p;
});
$('tag').textContent = S.tag; $('tag2').textContent = S.tag2;
const tg = outCubic(seg(t, 23.6 + E, 24.1 + E)), tg2 = outCubic(seg(t, 23.9 + E, 24.4 + E));
$('tag').style.opacity = tg; $('tag').style.transform = `translateY(${(1 - tg) * 30}px)`;
$('tag2').style.opacity = tg2; $('tag2').style.transform = `translateY(${(1 - tg2) * 30}px)`;
</script></body></html>"""

open(os.path.join(HERE, "guide.html"), "w").write(HTML.replace("LETTERS", LETTERS))
print("wrote guide.html")
