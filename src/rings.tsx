import { t } from './i18n'

// The two rings of the Toogo symbol (brand/toogo/kit/masters/toogo-symbol.svg): the first walks, the second is a step up.
const FIRST = 'M24 142A48 48 0 1 1 120 142A48 48 0 1 1 24 142ZM44 142A28 28 0 1 0 100 142A28 28 0 1 0 44 142Z'
const SECOND = 'M136 114A48 48 0 1 1 232 114A48 48 0 1 1 136 114ZM156 114A28 28 0 1 0 212 114A28 28 0 1 0 156 114Z'
// the small-size cut (toogo-symbol-small.svg): heavier rings and a wider hole, for icons next to text
const FIRST_SMALL = 'M12 144A54 54 0 1 1 120 144A54 54 0 1 1 12 144ZM42 144A24 24 0 1 0 90 144A24 24 0 1 0 42 144Z'
const SECOND_SMALL = 'M136 112A54 54 0 1 1 244 112A54 54 0 1 1 136 112ZM166 112A24 24 0 1 0 214 112A24 24 0 1 0 166 112Z'
const ONE_SMALL = 'M74 128A54 54 0 1 1 182 128A54 54 0 1 1 74 128ZM104 128A24 24 0 1 0 152 128A24 24 0 1 0 104 128Z'

/**
 * A text-sized icon from the logo: two rings for the whole group together, one ring for part of the group on its own.
 * It takes the text colour, like the other icons.
 */
export function RingsIcon({ one = false }: { one?: boolean }) {
  // both boxes are 152 units high around the rings, so one ring is drawn exactly as big as each of the two
  return one ? (
    <svg className="ic rings-ic" viewBox="52 52 152 152" width="1.15em" height="1.15em" fill="currentColor" aria-hidden>
      <path d={ONE_SMALL} />
    </svg>
  ) : (
    <svg className="ic rings-ic" viewBox="8 52 240 152" width="1.82em" height="1.15em" fill="currentColor" aria-hidden>
      <path d={FIRST_SMALL + SECOND_SMALL} />
    </svg>
  )
}

/**
 * Full-screen loading: the symbol in the middle of the screen, the same size and spot as on the iOS launch screen,
 * with the two rings taking turns to step up. Still for people who ask for less motion.
 */
export function Loading() {
  return (
    <div className="center" role="status">
      <svg className="rings-loader" viewBox="24 58 208 140" aria-hidden>
        <path className="ring-a" d={FIRST} />
        <path className="ring-b" d={SECOND} />
      </svg>
      <span className="sr-only">{t('טוען…')}</span>
    </div>
  )
}
