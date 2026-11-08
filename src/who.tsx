import { t } from './i18n'
import { RingsIcon } from './rings'

/**
 * Whose items a screen shows (7): the same chips in the same order on Plan, Places and Bookings. "all" is
 * everything; "mine" is my couple's items with the together ones; "group" only the together ones; any other value
 * is another couple's name (their items with the together ones).
 */
export type Who = 'all' | 'mine' | 'group' | (string & {})

export function shows(who: string | null | undefined, mode: Who, mine: string | null) {
  if (mode === 'all') return true
  if (mode === 'group') return !who
  if (!who) return true
  return mode === 'mine' ? !!mine && who === mine : who === mode
}

/** A remembered choice that names a couple no longer in the trip falls back to "mine". */
export function validWho(v: string | null | undefined, couples: string[], mine: string | null): Who {
  if (v === 'all' || v === 'group' || v === 'mine') return v
  return v && couples.includes(v) && v !== mine ? v : 'mine'
}

/** The label of a choice: "שלנו" is always my couple, never our names; "ביחד" carries the two rings. */
export function whoLabel(mode: Who) {
  if (mode === 'all') return t('הכל')
  if (mode === 'mine') return t('שלנו')
  if (mode === 'group')
    return (
      <>
        <RingsIcon /> {t('ביחד')}
      </>
    )
  return t(mode)
}

/** הכל · שלנו · each other couple · ביחד */
export function whoChoices(couples: string[], mine: string | null): Who[] {
  return ['all', 'mine', ...couples.filter((c) => c !== mine), 'group']
}

/** The chip row itself. */
export function WhoChips({ couples, mine, value, onChange }: { couples: string[]; mine: string | null; value: Who; onChange: (w: Who) => void }) {
  return (
    <div className="chips scroll who-chips" role="group" aria-label={t('של מי')}>
      {whoChoices(couples, mine).map((w) => (
        <button key={w} className={'chip' + (value === w ? ' on' : '')} aria-pressed={value === w} onClick={() => onChange(w)}>
          {whoLabel(w)}
        </button>
      ))}
    </div>
  )
}
