import { Capacitor, registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { AlbumPhoto } from './match'

/** The trip album exists in the iOS app only; the website never shows or loads any of it. */
export const albumAvailable = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

export type AlbumAccess = 'full' | 'limited' | 'denied' | 'undetermined'

/** The app's own plugin (ios/App/App/TripPhotos.swift): reads the photo library, copies and uploads nothing. */
const TripPhotos = registerPlugin<{
  requestAccess(): Promise<{ status: AlbumAccess }>
  status(): Promise<{ status: AlbumAccess }>
  list(o: { from: number; to: number }): Promise<{ photos: AlbumPhoto[] }>
  thumbnail(o: { id: string; size: number }): Promise<{ url: string }>
  image(o: { id: string }): Promise<{ url: string }>
  pickMore(): Promise<void>
  openSettings(): Promise<void>
}>('TripPhotos')

const guard = async <T>(fallback: T, run: () => Promise<T>): Promise<T> => {
  if (!albumAvailable) return fallback
  try {
    return await run()
  } catch {
    return fallback
  }
}

export const albumStatus = () => guard<AlbumAccess>('undetermined', async () => (await TripPhotos.status()).status)
export const albumRequestAccess = () => guard<AlbumAccess>('denied', async () => (await TripPhotos.requestAccess()).status)
export const albumList = (from: number, to: number) =>
  guard<AlbumPhoto[]>([], async () => (await TripPhotos.list({ from, to })).photos)
export const albumPickMore = () => guard<void>(undefined, () => TripPhotos.pickMore())
export const albumOpenSettings = () => guard<void>(undefined, () => TripPhotos.openSettings())

const toSrc = (r: { url: string }) => Capacitor.convertFileSrc(r.url)
export const albumThumb = (id: string, size = 200) => guard<string>('', async () => toSrc(await TripPhotos.thumbnail({ id, size })))
export const albumImage = (id: string) => guard<string>('', async () => toSrc(await TripPhotos.image({ id })))

export type AlbumManual = Record<string, { day: number; placeId: string | null }>

// the web view's localStorage can be cleared by iOS; Preferences lives in UserDefaults
const manualKey = (tripId: string) => `album-manual-${tripId}`

export async function loadManual(tripId: string): Promise<AlbumManual> {
  try {
    const { value } = await Preferences.get({ key: manualKey(tripId) })
    const parsed = value ? JSON.parse(value) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export async function saveManual(tripId: string, m: AlbumManual) {
  try {
    await Preferences.set({ key: manualKey(tripId), value: JSON.stringify(m) })
  } catch {
    // the choice then lasts until the album closes
  }
}
