import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Icon, type LucideIcon } from './icons'
import { t } from './i18n'
import { project, reducedMotion, springTo } from './spring'

/** One round capsule behind a swiped row. */
export type SwipeAction = { label: string; icon: LucideIcon; onClick: () => void; tone: 'edit' | 'del' | 'ok' }

// the one row that is open: opening another (or tapping elsewhere, or scrolling) closes it
let openRow: (() => void) | null = null
const CAP = 76 // room for one capsule

/**
 * A list row that slides like iOS lists (29, 48, 55): toward its end side it uncovers `end` (edit, remove: on the
 * left in Hebrew, the right in English); toward its start side `start` (e.g. "ביקרנו", like "read" in Mail). The
 * capsules grow and fade in with how far the row is open. `hint` slides it open a little once, the first time a
 * screen with swipe rows opens on this phone.
 */
export function SwipeRow({ children, end, start, hint }: { children: ReactNode; end: SwipeAction[]; start?: SwipeAction; hint?: boolean }) {
  const row = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const pos = useRef(0)
  const stop = useRef<(() => void) | null>(null)
  const g = useRef<{ x: number; y: number; from: number; lock: 'h' | 'v' | null; trail: { t: number; x: number }[] } | null>(null)
  const moved = useRef(false)
  const endW = CAP * end.length
  const startW = start ? CAP : 0
  // which way the row slides to uncover the end actions: right in Hebrew (they sit on the left), left in English
  const sign = () => (document.documentElement.dir === 'rtl' ? 1 : -1)

  const show = (x: number) => {
    pos.current = x
    const el = row.current
    if (!el) return
    const card = el.querySelector<HTMLElement>(':scope > .swipe-card')
    const endBox = el.querySelector<HTMLElement>(':scope > .swipe-acts.end')
    const startBox = el.querySelector<HTMLElement>(':scope > .swipe-acts.start')
    if (card) card.style.transform = x ? `translateX(${x}px)` : ''
    const along = x * sign() // > 0: toward the end actions
    const still = reducedMotion()
    const c01 = (v: number) => Math.max(0, Math.min(1, v))
    const grow = (b: HTMLElement, q: number, wide = 0) => {
      const sc = c01((q - 0.1) / 0.6)
      const op = c01((q - 0.05) / 0.5)
      b.style.opacity = still ? (q > 0 ? '1' : '0') : String(op)
      b.style.transform = still ? '' : `scale(${0.3 + 0.7 * sc})`
      b.style.width = wide ? `${64 + wide}px` : ''
    }
    if (endBox) {
      const p = Math.min(1, Math.max(0, along) / endW)
      const caps = [...endBox.children] as HTMLElement[]
      // the outer capsule leads and stretches a little when dragged past; the inner one follows
      caps.forEach((b, i) => grow(b, p - 0.15 * (caps.length - 1 - i), i === caps.length - 1 ? Math.min(40, Math.max(0, along - endW) / 2) : 0))
      endBox.style.visibility = along > 0 ? 'visible' : ''
    }
    if (startBox) {
      const p = Math.min(1, Math.max(0, -along) / startW)
      grow(startBox.firstElementChild as HTMLElement, p, Math.min(40, Math.max(0, -along - startW) / 2))
      startBox.style.visibility = along < 0 ? 'visible' : ''
    }
  }
  const settle = (to: number, v = 0) => {
    stop.current?.()
    stop.current = null
    setOpen(to !== 0)
    if (to !== 0) {
      openRow?.()
      openRow = () => settle(0)
    }
    if (reducedMotion()) return show(to)
    stop.current = springTo(pos.current, to, v, { damping: 0.62, response: 0.35 }, (x) => show(x), () => (stop.current = null))
  }
  useEffect(() => {
    if (!open) return
    const close = (ev: Event) => {
      if (ev.type === 'pointerdown' && row.current?.contains(ev.target as Node)) return
      settle(0)
    }
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('scroll', close, true)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stop.current?.(), [])
  useEffect(() => {
    if (!hint || reducedMotion()) return
    try {
      if (localStorage.getItem('swipeHint')) return
      localStorage.setItem('swipeHint', '1')
    } catch {
      return
    }
    const k = sign()
    const a = setTimeout(() => {
      stop.current = springTo(0, k * 70, 0, { damping: 0.8, response: 0.4 }, (x) => show(x), () => (stop.current = null))
    }, 700)
    const b = setTimeout(() => {
      stop.current?.()
      stop.current = springTo(pos.current, 0, 0, { damping: 0.8, response: 0.4 }, (x) => show(x), () => (stop.current = null))
    }, 1500)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [hint]) // eslint-disable-line react-hooks/exhaustive-deps

  const down = (ev: PointerEvent) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return
    if ((ev.target as HTMLElement).closest('.swipe-acts')) return
    stop.current?.()
    stop.current = null
    moved.current = false
    g.current = { x: ev.clientX, y: ev.clientY, from: pos.current, lock: null, trail: [{ t: ev.timeStamp, x: ev.clientX }] }
  }
  const move = (ev: PointerEvent) => {
    const s = g.current
    if (!s) return
    const dx = ev.clientX - s.x
    const dy = ev.clientY - s.y
    if (!s.lock) {
      if (Math.hypot(dx, dy) < 8) return
      s.lock = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (s.lock === 'h') row.current?.setPointerCapture(ev.pointerId)
    }
    if (s.lock !== 'h') return
    moved.current = true
    s.trail.push({ t: ev.timeStamp, x: ev.clientX })
    if (s.trail.length > 6) s.trail.shift()
    const k = sign()
    const along = Math.max(-startW * 1.6, Math.min(endW * 1.6, (s.from + dx) * k))
    show(along * k)
  }
  const up = () => {
    const s = g.current
    g.current = null
    if (!s || s.lock !== 'h') return
    const k = sign()
    const a = s.trail[0]
    const b = s.trail[s.trail.length - 1]
    const v = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0
    const rest = (pos.current + project(v)) * k
    // the start action is a single tap's worth: pulled far enough and let go, it happens (like Mail's "read")
    if (start && rest < -startW * 1.2) {
      settle(0)
      start.onClick()
      return
    }
    settle(rest > endW * 0.4 ? k * endW : start && rest < -startW * 0.4 ? -k * startW : 0, v)
  }
  // a drag (or a tap that only closes an open row) must not also click what is underneath
  const click = (ev: React.MouseEvent) => {
    if (moved.current || (open && !(ev.target as HTMLElement).closest('.swipe-acts'))) {
      ev.stopPropagation()
      ev.preventDefault()
      moved.current = false
    }
  }
  const cap = (a: SwipeAction) => (
    <button
      key={a.label}
      className={'swipe-cap ' + a.tone}
      tabIndex={open ? 0 : -1}
      aria-label={a.label}
      onClick={() => {
        settle(0)
        a.onClick()
      }}
    >
      <Icon as={a.icon} size="1.375rem" aria-hidden="true" />
    </button>
  )

  return (
    <div ref={row} className={'swipe-row' + (open ? ' open' : '')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={click}>
      <div className="swipe-card">{children}</div>
      {start && (
        <div className="swipe-acts start" aria-hidden={!open} style={{ width: startW + 16 }}>
          {cap(start)}
        </div>
      )}
      <div className="swipe-acts end" aria-hidden={!open} style={{ width: endW + 16 }}>
        {end.map(cap)}
      </div>
    </div>
  )
}

export const swipeLabels = { edit: () => t('עריכה'), remove: () => t('מחיקה') }
