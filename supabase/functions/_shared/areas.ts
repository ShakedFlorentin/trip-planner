// A few clean neighbourhoods per city (47): the places used to come with 111 different area spellings for 135 places
// ("Namba / Sennichimae", "Shinsaibashi/Dotonbori", "Dotonbori (small alley one block off the main strip)"…). Each
// place belongs to one of these; the heading shows the Hebrew name with the English small beside it (English only, in
// English). The exact address stays on the place card.
//
// The key is what places.area keeps; `match` lists the words an area written any other way is recognised by, so a
// place added later (by a link, by hand, by "אחרת…") still lands under the right heading.
//
// One table for the app and the planner: src/areas.ts re-exports it, and plan-trip imports it as ../_shared/areas.ts
// (a deploy of plan-trip must include this file). Plain data and code only: no Deno, no DOM.
//
// lat/lng: the area's main station (the middle a hotel search and the planner measure from); station: its name.
// stay: false for an area that is no good as a base for the nights (outskirts, a day-trip spot); search: what a hotel
// search looks for. pick: the city's default base when there is nothing to go by yet (no liked places).

export type Area = {
  key: string
  he: string
  en: string
  match: string[]
  lat: number
  lng: number
  station: string
  search: string
  stay?: false
  pick?: true
}

export const AREAS: Record<string, Area[]> = {
  'טוקיו': [ // he-only
    { key: 'Shinjuku', he: 'שינג׳וקו', en: 'Shinjuku', match: ['shinjuku', 'yoyogi', 'yotsuya'], lat: 35.6896, lng: 139.7006, station: 'Shinjuku', search: 'Shinjuku, Tokyo', pick: true }, // he-only
    { key: 'Shibuya & Ebisu', he: 'שיבויה ואביסו', en: 'Shibuya & Ebisu', match: ['shibuya', 'harajuku', 'omotesando', 'daikanyama', 'ebisu', 'nakameguro', 'meguro'], lat: 35.658, lng: 139.7016, station: 'Shibuya', search: 'Shibuya, Tokyo' }, // he-only
    { key: 'West Tokyo', he: 'מערב טוקיו', en: 'West Tokyo', match: ['shimokitazawa', 'koenji', 'nakano', 'setagaya', 'kichijoji', 'sangenjaya'], lat: 35.6615, lng: 139.6668, station: 'Shimokitazawa', search: 'Shimokitazawa, Tokyo' }, // he-only
    { key: 'Ginza & Tokyo Station', he: 'גינזה ותחנת טוקיו', en: 'Ginza & Tokyo Station', match: ['ginza', 'tokyo station', 'marunouchi', 'nihonbashi', 'tsukiji', 'shinbashi', 'shimbashi', 'yurakucho', 'nagatacho', 'chiyoda', 'chuo'], lat: 35.6812, lng: 139.7671, station: 'Tokyo Station', search: 'Ginza, Tokyo' }, // he-only
    { key: 'Roppongi & Azabu', he: 'רופונגי ואזבו', en: 'Roppongi & Azabu', match: ['roppongi', 'azabu', 'akasaka', 'minato'], lat: 35.6628, lng: 139.7314, station: 'Roppongi', search: 'Roppongi, Tokyo' }, // he-only
    { key: 'Asakusa & Ueno', he: 'אסאקוסה ואואנו', en: 'Asakusa & Ueno', match: ['asakusa', 'ueno', 'oshiage', 'skytree', 'yanaka', 'nezu', 'yushima', 'akihabara', 'bunkyo', 'taito', 'kuramae'], lat: 35.7138, lng: 139.7773, station: 'Ueno', search: 'Ueno, Tokyo' }, // he-only
    { key: 'Tokyo Bay', he: 'מפרץ טוקיו', en: 'Tokyo Bay', match: ['odaiba', 'toyosu', 'kasai', 'koto', 'ariake'], lat: 35.6258, lng: 139.7714, station: 'Daiba', search: 'Odaiba, Tokyo', stay: false }, // he-only
    { key: 'Outer Tokyo', he: 'מחוץ למרכז', en: 'Outer Tokyo', match: ['itabashi', 'katsushika', 'tateishi', 'oyama', 'various'], lat: 35.7512, lng: 139.7093, station: 'Itabashi', search: 'Tokyo', stay: false }, // he-only
  ],
  'אוסקה': [ // he-only
    { key: 'Minami', he: 'מינאמי', en: 'Minami (Namba)', match: ['namba', 'dotonbori', 'shinsaibashi', 'minami', 'nipponbashi', 'sennichimae', 'amerikamura'], lat: 34.6665, lng: 135.5009, station: 'Namba', search: 'Namba, Osaka', pick: true }, // he-only
    { key: 'Kita', he: 'קיטה', en: 'Kita (Umeda)', match: ['umeda', 'kita', 'tenma', 'fukushima', 'kitahama', 'nakazakicho', 'nakatsu'], lat: 34.7025, lng: 135.4959, station: 'Osaka / Umeda', search: 'Umeda, Osaka' }, // he-only
    { key: 'Shinsekai & Abeno', he: 'שינסקאי ואבנו', en: 'Shinsekai & Abeno', match: ['shinsekai', 'abeno', 'tennoji', 'tsuruhashi', 'ikuno'], lat: 34.6466, lng: 135.5133, station: 'Tennoji', search: 'Tennoji, Osaka' }, // he-only
    { key: 'Osaka Bay', he: 'מפרץ אוסקה', en: 'Osaka Bay', match: ['osaka bay', 'tempozan', 'minato-ku', 'universal', 'usj'], lat: 34.6675, lng: 135.4372, station: 'Universal City', search: 'Universal City, Osaka' }, // he-only
  ],
  'קיוטו': [ // he-only
    { key: 'Gion & Higashiyama', he: 'גיון והיגשיאמה', en: 'Gion & Higashiyama', match: ['gion', 'higashiyama', 'kiyomizu', 'sannenzaka', 'ninenzaka', 'shirakawa', 'chion'], lat: 35.0037, lng: 135.7722, station: 'Gion-Shijo', search: 'Gion, Kyoto' }, // he-only
    { key: 'Downtown Kyoto', he: 'מרכז העיר', en: 'Downtown Kyoto', match: ['kawaramachi', 'karasuma', 'nakagyo', 'nishiki', 'pontocho', 'teramachi', 'shijo', 'sanjo', 'nijo', 'shimogyo', 'ebisucho'], lat: 35.0039, lng: 135.7642, station: 'Shijo / Kawaramachi', search: 'Kawaramachi, Kyoto', pick: true }, // he-only
    { key: 'North & East Kyoto', he: 'צפון ומזרח קיוטו', en: 'North & East Kyoto', match: ['sakyo', 'okazaki', 'nanzen', 'shimogamo', 'ginkaku', 'philosopher', 'kitayama'], lat: 35.0186, lng: 135.7724, station: 'Jingu-Marutamachi', search: 'Okazaki, Kyoto' }, // he-only
    { key: 'Kyoto Station & South', he: 'תחנת קיוטו והדרום', en: 'Kyoto Station & South', match: ['umekoji', 'fushimi', 'kyoto station', 'inari', 'tofuku'], lat: 34.9858, lng: 135.7588, station: 'Kyoto Station', search: 'Kyoto Station, Kyoto' }, // he-only
    { key: 'Arashiyama', he: 'ארשיאמה', en: 'Arashiyama', match: ['arashiyama', 'sagano', 'saga'], lat: 35.0185, lng: 135.6814, station: 'Saga-Arashiyama', search: 'Arashiyama, Kyoto' }, // he-only
    { key: 'Uji', he: 'אוג׳י', en: 'Uji', match: ['uji'], lat: 34.8893, lng: 135.8073, station: 'Uji', search: 'Uji, Kyoto', stay: false }, // he-only
  ],
  'נארה': [ // he-only
    { key: 'Nara Park & Naramachi', he: 'פארק נארה ונאראמאצ׳י', en: 'Nara Park & Naramachi', match: ['nara'], lat: 34.6844, lng: 135.827, station: 'Kintetsu-Nara', search: 'Nara Park, Nara', pick: true }, // he-only
  ],
  'הירושימה': [ // he-only
    { key: 'Downtown Hiroshima', he: 'מרכז העיר', en: 'Downtown Hiroshima', match: ['hondori', 'hatchobori', 'nagarekawa', 'kamiyacho', 'naka-ku', 'downtown'], lat: 34.3937, lng: 132.4590, station: 'Hatchobori', search: 'Hatchobori, Hiroshima', pick: true }, // he-only
    { key: 'Peace Park & Castle', he: 'פארק השלום והטירה', en: 'Peace Park & Castle', match: ['peace', 'heiwa', 'genbaku', 'atomic', 'motomachi', 'castle', 'nakajima'], lat: 34.3955, lng: 132.4536, station: 'Genbaku Dome-mae', search: 'Peace Memorial Park, Hiroshima' }, // he-only
    { key: 'Hiroshima Station', he: 'תחנת הירושימה', en: 'Hiroshima Station', match: ['hiroshima station', 'ekimae', 'matsubara', 'minami-ku', 'higashi-ku'], lat: 34.3972, lng: 132.4753, station: 'Hiroshima', search: 'Hiroshima Station' }, // he-only
    { key: 'Miyajima', he: 'מיאג׳ימה', en: 'Miyajima', match: ['miyajima', 'itsukushima', 'hatsukaichi'], lat: 34.2959, lng: 132.3199, station: 'Miyajima Pier', search: 'Miyajima' }, // he-only
    { key: 'Around Hiroshima', he: 'סביב הירושימה', en: 'Around Hiroshima', match: ['onomichi', 'kure', 'iwakuni', 'takehara', 'okunoshima', 'saijo'], lat: 34.4088, lng: 133.2050, station: 'Onomichi', search: 'Onomichi', stay: false }, // he-only
  ],
  'פוקואוקה': [ // he-only
    { key: 'Tenjin & Daimyo', he: 'טנג׳ין ודאימיו', en: 'Tenjin & Daimyo', match: ['tenjin', 'daimyo', 'akasaka', 'imaizumi', 'yakuin', 'chuo-ku'], lat: 33.5911, lng: 130.3990, station: 'Tenjin', search: 'Tenjin, Fukuoka', pick: true }, // he-only
    { key: 'Hakata', he: 'האקטה', en: 'Hakata', match: ['hakata', 'gion', 'kushida', 'reisen', 'chiyo', 'hakata-ku'], lat: 33.5902, lng: 130.4207, station: 'Hakata', search: 'Hakata, Fukuoka' }, // he-only
    { key: 'Nakasu & Canal City', he: 'נקאסו וקנאל סיטי', en: 'Nakasu & Canal City', match: ['nakasu', 'canal city', 'haruyoshi', 'sumiyoshi', 'kawabata'], lat: 33.5926, lng: 130.4065, station: 'Nakasu-Kawabata', search: 'Nakasu, Fukuoka' }, // he-only
    { key: 'Ohori & Momochi', he: 'אוהורי ומומוצ׳י', en: 'Ohori & Momochi', match: ['ohori', 'ropponmatsu', 'momochi', 'nishijin', 'sawara', 'fukuoka tower', 'maizuru', 'nishi-ku'], lat: 33.5862, lng: 130.3762, station: 'Ohorikoen', search: 'Ohori Park, Fukuoka' }, // he-only
    { key: 'Around Fukuoka', he: 'סביב פוקואוקה', en: 'Around Fukuoka', match: ['dazaifu', 'itoshima', 'yanagawa', 'nokonoshima', 'shikanoshima', 'munakata', 'karatsu'], lat: 33.5194, lng: 130.5350, station: 'Dazaifu', search: 'Dazaifu', stay: false }, // he-only
  ],
  'סאפורו': [ // he-only
    { key: 'Odori & Susukino', he: 'אודורי וסוסוקינו', en: 'Odori & Susukino', match: ['odori', 'susukino', 'tanukikoji', 'nakajima', 'chuo-ku', 'nijo'], lat: 43.0597, lng: 141.3540, station: 'Odori', search: 'Odori, Sapporo', pick: true }, // he-only
    { key: 'Sapporo Station', he: 'תחנת סאפורו', en: 'Sapporo Station', match: ['sapporo station', 'kita-ku', 'kita ', 'hokkaido university', 'jr tower', 'higashi-ku'], lat: 43.0687, lng: 141.3508, station: 'Sapporo', search: 'Sapporo Station' }, // he-only
    { key: 'Maruyama', he: 'מרויאמה', en: 'Maruyama', match: ['maruyama', 'jingu', 'miyanomori', 'okurayama', 'moiwa', 'nishi', 'shiroishi'], lat: 43.0545, lng: 141.3195, station: 'Maruyama-Koen', search: 'Maruyama, Sapporo' }, // he-only
    { key: 'Jozankei', he: 'ג׳וזנקיי', en: 'Jozankei', match: ['jozankei', 'minami-ku', 'hoheikyo', 'kokusai'], lat: 42.9680, lng: 141.1640, station: 'Jozankei Onsen', search: 'Jozankei Onsen' }, // he-only
    { key: 'Around Sapporo', he: 'סביב סאפורו', en: 'Around Sapporo', match: ['otaru', 'yoichi', 'shakotan', 'asari', 'ishikari', 'noboribetsu', 'niseko'], lat: 43.1977, lng: 140.9943, station: 'Otaru', search: 'Otaru', stay: false }, // he-only
  ],
  'קנאזאווה': [ // he-only
    { key: 'Higashi Chaya & Kazuemachi', he: 'היגשי צ׳איה וקזואמצ׳י', en: 'Higashi Chaya & Kazuemachi', match: ['higashi chaya', 'higashiyama', 'kazuemachi', 'utatsuyama', 'asanogawa', 'hashiba'], lat: 36.5723, lng: 136.6670, station: 'Hashiba-cho', search: 'Higashi Chaya, Kanazawa' }, // he-only
    { key: 'Kenrokuen & Korinbo', he: 'קנרוקואן וקורינבו', en: 'Kenrokuen & Korinbo', match: ['kenrokuen', 'kenroku', 'castle', 'korinbo', 'kohrinbo', '21st century', 'hirosaka', 'dewamachi'], lat: 36.5613, lng: 136.6562, station: 'Korinbo', search: 'Korinbo, Kanazawa', pick: true }, // he-only
    { key: 'Station & Omicho', he: 'התחנה ואומיצ׳ו', en: 'Station & Omicho', match: ['omicho', 'kanazawa station', 'musashi', 'hikoso', 'station'], lat: 36.5781, lng: 136.6480, station: 'Kanazawa', search: 'Kanazawa Station' }, // he-only
    { key: 'Nagamachi & Katamachi', he: 'נגמצ׳י וקטמצ׳י', en: 'Nagamachi & Katamachi', match: ['nagamachi', 'katamachi', 'kigura', 'teramachi', 'nishi chaya', 'saigawa', 'tatemachi', 'kakinokibatake'], lat: 36.5623, lng: 136.6497, station: 'Katamachi', search: 'Katamachi, Kanazawa' }, // he-only
    { key: 'Around Kanazawa', he: 'סביב קנאזאווה', en: 'Around Kanazawa', match: ['kaga', 'yamanaka', 'yamashiro', 'awazu', 'noto', 'wajima', 'kanazawa port', 'ono', 'nonoichi', 'hakusan'], lat: 36.3060, lng: 136.3150, station: 'Kagaonsen', search: 'Kaga Onsen', stay: false }, // he-only
  ],
  'נגויה': [ // he-only
    { key: 'Nagoya Station', he: 'תחנת נגויה', en: 'Nagoya Station', match: ['nagoya station', 'meieki', 'meitetsu', 'nakamura', 'noritake', 'nishiki-dori'], lat: 35.1709, lng: 136.8815, station: 'Nagoya', search: 'Nagoya Station', pick: true }, // he-only
    { key: 'Sakae', he: 'סאקאה', en: 'Sakae', match: ['sakae', 'nishiki', 'hisaya', 'oasis 21', 'fushimi', 'naka-ku', 'chikusa'], lat: 35.1700, lng: 136.9085, station: 'Sakae', search: 'Sakae, Nagoya' }, // he-only
    { key: 'Osu & Kamimaezu', he: 'אוסו וקמימאזו', en: 'Osu & Kamimaezu', match: ['osu', 'kamimaezu', 'kanayama', 'tsurumai', 'yabacho', 'yaba-cho', 'shirakabe'], lat: 35.1595, lng: 136.9045, station: 'Kamimaezu', search: 'Osu, Nagoya' }, // he-only
    { key: 'Castle & Higashi', he: 'הטירה והמזרח', en: 'Castle & Higashi', match: ['castle', 'shiyakusho', 'tokugawa', 'kakuozan', 'higashi-ku', 'nagoya dome', 'motoyama', 'higashiyama'], lat: 35.1813, lng: 136.9066, station: 'Shiyakusho', search: 'Nagoya Castle' }, // he-only
    { key: 'Atsuta & Port', he: 'אצוטה והנמל', en: 'Atsuta & Port', match: ['atsuta', 'jingu', 'minato', 'port', 'kinjo', 'legoland', 'scmaglev', 'arimatsu', 'mizuho'], lat: 35.1280, lng: 136.9085, station: 'Jingu-mae', search: 'Atsuta, Nagoya', stay: false }, // he-only
    { key: 'Around Nagoya', he: 'סביב נגויה', en: 'Around Nagoya', match: ['inuyama', 'ghibli', 'nagakute', 'tokoname', 'seto', 'toyota', 'gifu', 'meiji mura', 'okazaki', 'gamagori'], lat: 35.3880, lng: 136.9390, station: 'Inuyama', search: 'Inuyama', stay: false }, // he-only
  ],
  'הקונה': [ // he-only
    { key: 'Hakone-Yumoto & Tonosawa', he: 'הקונה-יומוטו וטונוסאווה', en: 'Hakone-Yumoto & Tonosawa', match: ['yumoto', 'tonosawa', 'tounosawa', 'ohiradai', 'hatajuku', 'yuryo'], lat: 35.2324, lng: 139.1069, station: 'Hakone-Yumoto', search: 'Hakone-Yumoto', pick: true }, // he-only
    { key: 'Miyanoshita & Gora', he: 'מיאנושיטה וגורה', en: 'Miyanoshita & Gora', match: ['miyanoshita', 'gora', 'kowakudani', 'chokoku', 'sokokura', 'kiga', 'dogashima', 'owakudani'], lat: 35.2443, lng: 139.0547, station: 'Gora', search: 'Gora, Hakone' }, // he-only
    { key: 'Sengokuhara', he: 'סנגוקוהרה', en: 'Sengokuhara', match: ['sengokuhara', 'sengoku', 'pola', 'lalique', 'little prince', 'susuki'], lat: 35.2595, lng: 139.0237, station: 'Sengoku', search: 'Sengokuhara, Hakone' }, // he-only
    { key: 'Lake Ashi', he: 'אגם אשי', en: 'Lake Ashi', match: ['ashi', 'ashinoko', 'moto-hakone', 'motohakone', 'hakone-machi', 'hakonemachi', 'togendai', 'hakone shrine', 'checkpoint', 'kojiri', 'komagatake'], lat: 35.2000, lng: 139.0250, station: 'Moto-Hakone', search: 'Moto-Hakone' }, // he-only
    { key: 'Odawara', he: 'אודווארה', en: 'Odawara', match: ['odawara', 'kamaboko', 'kazamatsuri', 'manazuru', 'yugawara'], lat: 35.2564, lng: 139.1551, station: 'Odawara', search: 'Odawara' }, // he-only
  ],
  'ניקו': [ // he-only
    { key: 'Shrines & Town', he: 'המקדשים והעיירה', en: 'Shrines & Town', match: ['toshogu', 'futarasan', 'rinnoji', 'taiyuin', 'shinkyo', 'nishisando', 'tobu nikko', 'jr nikko', 'kanmangafuchi', 'nikko station', 'ishiya'], lat: 36.7468, lng: 139.6142, station: 'Tobu-Nikko', search: 'Nikko', pick: true }, // he-only
    { key: 'Lake Chuzenji & Okunikko', he: 'אגם צ׳וזנג׳י ואוקוניקו', en: 'Lake Chuzenji & Okunikko', match: ['chuzenji', 'chuzenjiko', 'kegon', 'okunikko', 'yumoto', 'senjogahara', 'ryuzu', 'yudaki', 'akechidaira', 'irohazaka', 'italian embassy'], lat: 36.7385, lng: 139.5025, station: 'Chuzenji Onsen', search: 'Lake Chuzenji' }, // he-only
    { key: 'Kinugawa Onsen', he: 'קינוגאווה אונסן', en: 'Kinugawa Onsen', match: ['kinugawa', 'edo wonderland', 'tobu world square', 'ryuokyo', 'kawaji', 'kinu'], lat: 36.8186, lng: 139.7158, station: 'Kinugawa-Onsen', search: 'Kinugawa Onsen' }, // he-only
    { key: 'Around Nikko', he: 'סביב ניקו', en: 'Around Nikko', match: ['kirifuri', 'imaichi', 'ashio', 'kirifurikogen', 'oku-kinu', 'yunishigawa', 'cedar avenue', 'shimo-imaichi'], lat: 36.7240, lng: 139.6840, station: 'Shimo-Imaichi', search: 'Imaichi, Nikko', stay: false }, // he-only
  ],
  'קובה': [ // he-only
    { key: 'Sannomiya & Motomachi', he: 'סאנומיה ומוטומאצ׳י', en: 'Sannomiya & Motomachi', match: ['sannomiya', 'motomachi', 'nankinmachi', 'chinatown', 'tor road', 'kyukyoryuchi', 'former foreign settlement', 'chuo-ku'], lat: 34.6946, lng: 135.1953, station: 'Sannomiya', search: 'Sannomiya, Kobe', pick: true }, // he-only
    { key: 'Kitano', he: 'קיטאנו', en: 'Kitano', match: ['kitano', 'ijinkan', 'nunobiki', 'shin-kobe', 'shinkobe', 'yamamoto-dori'], lat: 34.7005, lng: 135.1905, station: 'Shin-Kobe', search: 'Kitano, Kobe' }, // he-only
    { key: 'Harborland & Meriken', he: 'הארבורלנד ומריקן', en: 'Harborland & Meriken', match: ['harborland', 'harbour', 'meriken', 'port tower', 'umie', 'mosaic', 'kobe port', 'naka-tottei', 'port island'], lat: 34.6795, lng: 135.1840, station: 'Harborland', search: 'Harborland, Kobe' }, // he-only
    { key: 'Arima Onsen', he: 'ארימה אונסן', en: 'Arima Onsen', match: ['arima', 'kinnoyu', 'gin no yu', 'ginnoyu', 'taiko'], lat: 34.7967, lng: 135.2478, station: 'Arima-Onsen', search: 'Arima Onsen' }, // he-only
    { key: 'Nada & Rokko', he: 'נאדה ורוקו', en: 'Nada & Rokko', match: ['nada', 'rokko', 'maya', 'mikage', 'uozaki', 'nishinomiya', 'sumiyoshi', 'okamoto', 'kakogawa', 'suma', 'akashi', 'tarumi', 'maiko'], lat: 34.7140, lng: 135.2610, station: 'Rokko', search: 'Rokko, Kobe', stay: false }, // he-only
  ],
  'טקאיאמה': [ // he-only
    { key: 'Old Town', he: 'העיר העתיקה', en: 'Old Town', match: ['sanmachi', 'san-machi', 'kamisannomachi', 'old town', 'miyagawa', 'jinya', 'morning market', 'higashiyama', 'kami-sannomachi', 'yatai kaikan'], lat: 36.1395, lng: 137.2600, station: 'Takayama', search: 'Sanmachi, Takayama', pick: true }, // he-only
    { key: 'Takayama Station', he: 'תחנת טקאיאמה', en: 'Takayama Station', match: ['takayama station', 'station', 'hanasato', 'shoyo', 'hida no sato', 'hida folk village', 'kokufu'], lat: 36.1410, lng: 137.2510, station: 'Takayama', search: 'Takayama Station' }, // he-only
    { key: 'Shirakawa-go', he: 'שיראקאווה-גו', en: 'Shirakawa-go', match: ['shirakawa', 'shirakawago', 'ogimachi', 'gokayama', 'gassho'], lat: 36.2570, lng: 136.9060, station: 'Shirakawa-go Bus Terminal', search: 'Shirakawa-go' }, // he-only
    { key: 'Hida-Furukawa', he: 'הידה-פורוקאווה', en: 'Hida-Furukawa', match: ['furukawa', 'hida-furukawa', 'hidafurukawa', 'seto river', 'kamioka'], lat: 36.2390, lng: 137.1870, station: 'Hida-Furukawa', search: 'Hida-Furukawa', stay: false }, // he-only
    { key: 'Okuhida', he: 'אוקוהידה', en: 'Okuhida', match: ['okuhida', 'hirayu', 'shinhotaka', 'shin-hotaka', 'fukuchi', 'shin-hirayu', 'tochio', 'kamikochi', 'norikura'], lat: 36.2600, lng: 137.5800, station: 'Hirayu Onsen', search: 'Okuhida Onsen' }, // he-only
  ],
  'אוקינאווה': [ // he-only
    { key: 'Kokusai-dori & Makishi', he: 'קוקוסאי-דורי ומקישי', en: 'Kokusai-dori & Makishi', match: ['kokusai', 'makishi', 'heiwa-dori', 'tsuboya', 'sakurazaka', 'matsuo', 'kumoji', 'kenchomae', 'asahibashi', 'makishi market'], lat: 26.2151, lng: 127.6890, station: 'Makishi', search: 'Kokusai-dori, Naha', pick: true }, // he-only
    { key: 'Shuri', he: 'שורי', en: 'Shuri', match: ['shuri', 'kinjo', 'tamaudun', 'shikinaen', 'gibo', 'akamine'], lat: 26.2170, lng: 127.7190, station: 'Shuri', search: 'Shuri, Naha' }, // he-only
    { key: 'Naha Port & Tomari', he: 'נמל נאהה וטומרי', en: 'Naha Port & Tomari', match: ['tomari', 'naminoue', 'wakasa', 'kume', 'omoromachi', 'shintoshin', 'naha port', 'kume', 'tsuji', 'nishi', 'senaga', 'ashibinaa', 'tomigusuku'], lat: 26.2290, lng: 127.6820, station: 'Miebashi', search: 'Tomari, Naha' }, // he-only
    { key: 'Central Okinawa', he: 'מרכז האי', en: 'Central Okinawa', match: ['chatan', 'american village', 'mihama', 'ginowan', 'okinawa city', 'koza', 'kitanakagusuku', 'nakagusuku', 'yomitan', 'onna', 'urasoe', 'uruma', 'kaichu', 'maeda', 'manzamo', 'zanpa', 'kadena'], lat: 26.3160, lng: 127.7570, station: 'Mihama (Chatan)', search: 'Chatan, Okinawa' }, // he-only
    { key: 'North Okinawa', he: 'צפון האי', en: 'North Okinawa', match: ['motobu', 'churaumi', 'ocean expo', 'nago', 'kouri', 'kourijima', 'sesoko', 'nakijin', 'yanbaru', 'kunigami', 'hentona', 'bise', 'okuma', 'cape hedo', 'minna'], lat: 26.6940, lng: 127.8780, station: 'Kinenkoen-mae', search: 'Motobu, Okinawa' }, // he-only
    { key: 'South Okinawa', he: 'דרום האי', en: 'South Okinawa', match: ['itoman', 'nanjo', 'sefa', 'utaki', 'gyokusendo', 'himeyuri', 'peace memorial', 'mabuni', 'hyakuna', 'ou island', 'ojima', 'yaese', 'chinen', 'kudaka', 'senaga island'], lat: 26.1240, lng: 127.6650, station: 'Itoman', search: 'Itoman, Okinawa', stay: false }, // he-only
  ],
  'טיול יום': [ // he-only
    { key: 'Hakone & Fuji', he: 'הקונה ופוג׳י', en: 'Hakone & Fuji', match: ['hakone', 'gotemba', 'fuji', 'kawaguchiko'], lat: 35.3089, lng: 138.9346, station: 'Gotemba', search: 'Hakone', stay: false }, // he-only
    { key: 'Kobe & Arima', he: 'קובה וארימה', en: 'Kobe & Arima', match: ['kobe', 'arima'], lat: 34.6946, lng: 135.1953, station: 'Sannomiya', search: 'Kobe', stay: false }, // he-only
    { key: 'Himeji', he: 'הימג׳י', en: 'Himeji', match: ['himeji'], lat: 34.8267, lng: 134.6906, station: 'Himeji', search: 'Himeji', stay: false }, // he-only
    { key: 'Uji', he: 'אוג׳י', en: 'Uji', match: ['uji'], lat: 34.8893, lng: 135.8073, station: 'Uji', search: 'Uji, Kyoto', stay: false }, // he-only
    { key: 'Amanohashidate', he: 'אמאנוהאשידטה', en: 'Amanohashidate (Miyazu)', match: ['miyazu', 'amanohashidate'], lat: 35.57, lng: 135.191, station: 'Amanohashidate', search: 'Amanohashidate', stay: false }, // he-only
    { key: 'Kyushu', he: 'קיושו', en: 'Kyushu', match: ['fukuoka', 'kurume', 'kyushu'], lat: 33.5897, lng: 130.4207, station: 'Hakata', search: 'Fukuoka', stay: false }, // he-only
  ],
}
AREAS['טיולי יום'] = AREAS['טיול יום'] // he-only: both spellings are in the data

/** The clean neighbourhood a written area belongs to, or null when none of the city's fits (it keeps its own name). */
export function areaOf(city: string | null | undefined, raw: string | null | undefined): Area | null {
  if (!raw) return null
  const list = AREAS[city ?? ''] ?? []
  const exact = list.find((a) => a.key === raw)
  if (exact) return exact
  const s = raw.toLowerCase()
  // the first word of the written area decides first ("Nishi-Shinbashi, Minato" is Shinbashi, not Minato)
  const head = s.split(/[,(/]/)[0]
  return list.find((a) => a.match.some((m) => head.includes(m))) ?? list.find((a) => a.match.some((m) => s.includes(m))) ?? null
}

/**
 * Where the day trips leave from: a destination (a point and a radius) and the areas of a city whose station has the
 * direct train or bus there. Sleeping in one of them saves the ride across town on the morning of the day trip.
 * id names the line the app shows ("close to the bus to Fuji"). city: the AREAS key (Hebrew name) of the base city.
 */
export type Hub = { id: string; city: string; lat: number; lng: number; km: number; areas: string[] }

export const HUBS: Hub[] = [
  // Busta Shinjuku: highway buses to Kawaguchiko and Gotemba; Odakyu Romancecar to Hakone-Yumoto
  { id: 'fuji', city: 'טוקיו', lat: 35.36, lng: 138.95, km: 45, areas: ['Shinjuku'] }, // he-only
  // Tobu limited express from Asakusa
  { id: 'nikko', city: 'טוקיו', lat: 36.72, lng: 139.698, km: 25, areas: ['Asakusa & Ueno'] }, // he-only
  // JR Yokosuka line from Tokyo Station, Shonan-Shinjuku line from Shinjuku
  { id: 'kamakura', city: 'טוקיו', lat: 35.319, lng: 139.547, km: 15, areas: ['Ginza & Tokyo Station', 'Shinjuku'] }, // he-only
  // Hokuriku Shinkansen from Tokyo and Ueno
  { id: 'karuizawa', city: 'טוקיו', lat: 36.343, lng: 138.635, km: 20, areas: ['Ginza & Tokyo Station', 'Asakusa & Ueno'] }, // he-only
  // Tokyu Toyoko line from Shibuya, JR from Tokyo Station
  { id: 'yokohama', city: 'טוקיו', lat: 35.444, lng: 139.638, km: 12, areas: ['Shibuya & Ebisu', 'Ginza & Tokyo Station'] }, // he-only
  // JR Nara line and Kintetsu from Kyoto Station
  { id: 'nara', city: 'קיוטו', lat: 34.685, lng: 135.805, km: 15, areas: ['Kyoto Station & South'] }, // he-only
  // JR from Kyoto Station, Hankyu from Kawaramachi
  { id: 'osaka', city: 'קיוטו', lat: 34.69, lng: 135.5, km: 15, areas: ['Kyoto Station & South', 'Downtown Kyoto'] }, // he-only
  // Shinkansen and JR special rapid from Kyoto Station
  { id: 'kobe', city: 'קיוטו', lat: 34.76, lng: 134.94, km: 35, areas: ['Kyoto Station & South'] }, // he-only
  // JR Nara line from Kyoto Station, Keihan from Gion-Shijo
  { id: 'uji', city: 'קיוטו', lat: 34.889, lng: 135.807, km: 6, areas: ['Kyoto Station & South', 'Gion & Higashiyama'] }, // he-only
  // limited express Hashidate from Kyoto Station
  { id: 'amanohashidate', city: 'קיוטו', lat: 35.57, lng: 135.191, km: 15, areas: ['Kyoto Station & South'] }, // he-only
  // Kintetsu from Osaka-Namba
  { id: 'nara', city: 'אוסקה', lat: 34.685, lng: 135.805, km: 15, areas: ['Minami'] }, // he-only
  // JR and Hankyu from Osaka / Umeda
  { id: 'kyoto', city: 'אוסקה', lat: 35.003, lng: 135.759, km: 15, areas: ['Kita'] }, // he-only
  { id: 'kobe', city: 'אוסקה', lat: 34.76, lng: 134.94, km: 35, areas: ['Kita'] }, // he-only
  // Nankai from Namba
  { id: 'koyasan', city: 'אוסקה', lat: 34.213, lng: 135.585, km: 20, areas: ['Minami'] }, // he-only
]
