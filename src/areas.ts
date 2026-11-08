// A few clean neighbourhoods per city (47): the places used to come with 111 different area spellings for 135 places
// ("Namba / Sennichimae", "Shinsaibashi/Dotonbori", "Dotonbori (small alley one block off the main strip)"…). Each
// place belongs to one of these; the heading shows the Hebrew name with the English small beside it (English only, in
// English). The exact address stays on the place card.
//
// The key is what places.area keeps; `match` lists the words an area written any other way is recognised by, so a
// place added later (by a link, by hand, by "אחרת…") still lands under the right heading.

export type Area = { key: string; he: string; en: string; match: string[] }

export const AREAS: Record<string, Area[]> = {
  'טוקיו': [ // he-only
    { key: 'Shinjuku', he: 'שינג׳וקו', en: 'Shinjuku', match: ['shinjuku', 'yoyogi', 'yotsuya'] }, // he-only
    { key: 'Shibuya & Ebisu', he: 'שיבויה ואביסו', en: 'Shibuya & Ebisu', match: ['shibuya', 'harajuku', 'omotesando', 'daikanyama', 'ebisu', 'nakameguro', 'meguro'] }, // he-only
    { key: 'West Tokyo', he: 'מערב טוקיו', en: 'West Tokyo', match: ['shimokitazawa', 'koenji', 'nakano', 'setagaya', 'kichijoji', 'sangenjaya'] }, // he-only
    { key: 'Ginza & Tokyo Station', he: 'גינזה ותחנת טוקיו', en: 'Ginza & Tokyo Station', match: ['ginza', 'tokyo station', 'marunouchi', 'nihonbashi', 'tsukiji', 'shinbashi', 'shimbashi', 'yurakucho', 'nagatacho', 'chiyoda', 'chuo'] }, // he-only
    { key: 'Roppongi & Azabu', he: 'רופונגי ואזבו', en: 'Roppongi & Azabu', match: ['roppongi', 'azabu', 'akasaka', 'minato'] }, // he-only
    { key: 'Asakusa & Ueno', he: 'אסאקוסה ואואנו', en: 'Asakusa & Ueno', match: ['asakusa', 'ueno', 'oshiage', 'skytree', 'yanaka', 'nezu', 'yushima', 'akihabara', 'bunkyo', 'taito', 'kuramae'] }, // he-only
    { key: 'Tokyo Bay', he: 'מפרץ טוקיו', en: 'Tokyo Bay', match: ['odaiba', 'toyosu', 'kasai', 'koto', 'ariake'] }, // he-only
    { key: 'Outer Tokyo', he: 'מחוץ למרכז', en: 'Outer Tokyo', match: ['itabashi', 'katsushika', 'tateishi', 'oyama', 'various'] }, // he-only
  ],
  'אוסקה': [ // he-only
    { key: 'Minami', he: 'מינאמי', en: 'Minami (Namba)', match: ['namba', 'dotonbori', 'shinsaibashi', 'minami', 'nipponbashi', 'sennichimae', 'amerikamura'] }, // he-only
    { key: 'Kita', he: 'קיטה', en: 'Kita (Umeda)', match: ['umeda', 'kita', 'tenma', 'fukushima', 'kitahama', 'nakazakicho', 'nakatsu'] }, // he-only
    { key: 'Shinsekai & Abeno', he: 'שינסקאי ואבנו', en: 'Shinsekai & Abeno', match: ['shinsekai', 'abeno', 'tennoji', 'tsuruhashi', 'ikuno'] }, // he-only
    { key: 'Osaka Bay', he: 'מפרץ אוסקה', en: 'Osaka Bay', match: ['osaka bay', 'tempozan', 'minato-ku', 'universal', 'usj'] }, // he-only
  ],
  'קיוטו': [ // he-only
    { key: 'Gion & Higashiyama', he: 'גיון והיגשיאמה', en: 'Gion & Higashiyama', match: ['gion', 'higashiyama', 'kiyomizu', 'sannenzaka', 'ninenzaka', 'shirakawa', 'chion'] }, // he-only
    { key: 'Downtown Kyoto', he: 'מרכז העיר', en: 'Downtown Kyoto', match: ['kawaramachi', 'karasuma', 'nakagyo', 'nishiki', 'pontocho', 'teramachi', 'shijo', 'sanjo', 'nijo', 'shimogyo', 'ebisucho'] }, // he-only
    { key: 'North & East Kyoto', he: 'צפון ומזרח קיוטו', en: 'North & East Kyoto', match: ['sakyo', 'okazaki', 'nanzen', 'shimogamo', 'ginkaku', 'philosopher', 'kitayama'] }, // he-only
    { key: 'Kyoto Station & South', he: 'תחנת קיוטו והדרום', en: 'Kyoto Station & South', match: ['umekoji', 'fushimi', 'kyoto station', 'inari', 'tofuku'] }, // he-only
    { key: 'Arashiyama', he: 'ארשיאמה', en: 'Arashiyama', match: ['arashiyama', 'sagano', 'saga'] }, // he-only
    { key: 'Uji', he: 'אוג׳י', en: 'Uji', match: ['uji'] }, // he-only
  ],
  'נארה': [ // he-only
    { key: 'Nara Park & Naramachi', he: 'פארק נארה ונאראמאצ׳י', en: 'Nara Park & Naramachi', match: ['nara'] }, // he-only
  ],
  'טיול יום': [ // he-only
    { key: 'Hakone & Fuji', he: 'הקונה ופוג׳י', en: 'Hakone & Fuji', match: ['hakone', 'gotemba', 'fuji', 'kawaguchiko'] }, // he-only
    { key: 'Kobe & Arima', he: 'קובה וארימה', en: 'Kobe & Arima', match: ['kobe', 'arima'] }, // he-only
    { key: 'Himeji', he: 'הימג׳י', en: 'Himeji', match: ['himeji'] }, // he-only
    { key: 'Uji', he: 'אוג׳י', en: 'Uji', match: ['uji'] }, // he-only
    { key: 'Amanohashidate', he: 'אמאנוהאשידטה', en: 'Amanohashidate (Miyazu)', match: ['miyazu', 'amanohashidate'] }, // he-only
    { key: 'Kyushu', he: 'קיושו', en: 'Kyushu', match: ['fukuoka', 'kurume', 'kyushu'] }, // he-only
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
