// Ranking for the swipe deck and smoothing for star ratings. Plain code over the card's own fields: nothing here
// calls a model or a paid API, so it can run on every view. Pure functions only (no React, no network), which is
// what scripts/rank-test.mjs checks.

/** How many ratings' worth of the category average a place starts with. */
export const RATING_PRIOR_WEIGHT = 5
/** The category average when nobody has rated anything in the category yet. */
export const RATING_PRIOR_DEFAULT = 3.5
/** Cards per batch in the swipe deck. */
// the default batch; the live one is app_settings swipe_batch_size (src/settings.ts), passed in as ctx.size
export const BATCH_SIZE = 20

/** Bayesian mean: (C*m + sum) / (C + n). Three 5-star ratings come out near 4.1, not 5.0. */
export function bayesMean(sum: number, n: number, prior = RATING_PRIOR_DEFAULT, weight = RATING_PRIOR_WEIGHT): number {
  return (weight * prior + sum) / (weight + n)
}

/** The same for a list of star ratings. */
export function smoothedStars(stars: number[], prior = RATING_PRIOR_DEFAULT, weight = RATING_PRIOR_WEIGHT): number {
  return bayesMean(
    stars.reduce((s, x) => s + x, 0),
    stars.length,
    prior,
    weight,
  )
}

/** Mean stars over every rating in each category: `rated` is one entry per rated place. */
export function categoryMeans(rated: { category: string; stars: number[] }[]): Map<string, number> {
  const acc = new Map<string, { sum: number; n: number }>()
  for (const r of rated) {
    const a = acc.get(r.category) ?? { sum: 0, n: 0 }
    for (const s of r.stars) {
      a.sum += s
      a.n++
    }
    acc.set(r.category, a)
  }
  const out = new Map<string, number>()
  for (const [k, a] of acc) if (a.n) out.set(k, a.sum / a.n)
  return out
}

/** The fields of a card the ranking reads. */
export type RankCard = {
  id: string
  category: string
  tags?: string[] | null
  verdict?: string | null
  photos?: string[] | null
  opens?: string | null
  closes?: string | null
  lat?: number | null
  lng?: number | null
}

export type RankCtx = {
  /** prefs.score() of the card for this person (0 when there are no answers) */
  fit: (c: RankCard) => number
  /** how many other couples already said yes */
  othersLiked: (c: RankCard) => number
  /** how many people voted on the card so far, in this trip */
  swipeCount: (c: RankCard) => number
  /** star ratings of the card (from any traveller) */
  stars: (c: RankCard) => number[]
  /** category average for the Bayesian mean (falls back to 3.5) */
  categoryMean: (category: string) => number | undefined
  /** how the card did on other trips (card_interest): views, likes, and the median look time over `looks` views */
  interest?: (c: RankCard) => Interest | undefined
  /** the same over every card, the baseline a card is compared with */
  interestBase?: InterestBase
  /** this session's tag weights from the swipes so far */
  tagWeights?: Map<string, number>
  /** cards the person pressed "not now" on earlier: they come after everything else */
  notNow?: (c: RankCard) => boolean
  /** categories of the cards just shown, oldest first, so a run continues across calls */
  recent?: string[]
  /** stable per-user tiebreak */
  hash: (c: RankCard) => number
  /** cards wanted; default one batch */
  size?: number
}

/** A card's record on other trips. */
export type Interest = { views: number; likes: number; looks: number; look_ms: number | null }
export type InterestBase = { rate: number; look_ms: number | null }

/** How long a look has to be to count as a real look, and how short a "no" counts as a glance. */
export const LONG_LOOK_MS = 6000
export const GLANCE_MS = 1500
/** How many views' worth of the overall like rate a card starts with. */
export const INTEREST_PRIOR_WEIGHT = 10
/** Fewest timed views before a card's look time counts. */
export const MIN_LOOKS = 5

const MAX_RUN = 3
const FRESH_SHARE = 0.2

/** Plain tag form used for the weights. */
export const tagOf = (t: string) => t.trim().toLowerCase()

/** Quality of the card's data: photos, opening hours, coordinates. 0 to 1. */
export function dataQuality(c: RankCard): number {
  return (c.photos?.length ? 0.5 : 0) + (c.opens || c.closes ? 0.25 : 0) + (c.lat != null && c.lng != null ? 0.25 : 0)
}

/** Smoothed star score minus the neutral 3.5, limited so one rating can't bury or carry a card. */
export function ratingBonus(stars: number[], prior: number | undefined): number {
  if (!stars.length) return 0
  const b = smoothedStars(stars, prior ?? RATING_PRIOR_DEFAULT) - RATING_PRIOR_DEFAULT
  return Math.max(-1, Math.min(1.5, b))
}

/** A card worth a reserved slot: few or no votes so far, or a hidden gem. */
export const isFresh = (c: RankCard, votes: number) => votes <= 1 || c.verdict === 'gem'

/**
 * Live learning: after a swipe, a like adds 1 to each of the card's tags and a no takes 0.5 off (only 0.1 for food,
 * cafes and bars, where skipping one restaurant says little about the cuisine). Older weights fade by 10% first.
 * With the look time: a like after 6 seconds or more adds 1.3; a no in under 1.5 seconds takes 1.5 times as much, and
 * a no after 6 seconds or more half as much. "Not now" is learnNotNow. Returns a new map.
 */
export function learnTags(weights: Map<string, number>, c: RankCard, liked: boolean, lookMs?: number | null): Map<string, number> {
  const next = new Map<string, number>()
  for (const [k, w] of weights) if (Math.abs(w * 0.9) >= 0.02) next.set(k, w * 0.9)
  const eats = c.category === 'food' || c.category === 'cafe' || c.category === 'nightlife'
  // how long they looked first (roadmap step 11): a like after a real look counts a little more; a "no" at a glance
  // says more than a "no" after reading the card through, which was a near miss
  const long = lookMs != null && lookMs >= LONG_LOOK_MS
  const glance = lookMs != null && lookMs < GLANCE_MS
  const d = liked ? (long ? 1.3 : 1) : (eats ? -0.1 : -0.5) * (glance ? 1.5 : long ? 0.5 : 1)
  for (const t of c.tags ?? []) {
    const k = tagOf(t)
    if (k) next.set(k, (next.get(k) ?? 0) + d)
  }
  return next
}

/**
 * "Not now" after a real look is a sign of interest: a small lift for the card's tags (older weights fade the same way).
 * A quick "not now" changes nothing, as before.
 */
export function learnNotNow(weights: Map<string, number>, c: RankCard, lookMs?: number | null): Map<string, number> {
  if (lookMs == null || lookMs < LONG_LOOK_MS) return weights
  const next = new Map<string, number>()
  for (const [k, w] of weights) if (Math.abs(w * 0.9) >= 0.02) next.set(k, w * 0.9)
  for (const t of c.tags ?? []) {
    const k = tagOf(t)
    if (k) next.set(k, (next.get(k) ?? 0) + 0.3)
  }
  return next
}

/**
 * How the card did on other trips, against all cards: its like rate, smoothed toward the overall rate (10 views'
 * worth), up to ±0.8; and its median look time against the overall median once 5 views were timed, up to ±0.3
 * (twice as long is +0.3). Nothing known: 0, so a new card is never held back.
 */
export function interestBonus(i: Interest | undefined, base: InterestBase | undefined): number {
  if (!i || !base || !i.views) return 0
  const rate = (i.likes + INTEREST_PRIOR_WEIGHT * base.rate) / (i.views + INTEREST_PRIOR_WEIGHT)
  let b = Math.max(-0.8, Math.min(0.8, (rate - base.rate) * 4))
  if (i.looks >= MIN_LOOKS && i.look_ms && base.look_ms) b += Math.max(-0.3, Math.min(0.3, Math.log2(i.look_ms / base.look_ms) * 0.3))
  return b
}

function tagBonus(c: RankCard, w: Map<string, number> | undefined): number {
  if (!w?.size) return 0
  let s = 0
  for (const t of c.tags ?? []) s += w.get(tagOf(t)) ?? 0
  return Math.max(-2, Math.min(2, s * 0.3))
}

/** The relevance score of one card: higher comes first. */
export function cardScore(c: RankCard, ctx: RankCtx): number {
  let s = ctx.fit(c)
  s += Math.min(2, ctx.othersLiked(c) * 1.5)
  s += ratingBonus(ctx.stars(c), ctx.categoryMean(c.category))
  s += dataQuality(c)
  s += tagBonus(c, ctx.tagWeights)
  s += interestBonus(ctx.interest?.(c), ctx.interestBase)
  if (ctx.notNow?.(c)) s -= 10
  return s
}

/**
 * The next batch: cards ordered by score (fit + group fit + smoothed rating + data quality + session learning +
 * how the card did on other trips),
 * at most 3 of one category in a row, and about 20% of the slots (every fifth) for new or gem cards. The same input
 * gives the same order; ties go to the per-user hash.
 */
export function rankDeck<T extends RankCard>(cards: T[], ctx: RankCtx): T[] {
  const size = Math.min(ctx.size ?? BATCH_SIZE, cards.length)
  const scored = cards
    .map((c) => ({ c, s: cardScore(c, ctx), h: ctx.hash(c), fresh: isFresh(c, ctx.swipeCount(c)) }))
    .sort((a, b) => b.s - a.s || a.h - b.h)
  const taken = new Set<string>()
  const out: T[] = []
  const run = [...(ctx.recent ?? [])]
  const runOk = (cat: string) => {
    const tail = run.slice(-MAX_RUN)
    return !(tail.length === MAX_RUN && tail.every((x) => x === cat))
  }
  const pick = (fresh: boolean) =>
    scored.find((x) => !taken.has(x.c.id) && (!fresh || x.fresh) && runOk(x.c.category)) ??
    // nothing fits the rules: the best card left, rather than a short batch
    (fresh ? undefined : scored.find((x) => !taken.has(x.c.id)))
  // every fifth slot is for a fresh card, as long as the quota allows
  const quota = Math.round(size * FRESH_SHARE)
  let usedFresh = 0
  for (let i = 0; i < size; i++) {
    const slot = (i + 1) % 5 === 0 && usedFresh < quota
    const x = (slot ? pick(true) : undefined) ?? pick(false)
    if (!x) break
    if (slot && x.fresh) usedFresh++
    taken.add(x.c.id)
    out.push(x.c)
    run.push(x.c.category)
  }
  return out
}
