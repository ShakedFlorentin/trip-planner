// What the night-split suggester (split.ts) knows about each city before anyone has liked a place: where it sits on
// the route, how many nights it is worth, and in which months. Starting values, written by hand from common Japan
// routes; the same fields on a row of the `cities` table win over these (index.ts merges them), so a number can be
// corrected in the database with no deploy. Plain data: no Deno, no DOM.

export type RouteInfo = {
  /** the stretch of the main line the city is on (kanto → chubu → kansai → chugoku → kyushu), or an island reached by air */
  region: string
  /** reached by a flight only: at an end of the trip, three nights or more */
  air?: boolean
  /** has an airport with flights inside Japan (the stop before or after an island must be near one) */
  hub?: boolean
  /** the classic first-trip line: filled before any other city on a first visit, and the default when nothing is picked */
  classic?: boolean
  /** nights worth staying: the least that makes sense as a base (0: fine as a day trip) and the ideal */
  min: number
  ideal: number
  /** the same for a group on its first visit to Japan, when it differs */
  minFirst?: number
  idealFirst?: number
  /** January..December: 0 not in season (never suggested unless picked), 1 fine (worth half), 2 good. Missing: good all year */
  season?: number[]
}

export const CITY_ROUTE: Record<string, RouteInfo> = {
  tokyo: { region: 'kanto', hub: true, classic: true, min: 2, ideal: 4, minFirst: 4, idealFirst: 6 },
  yokohama: { region: 'kanto', min: 0, ideal: 1 },
  hakone: { region: 'kanto', min: 1, ideal: 1 },
  nikko: { region: 'kanto', min: 0, ideal: 1, season: [1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1] },
  nagoya: { region: 'chubu', hub: true, min: 0, ideal: 1 },
  takayama: { region: 'chubu', min: 1, ideal: 2, season: [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0] },
  kanazawa: { region: 'chubu', min: 1, ideal: 2, season: [1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1] },
  kyoto: { region: 'kansai', classic: true, min: 2, ideal: 4, minFirst: 3 },
  osaka: { region: 'kansai', hub: true, classic: true, min: 1, ideal: 3 },
  nara: { region: 'kansai', min: 0, ideal: 1 },
  kobe: { region: 'kansai', min: 0, ideal: 1 },
  hiroshima: { region: 'chugoku', min: 1, ideal: 2 },
  fukuoka: { region: 'kyushu', hub: true, min: 1, ideal: 2 },
  sapporo: { region: 'hokkaido', air: true, hub: true, min: 2, ideal: 3, season: [0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 0, 0] },
  okinawa: { region: 'okinawa', air: true, hub: true, min: 3, ideal: 4, season: [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0] },
}
