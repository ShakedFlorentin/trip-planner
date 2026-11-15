import { useRef, useState, type ReactNode } from 'react'
import { DrawerClose } from '@ui-sdk/react/drawer'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@ui-sdk/react/collapsible'
import { ArrowLeftRight, ArrowUpRight, BookOpen, ChevronDown, ChevronLeft, MessageSquareWarning, Settings as SettingsIcon, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { Icon, type LucideIcon } from '../icons'
import { t, locale } from '../i18n'
import { Sheet } from '../ui'
import { Avatar } from '../avatar'
import { dayDate } from '../lib'
import type { Trip } from '../types'
import { MORE_TABS, type MoreTab } from './More'
import { PhotoReviewRow } from './PlacePhotos'
import { GUIDE_READY, openGuide } from './Guide'
import { openExternal, privacyUrl } from '../native'
import SignOutSheet from './SignOutSheet'
import '../styles/menu.css'

type Props = {
  me: string
  trip: Trip | null
  hasBaby: boolean
  onClose: () => void
  onTool: (sub: MoreTab) => void
  onPrefs: () => void
  onSettings: () => void
  onLeave: () => void
  onReport: () => void
}

/** "12–31 December" / "12–31 בדצמבר": the trip's first and last day, or nothing for a trip with no start date. */
function tripDates(trip: Trip | null) {
  const a = dayDate(trip?.start_date ?? null, 1)
  const b = dayDate(trip?.start_date ?? null, Math.max(1, trip?.num_days ?? 1))
  if (!a || !b) return ''
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }) as Intl.DateTimeFormat & { formatRange(a: Date, b: Date): string }
  return fmt.formatRange(a, b)
}

/**
 * The account sheet, opened from the initial in the top bar: who you are and your preferences, the tools that left the
 * tab bar, then settings, another trip and a "More" disclosure for the rarely used rows; signing out alone at the bottom.
 * It is the shared Sheet (ui-sdk Drawer), so the slide, the drag from the handle or header, Escape and the backdrop tap
 * come with it.
 */
export default function Menu(props: Props) {
  const [signingOut, setSigningOut] = useState(false)
  // a row closes the sheet first, so the screen it opens sits over the page, not over the sheet; it runs once the sheet
  // has slid out
  const after = useRef<(() => void) | null>(null)
  const go = (f: () => void) => () => {
    after.current = f
  }
  const tools = MORE_TABS.filter((x) => x.id !== 'baby' || props.hasBaby)
  const sub = [props.trip?.name, tripDates(props.trip)].filter(Boolean).join(' · ')
  return (
    <Sheet
      title={t('חשבון')}
      closeLabel={t('סיום')}
      onClose={() => {
        props.onClose()
        const f = after.current
        after.current = null
        f?.()
      }}
    >
      <div className="acct">
        <div className="group acct-group">
          <div className="acct-id">
            <Avatar name={props.me} size="l" look="accent" decorative />
            <span className="acct-id-text">
              <b dir="auto">{props.me}</b>
              {sub && <small dir="auto">{sub}</small>}
            </span>
          </div>
          <Row icon={SlidersHorizontal} label={t('ההעדפות שלי')} onPress={go(props.onPrefs)} />
        </div>
        <div className="group acct-group">
          {tools.map((x) => (
            <Row key={x.id} icon={x.icon} label={x.label} onPress={go(() => props.onTool(x.id))} />
          ))}
        </div>
        <div className="group acct-group">
          <Row icon={SettingsIcon} label={t('הגדרות')} onPress={go(props.onSettings)} />
          <Row icon={ArrowLeftRight} label={t('מעבר לטיול אחר')} onPress={go(props.onLeave)} />
          <PhotoReviewRow />
          <Collapsible className="acct-more">
            <CollapsibleTrigger className="group-row acct-more-trigger">
              <span className="k">{t('עוד')}</span>
              <Icon as={ChevronDown} className="chev acct-more-chev" />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              {GUIDE_READY && <Row icon={BookOpen} label={t('מדריך')} onPress={go(openGuide)} />}
              <Row icon={MessageSquareWarning} label={t('דיווח על בעיה')} onPress={go(props.onReport)} />
              <Row icon={ShieldCheck} label={t('פרטיות ותנאי שימוש')} external onPress={go(() => openExternal(privacyUrl()))} />
            </CollapsiblePanel>
          </Collapsible>
        </div>
        <div className="group acct-group">
          <button className="group-row danger" onClick={() => setSigningOut(true)}>
            {t('התנתקות')}
          </button>
        </div>
      </div>
      {signingOut && <SignOutSheet onClose={() => setSigningOut(false)} />}
    </Sheet>
  )
}

function Row(props: { icon: LucideIcon; label: ReactNode; external?: boolean; onPress: () => void }) {
  return (
    <DrawerClose className="group-row" onClick={props.onPress}>
      <Icon as={props.icon} className="lead" />
      <span className="k">{props.label}</span>
      <Icon as={props.external ? ArrowUpRight : ChevronLeft} className={props.external ? 'chev' : 'chev flip-ltr'} />
    </DrawerClose>
  )
}
