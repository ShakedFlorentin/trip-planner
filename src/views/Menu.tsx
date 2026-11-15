import { useRef, useState } from 'react'
import { Drawer, DrawerBackdrop, DrawerContent, DrawerTitle } from '@ui-sdk/react/drawer'
import { ArrowLeftRight, ArrowUpRight, BookOpen, ChevronLeft, MessageSquareWarning, Settings as SettingsIcon, ShieldCheck } from 'lucide-react'
import { Icon, type LucideIcon } from '../icons'
import { t } from '../i18n'
import { MORE_TABS, type MoreTab } from './More'
import { PhotoReviewRow } from './PlacePhotos'
import { GUIDE_READY, openGuide } from './Guide'
import { openExternal, privacyUrl } from '../native'
import SignOutSheet from './SignOutSheet'

// the tools' tile colours, like iOS Settings: one colour per tool, white glyph
const TOOL_TONE: Record<MoreTab, string> = { money: 'green', lists: 'orange', info: 'red', say: 'blue', baby: 'purple' }

type Props = {
  me: string
  hasBaby: boolean
  onClose: () => void
  onTool: (sub: MoreTab) => void
  onPrefs: () => void
  onSettings: () => void
  onLeave: () => void
  onReport: () => void
}

/**
 * The ☰ menu (4, 52, 63): the person on top with their preferences, the tools that left the tab bar, then settings,
 * another trip, the guide and a problem report; signing out alone at the bottom, the only red row. It slides in from the side
 * the ☰ button is on (left in Hebrew, right in English).
 */
export default function Menu(props: Props) {
  const [open, setOpen] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  // a row closes the menu first, so the screen it opens sits over the page, not over the menu; it runs when the
  // menu has slid out
  const after = useRef<(() => void) | null>(null)
  const go = (f?: () => void) => () => {
    after.current = f ?? null
    setOpen(false)
  }
  const tools = MORE_TABS.filter((x) => x.id !== 'baby' || props.hasBaby)
  const initial = props.me.trim()[0] ?? ''
  return (
    <Drawer
      open={open}
      side="end"
      onOpenChange={(next) => setOpen(next)}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return
        props.onClose()
        const f = after.current
        after.current = null
        f?.()
      }}
    >
      <DrawerBackdrop className="backdrop menu-backdrop" />
      <DrawerContent className="menu-panel" initialFocus="content">
        <div className="menu-scroll">
          <DrawerTitle className="sr-only">{t('תפריט')}</DrawerTitle>
          <div className="menu-me">
            <span className="avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="menu-me-text">
              <b dir="auto">{props.me}</b>
              <button className="link" onClick={go(props.onPrefs)}>
                {t('ההעדפות שלי')} <Icon as={ChevronLeft} className="flip-ltr" />
              </button>
            </span>
          </div>
          <div className="group">
            {tools.map((x) => (
              <MenuRow key={x.id} icon={x.icon} tone={TOOL_TONE[x.id]} label={x.label} chevron onClick={go(() => props.onTool(x.id))} />
            ))}
          </div>
          <div className="group">
            <MenuRow icon={SettingsIcon} label={t('הגדרות')} chevron onClick={go(props.onSettings)} />
            <MenuRow icon={ArrowLeftRight} label={t('מעבר לטיול אחר')} chevron onClick={go(props.onLeave)} />
            {GUIDE_READY && <MenuRow icon={BookOpen} label={t('מדריך')} chevron onClick={go(openGuide)} />}
            <MenuRow icon={MessageSquareWarning} label={t('דיווח על בעיה')} chevron onClick={go(props.onReport)} />
            <MenuRow icon={ShieldCheck} label={t('פרטיות ותנאי שימוש')} external onClick={go(() => openExternal(privacyUrl()))} />
            <PhotoReviewRow />
          </div>
          <div className="group">
            <button className="group-row danger" onClick={() => setSigningOut(true)}>
              {t('התנתקות')}
            </button>
          </div>
        </div>
        {signingOut && <SignOutSheet onClose={() => setSigningOut(false)} />}
      </DrawerContent>
    </Drawer>
  )
}

function MenuRow(props: { icon: LucideIcon; tone?: string; label: string; chevron?: boolean; external?: boolean; onClick: () => void }) {
  return (
    <button className="group-row" onClick={props.onClick}>
      <span className="menu-tile" data-tone={props.tone ?? 'gray'}>
        <Icon as={props.icon} />
      </span>
      <span className="k">{props.label}</span>
      {props.chevron && <Icon as={ChevronLeft} className="chev flip-ltr" />}
      {props.external && <Icon as={ArrowUpRight} className="chev" />}
    </button>
  )
}
