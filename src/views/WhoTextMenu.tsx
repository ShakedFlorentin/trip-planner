import { Menu, MenuContent, MenuItemIndicator, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '@ui-sdk/react/menu'
import { Check, ChevronDown } from 'lucide-react'
import { Icon } from '../icons'
import { whoChoices, whoLabel, type Who } from '../who'

/** "Ours · 5 places ▾": whose items a screen shows, as a quiet text menu under the title (ui-sdk Menu). */
export default function WhoTextMenu(props: { couples: string[]; mine: string | null; value: Who; onChange: (w: Who) => void; suffix?: string; label: string }) {
  return (
    <Menu>
      <MenuTrigger className="who-text" aria-label={props.label}>
        <span>
          {whoLabel(props.value)}
          {props.suffix ? ' · ' + props.suffix : ''}
        </span>
        <Icon as={ChevronDown} />
      </MenuTrigger>
      <MenuContent className="who-menu-list" side="bottom" align="start" sideOffset={6}>
        <MenuRadioGroup value={props.value} onValueChange={(w) => props.onChange(w as Who)}>
          {whoChoices(props.couples, props.mine).map((w) => (
            <MenuRadioItem key={w} value={w} closeOnSelect>
              <span>{whoLabel(w)}</span>
              <MenuItemIndicator>
                <Icon as={Check} />
              </MenuItemIndicator>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}
