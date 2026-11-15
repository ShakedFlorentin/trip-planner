/*
 * Avatar: a round initial for a person, used wherever people are told apart (Expenses, Settings, later the menu).
 * Pass the person's `name` (the initial is taken from it) and a `size`: 's' 24px, 'm' 32px, 'l' 52px. The two couples
 * are told apart by `look`: 'filled' (grey fill) for one couple and 'outlined' (hairline ring) for the other; use
 * coupleLook(person's couple, my couple) to pick it, so my couple is filled and the other outlined everywhere.
 * 'ink' is a black-on-white disc and 'accent' the red profile or selected-person disc. The avatar is an image named `name` for screen readers;
 * pass `decorative` when the name is written next to it, so it is not read twice. Styles are in styles/avatar.css and
 * follow the data-look and data-size attributes.
 */
import type { ReactNode } from 'react'
import { Avatar as SdkAvatar, AvatarFallback } from '@ui-sdk/react/avatar'
import './styles/avatar.css'

export type AvatarLook = 'filled' | 'outlined' | 'ink' | 'accent'
export type AvatarSize = 's' | 'm' | 'l'

/** The look that tells the couples apart: `mine` (the viewer's couple, or the first one) is filled, any other is outlined; no couple is filled. */
export const coupleLook = (couple: string | null | undefined, mine: string | null | undefined): AvatarLook => (!couple || !mine || couple === mine ? 'filled' : 'outlined')

/** The first letter of a name, upper-cased; '?' for an empty one. */
export const initialOf = (name: string) => (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase()

export function Avatar(props: {
  name: string
  size?: AvatarSize
  look?: AvatarLook
  decorative?: boolean
  /** an icon instead of the initial (a repayment, for example) */
  children?: ReactNode
  className?: string
}) {
  const { name, size = 'm', look = 'filled', decorative } = props
  return (
    <SdkAvatar
      className={'ava' + (props.className ? ' ' + props.className : '')}
      data-size={size}
      data-look={look}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
    >
      <AvatarFallback aria-hidden="true">{props.children ?? initialOf(name)}</AvatarFallback>
    </SdkAvatar>
  )
}
