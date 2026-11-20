import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogTitle } from '@ui-sdk/react/dialog'
import { X } from 'lucide-react'
import { Icon } from '../icons'
import { t } from '../i18n'
import { albumImage, albumThumb } from '../album/photos'

const thumbs = new Map<string, Promise<string>>()
/** One preview per photo and size for the whole session; the plugin keeps the file, this keeps the answer. */
export function thumbUrl(id: string, size: number) {
  const key = id + ':' + size
  let p = thumbs.get(key)
  if (!p) {
    p = albumThumb(id, size)
    thumbs.set(key, p)
  }
  return p
}

/** A square preview, fetched when it scrolls near the screen; a grey tile until then (iCloud photos can take a moment). */
export function Thumb({ id, size = 240, className = '' }: { id: string; size?: number; className?: string }) {
  const box = useRef<HTMLSpanElement>(null)
  const [src, setSrc] = useState('')
  useEffect(() => {
    const el = box.current
    if (!el) return
    let live = true
    const load = () => void thumbUrl(id, size).then((u) => live && setSrc(u))
    if (typeof IntersectionObserver === 'undefined') {
      load()
      return () => { live = false }
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        io.disconnect()
        load()
      }
    }, { rootMargin: '300px' })
    io.observe(el)
    return () => {
      live = false
      io.disconnect()
    }
  }, [id, size])
  return (
    <span ref={box} className={'al-thumb ' + className} data-ready={src ? '' : undefined}>
      {src && <img src={src} alt="" decoding="async" draggable={false} />}
    </span>
  )
}

/** Full-screen viewer: swipe between a place's photos; the full-size file is read from the library only when it comes near. */
export function Viewer(props: { ids: string[]; start: number; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(props.start)
  const slides = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => {
    slides.current[props.start]?.scrollIntoView({ inline: 'start', block: 'nearest' })
  }, [props.start])
  useEffect(() => {
    const els = slides.current.filter((e): e is HTMLDivElement => !!e)
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.i))
    }, { threshold: 0.6 })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [props.ids])
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogBackdrop className="al-viewer-backdrop" />
      <DialogContent className="al-viewer" initialFocus="[data-viewer-close]">
        <DialogTitle className="al-viewer-title" dir="auto">
          {props.title}
        </DialogTitle>
        <span className="al-viewer-count" aria-live="polite">
          {index + 1} / {props.ids.length}
        </span>
        <DialogClose className="al-viewer-close" aria-label={t('סגירה')} data-viewer-close>
          <Icon as={X} size={22} />
        </DialogClose>
        <div className="al-viewer-strip">
          {props.ids.map((id, i) => (
            <div key={id} data-i={i} ref={(el) => { slides.current[i] = el }} className="al-viewer-slide">
              {Math.abs(i - index) <= 1 && <Full id={id} />}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Full({ id }: { id: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let live = true
    void albumImage(id).then((u) => live && setSrc(u))
    return () => { live = false }
  }, [id])
  return src ? <img src={src} alt="" draggable={false} /> : <span className="al-viewer-wait" />
}
