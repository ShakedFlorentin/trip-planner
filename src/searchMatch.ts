// How the trip search compares text: shared by the Search sheet and its test (scripts/search-test.mjs).

// lower-case, drop Hebrew niqqud and geresh ("ג׳" and "ג'" and "ג" find each other), and fold katakana into hiragana
// so "らーめん" finds "ラーメン"
export const norm = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[֑-ׇ'׳"״`]/g, '') // he-only
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

/** Latin letters, digits and punctuation only (up to Latin Extended-B): no Hebrew, kana or kanji. */
const isLatin = (term: string) => !/[^\u0000-ɏ\s]/.test(term)

/**
 * A matcher for one search term. A Latin term matches at the start of a word ("one" shouldn't find Hakone or
 * Sonezaki); anything else matches anywhere, since a Hebrew word can carry a prefix letter (בטוקיו, הטיסה) and
 * Japanese has no spaces between words.
 */
export function makeHas(rawTerm: string) {
  const term = norm(rawTerm.trim())
  const wordStart = new RegExp('(^|[^\\p{L}\\p{N}])' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u')
  const latin = isLatin(term)
  return (...fields: (string | null | undefined)[]) => fields.some((f) => (latin ? wordStart.test(norm(f)) : norm(f).includes(term)))
}
