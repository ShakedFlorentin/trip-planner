/**
 * The row an upsert of a star rating sends. When your own saved rating has not been read yet, `note` is left out:
 * the database then keeps whatever note is already there, instead of the star tap wiping it.
 */
export function ratingRow<T extends object>(base: T, stars: number, note: string | null, noteKnown: boolean) {
  return noteKnown ? { ...base, stars, note } : { ...base, stars }
}
