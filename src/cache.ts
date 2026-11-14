// The last good copy of some data, kept on the phone so the app opens with no network.
export const CACHE_PREFIX = 'cache:'

export function readCache<T>(key: string): { data: T; at: number } | null {
  try {
    const s = localStorage.getItem(CACHE_PREFIX + key)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export function writeCache(key: string, data: unknown) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, at: Date.now() }))
  } catch {
    // storage full or blocked: the app just won't have this copy offline
  }
}
