// Who a trip is planned for. A party is the people who sleep and plan together: a couple (members.couple). A trip
// where nobody has a couple (every trip the app creates: create_trip and join set none) is ONE party of all its
// members, so it is planned like a trip of a single couple. Pure code, tested by scripts/plan-parties-test.mjs.

/**
 * The name of the single party of a trip with no couples. Used inside the planner only (the days' people, a place's
 * couples): it is never written to a row and never sent to the app as a couple's name.
 */
export const ONE = '*'

export type MemberLite = { couple: string | null; user_id: string }
export type Vote = { candidate_id: string; couples: string[] | null; voted: string[] | null; yes: string[] | null }

/**
 * The trip's parties. one: no member has a couple, the trip is a single party (ONE).
 * A mixed trip (some members with a couple, some with none) is planned for the named couples only: a member with no
 * couple is not a party of their own, because nothing says where they sleep or what they like (plan_place_couples
 * counts votes by couple, trip_stays and day_info name a couple). partyless says how many members that leaves out.
 */
export function partiesOf(members: MemberLite[]) {
  const named = [...new Set(members.map((m) => m.couple).filter((c): c is string => !!c))].sort()
  const one = !named.length
  return { parties: one ? [ONE] : named, one, partyless: one ? 0 : members.filter((m) => !m.couple).length }
}

/** The party a member belongs to (null: a member with no couple in a trip that has couples). */
export const partyOf = (m: MemberLite, one: boolean) => (one ? ONE : m.couple || null)

/** Whose a row is (a place, a stay, a booking, a day): in a single-party trip everything is that party's (null = everyone). */
export const ownerOf = (who: string | null | undefined, one: boolean) => (one ? null : who || null)

/**
 * Is a place of the trip to be planned? A place is in `places` only after a swipe and a match, so in a single-party
 * trip every place is liked (plan_place_couples answers with no couples and no votes there). With couples: a yes from
 * someone, and 'waiting' while a couple it is for has not voted.
 */
export function wanted(v: Vote | undefined, one: boolean): 'plan' | 'waiting' | 'skip' {
  if (one) return 'plan'
  if (!v?.yes?.length) return 'skip'
  return (v.couples ?? []).some((x) => !(v.voted ?? []).includes(x)) ? 'waiting' : 'plan'
}

/** How many parties said yes to a place (a single-party trip: one). */
export const yesCount = (v: Vote | undefined, one: boolean) => (one ? 1 : (v?.yes?.length ?? 0))

/** A party's name as the app may see it: the single party of a trip with no couples has none. */
export const shown = (party: string) => (party === ONE ? null : party)
/** The same as a key of a JSON object (hotels and arrivals per party): '' for the party with no name. */
export const shownKey = (party: string) => (party === ONE ? '' : party)
