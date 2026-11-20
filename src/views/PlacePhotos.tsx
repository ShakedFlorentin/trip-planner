import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogTitle } from '@ui-sdk/react/dialog'
import { supabase } from '../supabase'
import { EmptyState, Sheet } from '../ui'
import { Icon } from '../icons'
import { t } from '../i18n'
import { safePhoto } from '../lib'
import { Camera, Images, X } from 'lucide-react'
import { openExternal, privacyUrl } from '../native'
import { MAX_PHOTOS_PER_REVIEW } from './photoSend'

/** One picked photo as a 72px square with its remove button; the preview URL is made and freed with the tile. */
function PickedTile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="pp-tile pp-picked">
      <img src={url} alt="" />
      <button type="button" className="pp-x" aria-label={t('הסרת תמונה')} onClick={onRemove}>
        <Icon as={X} size={14} />
      </button>
    </div>
  )
}

/**
 * The "photos from the place" part of the day-after review: a camera tile and a gallery tile, the picked photos with
 * their ✕ (at most 5), and, once something is picked, a line saying sending means agreeing to the terms. Sending is the parent's job
 * (sendPhotos); the files stay here until it says they went.
 */
export function PhotoPicker(props: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}) {
  const { files, onChange, disabled } = props
  const room = MAX_PHOTOS_PER_REVIEW - files.length
  const add = (list: FileList | null) => {
    if (list?.length) onChange([...files, ...Array.from(list)].slice(0, MAX_PHOTOS_PER_REVIEW))
  }
  // an input that picked the same photo again would not fire onChange: clear it after each use
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    add(e.target.files)
    e.target.value = ''
  }
  return (
    <div className="pp" role="group" aria-labelledby="pp-title">
      <div className="pp-head" id="pp-title">
        <b>{t('תמונות מהמקום')}</b> <span className="muted">{t('(לא חובה)')}</span>
      </div>
      <div className="pp-tiles">
        {files.map((f, i) => (
          <PickedTile key={`${f.name}-${f.size}-${f.lastModified}-${i}`} file={f} onRemove={() => onChange(files.filter((_, j) => j !== i))} />
        ))}
        {room > 0 && (
          <>
            <label className="pp-tile pp-add">
              <Icon as={Camera} size={26} />
              <span className="pp-sr">{t('צילום תמונה')}</span>
              <input type="file" accept="image/*" capture="environment" disabled={disabled} onChange={pick} />
            </label>
            <label className="pp-tile pp-add">
              <Icon as={Images} size={26} />
              <span className="pp-sr">{t('בחירה מהגלריה')}</span>
              <input type="file" accept="image/*" multiple disabled={disabled} onChange={pick} />
            </label>
          </>
        )}
      </div>
      {files.length === 0 ? (
        <p className="muted small pp-hint">{t('צלמו עכשיו או בחרו מהגלריה')}</p>
      ) : (
        <>
          <p className="muted small pp-terms">
            {t('בשליחה אתם מאשרים את')}{' '}
            <button type="button" className="link pp-terms-link" onClick={() => openExternal(privacyUrl() + '#terms')}>
              {t('תנאי השימוש')}
            </button>{' '}
            {t('לתמונות.')}
          </p>
          <p className="muted small">{t('התמונות יופיעו בכרטיס אחרי שנאשר אותן.')}</p>
        </>
      )}
    </div>
  )
}

/** Approved traveller photos, full screen: swipe sideways between them (the dialog traps focus and closes on Escape). */
export function PhotoViewer({ urls, start, onClose }: { urls: string[]; start: number; onClose: () => void }) {
  const track = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(start)
  useEffect(() => {
    const el = track.current
    if (el) el.scrollLeft = (el.children[start] as HTMLElement | undefined)?.offsetLeft ?? 0
  }, [start])
  const onScroll = () => {
    const el = track.current
    if (el && el.clientWidth) setAt(Math.round(Math.abs(el.scrollLeft) / el.clientWidth))
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogBackdrop className="pv-backdrop" />
      <DialogContent className="pv" initialFocus="[data-pv-close]">
        <DialogTitle className="pp-sr">{t('תמונות של מטיילים')}</DialogTitle>
        <DialogClose className="pv-close" data-pv-close aria-label={t('סגירה')}>
          <Icon as={X} />
        </DialogClose>
        <div className="pv-track" ref={track} onScroll={onScroll}>
          {urls.map((u, i) => (
            <img key={u} className="pv-img" src={u} alt={t('תמונה {n} מתוך {total}', { n: i + 1, total: urls.length })} />
          ))}
        </div>
        {urls.length > 1 && <p className="pv-count">{t('{n} מתוך {total}', { n: Math.min(at, urls.length - 1) + 1, total: urls.length })}</p>}
      </DialogContent>
    </Dialog>
  )
}

type Waiting = { id: string; path: string; created_at: string; place_library: { name: string } | null; url?: string }

/** The admin's entry on the More tab, shown only to app admins, with the count of photos waiting. */
/**
 * "תמונות לאישור" in the ☰ menu (52): only for the app builder (accounts in app_admins), and only while photos are
 * waiting, with their count in red. Everyone else never sees it.
 */
export function PhotoReviewRow() {
  const [admin, setAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Waiting[]>([])
  const [err, setErr] = useState('')

  const load = async () => {
    const { data } = await supabase
      .from('photo_submissions')
      .select('id,path,created_at,place_library(name)')
      .eq('status', 'pending')
      .order('created_at')
      .limit(30)
      .returns<Waiting[]>()
    const list = data ?? []
    const signed = list.length ? (await supabase.storage.from('photo-submissions').createSignedUrls(list.map((r) => r.path), 600)).data : null
    setRows(list.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? undefined })))
  }

  useEffect(() => {
    void supabase.rpc('is_app_admin').then(({ data }) => {
      if (data !== true) return
      setAdmin(true)
      void load()
    })
  }, [])

  const review = async (id: string, approve: boolean) => {
    setErr('')
    const { error } = await supabase.functions.invoke('review-photo', { body: { id, approve } })
    if (error) return setErr(t('הפעולה לא הצליחה. אפשר לנסות שוב.'))
    setRows((r) => r.filter((x) => x.id !== id))
  }

  if (!admin || (!rows.length && !open)) return null
  return (
    <>
      <button className="group-row" onClick={() => setOpen(true)}>
        <span className="menu-tile" style={{ background: '#8e8e93' }}>
          <Icon as={Camera} />
        </span>
        <span className="k">{t('תמונות לאישור')}</span>
        <span className="badge">{rows.length}</span>
      </button>
      {open && (
        <Sheet title={t('תמונות לאישור')} onClose={() => setOpen(false)}>
          {err && <p className="msg" role="alert">{err}</p>}
          {!rows.length && <EmptyState icon={Camera} title={t('אין תמונות שממתינות לאישור')} />}
          {rows.map((r) => (
            <div key={r.id} className="photo-review">
              {safePhoto(r.url) && <img className="photo-preview" src={safePhoto(r.url)} alt="" />}
              <b dir="auto">{r.place_library?.name}</b>
              <div className="row">
                <button className="primary" onClick={() => review(r.id, true)}>{t('אישור')}</button>
                <button className="link" onClick={() => review(r.id, false)}>{t('דחייה')}</button>
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </>
  )
}
