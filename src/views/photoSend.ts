import { supabase } from '../supabase'

const MAX_SIDE = 1600
export const MAX_PHOTOS_PER_REVIEW = 5

/** The picked photo as a JPEG at most 1600px long; drawing it anew also drops its location and other hidden data. */
export async function toJpeg(file: File) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise<Blob>((done, fail) => canvas.toBlob((b) => (b ? done(b) : fail(new Error('no image'))), 'image/jpeg', 0.85))
}

/**
 * Sends a traveller's own photos for approval, one by one (private upload, then a `pending` row). A file whose upload
 * or row fails goes back in `failed` to be retried; the 20-waiting cap shows up as the row being refused by its
 * policy, and then nothing more is sent: the rest also come back in `failed`.
 */
export async function sendPhotos(files: File[], o: { tripId: string; libraryId: string }): Promise<{ sent: number; failed: File[]; capped: boolean }> {
  let sent = 0
  let capped = false
  const failed: File[] = []
  const { data: auth } = await supabase.auth.getUser()
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (capped) {
      failed.push(file)
      continue
    }
    const path = `${o.tripId}/${auth.user?.id}/${crypto.randomUUID()}.jpg`
    try {
      const up = await supabase.storage.from('photo-submissions').upload(path, await toJpeg(file), { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      // rights_confirmed is required by the table's check; it now means "sent under the terms of use"
      const row = await supabase.from('photo_submissions').insert({ library_id: o.libraryId, trip_id: o.tripId, path, rights_confirmed: true })
      if (row.error) {
        await supabase.storage.from('photo-submissions').remove([path])
        // row-level security refusing the insert is the waiting cap (the trip membership was already true to open the review)
        if (row.error.code === '42501') capped = true
        throw row.error
      }
      sent++
    } catch (e) {
      console.error('photo not sent', e)
      failed.push(file)
    }
  }
  return { sent, failed, capped }
}
