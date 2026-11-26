import { useMemo } from 'react'
import type { Candidate, DayInfo, ItineraryItem, Member, Place, Trip } from '../types'
import { dayDate, cityHe, useTripTable } from '../lib'
import { useStays } from '../stays'
import { ymd } from '../views/planUtils'
import { visitMinutes } from './visit'
import type { AlbumDay, AlbumStop } from './match'

/** Japan, for a trip whose cities are not known yet. */
const FALLBACK_TZ = 'Asia/Tokyo'

/**
 * What the matcher needs from the trip: its days (date and the zone of the city the user sleeps in), and the stops of
 * the user's own plan (their couple's items and the group's), plus the hotels with a known spot.
 */
export function useAlbumPlan(trip: Trip, members: Member[], userId: string) {
  const { rows: items } = useTripTable<ItineraryItem>('itinerary_items', trip.id, 'sort')
  const { rows: places } = useTripTable<Place>('places', trip.id)
  const { rows: cards } = useTripTable<Candidate>('candidates', trip.id)
  const { rows: info } = useTripTable<DayInfo>('day_info', trip.id, 'day')
  const { stays, cities } = useStays(trip.id)
  const mine = members.find((m) => m.user_id === userId)?.couple ?? null

  return useMemo(() => {
    const byHe = new Map(cities.map((c) => [cityHe(c.name_he), c]))
    const byId = new Map(cities.map((c) => [c.id, c]))
    const ourStays = stays.filter((s) => !s.party || s.party === mine)
    const days: AlbumDay[] = []
    let lastTz = ''
    for (let d = 1; d <= Math.max(1, trip.num_days); d++) {
      const date = dayDate(trip.start_date, d)
      if (!date) break
      const iso = ymd(date)
      const sleeps = ourStays.filter((s) => s.check_in <= iso && iso < s.check_out)
      const own = sleeps.find((s) => s.party === mine) ?? sleeps[0]
      const named = (info.find((x) => x.day === d)?.city ?? '').split(' / ')[0]
      const tz = (own && byId.get(own.city)?.tz) || (named && byHe.get(cityHe(named))?.tz) || lastTz || cities[0]?.tz || FALLBACK_TZ
      lastTz = tz
      days.push({ day: d, date: iso, tz })
    }

    const stops: AlbumStop[] = []
    for (const i of items) {
      if (i.who && i.who !== mine) continue
      const p = i.place_id ? places.find((x) => x.id === i.place_id) : undefined
      const card = p?.candidate_id ? cards.find((c) => c.id === p.candidate_id) : undefined
      const minutes = visitMinutes(card?.time_needed) ?? undefined
      stops.push({
        placeId: p?.id ?? 'item:' + i.id,
        name: p?.name ?? i.title,
        day: i.day,
        lat: p?.lat ?? null,
        lng: p?.lng ?? null,
        ...(i.time ? { start: i.time.slice(0, 5) } : {}),
        ...(minutes ? { minutes } : {}),
      })
    }
    for (const s of ourStays) {
      if (s.lat == null || s.lng == null) continue
      const name = s.area || byId.get(s.city)?.name_he || s.city
      for (const d of days) if (s.check_in <= d.date && d.date <= s.check_out) {
        stops.push({ placeId: 'stay:' + s.id, name, day: d.day, lat: s.lat, lng: s.lng, hotel: true })
      }
    }
    const cityByDay: Record<number, string> = {}
    for (const d of days) cityByDay[d.day] = (info.find((x) => x.day === d.day)?.city ?? '').split(' / ')[0]
    return { days, stops, mine, cityByDay }
  }, [items, places, cards, info, stays, cities, mine, trip.start_date, trip.num_days])
}
