// English UI text, keyed by the Hebrew string passed to t(). Split by group of files so several people can add to it
// at once: en-a (shell, home, more, lists), en-b (plan, places, add place, swipe), en-c (bookings, money, essentials,
// baby, translator), en-shared (city names the database keeps in Hebrew).
import { EN_A } from './en-a'
import { EN_B } from './en-b'
import { EN_C } from './en-c'
import { EN_MONEY } from './en-money'
import { EN_UX } from './en-ux'
import { EN_SHARED } from './en-shared'
import { EN_PLAN2 } from './en-plan2'
import { EN_REDESIGN } from './en-redesign'
import { EN_SAFETY } from './en-safety'
import { EN_FIXC } from './en-fixc'
import { EN_PHOTOS } from './en-photos'
import { EN_ALBUM } from './en-album'

export const EN: Record<string, string> = { ...EN_SHARED, ...EN_A, ...EN_B, ...EN_C, ...EN_MONEY, ...EN_UX, ...EN_PLAN2, ...EN_REDESIGN, ...EN_SAFETY, ...EN_FIXC, ...EN_PHOTOS, ...EN_ALBUM }
