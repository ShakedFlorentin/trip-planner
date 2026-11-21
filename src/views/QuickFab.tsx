import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ListChecks, MapPin, Plus, Ticket, Wallet } from 'lucide-react'
import { isEn, t } from '../i18n'
import { requestAdd, type QuickKind } from '../quickAdd'
import { reducedMotion } from '../spring'
import type { LucideIcon } from '../icons'
import '../styles/wheel.css'

// the four quarters, counter-clockwise from the top right (mirrored in English): what is added from each
const ACTIONS: { kind: QuickKind; icon: LucideIcon; label: string }[] = [
  { kind: 'place', icon: MapPin, label: t('מקום') },
  { kind: 'expense', icon: Wallet, label: t('הוצאה') },
  { kind: 'list', icon: ListChecks, label: t('פריט לרשימה') },
  { kind: 'booking', icon: Ticket, label: t('הזמנה') },
]
/** A drag this far off the + opens the wheel at once; holding still opens it after HOLD_MS . */
const DRAG_PX = 8
const HOLD_MS = 220
/** Closer than this to where the finger went down, nothing is chosen (letting go there closes the wheel). */
const DEAD_PX = 34
/** Once a quarter is chosen it holds down to here, and a neighbour takes over only when the angle is this far inside it. */
const KEEP_PX = 28
const KEEP_DEG = 15
/** The + slides away after this much downward scroll, and comes back on any upward scroll, at the top, or this long after scrolling stops. */
const AWAY_PX = 10
const BACK_MS = 700

// quarter k's centre in degrees (maths angle, y up); English mirrors the wheel so "place" stays on the reading side
const centre = (k: number) => (isEn ? 180 - (45 + 90 * k) : 45 + 90 * k)
const P = (r: number, deg: number) => [r * Math.cos((deg * Math.PI) / 180), -r * Math.sin((deg * Math.PI) / 180)] as const
const f = (n: number) => n.toFixed(1)
const arc = (r: number, a1: number, a2: number) => {
  const [x1, y1] = P(r, Math.min(a1, a2))
  const [x2, y2] = P(r, Math.max(a1, a2))
  return `M${f(x1)} ${f(y1)}A${r} ${r} 0 0 0 ${f(x2)} ${f(y2)}`
}
const sector = (r1: number, r2: number, a1: number, a2: number) => {
  const [a, b] = P(r2, a1)
  const [c, d] = P(r2, a2)
  const [e, g] = P(r1, a2)
  const [h, i] = P(r1, a1)
  return `M${f(a)} ${f(b)}A${r2} ${r2} 0 0 0 ${f(c)} ${f(d)}L${f(e)} ${f(g)}A${r1} ${r1} 0 0 1 ${f(h)} ${f(i)}Z`
}
/** Which quarter a drag of (dx, dy) screen pixels points at, or -1 inside the dead zone. */
function degOf(dx: number, dy: number) {
  let deg = (Math.atan2(-dy, dx) * 180) / Math.PI
  if (isEn) deg = 180 - deg
  return ((deg % 360) + 360) % 360
}
function quarterOf(dx: number, dy: number, prev = -1) {
  if (Math.hypot(dx, dy) < (prev >= 0 ? KEEP_PX : DEAD_PX)) return -1
  const deg = degOf(dx, dy)
  const q = Math.floor(deg / 90)
  if (prev >= 0 && q !== prev) {
    const off = Math.abs(((deg - (prev * 90 + 45) + 540) % 360) - 180) // degrees from the chosen quarter's middle
    if (off < 45 + KEEP_DEG) return prev
  }
  return q
}
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const [x1, y1] = P(101, i * 5)
  const [x2, y2] = P(i % 6 ? 104 : 107, i * 5)
  return `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`
}).join('')

/**
 * The + of every screen. A tap adds what the screen is about, as before. Pressing and dragging off it opens the
 * action wheel at once (holding still opens it too, after a beat): the wheel tilts toward the finger, the quarter it
 * points at lights up, and letting go adds that from wherever you are. Letting go in the middle after a hold (the
 * finger never left the middle) leaves the wheel open: each quarter is a big button to tap, and the scrim or the +
 * closes it. Dragging out and coming back to the middle is a change of mind: the wheel closes by itself.
 * Keyboard: arrow up on the + opens it, arrows choose, Enter adds, Escape closes.
 */
export default function QuickFab({ label, onTap, children }: { label: string; onTap: () => void; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(-1)
  const [pinned, setPinned] = useState(false) // finger lifted with nothing chosen: the quarters are tappable buttons
  const [closing, setClosing] = useState<'pick' | 'cancel' | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const wheel = useRef<HTMLDivElement>(null)
  const needle = useRef<SVGGElement>(null)
  const press = useRef<{ x: number; y: number; id: number } | null>(null)
  const timer = useRef(0)
  const opened = useRef(false) // this press opened the wheel, so its click is not a tap
  const dragged = useRef(false) // this press went out of the middle: letting go back in the middle is a change of mind, so it closes
  const byKey = useRef(false)
  const selRef = useRef(-1)
  const closingRef = useRef(false)
  const pinnedAt = useRef(0) // the click that ends the press that pinned the wheel can land on the scrim: ignore it

  const choose = (k: number) => {
    selRef.current = k
    setSel(k)
  }
  const aim = (dx: number, dy: number) => {
    const d = Math.hypot(dx, dy)
    const w = wheel.current
    const n = needle.current
    if (w) {
      const still = reducedMotion()
      const tx = still ? 0 : Math.max(-14, Math.min(14, -dy * 0.2))
      const ty = still ? 0 : Math.max(-14, Math.min(14, dx * 0.2))
      w.style.setProperty('--tx', tx + 'deg')
      w.style.setProperty('--ty', ty + 'deg')
    }
    if (n) {
      const len = Math.min(62, d * 1.1)
      n.setAttribute('transform', `rotate(${f((Math.atan2(dy, dx) * 180) / Math.PI)}) scale(${f(Math.min(1, len / 60))} 1)`)
      n.style.opacity = d > 4 ? '1' : '0'
    }
    choose(quarterOf(dx, dy, selRef.current))
  }
  const show = (key: boolean) => {
    clearTimeout(timer.current)
    opened.current = true
    byKey.current = key
    setClosing(null)
    setPinned(false)
    setOpen(true)
    choose(key ? 0 : -1)
    if (!key) navigator.vibrate?.(10) // no haptics helper in the app yet (Swipe uses the same call); iOS ignores it
  }
  const finish = (k: number) => {
    press.current = null
    if (closingRef.current) return
    closingRef.current = true
    setClosing(k >= 0 ? 'pick' : 'cancel')
    window.setTimeout(
      () => {
        closingRef.current = false
        setOpen(false)
        setPinned(false)
        setClosing(null)
        choose(-1)
        if (k >= 0) requestAdd(ACTIONS[k].kind)
        else if (byKey.current) btn.current?.focus()
      },
      reducedMotion() ? 0 : k >= 0 ? 200 : 160,
    )
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  // a pinned wheel closes on Escape wherever focus is
  useEffect(() => {
    if (!pinned) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && finish(-1)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pinned]) // eslint-disable-line react-hooks/exhaustive-deps
  // slide away while the list scrolls down (it would cover a row), back on scroll up / at the top / when scrolling stops.
  // Scroll does not bubble, so one capture listener on the document hears the page and any sheet's own scroller.
  // Class toggled on the button directly: no re-render per scroll event.
  useEffect(() => {
    const b = btn.current
    if (!b) return
    const last = new WeakMap<object, number>()
    let el: Element | null = null
    let down = 0
    let raf = 0
    let settle = 0
    const back = () => {
      down = 0
      b.classList.remove('fab-away')
    }
    const read = () => {
      raf = 0
      if (!el) return
      const top = el.scrollTop
      const max = el.scrollHeight - el.clientHeight
      if (top < 0 || top > max) return // iOS rubber band
      const delta = top - (last.get(el) ?? top)
      last.set(el, top)
      if (delta === 0) return
      if (delta < 0 || top <= 0) return back()
      down += delta
      if (down > AWAY_PX && !b.classList.contains('open') && !b.matches(':focus-visible')) b.classList.add('fab-away')
    }
    const onScroll = (e: Event) => {
      const tg = e.target
      el = tg instanceof Element ? tg : document.scrollingElement
      if (!raf) raf = requestAnimationFrame(read)
      clearTimeout(settle)
      settle = window.setTimeout(back, BACK_MS)
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      cancelAnimationFrame(raf)
      clearTimeout(settle)
    }
  }, [])
  useEffect(() => {
    if (open) btn.current?.classList.remove('fab-away')
  }, [open])
  // with the keyboard, the needle points at the chosen quarter
  useEffect(() => {
    if (open && byKey.current && sel >= 0) {
      const [x, y] = P(55, centre(sel))
      aim(x, y)
    }
  }, [open, sel]) // eslint-disable-line react-hooks/exhaustive-deps

  // a tap anywhere on a quarter's ring (between the inner disk and the rim) counts for that quarter, not just on its button
  const ringQuarter = (e: { clientX: number; clientY: number }) => {
    const box = wheel.current?.querySelector('svg')?.getBoundingClientRect()
    if (!box) return -1
    const dx = e.clientX - (box.left + box.width / 2)
    const dy = e.clientY - (box.top + box.height / 2)
    const r = Math.hypot(dx, dy) / (box.width / 360)
    return r >= 98 && r <= 182 ? Math.floor(degOf(dx, dy) / 90) : -1
  }
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (open || e.button !== 0) return
    opened.current = false
    dragged.current = false
    press.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    timer.current = window.setTimeout(() => press.current && show(false), HOLD_MS)
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    if (!opened.current && Math.hypot(dx, dy) > DRAG_PX) show(false)
    if (Math.hypot(dx, dy) >= DEAD_PX) dragged.current = true
    if (opened.current) aim(dx, dy)
  }
  const up = (cancel: boolean) => () => {
    clearTimeout(timer.current)
    if (!press.current) return
    if (opened.current) {
      if (!cancel && selRef.current < 0 && !byKey.current && !dragged.current) {
        // held still and let go in the middle: keep the wheel open for a tap on a quarter (a drag that came back closes it)
        const w = wheel.current
        w?.style.setProperty('--tx', '0deg')
        w?.style.setProperty('--ty', '0deg')
        needle.current && (needle.current.style.opacity = '0')
        pinnedAt.current = Date.now()
        setPinned(true)
      } else finish(cancel ? -1 : selRef.current)
    }
    press.current = null
  }
  const click = () => {
    // a press that opened the wheel ends there; anything else is a tap (keyboard Enter included)
    if (opened.current) {
      opened.current = false
      return
    }
    if (open) return finish(-1) // the + while the wheel is open closes it
    onTap()
  }
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === 'ArrowUp' || e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
        e.preventDefault()
        show(true)
      }
      return
    }
    // up and left walk forward around the wheel, down and right back
    const step = (d: number) => choose(((Math.max(0, selRef.current) + d) % 4 + 4) % 4)
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(1)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(-1)
    else if (e.key === 'Enter' || e.key === ' ') {
      opened.current = true // the click this key makes is not a tap
      finish(selRef.current)
    } else if (e.key === 'Escape') finish(-1)
    else return
    e.preventDefault()
  }

  return (
    <>
      <button
        ref={btn}
        className={'fab quick-fab' + (open ? ' open' : '')}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up(false)}
        onPointerCancel={up(true)}
        onClick={click}
        onKeyDown={key}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && e.currentTarget.classList.remove('fab-away')}
        onContextMenu={(e) => e.preventDefault()}
      >
        {children ?? <Plus size={28} strokeWidth={2} aria-hidden="true" />}
      </button>
      {open &&
        createPortal(
          <div className={'wheel-layer' + (closing ? ' closing ' + closing : '') + (pinned ? ' pinned' : '')}>
            <div className="wheel-scrim" onClick={() => Date.now() - pinnedAt.current > 400 && finish(-1)} />
            <div
              ref={wheel}
              className="wheel"
              role="menu"
              aria-label={t('פעולות הוספה')}
              onPointerDown={(e) => pinned && !closing && choose(ringQuarter(e))}
              onClick={(e) => {
                const k = pinned && !closing ? ringQuarter(e) : -1
                if (k >= 0) finish(k)
              }}
            >
              <svg viewBox="-180 -180 360 360" width="340" height="340">
                <defs>
                  <radialGradient id="wheel-wedge" cx="0" cy="0" r="182" gradientUnits="userSpaceOnUse">
                    <stop offset=".5" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
                    <stop offset=".75" style={{ stopColor: 'var(--accent)', stopOpacity: 0.18 }} />
                    <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
                  </radialGradient>
                  <pattern id="wheel-dots" width="7" height="7" patternUnits="userSpaceOnUse">
                    <circle cx="3.5" cy="3.5" r=".9" className="dot" />
                  </pattern>
                </defs>
                <circle r="176" className="rim" />
                {[0, 90, 180, 270].map((a) => {
                  const [x1, y1] = P(100, a)
                  const [x2, y2] = P(150, a)
                  return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} className="divider" />
                })}
                {ACTIONS.map((a, k) => {
                  const c = centre(k)
                  const [bx, by] = P(122, c)
                  const [lx, ly] = [bx, by + (by > 0 ? 40 : -40)]
                  const on = sel === k
                  return (
                    <g key={a.kind} className={'quarter' + (on ? ' on' : sel >= 0 ? ' off' : '')}>
                      <path className="wedge" d={sector(98, 182, c - 44, c + 44)} fill="url(#wheel-wedge)" />
                      <path className="arc" d={arc(122, c - 40, c - 13)} />
                      <path className="arc" d={arc(122, c + 13, c + 40)} />
                      <g transform={`translate(${f(bx)} ${f(by)})`}>
                        <g className="bubble">
                          <circle r="23" />
                          <a.icon x={-12} y={-12} width={24} height={24} strokeWidth={2} aria-hidden="true" />
                        </g>
                      </g>
                      <text x={f(lx)} y={f(ly + 5)} textAnchor="middle">
                        {a.label}
                      </text>
                    </g>
                  )
                })}
                <circle r="98" className="disk" />
                <circle r="94" fill="url(#wheel-dots)" />
                <path className="ticks" d={TICKS} />
                <g ref={needle} className="needle" style={{ opacity: 0 }}>
                  <line x1="0" y1="0" x2="60" y2="0" />
                  <path d="M60 -7 72 0 60 7Z" />
                </g>
                <circle r="27" className="hub" />
                <g transform="translate(-17 -8)" className="hub-rings">
                  <circle cx="8" cy="8" r="6" />
                  <circle cx="26" cy="5" r="6" />
                </g>
              </svg>
              {ACTIONS.map((a, k) => {
                const [hx, hy] = P(143, centre(k))
                return (
                  <button
                    key={a.kind}
                    type="button"
                    role="menuitem"
                    className="wheel-hit"
                    aria-label={a.label}
                    tabIndex={pinned ? 0 : -1}
                    style={{ left: `${((180 + hx) / 360) * 100}%`, top: `${((180 + hy) / 360) * 100}%` }}
                    onPointerDown={() => choose(k)}
                    onFocus={() => pinned && choose(k)}
                    onClick={() => finish(k)}
                  />
                )
              })}
            </div>
            <div className="sr-only" aria-live="polite">
              {sel >= 0 ? t('נבחר: {what}', { what: ACTIONS[sel].label }) : t('נפתח גלגל פעולות')}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
