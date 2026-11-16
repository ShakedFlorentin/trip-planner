import { useEffect, useMemo, useRef, useState } from 'react'
import { Ban, CalendarDays, Heart, ListChecks, MapPin, Search as SearchIcon, Ticket } from 'lucide-react'
import { BOOKING_ICON, Icon, type LucideIcon } from '../icons'
import { BOOKING_TABS, CITY_HE, type Booking, type Candidate, type ChecklistItem, type ItineraryItem, type Member, type Place, type Swipe } from '../types'
import { cityLabel, dayDate, fmtDay, useTripTable } from '../lib'
import { t } from '../i18n'
import { Sheet } from '../ui'
import { makeHas, norm } from '../searchMatch'

/** Where a result leads: the screen that shows it. */
export type SearchTarget =
  | { tab: 'places' }
  | { tab: 'swipe'; card?: string }
  | { tab: 'bookings' }
  | { tab: 'plan'; day: number }
  | { tab: 'lists' }

type Hit = { key: string; title: string; sub: string; icon: LucideIcon; to: SearchTarget }

/** Search across everything in the trip: places, the swipe deck, bookings, the day plan and the lists. */
export default function Search({
  tripId,
  start,
  members,
  onClose,
  onPick,
}: {
  tripId: string
  start: string | null
  members: Member[]
  onClose: () => void
  onPick: (to: SearchTarget) => void
}) {
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const { rows: places, loading: l1, error: e1 } = useTripTable<Place>('places', tripId)
  const { rows: cards, loading: l2, error: e2 } = useTripTable<Candidate>('candidates', tripId)
  const { rows: swipes, loading: l3, error: e3 } = useTripTable<Swipe>('swipes', tripId)
  const { rows: bookings, loading: l4, error: e4 } = useTripTable<Booking>('bookings', tripId, 'starts_at')
  const { rows: items, loading: l5, error: e5 } = useTripTable<ItineraryItem>('itinerary_items', tripId, 'sort')
  const { rows: todos, loading: l6, error: e6 } = useTripTable<ChecklistItem>('checklist_items', tripId)
  const loading = l1 || l2 || l3 || l4 || l5 || l6
  const failed = !!(e1 || e2 || e3 || e4 || e5 || e6)
  // the sheet takes focus when it opens; hand it to the field right after
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  const groups = useMemo(() => {
    const term = norm(q.trim())
    if (term.length < 2) return []
    const has = makeHas(term)
    // a place and its plan items are found by their card's search words too (what it sells, synonyms)
    const tagsOf = new Map(cards.map((c) => [c.id, c.tags ?? []]))
    const placeTags = new Map(places.map((p) => [p.id, (p.candidate_id && tagsOf.get(p.candidate_id)) || []]))
    // a place on the list shows once: under places, with its plan date; its card and its plan stops don't repeat it
    const planned = new Map<string, number>()
    for (const i of items) if (i.place_id && !planned.has(i.place_id)) planned.set(i.place_id, i.day)
    const foundPlaces = places.filter((p) => has(p.name, p.city, cityLabel(p.city), p.area, p.notes, ...(placeTags.get(p.id) ?? [])))
    const shownPlaces = new Set(foundPlaces.map((p) => p.id))
    const placeCards = new Set(places.map((p) => p.candidate_id).filter(Boolean))
    const out: { label: string; hits: Hit[] }[] = [
      {
        label: t('מקומות'),
        hits: foundPlaces.map((p) => {
          const day = planned.get(p.id)
          const when = day ? fmtDay(dayDate(start, day)) : ''
          const sub = [cityLabel(p.city), p.area, day && t('במסלול: {day}', { day: when || t('יום {day}', { day }) })].filter(Boolean).join(' · ')
          return { key: 'p' + p.id, title: p.name, sub, icon: MapPin, to: { tab: 'places' } } satisfies Hit
        }),
      },
      {
        label: t('עוד בגילוי'),
        hits: cards
          .filter((c) => !placeCards.has(c.id))
          .filter((c) => has(c.name, c.name_ja, c.area, CITY_HE[c.city] ?? c.city, cityLabel(CITY_HE[c.city] ?? c.city), c.serves, c.todo, ...(c.dishes ?? []), ...(c.tags ?? [])))
          .map((c) => {
            // a card someone said no to says who; any card opens on its own, with the votes
            const no = swipes
              .filter((s) => s.candidate_id === c.id && !s.liked)
              .map((s) => t(members.find((m) => m.user_id === s.user_id)?.display_name ?? '?'))
            const where = [cityLabel(CITY_HE[c.city] ?? c.city), c.area].filter(Boolean).join(' · ')
            return {
              key: 'c' + c.id,
              title: c.name,
              sub: no.length ? `${where} · ${t('אמרו לא: {names}', { names: no.join(', ') })}` : where,
              icon: no.length ? Ban : Heart,
              to: { tab: 'swipe', card: c.id },
            } satisfies Hit
          }),
      },
      {
        label: t('הזמנות'),
        hits: bookings
          .filter((b) => has(b.title, b.location, b.confirmation, b.notes, b.who))
          .map((b) => ({
            key: 'b' + b.id,
            title: b.title,
            sub: [BOOKING_TABS[b.kind] ?? b.kind, b.who && t(b.who)].filter(Boolean).join(' · '),
            icon: BOOKING_ICON[b.kind] ?? Ticket,
            to: { tab: 'bookings' },
          })),
      },
      {
        label: t('מסלול'),
        hits: items
          .filter((i) => !(i.place_id && shownPlaces.has(i.place_id)))
          .filter((i) => has(i.title, i.location, i.notes, ...((i.place_id && placeTags.get(i.place_id)) || [])))
          .map((i) => ({ key: 'i' + i.id, title: i.title, sub: `${fmtDay(dayDate(start, i.day)) || t('יום {day}', { day: i.day })}${i.time ? ` · ${i.time.slice(0, 5)}` : ''}`, icon: CalendarDays, to: { tab: 'plan', day: i.day } })),
      },
      {
        label: t('רשימות'),
        hits: todos
          .filter((todo) => has(todo.text, todo.assignee))
          .map((todo) => ({ key: 't' + todo.id, title: todo.text, sub: todo.done ? t('בוצע') : '', icon: ListChecks, to: { tab: 'lists' } })),
      },
    ]
    return out.filter((g) => g.hits.length)
  }, [q, places, cards, swipes, members, bookings, items, todos, start])

  return (
    <Sheet title={t('חיפוש')} onClose={onClose}>
      <label className="search-field">
        <Icon as={SearchIcon} />
        <input
          ref={input}
          type="search"
          enterKeyHint="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t('מקומות, הזמנות, מסלול ועוד')}
          aria-label={t('חיפוש בטיול')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {q.trim().length >= 2 && !groups.length && (
        <p className="empty" role="status">
          {loading
            ? t('טוען את הטיול…')
            : failed
              ? t('אין חיבור, אי אפשר לחפש עכשיו. נסו שוב כשיש קליטה.')
              : t('אין תוצאות ל"{q}"', { q: q.trim() })}
        </p>
      )}
      {q.trim().length >= 2 && groups.length > 0 && (loading || failed) && (
        <p className="muted small" role="status">{loading ? t('עוד טוען, ייתכן שיתווספו תוצאות.') : t('אין חיבור, ייתכן שחסרות תוצאות.')}</p>
      )}
      {groups.map((g) => (
        <section key={g.label} className="search-group">
          <h3>{g.label}</h3>
          <div className="card list-card">
            {g.hits.slice(0, 20).map((h) => (
              <button key={h.key} className="search-row" onClick={() => onPick(h.to)}>
                <span className="tile neutral">
                  <Icon as={h.icon} />
                </span>
                <span className="search-text">
                  <b dir="auto">{h.title}</b>
                  {h.sub && <span className="muted small" dir="auto">{h.sub}</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </Sheet>
  )
}
