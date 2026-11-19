import { ExternalLink, MapPin } from 'lucide-react'
import { Icon } from '../icons'
import { t } from '../i18n'
import { mapsUrl } from '../lib'
import { grayUrls, useDark } from '../mapTiles'
import '../styles/places.css'

const Z = 15
const TILE = 256

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
 * key, no per-view cost, "Tiles © Esri"). Esri Gray Canvas, light or dark tile set with its label overlay,
 * swapped when the theme changes. It is not interactive; one tap opens the place in Google
 * Maps. It is shown only in "More details", never on the swipe card. A card without coordinates gets the area line
 * and a link instead.
 */
export default function AreaMap(props: { name: string; lat: number | null | undefined; lng: number | null | undefined; area?: string | null }) {
  const dark = useDark()
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
  const u = grayUrls(dark)
  const fill = (tpl: string, tx: number, ty: number) => tpl.replace('{z}', String(Z)).replace('{y}', String(ty)).replace('{x}', String(tx))
  const tiles: { key: string; src: string; labels: string; dx: number; dy: number }[] = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const tx = Math.floor(x) + dx
      const ty = Math.floor(y) + dy
      tiles.push({
        key: tx + '/' + ty,
        dx: (tx - x) * TILE,
        dy: (ty - y) * TILE,
        src: fill(u.base, tx, ty),
        labels: fill(u.labels, tx, ty),
      })
    }
  return (
    <a className="am" href={href} target="_blank" rel="noreferrer" aria-label={t('פתיחה במפה: {name}', { name: props.name })}>
      <span className="am-tiles" aria-hidden="true">
        {tiles.flatMap((tl) =>
          [tl.src, tl.labels].map((src, i) => (
            <img key={tl.key + (i ? 'l' : '')} src={src} alt="" width={TILE} height={TILE} loading="lazy" referrerPolicy="no-referrer" style={{ transform: `translate(${tl.dx}px, ${tl.dy}px)` }} />
          )),
        )}
      </span>
      <span className="am-pin" aria-hidden="true">
        <Icon as={MapPin} size={22} />
      </span>
      <span className="am-credit">Tiles © Esri</span>
    </a>
  )
}
