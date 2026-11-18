// The question card-photos puts to Claude, as pure functions (no Deno or npm imports), so scripts/guard-test.mjs can
// check that everything a member wrote sits in a fenced block and that the data rule is in the system prompt.
import { DATA_RULE, fence } from '../_shared/guard.ts'

export type PickCard = { name: string; name_ja: string | null; city: string | null; area: string | null; category: string | null; serves: string | null; todo: string | null; hype: string | null }

/** The text part of the question. Name and the card's own words are member text: fenced, never loose in the prompt. */
export function pickIntro(c: PickCard): string {
  const about = [c.category, c.area, c.city, c.serves ?? c.todo ?? c.hype].filter(Boolean).join(' · ')
  return `Place:\n${fence('place_name', `${c.name}${c.name_ja ? ` (${c.name_ja})` : ''}`, 300)}\nAbout:\n${fence('member_text', about, 1500)}\nImages, numbered from 0:`
}

/** Where an image came from, as one harmless word: a host name is page-controlled text, so only its host characters stay. */
export const fromLabel = (from: string) => from.toLowerCase().replace(/[^a-z0-9. -]/g, '').slice(0, 60) || 'page'

export function pickSystem(keep: number): string {
  return (
    `These images were found for a place card in a trip app. Return the numbers of up to ${keep} images that are real photos of this place: its food or drinks, the interior, the building or street, or the view, ` +
    'best first. Leave out logos, text banners, maps, menus as plain text, screenshots, collages of many places, stock photos of something else, and images that clearly show a different place. ' +
    'When an image has a place name written on it, keep it only if the name is this place. ' +
    'Images "from post slide" come from one post about several places: keep such a slide only when this place\'s name (in any language or script) is written on it, never for its food or look alone. ' +
    'An empty list is fine.\n\n' +
    DATA_RULE
  )
}
