// Japan airport and city recognition, shared by presence.ts and split.ts.
// A flight title may use IATA codes, English city names, or Hebrew city names; a title without a route
// separator (e.g. "TLV-NRT" or "טוקיו") is handled by flightDest() which falls back to the full title.
import type { Point } from './plan.ts'

export const ROUTE = /→|->|⟶|—|–|\s-\s/

/**
 * A flight whose destination half matches this regex is a Japan arrival; a flight whose origin half
 * matches is a Japan departure. Covers IATA codes, English and Hebrew names and generic "Japan".
 */
export const JAPAN =
  /\b(HND|NRT|KIX|ITM|NGO|CTS|FUK|OKA|UKB|HIJ|KMQ)\b|Haneda|Narita|Kansai|Itami|Chubu|Centrair|Chitose|Fukuoka|Naha|Tokyo|Osaka|Kyoto|Nagoya|Sapporo|Okinawa|Japan|טוקיו|אוסקה|קיוטו|נגויה|סאפורו|פוקואוקה|אוקינאווה|יפן|הנדה|נריטה|קנסאי/i

/** Runway coordinates for each Japan IATA airport code. */
export const AIRPORT_PT: Record<string, Point> = {
  HND: { lat: 35.5494, lng: 139.7798 }, // Haneda
  NRT: { lat: 35.7765, lng: 140.3864 }, // Narita
  KIX: { lat: 34.4347, lng: 135.2440 }, // Kansai
  ITM: { lat: 34.7850, lng: 135.4388 }, // Itami
  NGO: { lat: 34.8583, lng: 136.8054 }, // Chubu/Centrair
  CTS: { lat: 42.7752, lng: 141.6921 }, // New Chitose (Sapporo)
  FUK: { lat: 33.5853, lng: 130.4511 }, // Fukuoka
  OKA: { lat: 26.1958, lng: 127.6454 }, // Naha (Okinawa)
  UKB: { lat: 34.6328, lng: 135.2237 }, // Kobe
  HIJ: { lat: 34.4369, lng: 132.9194 }, // Hiroshima
  KMQ: { lat: 36.3940, lng: 136.4079 }, // Komatsu (Kanazawa)
}

/** City a Japan airport is in; also recognises English and Hebrew city name text. */
export const AIRPORT_CITY: [RegExp, string][] = [
  [/\b(HND|NRT)\b|Haneda|Narita|Tokyo|טוקיו|הנדה|נריטה/i, 'tokyo'],
  [/\b(KIX|ITM)\b|Kansai|Itami|Osaka|אוסקה|קנסאי/i, 'osaka'],
  [/\bNGO\b|Chubu|Centrair|Nagoya|נגויה/i, 'nagoya'],
  [/\bCTS\b|Chitose|Sapporo|סאפורו/i, 'sapporo'],
  [/\bFUK\b|Fukuoka|פוקואוקה/i, 'fukuoka'],
  [/\bOKA\b|Naha|Okinawa|אוקינאווה/i, 'okinawa'],
  [/\bUKB\b|Kobe/i, 'kobe'],
  [/\bHIJ\b|Hiroshima/i, 'hiroshima'],
  [/\bKMQ\b|Kanazawa/i, 'kanazawa'],
]

export const cityOfAirport = (s: string): string | null => AIRPORT_CITY.find(([re]) => re.test(s))?.[1] ?? null

/**
 * The destination half of a flight title: the part after the route separator, or the full title when
 * there is no separator (e.g. "TLV-NRT", "טוקיו"). For JAPAN detection and airport code lookup.
 */
export function flightDest(title: string): string {
  const parts = title.split(ROUTE)
  return parts.length > 1 ? parts.slice(1).join(' ') : title
}

/**
 * The IATA code of the Japan arrival airport in a flight's destination string, or null when the
 * destination is a city name without a matching code. Used to look up coordinates in AIRPORT_PT.
 */
export function japanAirportCode(dest: string): string | null {
  const m = dest.match(/\b(HND|NRT|KIX|ITM|NGO|CTS|FUK|OKA|UKB|HIJ|KMQ)\b/i)
  if (m) return m[1].toUpperCase()
  if (/Haneda/i.test(dest)) return 'HND'
  if (/Narita/i.test(dest)) return 'NRT'
  if (/Kansai/i.test(dest)) return 'KIX'
  if (/Itami/i.test(dest)) return 'ITM'
  if (/Chubu|Centrair/i.test(dest)) return 'NGO'
  if (/Chitose/i.test(dest)) return 'CTS'
  if (/Fukuoka/i.test(dest)) return 'FUK'
  if (/Naha/i.test(dest)) return 'OKA'
  // city names without a code: use the main airport for each city
  if (/Tokyo|טוקיו|הנדה/i.test(dest)) return 'HND'
  if (/Osaka|Kyoto|אוסקה|קיוטו|קנסאי/i.test(dest)) return 'KIX'
  if (/Nagoya|נגויה/i.test(dest)) return 'NGO'
  if (/Sapporo|סאפורו/i.test(dest)) return 'CTS'
  if (/Okinawa|Naha|אוקינאווה/i.test(dest)) return 'OKA'
  // generic "Japan" or other Hebrew text: no specific airport; presence.ts uses ride(null, hotel) = 25 min
  return null
}
