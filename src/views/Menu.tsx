import { useEffect, useRef } from 'react'
import { ArrowLeftRight, BookOpen, ChevronLeft, MessageSquareWarning, Settings as SettingsIcon, ShieldCheck } from 'lucide-react'
import { Icon, type LucideIcon } from '../icons'
import { t } from '../i18n'
import { supabase } from '../supabase'
import { MORE_TABS, type MoreTab } from './More'
import { PhotoReviewRow } from './PlacePhotos'
import { GUIDE_READY, openGuide } from './Guide'
import { openExternal, privacyUrl } from '../native'

// the tools' tile colours, like iOS Settings: one colour per tool, white glyph
const TOOL_COLOR: Record<MoreTab, string> = { money: '#34a853', lists: '#f0a020', info: '#e5484d', say: '#3b82f6', baby: '#a259d9' }

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
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(props.onClose)
  close.current = props.onClose
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])
  // every row closes the menu first, so the screen it opens sits over the page, not over the menu
  const go = (f: () => void) => () => {
    props.onClose()
    f()
  }
  const tools = MORE_TABS.filter((x) => x.id !== 'baby' || props.hasBaby)
  const initial = props.me.trim()[0] ?? ''
  return (
    <div className="menu-backdrop" onClick={props.onClose}>
      <div ref={panel} className="menu-panel" role="dialog" aria-modal="true" aria-label={t('תפריט')} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
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
            <MenuRow key={x.id} icon={x.icon} color={TOOL_COLOR[x.id]} label={x.label} onClick={go(() => props.onTool(x.id))} />
          ))}
        </div>
        <div className="group">
          <MenuRow icon={SettingsIcon} color="#8e8e93" label={t('הגדרות')} chevron onClick={go(props.onSettings)} />
          <MenuRow icon={ArrowLeftRight} color="#8e8e93" label={t('מעבר לטיול אחר')} onClick={go(props.onLeave)} />
          {GUIDE_READY && <MenuRow icon={BookOpen} color="#8e8e93" label={t('מדריך')} onClick={go(openGuide)} />}
          <MenuRow icon={MessageSquareWarning} color="#8e8e93" label={t('דיווח על בעיה')} onClick={go(props.onReport)} />
          <MenuRow icon={ShieldCheck} color="#8e8e93" label={t('פרטיות ותנאי שימוש')} onClick={go(() => openExternal(privacyUrl()))} />
          <PhotoReviewRow />
        </div>
        <div className="group">
          <button
            className="group-row danger"
            onClick={() => {
              // this phone only: the others' devices, and this person's other devices, stay logged in
              if (confirm(t('להתנתק מהטלפון הזה? כדי לחזור צריך שם וסיסמה.'))) supabase.auth.signOut({ scope: 'local' })
            }}
          >
            {t('התנתקות')}
          </button>
        </div>
      </div>
    </div>
  )
}

function MenuRow(props: { icon: LucideIcon; color: string; label: string; chevron?: boolean; onClick: () => void }) {
  return (
    <button className="group-row" onClick={props.onClick}>
      <span className="menu-tile" style={{ background: props.color }}>
        <Icon as={props.icon} />
      </span>
      <span className="k">{props.label}</span>
      {props.chevron && <Icon as={ChevronLeft} className="chev flip-ltr" />}
    </button>
  )
}
