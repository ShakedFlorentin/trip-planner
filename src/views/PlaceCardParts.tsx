import { useState } from 'react'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@ui-sdk/react/menu'
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@ui-sdk/react/collapsible'
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Icon } from '../icons'
import { t } from '../i18n'
import type { ReactNode } from 'react'

/**
 * The place's photo as a full-width block, only when it is a good one: it has to load, be wide enough to fill the
 * card without blurring (600px), and not be a sliver. Until it passes (and when it never does) nothing shows,
 * because no photo beats a weak one.
 */
export function PlaceHero({ src }: { src: string }) {
  const [ok, setOk] = useState(false)
  return (
    <img
      className="pc-photo"
      hidden={!ok}
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget
        setOk(w >= 600 && h >= 300 && w / h < 3)
      }}
      onError={() => setOk(false)}
    />
  )
}

/** "⋯": Edit and Delete behind one menu (ui-sdk Menu), so the card's buttons are the actions that matter. */
export function PlaceMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <Menu>
      <MenuTrigger className="icon-btn" aria-label={t('עוד פעולות')}>
        <Icon as={MoreHorizontal} size={22} />
      </MenuTrigger>
      <MenuContent className="pc-menu" side="bottom" align="end" sideOffset={6}>
        <MenuItem onSelect={onEdit}>
          <Icon as={Pencil} size={18} /> {t('עריכה')}
        </MenuItem>
        <MenuItem className="danger" onSelect={onDelete}>
          <Icon as={Trash2} size={18} /> {t('מחיקה')}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

/** "Been there · 4 ▾": the visited places, folded away at the bottom of the list (ui-sdk Collapsible). */
export function BeenThere({ count, children }: { count: number; children: ReactNode }) {
  return (
    <Collapsible className="pl-been">
      <CollapsibleTrigger className="pl-been-head">
        <span>
          {t('ביקרנו')} · <bdi>{count}</bdi>
        </span>
        <Icon as={ChevronDown} size={18} />
      </CollapsibleTrigger>
      <CollapsiblePanel>{children}</CollapsiblePanel>
    </Collapsible>
  )
}
