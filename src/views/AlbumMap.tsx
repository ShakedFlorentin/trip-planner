import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BedDouble, Lock, MapPin } from 'lucide-react'
import { Icon } from '../icons'
import { t } from '../i18n'
import { cityLabel } from '../lib'
import type { AlbumDay, AlbumResult, AlbumStop } from '../album/match'
import { clock } from '../album/format'
import { Thumb, thumbUrl } from './AlbumParts'

type Props = {
  days: AlbumDay[]
  result: AlbumResult
  stops: AlbumStop[]
  cityByDay: Record<number, string>
  onOpen: (ids: string[], start: number, title: string) => void
}

type Pin = { placeId: string; name: string; hotel: boolean; lat: number; lng: number; ids: string[]; from: number; to: number }

/**
 * The album on a map: a chip per day with photos, a photo pin per place (count badge), the day's route as a dotted line,
 * and a panel with the picked place's photos. Same Esri tiles as the places map; pins use the phone's own previews.
 */
export default function AlbumMap({ days, result, stops, cityByDay, onOpen }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const withPhotos = useMemo(
    () => result.days.filter((d) => d.places.some((p) => p.photoIds.length) || d.loose.photoIds.length),
    [result],
  )
  const [pickedDay, setPickedDay] = useState<number | null>(null)
  const dayNo = withPhotos.some((d) => d.day === pickedDay) ? pickedDay! : (withPhotos[0]?.day ?? 1)
  const [pickedPlace, setPickedPlace] = useState<string | null>(null)

  const pins = useMemo<Pin[]>(() => {
    const d = result.days.find((x) => x.day === dayNo)
    const out: Pin[] = []
    for (const p of d?.places ?? []) {
      const s = stops.find((x) => x.placeId === p.placeId && x.day === dayNo) ?? stops.find((x) => x.placeId === p.placeId)
      if (!s || s.lat == null || s.lng == null || !p.photoIds.length) continue
      out.push({ placeId: p.placeId, name: s.name, hotel: !!p.hotel, lat: s.lat, lng: s.lng, ids: p.photoIds, from: p.from, to: p.to })
    }
    return out.sort((a, b) => a.from - b.from)
  }, [result, stops, dayNo])
  const here = pins.find((p) => p.placeId === pickedPlace) ?? pins[0]
  const tz = days.find((d) => d.day === dayNo)?.tz ?? 'Asia/Tokyo'

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false, attributionControl: true }).setView([35.0, 136.5], 6)
    map.current = m
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles © Esri',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const lay = layer.current
    if (!m || !lay) return
    lay.clearLayers()
    if (pins.length > 1) {
      L.polyline(pins.map((p) => [p.lat, p.lng] as [number, number]), { color: '#bc002d', weight: 3, opacity: 0.85, dashArray: '2 8', lineCap: 'round' }).addTo(lay)
    }
    for (const p of pins) {
      const icon = L.divIcon({
        className: '',
        html: `<div class="al-pin${p.placeId === here?.placeId ? ' on' : ''}"><i data-pin="${p.ids[0].replace(/"/g, '')}"></i><b>${p.ids.length}</b></div>`,
        // 56 px square (72 px when selected) with an 8 px tail; the tail tip is the place
        iconSize: p.placeId === here?.placeId ? [72, 82] : [56, 66],
        iconAnchor: p.placeId === here?.placeId ? [36, 82] : [28, 66],
      })
      const mk = L.marker([p.lat, p.lng], { icon, title: p.name, keyboard: true, zIndexOffset: p.placeId === here?.placeId ? 1000 : 0 }).on('click', () => setPickedPlace(p.placeId)).addTo(lay)
      void thumbUrl(p.ids[0], 120).then((u) => {
        const i = mk.getElement()?.querySelector<HTMLElement>('i')
        if (i && u) i.style.backgroundImage = `url("${u}")`
      })
    }
    // the top 100px belong to the day chips and the privacy label; the bottom to the panel
    if (pins.length) m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { paddingTopLeft: [56, 112], paddingBottomRight: [56, 196], maxZoom: 16 })
  }, [pins, here?.placeId])

  const sizeUp = () => map.current?.invalidateSize()
  useEffect(() => {
    const id = window.setTimeout(sizeUp, 350)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="al-mapbox">
      <div ref={el} className="map al-leaflet" />
      <div className="al-daychips chips scroll" role="group" aria-label={t('ימי הטיול')}>
        {withPhotos.map((d) => {
          const city = cityLabel(cityByDay[d.day])
          return (
            <button key={d.day} className={'chip' + (d.day === dayNo ? ' on' : '')} aria-pressed={d.day === dayNo} onClick={() => { setPickedDay(d.day); setPickedPlace(null) }}>
              {t('יום {n}', { n: d.day })}{city ? ` · ${city}` : ''}
            </button>
          )
        })}
      </div>
      <p className="al-maplock"><Icon as={Lock} size={14} /> {t('רק בטלפון שלך')}</p>
      {here ? (
        <section className="al-panel" aria-label={here.name}>
          <header>
            <Icon as={here.hotel ? BedDouble : MapPin} size={18} />
            <b dir="auto">{here.hotel ? t('מלון · {name}', { name: here.name }) : here.name}</b>
          </header>
          <p>
            {here.ids.length === 1 ? t('תמונה אחת') : t('{n} תמונות', { n: here.ids.length })}
            {here.from > 0 && here.to > 0 && (
              <>
                {' · '}
                <bdi dir="ltr">{clock(here.from, tz)}–{clock(here.to, tz)}</bdi>
              </>
            )}
          </p>
          <div className="al-panel-row">
            {here.ids.slice(0, 6).map((id, i) => (
              <button key={id} className="al-tile" aria-label={t('פתיחת תמונה {n}', { n: i + 1 })} onClick={() => onOpen(here.ids, i, here.name)}>
                <Thumb id={id} size={160} />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="al-panel">
          <p>{t('לתמונות של היום הזה אין מיקום על המפה. הן ברשימה.')}</p>
        </section>
      )}
    </div>
  )
}
