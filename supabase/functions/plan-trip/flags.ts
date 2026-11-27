// What a card's checked facts say about a place, for the planner: can it be the day's dinner, is it out in the open.
// Pure code (no I/O). A flag is set only when the card says so; when it can't be known it stays off (a wrong flag
// takes an aquarium off a day for being "a park", or calls forty-five minutes in an alley a dinner).

export type CardFacts = {
  category: string
  name: string
  /** the card's checked best time of day; null for a card never checked */
  best: string | null
  /** the card's checked visit length in minutes; null when it has none */
  visitMins: number | null
  /** opening and closing, minutes after midnight; null when the card has none */
  opens: number | null
  closes: number | null
  /** the card's own short lines (plan line, in each language) */
  notes: (string | null | undefined)[]
}

// the card itself calls the place an izakaya or a yakitori place. "Yokocho" (an alley) alone says nothing: some
// alleys are for a drink, some for a snack standing up
const SERVES = /izakaya|yakitori|居酒屋|焼き鳥|איזקאיה|יאקיטורי/i
const DINNER_MINS = 60

/**
 * A nightlife card that can be the day's dinner: the card says izakaya or yakitori (its name or its plan line), asks
 * for the evening or the night, and its visit is at least an hour. An afternoon alley, a 45-minute stop or a bar is
 * not a meal. A restaurant (category food) is a meal by its category, not by this flag.
 */
export function servesDinner(c: CardFacts) {
  if (c.category !== 'nightlife') return false
  if (c.best !== 'evening' && c.best !== 'night') return false
  if (c.visitMins == null || c.visitMins < DINNER_MINS) return false
  return SERVES.test([c.name, ...c.notes].filter(Boolean).join(' '))
}

// the card itself calls the place a walk in the open: a path, a trail, a promenade, a garden or a park (its name or its
// plan line). Read only for a sight with no hours at all, so "Sea Life Park" (an aquarium that closes at 17:00) and a
// "Floating Garden" deck open till late are never asked. "walk-ins" and "parking" are not walks
const WALK =
  /\b(?:path|trail|walk(?!-?ins?\b)(?:s|ing)?|stroll|hik(?:e|ing)|promenade|garden|park|grove|forest)\b|-michi\b|散歩|遊歩道|の道|庭園|公園|שביל|הליכה|טיילת|פארק|חורשה/i

/**
 * A sight that has to be seen in daylight. The cards have no "out in the open" fact, and a name alone does not say it
 * (a "Sea Life Park" is an aquarium, a "Floating Garden" an observatory deck open till late), so only this much is
 * known: a sight with no opening hours at all (nothing to close: open ground) whose card asks for the daytime, or
 * whose card names no time of day ("any") and calls the place a walk, a path, a garden or a park. A place with a
 * closing hour is already held to it; a card that asks for the evening or the night is left alone, and so is a card
 * never checked, or one with no hours and no hour of the day that says nothing of a walk (a crossing, a neon street).
 */
export function daylightOnly(c: CardFacts) {
  if (c.category !== 'sight') return false
  if (c.opens != null || c.closes != null) return false
  if (c.best === 'morning' || c.best === 'midday' || c.best === 'afternoon') return true
  return c.best === 'any' && WALK.test([c.name, ...c.notes].filter(Boolean).join(' '))
}
