// Which gallery an approved photo ends up in. Pure, so scripts/review-photo-test.mjs can run it.
// 'server' = a photo the card-photos function found on the web: appended to the card's gallery (no duplicate).
// 'member' = a traveller's photo: it always shows in the travellers row, and goes into the card's main gallery only when
// that row's gallery is empty. Library row and each trip copy are decided on their own.
// Returns the new `photos` array, or null for "leave this row unchanged".
export function galleryAfterApproval(source: 'member' | 'server', photos: string[] | null, url: string): string[] | null {
  const have = photos ?? []
  if (source === 'member') return have.length === 0 ? [url] : null
  return [...have.filter((p) => p !== url), url]
}
