// The hotel search a "where to sleep" card opens (Booking.com). The partner programme isn't open yet: AFFILIATE_ID
// stays empty until it is, and only then does every search carry it (aid=…). This is the one place to set it.
export const AFFILIATE_ID = ''

/** A Booking.com search for an area, with the stay's dates and the party's size filled in. */
export function hotelSearchUrl(o: { search: string; checkIn: string; checkOut: string; adults: number; rooms: number }) {
  const q = new URLSearchParams({
    ss: o.search,
    checkin: o.checkIn,
    checkout: o.checkOut,
    group_adults: String(Math.max(1, o.adults)),
    no_rooms: String(Math.max(1, o.rooms)),
    group_children: '0',
  })
  if (AFFILIATE_ID) q.set('aid', AFFILIATE_ID)
  return 'https://www.booking.com/searchresults.html?' + q.toString()
}
