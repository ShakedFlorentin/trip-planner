import { supabase } from './supabase'

// Booking documents are saved in Cache Storage so they open with no network (underground, in the air). The key is
// only a unique URL-shaped name: nothing is ever fetched from it. Paths are uuids, so a saved copy never goes stale.
export const docKey = (path: string) => new URL('__doc/' + path.split('/').map(encodeURIComponent).join('/'), document.baseURI).href

// Booking documents are PDFs or photos. Anything else is refused on upload, and a saved copy opens under one of these
// types or as a plain download: a file opened from a blob: URL runs on the app's own origin, so an SVG or HTML file
// typed as itself could run script with the viewer's session.
export const DOC_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
export const DOC_ACCEPT = DOC_TYPES.join(',')
export const isDocType = (type: string) => DOC_TYPES.includes(type)

export async function savedDoc(path: string) {
  try {
    return (await (await caches.open('docs')).match(docKey(path))) ?? null
  } catch {
    return null
  }
}

export async function saveDoc(path: string) {
  try {
    const { data } = await supabase.storage.from('docs').createSignedUrl(path, 600)
    if (!data) return false
    const res = await fetch(data.signedUrl)
    if (!res.ok) return false
    await (await caches.open('docs')).put(docKey(path), res)
    return true
  } catch {
    return false
  }
}

