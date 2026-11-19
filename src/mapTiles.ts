import { useEffect, useState } from 'react'

export const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/'
export const TILE_NATIVE_ZOOM = 16 // Esri's gray canvas stops at 16; closer views enlarge it

/** Esri Gray Canvas: the base and its label overlay, light or dark. Tile URL templates, {z}/{y}/{x}. */
export function grayUrls(dark: boolean) {
  const set = dark ? 'Dark' : 'Light'
  return {
    base: `${ESRI}Canvas/World_${set}_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}Canvas/World_${set}_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  }
}

/** html[data-theme] when light or dark was picked in Settings, else the phone's setting. */
export function isDark() {
  const th = document.documentElement.dataset.theme
  return th ? th === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}

/** Calls back on every theme change (the Settings row or the phone), at once. Returns the stop function. */
export function watchTheme(cb: (dark: boolean) => void) {
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const on = () => cb(isDark())
  const mo = new MutationObserver(on)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  mq.addEventListener('change', on)
  return () => {
    mo.disconnect()
    mq.removeEventListener('change', on)
  }
}

export function useDark() {
  const [dark, setDark] = useState(isDark)
  useEffect(() => watchTheme(setDark), [])
  return dark
}
