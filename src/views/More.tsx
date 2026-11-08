import type { Member, Trip } from '../types'
import Lists from './Lists'
import Expenses from './Expenses'
import Essentials from './Essentials'
import Baby from './Baby'
import Say from './Say'
import Onboarding, { useProfile } from './Onboarding'
import { answersOf } from '../prefs'
import { type LucideIcon } from '../icons'
import { t } from '../i18n'
import { Sheet } from '../ui'
import { Baby as BabyIcon, Languages, ListChecks, ShieldAlert, Wallet } from 'lucide-react'

export const MORE_TABS = [
  { id: 'money', label: t('כסף'), icon: Wallet },
  { id: 'lists', label: t('רשימות'), icon: ListChecks },
  { id: 'info', label: t('חירום'), icon: ShieldAlert },
  { id: 'say', label: t('תרגום'), icon: Languages },
  { id: 'baby', label: t('תינוק'), icon: BabyIcon },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[]
export type MoreTab = (typeof MORE_TABS)[number]['id']

/** One of the menu's tools, as a full-height sheet over the current page (5): closing returns to the same place. */
export function ToolSheet({ trip, members, userId, sub, onClose }: { trip: Trip; members: Member[]; userId: string; sub: MoreTab; onClose: () => void }) {
  const label = MORE_TABS.find((x) => x.id === sub)?.label ?? ''
  return (
    <Sheet title={label} onClose={onClose} tall>
      <div className="tool-sheet">
        {sub === 'money' && <Expenses trip={trip} members={members} userId={userId} />}
        {sub === 'lists' && <Lists tripId={trip.id} members={members} userId={userId} />}
        {sub === 'info' && <Essentials trip={trip} members={members} userId={userId} />}
        {sub === 'say' && <Say tripId={trip.id} />}
        {sub === 'baby' && <Baby trip={trip} members={members} userId={userId} />}
      </div>
    </Sheet>
  )
}

/** "ההעדפות שלי": the questionnaire, opened from the menu. */
export function PrefsSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { profile, saved } = useProfile(userId)
  if (profile === undefined) return null
  return (
    <Onboarding
      userId={userId}
      initial={answersOf(profile) ?? profile?.answers}
      onDone={(p) => {
        saved(p)
        onClose()
      }}
      onClose={onClose}
    />
  )
}
