/**
 * When a visitor with no account is asked to sign in and keep what they liked: once at the first natural point (after
 * PROMPT_AFTER swipes), and once more when the deck runs out. Never on a timer of swipes: after that the visitor
 * decides, with the "Save the trip" button that is always there.
 */
export const PROMPT_AFTER = 8

export type Asked = { first: boolean; end: boolean }

/**
 * `swiped` is the swipes this visit, `deckLeft` the cards still to swipe, `asked` what was already shown. Returns
 * whether to ask now and what has been shown after. A deck that runs out at the very swipe that asked counts as one ask.
 */
export function nextPrompt(p: { swiped: number; deckLeft: number; asked: Asked }): { ask: boolean; asked: Asked } {
  const { swiped, deckLeft, asked } = p
  if (swiped <= 0) return { ask: false, asked }
  const over = deckLeft === 0
  if (!asked.first && swiped >= PROMPT_AFTER) return { ask: true, asked: { first: true, end: asked.end || over } }
  if (!asked.end && over) return { ask: true, asked: { first: true, end: true } }
  return { ask: false, asked }
}

const KEY = 'guestAsked'

export function readAsked(): Asked {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Partial<Asked> | null
    return { first: v?.first === true, end: v?.end === true }
  } catch {
    return { first: false, end: false }
  }
}

export function writeAsked(a: Asked) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(a))
  } catch {
    // private mode: asked again at most once per open
  }
}
