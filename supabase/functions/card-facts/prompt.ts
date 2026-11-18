// What card-facts puts in front of Claude, as pure functions (no Deno or npm imports) so scripts/guard-test.mjs can
// check it: a card's name, area and every word a member wrote on it sit inside fenced blocks, and every system prompt
// carries the data rule.
import { DATA_RULE, fence } from '../_shared/guard.ts'

export type KnownCard = {
  name: string
  name_ja?: string | null
  city?: string | null
  area?: string | null
  category?: string | null
  tip?: string | null
  baby_notes?: string | null
  hype?: string | null
  reality?: string | null
  time_needed?: string | null
  address?: string | null
  opens?: string | null
  closes?: string | null
  closed_weekdays?: number[] | null
}

/** A system prompt plus the data rule. */
export const withRule = (system: string) => `${system}\n\n${DATA_RULE}`

const nameBlock = (p: KnownCard) =>
  fence('place_name', [`Place: ${p.name}${p.name_ja ? ` (${p.name_ja})` : ''}`, p.area || p.city ? `Where: ${[p.area, p.city].filter(Boolean).join(', ')}` : '', p.category ? `Kind: ${p.category}` : ''].filter(Boolean).join('\n'), 600)

/** The first lookup's question: the place, and what the trip's card already says (member text, fenced). */
export function lookUpKnown(p: KnownCard): string {
  const said = [p.hype, p.reality, p.tip, p.baby_notes, p.time_needed && `time needed: ${p.time_needed}`].filter(Boolean).join(' / ')
  return [nameBlock(p), said ? `What the trip's card already says:\n${fence('member_text', said, 3000)}` : ''].filter(Boolean).join('\n')
}

/** The extraction step's question: the same, and the research notes (text from web pages, fenced). */
export const extractContent = (p: KnownCard, notes: string) => `${lookUpKnown(p)}\n\nNotes:\n${fence('research_notes', notes, 12000)}`

/** The re-check's question. The card's own address and hours are member-editable, so they are fenced; the Tabelog page is built by tabelogPage(). */
export function recheckKnown(p: KnownCard, page: string | null): string {
  const card = [
    p.address ? `Address on the card: ${p.address}` : '',
    `The card's hours now: ${p.opens && p.closes ? `${p.opens}-${p.closes}` : 'none on the card'}`,
    `The card's weekly closing days now: ${p.closed_weekdays?.length ? p.closed_weekdays.join(', ') : 'none'}`,
  ]
    .filter(Boolean)
    .join('\n')
  return [nameBlock(p), fence('member_text', card, 1000), page ? `Its Tabelog page: ${page}` : ''].filter(Boolean).join('\n')
}
