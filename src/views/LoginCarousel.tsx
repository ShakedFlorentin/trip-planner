import { useEffect, useRef, useState } from 'react'
import { isEn, t } from '../i18n'
import { reducedMotion } from '../spring'
import '../styles/login-carousel.css'

/** The three app screens it shows (public/landing/, made from the promo's app screens, one set per language). */
const KEYS = ['discover', 'plan', 'book'] as const
const NAMES = [t('מחליקים ובוחרים ביחד'), t('המסלול, יום אחרי יום'), t('כל ההזמנות בכיס')]
const src = (k: string) => `${import.meta.env.BASE_URL}landing/${k}${isEn ? '-en' : ''}.webp`

/** Columns of dots across a screen: the same coarseness at every size. */
const COLS = 36
/** How long a screen stays before the next one slides in, and how long the slide takes. */
const STAY_MS = 2800
const SLIDE_MS = 640

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const mod = (k: number) => ((k % 3) + 3) % 3

type Mat = { ink: Path2D[]; red: Path2D; out: Path2D }

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/** A point at distance s along a rounded rectangle's outline, clockwise from the top-left corner's end. */
function perimeter(s: number, W: number, H: number, R: number): [number, number] {
  const q = (Math.PI * R) / 2
  const segs: [number, (t: number) => [number, number]][] = [
    [W - 2 * R, (t) => [R + t, 0]],
    [q, (t) => [W - R + R * Math.cos(-Math.PI / 2 + t / R), R + R * Math.sin(-Math.PI / 2 + t / R)]],
    [H - 2 * R, (t) => [W, R + t]],
    [q, (t) => [W - R + R * Math.cos(t / R), H - R + R * Math.sin(t / R)]],
    [W - 2 * R, (t) => [W - R - t, H]],
    [q, (t) => [R + R * Math.cos(Math.PI / 2 + t / R), H - R + R * Math.sin(Math.PI / 2 + t / R)]],
    [H - 2 * R, (t) => [0, H - R - t]],
    [q, (t) => [R + R * Math.cos(Math.PI + t / R), R + R * Math.sin(Math.PI + t / R)]],
  ]
  for (const [len, f] of segs) {
    if (s <= len) return f(s)
    s -= len
  }
  return [R, 0]
}

/** A screen as dots: darker pixels make bigger, darker dots (six steps), the red ones stay red, and a dotted outline. */
function dotMatrix(im: HTMLImageElement, W: number, H: number, R: number): Mat {
  const sp = W / COLS
  const rows = Math.round(H / sp)
  const c = document.createElement('canvas')
  c.width = COLS
  c.height = rows
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(im, 0, 0, COLS, rows)
  const d = g.getImageData(0, 0, COLS, rows).data
  const k = W / 152
  const ink = Array.from({ length: 6 }, () => new Path2D())
  const red = new Path2D()
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < COLS; i++) {
      const p = (j * COLS + i) * 4
      const r = d[p], gg = d[p + 1], b = d[p + 2]
      const x = (i + 0.5) * sp, y = (j + 0.5) * (H / rows)
      if (r > 130 && gg < 95 && b < 115) {
        red.moveTo(x + 1.15 * k, y)
        red.arc(x, y, 1.15 * k, 0, 6.3)
        continue
      }
      const a = clamp((1 - (0.299 * r + 0.587 * gg + 0.114 * b) / 255 - 0.05) * 1.35)
      if (a < 0.07) continue
      const lv = Math.min(5, Math.floor(a * 6))
      const rad = (0.7 + a * 0.55) * k
      ink[lv].moveTo(x + rad, y)
      ink[lv].arc(x, y, rad, 0, 6.3)
    }
  const out = new Path2D()
  const per = 2 * (W + H - 4 * R) + 2 * Math.PI * R
  const n = Math.round(per / (5 * k))
  for (let q = 0; q < n; q++) {
    const [x, y] = perimeter((q / n) * per, W, H, R)
    out.moveTo(x + 0.9 * k, y)
    out.arc(x, y, 0.9 * k, 0, 6.3)
  }
  return { ink, red, out }
}

/**
 * The sign-in screen's carousel: a phone in the middle showing an app screen, the screens before and after it drawn
 * in dots on a dotted grid, turning sharp as they slide into the phone. It moves on its own (not with reduced
 * motion), follows a swipe, and a tap moves it on. It goes away while the keyboard is up (login-carousel.css).
 */
export default function LoginCarousel() {
  const box = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const [at, setAt] = useState(0)

  useEffect(() => {
    const wrap = box.current!, canvas = cv.current!
    const ctx = canvas.getContext('2d')!
    // in Hebrew the next screen waits on the left and the strip moves right; English mirrors it
    const dir = isEn ? 1 : -1
    let cw = 0, ch = 0, dpr = 1, W = 0, H = 0, R = 0, pitch = 0, py = 0
    let pos = 0, target = 0
    let anim: { from: number; to: number; start: number; dur: number } | null = null
    let raf = 0, timer = 0, dragging = false, alive = true
    let ink = '#000', accent = '#bc002d', dark = false
    let grid: CanvasPattern | null = null
    const imgs = KEYS.map((k) => {
      const im = new Image()
      im.src = src(k)
      return im
    })
    let mats: (Mat | null)[] = [null, null, null]

    const colours = () => {
      const cs = getComputedStyle(canvas)
      ink = cs.color
      accent = cs.getPropertyValue('--accent').trim() || '#bc002d'
      dark = matchMedia('(prefers-color-scheme: dark)').matches
      const pat = document.createElement('canvas')
      pat.width = pat.height = Math.round(7 * dpr)
      const p = pat.getContext('2d')!
      p.fillStyle = ink
      p.globalAlpha = dark ? 0.16 : 0.1
      p.beginPath()
      p.arc(3.5 * dpr, 3.5 * dpr, 0.75 * dpr, 0, 7)
      p.fill()
      grid = ctx.createPattern(pat, 'repeat')
    }

    const size = () => {
      cw = wrap.clientWidth
      ch = wrap.clientHeight
      wrap.classList.toggle('lc-off', ch < 150)
      if (ch < 150) return
      dpr = Math.min(3, window.devicePixelRatio || 1)
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      // the phone fills the height, leaving room for its shadow; a screen is the iPhone's shape
      H = ch - 34
      W = Math.round(H * (402 / 874))
      R = W * 0.145
      pitch = W * 1.12
      py = 10
      colours()
      mats = imgs.map((im) => (im.complete && im.naturalWidth ? dotMatrix(im, W, H, R) : null))
      draw()
    }

    const slideX = (k: number) => cw / 2 - W / 2 + dir * (k - pos) * pitch

    function draw() {
      if (!W) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cw, ch)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      if (grid) {
        ctx.fillStyle = grid
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        // the grid fades out above and below, so the strip has no hard edge
        const fade = ctx.createLinearGradient(0, 0, 0, canvas.height)
        fade.addColorStop(0, 'rgba(0,0,0,0)')
        fade.addColorStop(0.18, '#000')
        fade.addColorStop(0.82, '#000')
        fade.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.globalCompositeOperation = 'destination-in'
        ctx.fillStyle = fade
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
      }
      ctx.restore()
      const px = cw / 2 - W / 2
      const base = Math.floor(pos)
      // the screens outside the phone, in dots
      for (let k = base - 3; k <= base + 3; k++) {
        const x = slideX(k)
        const m = mats[mod(k)]
        if (!m || x > cw || x + W < 0) continue
        ctx.save()
        ctx.translate(x, py)
        ctx.fillStyle = ink
        for (let lv = 0; lv < 6; lv++) {
          ctx.globalAlpha = 0.3 + lv * 0.14
          ctx.fill(m.ink[lv])
        }
        ctx.globalAlpha = 0.85
        ctx.fillStyle = accent
        ctx.fill(m.red)
        ctx.globalAlpha = 0.42
        ctx.fillStyle = ink
        ctx.fill(m.out)
        ctx.restore()
      }
      // the phone, and whatever part of a screen is inside it, sharp
      const bez = Math.max(4, W * 0.04)
      ctx.save()
      ctx.shadowColor = dark ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.26)'
      ctx.shadowBlur = 24
      ctx.shadowOffsetY = 12
      ctx.fillStyle = '#141414'
      roundRect(ctx, px - bez, py - bez, W + 2 * bez, H + 2 * bez, R + bez)
      ctx.fill()
      ctx.restore()
      if (dark) {
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,.16)'
        ctx.lineWidth = 1
        roundRect(ctx, px - bez + 0.5, py - bez + 0.5, W + 2 * bez - 1, H + 2 * bez - 1, R + bez)
        ctx.stroke()
        ctx.restore()
      }
      ctx.save()
      roundRect(ctx, px, py, W, H, R)
      ctx.clip()
      ctx.fillStyle = '#fff'
      ctx.fillRect(px, py, W, H)
      for (let k = base - 1; k <= base + 2; k++) {
        const x = slideX(k)
        const im = imgs[mod(k)]
        if (x > px + W || x + W < px || !im.complete || !im.naturalWidth) continue
        ctx.drawImage(im, x, py, W, H)
      }
      ctx.restore()
    }

    const schedule = () => {
      clearTimeout(timer)
      if (!reducedMotion() && alive) timer = window.setTimeout(() => goTo(Math.round(target) + 1), STAY_MS)
    }
    const run = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    function goTo(to: number) {
      target = to
      anim = { from: pos, to, start: performance.now(), dur: reducedMotion() ? 0 : SLIDE_MS }
      setAt(mod(Math.round(to)))
      run()
    }
    function frame(now: number) {
      raf = 0
      if (anim) {
        const k = anim.dur ? clamp((now - anim.start) / anim.dur) : 1
        pos = anim.from + (anim.to - anim.from) * easeIO(k)
        if (k >= 1) {
          anim = null
          pos = target
          schedule()
        }
      }
      draw()
      if (anim || dragging) run()
    }

    Promise.all(imgs.map((im) => im.decode().catch(() => undefined))).then(() => {
      if (!alive) return
      size()
      schedule()
    })
    const ro = new ResizeObserver(() => size())
    ro.observe(wrap)
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => {
      colours()
      draw()
    }
    scheme.addEventListener('change', onScheme)
    // nothing to move while the app is in the background
    const onVis = () => (document.hidden ? clearTimeout(timer) : schedule())
    document.addEventListener('visibilitychange', onVis)

    // a swipe drags the strip and lets go to the nearest screen (a flick goes one on); a tap moves on
    let sx = 0, sp = 0, lx = 0, lt = 0, vx = 0, moved = false
    const down = (e: PointerEvent) => {
      dragging = true
      moved = false
      anim = null
      clearTimeout(timer)
      canvas.setPointerCapture(e.pointerId)
      sx = lx = e.clientX
      sp = pos
      lt = performance.now()
      vx = 0
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const now = performance.now()
      vx = (e.clientX - lx) / Math.max(1, now - lt)
      lx = e.clientX
      lt = now
      if (Math.abs(e.clientX - sx) > 6) moved = true
      // the strip follows the finger
      pos = sp - (dir * (e.clientX - sx)) / pitch
      run()
    }
    const up = () => {
      if (!dragging) return
      dragging = false
      if (!moved) return goTo(Math.round(pos) + 1)
      // a flick carries it on to the next screen, but one swipe never goes more than one screen
      const from = Math.round(sp)
      goTo(clamp(Math.round(pos + clamp(-dir * vx * 2.2, -0.6, 0.6)), from - 1, from + 1))
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)

    return () => {
      alive = false
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      ro.disconnect()
      scheme.removeEventListener('change', onScheme)
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [])

  return (
    <div className="lc">
      <div className="lc-box" ref={box}>
        <canvas ref={cv} role="img" aria-label={t('מסכים מ-Toogo: גילוי, מסלול והזמנות')} />
      </div>
      <p className="lc-cap" aria-hidden="true">
        <span key={at}>{NAMES[at]}</span>
        <span className="lc-pager">
          {KEYS.map((k, i) => (
            <i key={k} className={i === at ? 'on' : ''} />
          ))}
        </span>
      </p>
    </div>
  )
}
