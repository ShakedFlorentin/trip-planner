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
/** A drag this far off the + opens the wheel at once; holding still opens it after HOLD_MS. */
const DRAG_PX = 8
const HOLD_MS = 220
/** Closer than this to where the finger went down, nothing is chosen (letting go there closes the wheel). */
const DEAD_PX = 16

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
function quarterOf(dx: number, dy: number) {
  if (Math.hypot(dx, dy) < DEAD_PX) return -1
  let deg = (Math.atan2(-dy, dx) * 180) / Math.PI
  if (isEn) deg = 180 - deg
  return Math.floor((((deg % 360) + 360) % 360) / 90)
}
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const [x1, y1] = P(101, i * 5)
  const [x2, y2] = P(i % 6 ? 104 : 107, i * 5)
  return `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`
}).join('')

/**
 * The + of every screen. A tap adds what the screen is about, as before. Pressing and dragging off it opens the
 * action wheel at once (holding still opens it too, after a beat): the wheel tilts toward the finger, the quarter it
 * points at lights up, and letting go adds that from wherever you are. Letting go in the middle closes it.
 * Keyboard: arrow up on the + opens it, arrows choose, Enter adds, Escape closes.
 */
export default function QuickFab({ label, onTap, children }: { label: string; onTap: () => void; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(-1)
  const [closing, setClosing] = useState<'pick' | 'cancel' | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const wheel = useRef<HTMLDivElement>(null)
  const needle = useRef<SVGGElement>(null)
  const press = useRef<{ x: number; y: number; id: number } | null>(null)
  const timer = useRef(0)
  const opened = useRef(false) // this press opened the wheel, so its click is not a tap
  const byKey = useRef(false)
  const selRef = useRef(-1)

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
    choose(quarterOf(dx, dy))
  }
  const show = (key: boolean) => {
    clearTimeout(timer.current)
    opened.current = true
    byKey.current = key
    setClosing(null)
    setOpen(true)
    choose(key ? 0 : -1)
  }
  const finish = (k: number) => {
    press.current = null
    setClosing(k >= 0 ? 'pick' : 'cancel')
    window.setTimeout(
      () => {
        setOpen(false)
        setClosing(null)
        choose(-1)
        if (k >= 0) requestAdd(ACTIONS[k].kind)
        else if (byKey.current) btn.current?.focus()
      },
      reducedMotion() ? 0 : k >= 0 ? 200 : 160,
    )
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  // with the keyboard, the needle points at the chosen quarter
  useEffect(() => {
    if (open && byKey.current && sel >= 0) {
      const [x, y] = P(55, centre(sel))
      aim(x, y)
    }
  }, [open, sel]) // eslint-disable-line react-hooks/exhaustive-deps

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (open || e.button !== 0) return
    opened.current = false
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
    if (opened.current) aim(dx, dy)
  }
  const up = (cancel: boolean) => () => {
    clearTimeout(timer.current)
    if (!press.current) return
    if (opened.current) finish(cancel ? -1 : selRef.current)
    press.current = null
  }
  const click = () => {
    // a press that opened the wheel ends there; anything else is a tap (keyboard Enter included)
    if (opened.current) {
      opened.current = false
      return
    }
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
        onContextMenu={(e) => e.preventDefault()}
      >
        {children ?? <Plus size={28} strokeWidth={2} aria-hidden="true" />}
      </button>
      {open &&
        createPortal(
          <div className={'wheel-layer' + (closing ? ' closing ' + closing : '')}>
            <div className="wheel-scrim" />
            <div ref={wheel} className="wheel" role="menu" aria-label={t('פעולות הוספה')}>
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
                  const [lx, ly] = P(164, c)
                  const on = sel === k
                  return (
                    <g key={a.kind} className={'quarter' + (on ? ' on' : sel >= 0 ? ' off' : '')} role="menuitem" aria-label={a.label}>
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
