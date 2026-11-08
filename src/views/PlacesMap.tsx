import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DayInfo, GuidePlace, Place } from '../types'
import { cityLabel, currentDay, useTripTable } from '../lib'
import { t } from '../i18n'

export const PIN_COLORS: Record<string, string> = {
  food: '#d7263d',
  cafe: '#a0522d',
  sight: '#8e2de2',
  shopping: '#f08a24',
  nightlife: '#2b59c3',
  transport: '#2e86de',
  other: '#3f7d5a',
}
const LEGEND: [string, string][] = [
  ['food', t('אוכל')],
  ['sight', t('אטרקציות')],
  ['shopping', t('קניות')],
  ['nightlife', t('ברים ולילה')],
  ['other', t('אחר')],
]

type Props = {
  places: Place[]
  onPick: (p: Place) => void
  /** a guide's places, drawn as small dots under the trip's own pins */
  guide?: GuidePlace[]
  onPickGuide?: (g: GuidePlace) => void
  start: string | null
  numDays: number
  tripId: string
}

const CITY_ORDER = ['טוקיו', 'יוקוהמה', 'קיוטו', 'נארה', 'אוסקה', 'טיולי יום', 'טיול יום'] // he-only
const rank = (c: string) => (CITY_ORDER.indexOf(c) + 1 || 99)

/** Dark mode: the app's own choice, else the phone's. */
function isDark() {
  const forced = document.documentElement.dataset.theme
  return forced ? forced === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * The places on a map (49). It opens on the city of today (during the trip) or the first city, with a chip per city
 * and its count; nearby places merge into a circle with a number, and a tap on it zooms in. Pins take their category's
 * colour (small legend). The same provider's dark grey map in dark mode. No +/− buttons: pinch to zoom.
 */
export default function PlacesMap({ places, onPick, guide = [], onPickGuide, start, numDays, tripId }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const guideLayer = useRef<L.LayerGroup | null>(null)
  const { rows: days } = useTripTable<DayInfo>('day_info', tripId, 'day')
  const pts = useMemo(() => places.filter((p) => p.lat != null && p.lng != null), [places])
  const cities = useMemo(() => {
    const n = new Map<string, number>()
    for (const p of pts) if (p.city) n.set(p.city, (n.get(p.city) ?? 0) + 1)
    return [...n].sort((a, b) => rank(a[0]) - rank(b[0]))
  }, [pts])
  const today = currentDay(start, numDays)
  const todayCity = today ? (days.find((d) => d.day === today)?.city ?? '').split(' / ')[0] : ''
  const [city, setCity] = useState('')
  const shownCity = city || (cities.some(([c]) => c === todayCity) ? todayCity : cities[0]?.[0] ?? '')

  useEffect(() => {
    map.current = L.map(el.current!, { zoomControl: false, attributionControl: true }).setView([35.0, 136.5], 6)
    // no tile service has Hebrew names for Tokyo's streets and areas; Esri labels Japan in English, not Japanese.
    // Dark mode gets Esri's dark grey base with its labels on top (free, no key)
    const base = 'https://server.arcgisonline.com/ArcGIS/rest/services/'
    if (isDark()) {
      L.tileLayer(base + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: 'Tiles © Esri' }).addTo(map.current)
      L.tileLayer(base + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(map.current)
    } else {
      L.tileLayer(base + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles © Esri' }).addTo(map.current)
    }
    guideLayer.current = L.layerGroup().addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // the pins, merged into numbered circles where they would sit on top of each other
  useEffect(() => {
    const m = map.current
    if (!m || !layer.current) return
    const draw = () => {
      const lay = layer.current!
      lay.clearLayers()
      const cells: { pts: Place[]; x: number; y: number }[] = []
      for (const p of pts) {
        const xy = m.latLngToLayerPoint([p.lat!, p.lng!])
        const near = cells.find((c) => Math.hypot(c.x - xy.x, c.y - xy.y) < 34)
        if (near) near.pts.push(p)
        else cells.push({ pts: [p], x: xy.x, y: xy.y })
      }
      for (const c of cells) {
        if (c.pts.length === 1) {
          const p = c.pts[0]
          const icon = L.divIcon({
            className: '',
            html: `<div class="pin${p.visited ? ' visited' : ''}" style="background:${PIN_COLORS[p.category] ?? PIN_COLORS.other}"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          })
          L.marker([p.lat!, p.lng!], { icon, title: p.name }).on('click', () => onPick(p)).addTo(lay)
        } else {
          const b = L.latLngBounds(c.pts.map((p) => [p.lat!, p.lng!]))
          const icon = L.divIcon({ className: '', html: `<div class="pin-cluster">${c.pts.length}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] })
          L.marker(b.getCenter(), { icon })
            .on('click', () => m.fitBounds(b, { padding: [50, 50], maxZoom: Math.max(m.getZoom() + 2, 15) }))
            .addTo(lay)
        }
      }
    }
    draw()
    m.on('zoomend', draw)
    return () => {
      m.off('zoomend', draw)
    }
  }, [pts, onPick])

  // frame the chosen city
  useEffect(() => {
    const m = map.current
    if (!m) return
    const inCity = pts.filter((p) => p.city === shownCity)
    const frame = inCity.length ? inCity : pts
    if (frame.length) m.fitBounds(L.latLngBounds(frame.map((p) => [p.lat!, p.lng!])), { padding: [40, 40], maxZoom: 15 })
  }, [shownCity, pts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map.current || !guideLayer.current) return
    guideLayer.current.clearLayers()
    const icon = L.divIcon({ className: '', html: '<div class="pin guide"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })
    for (const g of guide) L.marker([g.lat, g.lng], { icon, title: g.name }).on('click', () => onPickGuide?.(g)).addTo(guideLayer.current)
  }, [guide, onPickGuide])

  const used = new Set(pts.map((p) => (PIN_COLORS[p.category] ? p.category : 'other')))
  return (
    <div className="map-wrap">
      <div ref={el} className="map" />
      {cities.length > 1 && (
        <div className="map-cities chips scroll">
          {cities.map(([c, n]) => (
            <button key={c} className={'chip' + (shownCity === c ? ' on' : '')} onClick={() => setCity(c)}>
              {cityLabel(c)} <span className="count">{n}</span>
            </button>
          ))}
        </div>
      )}
      <div className="map-legend" aria-hidden="true">
        {LEGEND.filter(([k]) => used.has(k)).map(([k, label]) => (
          <span key={k}>
            <i style={{ background: PIN_COLORS[k] }} /> {label}
          </span>
        ))}
      </div>
    </div>
  )
}
