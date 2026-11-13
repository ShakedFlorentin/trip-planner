import { useEffect, useRef } from 'react'

/** What the action wheel on the + can add from any screen. */
export type QuickKind = 'place' | 'expense' | 'list' | 'booking'

const EVENT = 'quick-add'
// the wheel's choice waits here until the screen that adds it is open and takes it
let pending: QuickKind | null = null

// a link shared into the app from another app's Share menu (iOS share extension), for the add-place sheet
let pendingLink: string | null = null

/** Asks for an add from the wheel: App opens the right screen, and that screen opens its form. */
export function requestAdd(kind: QuickKind) {
  pending = kind
  dispatchEvent(new CustomEvent(EVENT, { detail: kind }))
}

/** A link shared into Toogo: the add-place sheet opens with it filled in (nothing is looked up until a tap). */
export function requestAddLink(url: string) {
  pendingLink = url
  requestAdd('place')
}

/** The shared link waiting for the add-place sheet, once; '' when the sheet was opened some other way. */
export function takeSharedLink() {
  const url = pendingLink ?? ''
  pendingLink = null
  return url
}

/** App's side: which screen to open for each choice. */
export function useQuickAddRoute(open: (kind: QuickKind) => void) {
  const cb = useRef(open)
  cb.current = open
  useEffect(() => {
    const on = (e: Event) => cb.current((e as CustomEvent<QuickKind>).detail)
    // asked before the trip screens were up (a link shared while the app was closed or signed out): go there now
    if (pending) cb.current(pending)
    addEventListener(EVENT, on)
    return () => removeEventListener(EVENT, on)
  }, [])
}

/** A screen's side: opens its add form when the wheel asked for this kind, now or before the screen was open. */
export function useQuickAdd(kind: QuickKind, open: () => void) {
  const cb = useRef(open)
  cb.current = open
  useEffect(() => {
    const take = () => {
      if (pending !== kind) return
      pending = null
      // after App has switched screens, so the form opens on top of the right one
      requestAnimationFrame(() => cb.current())
    }
    take()
    addEventListener(EVENT, take)
    return () => removeEventListener(EVENT, take)
  }, [kind])
}
