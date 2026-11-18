import { ExternalLink, MapPin } from 'lucide-react'
import { Icon } from '../icons'
import { t } from '../i18n'
import { mapsUrl } from '../lib'
import '../styles/places.css'

const Z = 15
const TILE = 256
const BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/'

/** Web-Mercator tile coordinates (fractional) of a point at zoom Z. */
function tileXY(lat: number, lng: number) {
  const n = 2 ** Z
  const x = ((lng + 180) / 360) * n
  const r = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  return { x, y }
}

/**
 * The card's spot on a map: a still tile grid around the pin, from the same free Esri tiles the Places map uses (no
 * key, no per-view cost, "Tiles © Esri"). It is always the colour street map; dark mode darkens the tiles in CSS
 * (.am-tiles in places.css), never the pin or the credit. It is not interactive; one tap opens the place in Google
 * Maps. It is shown only in "More details", never on the swipe card. A card without coordinates gets the area line
 * and a link instead.
 */
export default function AreaMap(props: { name: string; lat: number | null | undefined; lng: number | null | undefined; area?: string | null }) {
  const { lat, lng } = props
  const href = mapsUrl(lat != null && lng != null ? `${lat},${lng}` : props.name)
  if (lat == null || lng == null)
    return (
      <a className="am am-none" href={href} target="_blank" rel="noreferrer">
        <Icon as={MapPin} size={18} />
        <span>{props.area || t('מיקום במפה')}</span>
        <Icon as={ExternalLink} size={18} />
      </a>
    )
  const { x, y } = tileXY(lat, lng)
  const tiles: { key: string; src: string; dx: number; dy: number }[] = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const tx = Math.floor(x) + dx
      const ty = Math.floor(y) + dy
      tiles.push({
        key: tx + '/' + ty,
        dx: (tx - x) * TILE,
        dy: (ty - y) * TILE,
        src: `${BASE}World_Street_Map/MapServer/tile/${Z}/${ty}/${tx}`,
      })
    }
  return (
    <a className="am" href={href} target="_blank" rel="noreferrer" aria-label={t('פתיחה במפה: {name}', { name: props.name })}>
      <span className="am-tiles" aria-hidden="true">
        {tiles.map((tl) => (
          <img key={tl.key} src={tl.src} alt="" width={TILE} height={TILE} loading="lazy" referrerPolicy="no-referrer" style={{ transform: `translate(${tl.dx}px, ${tl.dy}px)` }} />
        ))}
      </span>
      <span className="am-pin" aria-hidden="true">
        <Icon as={MapPin} size={22} />
      </span>
      <span className="am-credit">Tiles © Esri</span>
    </a>
  )
}
