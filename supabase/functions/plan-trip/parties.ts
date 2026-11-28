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
 * A member with no couple in a trip that has couples (a mixed trip) is one more voice, and goes with the whole group.
 * plan_place_couples (supabase/sql/2026-11-27-lone-members-vote.sql) puts such a voice in a place's `voted` and
 * `yes` as LONE + the member's id. Their yes counts like a couple's: the place is liked (wanted), and liked by more
 * than one (yesCount). Their no, or no vote at all, takes nothing off and holds nothing up. The name is used inside
 * the planner only: it is never a party with days of its own, never written to a row, never sent to the app.
 * (Before that SQL is applied no such name comes, and a mixed trip is planned from its couples' votes only.)
 */
export const LONE = '~'
export const isLone = (voice: string) => voice.startsWith(LONE)

/**
 * The trip's parties. one: no member has a couple, the trip is a single party (ONE).
 * A mixed trip (some members with a couple, some with none) has days for the named couples only: a member with no
 * couple is not a party of their own, because nothing says where they sleep apart from the group (trip_stays and
 * day_info name a couple). What they like counts (LONE above). partyless says how many such members there are.
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
 * someone (a couple, or a member with no couple), and 'waiting' while a couple it is for has not voted.
 */
export function wanted(v: Vote | undefined, one: boolean): 'plan' | 'waiting' | 'skip' {
  if (one) return 'plan'
  if (!v?.yes?.length) return 'skip'
  return (v.couples ?? []).some((x) => !(v.voted ?? []).includes(x)) ? 'waiting' : 'plan'
}

/** How many parties said yes to a place (a single-party trip: one). A member with no couple in a mixed trip counts as one. */
export const yesCount = (v: Vote | undefined, one: boolean) => (one ? 1 : (v?.yes?.length ?? 0))

/**
 * The couples a liked place counts for when the nights are split between cities: [] is everyone. The couples that
 * said yes when they are not all of them; a place only a member with no couple liked is everyone's (they go with
 * the group).
 */
export function likedFor(v: Vote | undefined, parties: string[], one: boolean): string[] {
  if (one) return []
  const named = (v?.yes ?? []).filter((x) => !isLone(x))
  return !named.length || named.length >= parties.length ? [] : named
}

/** A party's name as the app may see it: the single party of a trip with no couples has none. */
export const shown = (party: string) => (party === ONE ? null : party)
/** The same as a key of a JSON object (hotels and arrivals per party): '' for the party with no name. */
export const shownKey = (party: string) => (party === ONE ? '' : party)
