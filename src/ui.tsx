import { ReactNode, useRef, useState } from 'react'
import { Icon, type LucideIcon } from './icons'
import { t } from './i18n'
import { Tabs as SdkTabs, TabsList, TabsTab } from '@ui-sdk/react/tabs'
import { Drawer, DrawerBackdrop, DrawerClose, DrawerContent, DrawerTitle } from '@ui-sdk/react/drawer'

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

/**
 * Bottom sheet, built on ui-sdk's Drawer: grabber, drag-down to dismiss, Escape, scroll lock, focus return. An edit
 * sheet passes `action` (its "שמירה") and `closeLabel` ("ביטול"): both sit in the title row, as on every iOS edit
 * sheet. `tall` keeps it at full height, for a whole screen shown as a sheet.
 */
export function Sheet(props: {
  title: string
  onClose: () => void
  children: ReactNode
  action?: { label: string; onClick: () => void; disabled?: boolean }
  closeLabel?: string
  tall?: boolean
}) {
  const [open, setOpen] = useState(true)
  const openedAt = useRef(performance.now())
  // a sheet is mounted while it is open: it slides out first, and the parent hears about it when it has settled
  const { onClose } = props

  // a sheet opened from inside a swipe card still bubbles its pointer events (React's tree) to the card, where a
  // sideways drift while closing the sheet would swipe the card
  const isolate = { onPointerDown: stop, onPointerMove: stop, onPointerUp: stop, onPointerCancel: stop }

  return (
    <Drawer
      open={open}
      onOpenChange={(next, details) => {
        // the click that follows the tap which opened the sheet lands on the backdrop; don't let it close the sheet
        if (!next && details.reason === 'outside-press' && performance.now() - openedAt.current < 450) return details.cancel()
        setOpen(next)
      }}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return
        onClose()
        // a parent that keeps the sheet mounted after onClose (a refused close) gets it back, as before
        setOpen(true)
      }}
    >
      <DrawerBackdrop className="backdrop" {...isolate} />
      <DrawerContent className={'sheet' + (props.tall ? ' tall' : '')} initialFocus="content" {...isolate}>
        <div className="sheet-head">
          <span className="grabber" aria-hidden="true" />
          <DrawerClose className="sheet-close">{props.closeLabel ?? t('סגירה')}</DrawerClose>
          <DrawerTitle dir="auto">{props.title}</DrawerTitle>
          {props.action ? (
            <button className="sheet-action" onClick={props.action.onClick} disabled={props.action.disabled}>
              {props.action.label}
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="sheet-body">{props.children}</div>
      </DrawerContent>
    </Drawer>
  )
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{props.label}</span>
      {props.children}
    </label>
  )
}

export function Empty(props: { children: ReactNode }) {
  return <p className="empty">{props.children}</p>
}

/** An empty screen, Apple style: a grey line icon that fits the case, a bold title, one line and one button. */
export function EmptyState(props: { icon: LucideIcon; title: string; line?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="empty-state">
      <Icon as={props.icon} size={50} className="empty-icon" />
      <b>{props.title}</b>
      {props.line && <p>{props.line}</p>}
      {props.action && (
        <button className="primary" onClick={props.action.onClick}>
          {props.action.label}
        </button>
      )}
    </div>
  )
}

/** A row of tabs pinned under the top bar; `counts` adds a badge to tabs that have items. */
export function Tabs(props: {
  label: string
  /** a plain label, or a label with a line icon */
  tabs: Record<string, string | { label: string; icon: LucideIcon }>
  current: string
  counts?: Record<string, number>
  onPick: (key: string) => void
}) {
  return (
    <SdkTabs className="tabs-root" value={props.current} onValueChange={(v) => v && props.onPick(v)}>
      <TabsList className="tabs-bar" aria-label={props.label}>
        {Object.entries(props.tabs).map(([k, v]) => (
          <TabsTab key={k} value={k} className={'chip' + (props.current === k ? ' on' : '')}>
            {typeof v === 'string' ? (
              v
            ) : (
              <>
                <Icon as={v.icon} />
                {v.label}
              </>
            )}
            {!!props.counts?.[k] && <span className="count">{props.counts[k]}</span>}
          </TabsTab>
        ))}
      </TabsList>
    </SdkTabs>
  )
}

/** useState that is also remembered in this browser, for per-viewer choices like the open tab. */
export function useRemembered(key: string, initial: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) ?? initial
    } catch {
      return initial
    }
  })
  const set = (v: string) => {
    setValue(v)
    try {
      localStorage.setItem(key, v)
    } catch {
      // it just won't be remembered
    }
  }
  return [value, set] as const
}

/** Shown when a list couldn't be refreshed; the rows already on screen stay. */
export function LoadNote({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="msg" role="alert">
      {t('העדכון נכשל, בדקו את החיבור.')}{' '}
      <button className="link" onClick={onRetry}>
        {t('נסו שוב')}
      </button>
    </p>
  )
}
