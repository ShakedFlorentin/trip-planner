import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BedDouble, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Footprints, Heart, MapPin, Navigation, Pencil, PlaneLanding, Plus, Route, Share2, Trash2, Undo2, Users } from 'lucide-react'
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox'
import { Menu, MenuContent, MenuItemIndicator, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '@ui-sdk/react/menu'
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs'
import { Timeline, TimelineConnector, TimelineDescription, TimelineItem, TimelineMarker, TimelineTime, TimelineTitle } from '@ui-sdk/react/timeline'
import { Toolbar, ToolbarButton } from '@ui-sdk/react/toolbar'
import { supabase } from '../supabase'
import { CATEGORIES, CITY_HE, TOGETHER, whoOptions, type Booking, type Candidate, type DayInfo, type Member, type Place, type PlanSummary, type Trip } from '../types'
import { cityLabel, couplesOf, currentDay, errorText, useTokyoHM, dayDate, keepRanges, dayOption, dayParts, fmtDayLong, mutate, replan, useMediaIndex, useTripTable, withMedia } from '../lib'
import { isEn, t } from '../i18n'
import { ask, say } from '../toast'
import { Empty, Field, LoadNote, Sheet, Skeleton, useRemembered } from '../ui'
import { validWho, whoChoices, whoLabel } from '../who'
import { RingsIcon } from '../rings'
import { CARD_ICON, Icon } from '../icons'
import { reducedMotion } from '../spring'
import { SwipeRow } from '../swipe'
import { CardFull } from './Swipe'
import { ShareSheet } from './Share'
import StaysSheet, { NightsSheet, SplitSheet, SplitStart, nightsWithoutCity, recommendedArea } from './Stays'
import { requestAddBooking } from '../quickAdd'
import { useStays } from '../stays'
import {
  ARRIVAL,
  dayEntries,
  hop,
  tokyoArrival,
  hotelNights,
  nightLines,
  navUrl,
  nextStop,
  visible,
  ymd,
  type Entry,
  type PlanItem,
  type WhoMode,
} from './planUtils'
import '../styles/plan.css'
import '../styles/fixc.css'
import QuickFab from './QuickFab'
import { arrivalLine, arrivalOf, type Arrival } from './arrivalLine'

type Props = { trip: Trip; day: number; setDay: (d: number) => void; members?: Member[]; userId?: string }

export default function Itinerary({ trip, day, setDay, members = [], userId }: Props) {
  const { rows: days, error: daysError, reload: reloadDays } = useTripTable<DayInfo>('day_info', trip.id, 'day')
  const { rows: items, put: putItems, loading: itemsLoading, error: itemsError, reload: reloadItems } = useTripTable<PlanItem>('itinerary_items', trip.id, 'sort')
  const { rows: bookings, loading: bookingsLoading, error: bookingsError, reload: reloadBookings } = useTripTable<Booking>('bookings', trip.id, 'starts_at')
  // "nothing planned" is only true once the plan has really loaded
  const loading = itemsLoading || bookingsLoading
  const loadFailed = !!(itemsError || bookingsError || daysError)
  const reloadPlan = () => {
    reloadItems()
    reloadBookings()
    reloadDays()
  }
  const couples = couplesOf(members)
  const myCouple = members.find((m) => m.user_id === userId)?.couple ?? null
  // "שלנו" always includes the group's items, so nothing everyone does is ever hidden
  const [saved, setMode] = useRemembered('planWho', 'mine')
  const mode: WhoMode = validWho(saved, couples, myCouple)
  const [editItem, setEditItem] = useState<Partial<PlanItem> | null>(null)
  const [editDay, setEditDay] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showStays, setShowStays] = useState(false)
  const { stays, cities, available: staysAvailable } = useStays(trip.id)
  // nights in no city yet: the starting card offers the three ways in, until they are all set or the card is put off
  const noCity = staysAvailable ? nightsWithoutCity(trip.start_date, trip.num_days, stays) : []
  const laterKey = 'splitStartLater:' + trip.id
  const [later, setLater] = useState(() => {
    try {
      return localStorage.getItem(laterKey) === '1'
    } catch {
      return false
    }
  })
  const [splitWay, setSplitWay] = useState<'nights' | 'suggest' | null>(null)
  // the item whose sheet is open: what the place is and what else is around it
  const [openId, setOpenId] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const summary = usePlanSummary(trip.id, items)
  // the card behind a place item, with the same text and media the swipe game shows
  const { rows: places } = useTripTable<Place>('places', trip.id)
  const { rows: rawCards } = useTripTable<Candidate>('candidates', trip.id)
  const media = useMediaIndex()
  const cards = useMemo(() => rawCards.map((c) => withMedia(c, media)), [rawCards, media])
  const placeOf = (i?: PlanItem) => (i?.place_id ? places.find((p) => p.id === i.place_id) : undefined)
  const cardOf = (p?: Place) => (p?.candidate_id ? cards.find((c) => c.id === p.candidate_id) : undefined)
  /** Where a plan item is, from its place or that place's card; bookings and places without one have none. */
  const pointOf = (e: Entry) => {
    const p = placeOf(e.item)
    const c = cardOf(p)
    const lat = p?.lat ?? c?.lat
    const lng = p?.lng ?? c?.lng
    return lat != null && lng != null ? { lat, lng } : null
  }

  useEffect(() => {
    stripRef.current?.querySelector('[data-selected]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [day])

  const info = days.find((d) => d.day === day)
  // the planner marks a day whose hotel is not booked yet: its times rest on a guess
  const estimateDay = !!summary?.days?.find((d) => d.day === day)?.estimate
  // a day that has passed: a place nobody ticked can go back to the planner for a day still ahead
  const today = currentDay(trip.start_date, trip.num_days)
  const past = today != null && day < today
  // the planner's flag on a place (types.ts doesn't list it)
  const autoPlannedOf = (i: PlanItem) => places.find((p) => p.id === i.place_id)?.auto_planned
  // a stop taken out of the plan can come back: the same row goes in again and its place gets the flag it had
  const bringBack = async (i: PlanItem, autoPlanned: boolean | undefined) => {
    if (!(await mutate(supabase.from('itinerary_items').insert(i)))) return
    if (i.place_id && autoPlanned != null) await mutate(supabase.from('places').update({ auto_planned: autoPlanned }).eq('id', i.place_id))
    replan(trip.id)
  }
  const missed = async (i: PlanItem) => {
    const was = autoPlannedOf(i)
    if (!(await mutate(supabase.from('itinerary_items').delete().eq('id', i.id)))) return
    // a new place to the planner again, not one somebody took out
    if (i.place_id) {
      await mutate(supabase.from('places').update({ auto_planned: false }).eq('id', i.place_id))
      replan(trip.id)
    }
    say(t('הסרנו: {name}', { name: i.title }), { undo: () => void bringBack(i, was) })
  }
  // swipe-to-remove: the stop is deleted and its place is marked as one the planner already had (auto_planned). A place
  // so marked with no stop is how the planner knows somebody took it out, so it leaves it out and plans the rest of
  // the day again. "Didn't make it" above does the opposite on purpose. No question first: Undo is on the message.
  const remove = async (i: PlanItem) => {
    const was = autoPlannedOf(i)
    if (!(await mutate(supabase.from('itinerary_items').delete().eq('id', i.id)))) return
    if (i.place_id) {
      await mutate(supabase.from('places').update({ auto_planned: true }).eq('id', i.place_id))
      replan(trip.id)
    }
    say(t('הסרנו מהמסלול: {name}', { name: i.title }), { undo: () => void bringBack(i, was) })
  }
  // the round tick: on screen at once; if saving fails it goes back and says so
  const tick = async (i: PlanItem) => {
    const done = !i.done
    putItems([{ ...i, done }])
    const { error } = await supabase.from('itinerary_items').update({ done }).eq('id', i.id)
    if (error) {
      putItems([i])
      say(t('הסימון לא נשמר, ולכן החזרנו אותו.'), { error: true, description: errorText(error.message), duration: 6000 })
      return
    }
    // ticking a stop also marks its place visited (48); unticking leaves the place as it is
    if (done && i.place_id) await mutate(supabase.from('places').update({ visited: true }).eq('id', i.place_id))
  }
  const date = trip.start_date ? ymd(dayDate(trip.start_date, day)!) : ''
  // the planner's landing data for this day (none in a plan made before it was added: then nothing extra shows)
  const dayArrival = summary?.days?.find((d) => d.day === day)?.arrival
  const entries = dayEntries(items, bookings, day, date, mode, myCouple, dayArrival)
  // today's next stop still ahead gets a "Next" mark (the same one Home's card shows)
  const nowHM = useTokyoHM()
  const nextKey = today === day ? nextStop(entries, nowHM)?.key : undefined
  // a day inside the trip dates: a slim header, so the first stop sits high on the screen
  const onTrip = today != null
  // on a day with several owners, "הכל" reads as one section per owner (the group first)
  const owners = [...new Set(entries.map((e) => e.who))].sort((a, b) => (a ?? '').localeCompare(b ?? ''))
  const sections = mode === 'all' && owners.length > 1 ? owners : [undefined]
  // a landing that has its steps card (ArrivalCard) is drawn once, as that card, in the landing's place in the list
  const arrivalCard = (e: Entry) => e.key.endsWith(':arr') && !!e.booking && !!tokyoArrival(e.booking)
  const opened = openId ? entries.find((e) => e.item?.id === openId) : undefined
  // a day only one couple is in Japan is that couple's plan by default
  const defaultWho = info?.who ?? null
  const warnings = new Map(summary?.warnings.map((w) => [w.item_id, warningText(w)]))
  // the planner's own items are keyed by place: what its final check found on them
  const issues = new Map(summary?.issues?.map((x) => [x.place_id, ISSUE[x.kind]]))
  // places planned in another city than the day's: "in Tokyo" (only while the item is still on the day the planner put it)
  const awayCity = (i?: PlanItem) => {
    const a = i?.place_id ? summary?.away?.find((x) => x.place_id === i.place_id && x.day === i.day) : undefined
    if (!a) return undefined
    const c = cities.find((x) => x.id === a.city)
    return isEn && c ? c.name_en : cityLabel(c?.name_he ?? CITY_HE[a.city] ?? a.city)
  }
  // places you liked in today's city that didn't fit into any day: ready to swap in
  const dayCities = (info?.city ?? '').split(' / ').filter(Boolean)
  const spare = (summary?.unplanned ?? []).filter(
    (u) => (u.reason === 'full' || u.reason === 'closed') && !!u.city && dayCities.includes(u.city) && visible(u.who, mode, myCouple),
  )

  // the day's main city (34): where most of its stops are. A Yokohama night with a day of Tokyo stops reads
  // "· טוקיו", with "לינה ביוקוהמה" on the bed line; only a stop in a third city keeps its city pill
  const lodging = cityLabel(info?.city)
  const awayCounts = new Map<string, number>()
  let homeCount = 0
  for (const e of entries) {
    if (!e.item) continue
    const c = awayCity(e.item)
    if (c) awayCounts.set(c, (awayCounts.get(c) ?? 0) + 1)
    else homeCount++
  }
  const topAway = [...awayCounts].sort((a, b) => b[1] - a[1])[0]
  const mainCity = topAway && topAway[1] > homeCount ? topAway[0] : lodging
  const sleepAway = !!lodging && mainCity !== lodging
  const nights = hotelNights(nightLines(info?.hotel ?? null, bookings, date, couples, stays, cities).filter((l) => visible(l.who, mode, myCouple)))
  // the legend for the one-ring mark shows the first few times Plan opens on this phone
  const [legend] = useState(() => {
    try {
      const n = Number(localStorage.getItem('apartLegend') ?? 0)
      localStorage.setItem('apartLegend', String(n + 1))
      return n < 3
    } catch {
      return false
    }
  })
  useStripShrink(stripRef)

  const dayTitle = trip.start_date ? fmtDayLong(dayDate(trip.start_date, day)) : t('יום {day}', { day })

  return (
    <div className="stack">
      {/* the days as a plain strip: the date, the weekday above it, today marked, the chosen day filled */}
      <Tabs className="tabs-root" value={String(day)} onValueChange={(v) => v && setDay(Number(v))}>
        <TabsList className="day-strip dtabs" ref={stripRef} aria-label={t('ימי הטיול')}>
          {Array.from({ length: trip.num_days }, (_, i) => i + 1).map((d) => {
            // the date and weekday lead; the trip's day number only stands in when there is no start date
            const parts = dayParts(dayDate(trip.start_date, d))
            const apart = !!days.find((x) => x.day === d)?.who
            return (
              <TabsTab key={d} value={String(d)} className="dtab" aria-current={d === today ? 'date' : undefined}>
                <span className="dtab-wd">{parts?.weekday ?? ''}</span>
                <b className="dtab-n">{dayDate(trip.start_date, d)?.getDate() ?? d}</b>
                {/* a day not everyone is together: the one-ring mark under the date */}
                {(apart || d === today) && (
                  <span className="dtab-marks">
                    {apart && (
                      <span className="dtab-mark" role="img" aria-label={t('יום שלא כולם ביחד')}>
                        <RingsIcon one />
                      </span>
                    )}
                    {d === today && <span className="dtab-mark dtab-today">{t('היום')}</span>}
                  </span>
                )}
              </TabsTab>
            )
          })}
        </TabsList>
      </Tabs>
      {legend && days.some((x) => x.who) && (
        <p className="strip-legend muted small">
          <RingsIcon one /> {t('יום שלא כולם ביחד')}
        </p>
      )}

      {noCity.length > 0 && !later && !onTrip && (
        <SplitStart
          open={noCity.length}
          onBooked={() => requestAddBooking('hotel')}
          onNights={() => setSplitWay('nights')}
          onSuggest={() => setSplitWay('suggest')}
          onLater={() => {
            setLater(true)
            try {
              localStorage.setItem(laterKey, '1')
            } catch {
              // private mode: it comes back next time, which is fine
            }
          }}
        />
      )}

      {/* the day: the city, the date and who it is for under it; the filter and the edit button in one toolbar; where you sleep as a hairline row */}
      <section className="plan-head">
        <h2 className="plan-city" dir="auto">{mainCity || dayTitle}</h2>
        <p className="plan-date muted">
          {mainCity ? dayTitle : null}
          {mainCity ? ' · ' : null}
          <span className="day-who">
            {info?.who ? (
              <>
                <RingsIcon one /> {t('רק {who}', { who: t(info.who) })}
              </>
            ) : (
              <>
                <RingsIcon /> {t('כולם היום')}
              </>
            )}
          </span>
        </p>
        <Toolbar className="plan-tools" aria-label={t('פעולות היום')}>
          {couples.length > 1 && (
            <Menu>
              <ToolbarButton className="chip plan-who" render={<MenuTrigger />}>
                <span className="plan-who-label">{t('מציג:')}</span> {whoLabel(mode)} <Icon as={ChevronDown} />
              </ToolbarButton>
              <MenuContent className="who-menu-list" side="bottom" align="start" sideOffset={6}>
                <MenuRadioGroup value={mode} onValueChange={(w) => setMode(w as WhoMode)}>
                  {whoChoices(couples, myCouple).map((w) => (
                    <MenuRadioItem key={w} value={w} closeOnSelect>
                      <span>{whoLabel(w)}</span>
                      <MenuItemIndicator>
                        <Icon as={Check} />
                      </MenuItemIndicator>
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
              </MenuContent>
            </Menu>
          )}
          <ToolbarButton className="plan-edit" aria-label={t('עריכת היום')} onClick={() => setEditDay(true)}>
            <Icon as={Pencil} />
          </ToolbarButton>
        </Toolbar>
        <div className="plan-hotels">
          {nights.length > 0 ? (
            nights.map((l) => (
              <button key={l.text} className="plan-hotel" onClick={() => setShowStays(true)}>
                <Icon as={BedDouble} />
                <span className="plan-hotel-text">
                  {l.who && mode === 'all' && <>{t(l.who)}: </>}
                  {sleepAway && <>{t('לינה ב{city}', { city: lodging })} · </>}
                  <bdi className="bed-name">{l.text}</bdi>
                  {l.proposed && <> · {t('מוצע')}</>}
                </span>
                <Icon as={ChevronLeft} className="chev flip-ltr" />
              </button>
            ))
          ) : (
            <button className="plan-hotel" onClick={() => setShowStays(true)}>
              <Icon as={BedDouble} />
              <span className="plan-hotel-text">{((a) => (a ? t('מומלץ לישון ב{area}', { area: a }) : t('איפה ישנים')))(recommendedArea(summary?.stay_areas, date, info?.who ?? null))}</span>
              <Icon as={ChevronLeft} className="chev flip-ltr" />
            </button>
          )}
        </div>
        {estimateDay && <p className="muted small">{t('השעות הן הערכה עד שמזמינים מלון.')}</p>}
        {info?.notes && <div className="notes day-notes" dir="auto">{keepRanges(info.notes)}</div>}
      </section>

      {loadFailed && <LoadNote onRetry={reloadPlan} />}
      {entries.length === 0 && loading && <Skeleton rows={3} />}
      {entries.length === 0 && !loading && !loadFailed && <Empty>{t('אין תוכניות ליום הזה')}</Empty>}
      {sections.map((owner) => {
        const list = entries.filter((e) => owner === undefined || e.who === owner)
        // today: the thin "now" line sits before the first stop that has not started yet
        const nowAt = today === day ? list.findIndex((e) => e.time && e.time > nowHM) : -1
        return (
          <Fragment key={owner ?? 'all'}>
            {owner !== undefined && (
              <h3 className="plan-owner">
                {owner ? (
                  t(owner)
                ) : (
                  <>
                    <Icon as={Users} /> {t(TOGETHER)}
                  </>
                )}
              </h3>
            )}
            {list.length > 0 && (
              <Timeline className="pt" aria-label={t('ציר היום')}>
                {list.map((e, n) => (
                  <Fragment key={e.key}>
                    {nowAt > 0 && n === nowAt && (
                      <TimelineItem className="pt-item pt-now">
                        <TimelineConnector className="pt-line" />
                        <TimelineMarker className="pt-node pt-now-dot" />
                        <div className="pt-content">
                          <TimelineTitle className="pt-now-title">{t('עכשיו')}</TimelineTitle>{' '}
                          <TimelineTime className="pt-now-time">{nowHM}</TimelineTime>
                        </div>
                      </TimelineItem>
                    )}
                    <TimelineItem className="pt-item" data-next={e.key === nextKey ? '' : undefined} data-done={e.done ? '' : undefined}>
                      <TimelineConnector className="pt-line" />
                      {arrivalCard(e) ? (
                        <>
                          <TimelineMarker className="pt-node pt-dot">
                            <Icon as={PlaneLanding} />
                          </TimelineMarker>
                          <div className="pt-content">
                            {n > 0 && <Hop from={list[n - 1]} to={e} pointOf={pointOf} />}
                            <ArrivalCard
                              entry={e}
                              dayWho={info?.who ?? null}
                              arrival={arrivalOf(dayArrival, e.who)}
                              hideMine={mode === 'mine'}
                              mine={myCouple}
                              hotel={entries.find((x) => x.key.endsWith(':in') && (!x.who || !e.who || x.who === e.who))?.location ?? null}
                              checkin={entries.find((x) => x.key.endsWith(':in') && (!x.who || !e.who || x.who === e.who))?.booking?.starts_at?.slice(11, 16) ?? null}
                            />
                          </div>
                        </>
                      ) : (
                        <StopItem
                          e={e}
                          ride={n > 0 ? <Hop from={list[n - 1]} to={e} pointOf={pointOf} /> : null}
                          dayWho={info?.who ?? null}
                          hint={n === 0 && owner === sections[0]}
                          kind={cardOf(placeOf(e.item))?.serves}
                          onOpen={(i) => setOpenId(i.id)}
                          onEdit={setEditItem}
                          onRemove={remove}
                          away={((c) => (c && c !== mainCity && c !== lodging ? c : undefined))(awayCity(e.item))}
                          warning={e.item && (warnings.get(e.item.id) ?? (e.item.auto && e.item.place_id ? issues.get(e.item.place_id) : undefined))}
                          onMissed={past && e.item?.place_id && !e.item.done ? missed : undefined}
                          onTick={tick}
                          next={e.key === nextKey ? nextLabel(e, nowHM) : undefined}
                          mineOnly={mode === 'mine'}
                          mine={myCouple}
                        />
                      )}
                    </TimelineItem>
                  </Fragment>
                ))}
              </Timeline>
            )}
          </Fragment>
        )
      })}

      {spare.length > 0 && <Spare trip={trip} day={day} spare={spare} places={places} />}

      <button className="link" onClick={() => setSharing(true)}>
        <Icon as={Share2} /> {t('שיתוף המסלול')}
      </button>

      {sharing && <ShareSheet trip={trip} days={days} items={items} places={places} cards={cards} onClose={() => setSharing(false)} />}

      <QuickFab label={t('פעילות חדשה')} onTap={() => setEditItem({ day, category: 'sight', who: defaultWho })} />

      {opened && (
        <ItemSheet
          e={opened}
          place={placeOf(opened.item)}
          card={cardOf(placeOf(opened.item))}
          cards={cards}
          places={places}
          onEdit={(i) => {
            setOpenId(null)
            setEditItem(i)
          }}
          onRemove={remove}
          onClose={() => setOpenId(null)}
        />
      )}
      {editItem && (
        <ItemForm tripId={trip.id} start={trip.start_date} numDays={trip.num_days} couples={couples} item={editItem} onClose={() => setEditItem(null)} />
      )}
      {splitWay === 'nights' && <NightsSheet tripId={trip.id} stays={stays} cities={cities} onClose={() => setSplitWay(null)} />}
      {splitWay === 'suggest' && <SplitSheet tripId={trip.id} stays={stays} cities={cities} onClose={() => setSplitWay(null)} />}
      {showStays && (
        <StaysSheet
          tripId={trip.id}
          date={date}
          couples={couples}
          stays={stays}
          cities={cities}
          bookings={bookings}
          available={staysAvailable}
          recs={summary?.stay_areas ?? []}
          people={(party) =>
            party
              ? { adults: Math.max(2, members.filter((m) => m.couple === party).length), rooms: 1 }
              : { adults: Math.max(members.length, couples.length * 2, 1), rooms: Math.max(1, couples.length) }
          }
          onClose={() => setShowStays(false)}
        />
      )}
      {editDay && (
        <DayForm
          tripId={trip.id}
          day={day}
          title={trip.start_date ? fmtDayLong(dayDate(trip.start_date, day)) : t('יום {day}', { day })}
          info={info}
          couples={couples}
          onClose={() => setEditDay(false)}
        />
      )}
    </div>
  )
}

/** Minutes from the Tokyo clock to a stop's time, or null when the stop has no time or has started. */
function minutesUntil(time: string | null | undefined, nowHM: string) {
  if (!time) return null
  const mins = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5))
  const n = mins(time) - mins(nowHM)
  return n >= 0 && Number.isFinite(n) ? n : null
}

/** "Next · in 12 min": a "~" in front of the number when the time is the planner's guess; plain "Next" when no time is ahead. */
function nextLabel(e: Entry, nowHM: string) {
  const n = minutesUntil(e.time, nowHM)
  if (n == null) return t('הבא')
  const guess = e.item?.auto ? '~' : ''
  // each number is kept left to right, or Hebrew turns "~12" around
  const dur = n < 60 ? t('{n} דק׳', { n: `⁦${guess}${n}⁩` }) : t('{h}:{m} ש׳', { h: `⁦${guess}${Math.floor(n / 60)}`, m: `${String(n % 60).padStart(2, '0')}⁩` })
  return t('הבא · בעוד {n}', { n: dur })
}

/**
 * One stop on the day's thread: a plan item you can tick, open and edit, or a booking moment that is read-only here.
 * The round node on the thread is the tick (a checkbox) for an item and the kind's icon for a booking; the time and the
 * name sit beside it, the one quiet line under them, and a Directions button (one tap, 44px) when the stop has a place.
 */
function StopItem(props: {
  e: Entry
  /** the ride from the stop before, drawn on the thread above this one */
  ride?: ReactNode
  /** whose day it is (null: everyone together): a stop shows its own tag only when it differs (28) */
  dayWho?: string | null
  /** the day's first stop: the first time Plan opens it slides open a little, to show that rows swipe (29) */
  hint?: boolean
  /** what the card says it serves: "food" alone doesn't tell a cake shop from a ramen counter */
  kind?: string | null
  onOpen: (i: PlanItem) => void
  onEdit: (i: PlanItem) => void
  onRemove: (i: PlanItem) => void
  warning?: string
  /** the city this place is in, when the planner put it on a day the people sleep in another city */
  away?: string
  onMissed?: (i: PlanItem) => void
  onTick: (i: PlanItem) => void
  /** the "Next · in N min" line, on the next stop still ahead today */
  next?: string
  /** the filter is "Ours" and this is my couple */
  mineOnly?: boolean
  mine?: string | null
}) {
  const { e, ride, kind, onOpen, onEdit, onRemove, warning, away, onMissed, onTick, next, dayWho = null, hint } = props
  // with "Ours" on, a stop that is ours says nothing new, so it carries no couple pill
  const ownTag = e.who !== dayWho && !(props.mineOnly && e.who === props.mine)
  const i = e.item
  const bags = e.key.endsWith(':bags')
  const sub = i ? [CATEGORIES[i.category] ?? i.category, kind && firstSentence(kind)].filter(Boolean).join(' · ') : e.sub || t('הזמנה')
  const main = (
    <div className="pt-main">
      {/* the planner's time is a rough guess: it shows as such until someone sets one */}
      <TimelineTime className={'pt-time' + (i?.auto ? ' approx' : '')} title={i?.auto ? t('שעה משוערת') : undefined}>
        {e.time ? (i?.auto ? '~' + e.time : e.time) : ''}
      </TimelineTime>
      {next && <div className="pt-next">{next}</div>}
      <TimelineTitle className="pt-title" onClick={i ? () => onOpen(i) : undefined}>
        {/* the stop's name is the control for keyboard and VoiceOver (the whole body also opens it on a tap) */}
        <span
          {...(i
            ? {
                role: 'button',
                tabIndex: 0,
                onKeyDown: (ev: React.KeyboardEvent) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    onOpen(i)
                  }
                },
              }
            : {})}
        >
          {e.title}
        </span>
      </TimelineTitle>
      <TimelineDescription className="pt-sub" onClick={i ? () => onOpen(i) : undefined}>
        <span className="plan-kind">{keepRanges(sub)}</span>
        {ownTag &&
          (e.who ? (
            <span className="who-pill">{t(e.who)}</span>
          ) : (
            <span className="who-pill">
              <RingsIcon /> {t('ביחד')}
            </span>
          ))}
        {away && (
          <span className="who-pill away-pill" title={t('בעיר אחרת מזו שישנים בה היום')}>
            {t('ב{city}', { city: away })}
          </span>
        )}
      </TimelineDescription>
      {warning && (
        <div className="plan-warn">
          <Icon as={CircleAlert} /> {warning}
        </div>
      )}
      <div className="pt-actions">
        {/* the way there: one tap, for every stop still ahead; the next one is the day's one filled button */}
        {e.location && !e.done && !bags && (
          <a
            className={'stop-nav' + (next ? ' primary-nav' : '')}
            href={navUrl(e.location)}
            target="_blank"
            rel="noreferrer"
            aria-label={t('ניווט אל {name}', { name: e.title })}
          >
            <Icon as={Navigation} /> {t('ניווט')}
          </a>
        )}
        {i && onMissed && (
          <button className="action plan-missed" onClick={() => onMissed(i)}>
            <Icon as={Undo2} /> {t('לא הגענו')}
          </button>
        )}
      </div>
    </div>
  )
  return (
    <>
      {i ? (
        <Checkbox className="pt-node pt-tick" checked={!!i.done} onCheckedChange={() => onTick(i)} aria-label={t('בוצע: {name}', { name: e.title })}>
          <CheckboxIndicator>
            <Check size="1em" strokeWidth={3.2} aria-hidden="true" />
          </CheckboxIndicator>
        </Checkbox>
      ) : (
        <TimelineMarker className={'pt-node pt-dot' + (bags ? ' quiet' : '')}>
          <Icon as={e.icon} />
        </TimelineMarker>
      )}
      <div className="pt-content">
        {ride}
        {i ? (
          <SwipeRow
            hint={hint}
            start={e.location ? { label: t('ניווט'), icon: Navigation, tone: 'ok', onClick: () => openLink(navUrl(e.location!)) } : undefined}
            end={[
              { label: t('עריכה'), icon: Pencil, tone: 'edit', onClick: () => onEdit(i) },
              { label: t('הסרה'), icon: Trash2, tone: 'del', onClick: () => onRemove(i) },
            ]}
          >
            {main}
          </SwipeRow>
        ) : (
          main
        )}
      </div>
    </>
  )
}

/** Opens a link the way a tapped <a target="_blank"> does (in the iOS app: Google Maps or the Safari sheet). */
function openLink(href: string) {
  const a = document.createElement('a')
  a.href = href
  a.target = '_blank'
  a.rel = 'noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

type Point = { lat: number; lng: number }
const at = (p: Point) => `${p.lat},${p.lng}`

/**
 * The way between two stops in a row, as a range of minutes: on foot nearby, a ride further (train, bus or taxi).
 * A tap opens the real route from the one to the other in Google Maps.
 */
function Hop({ from, to, pointOf }: { from: Entry; to: Entry; pointOf: (e: Entry) => Point | null }) {
  const a = pointOf(from)
  const b = pointOf(to)
  const h = a && b ? hop(a, b) : null
  if (!a || !b || !h) return null
  // kept left to right, or Hebrew turns 5–10 into 10–5
  const range = `\u2066${h.from}–${h.to}\u2069`
  // the names Maps knows the places by; the coordinates when a stop has none
  const url = navUrl(to.location || at(b), from.location || at(a), h.walk ? 'walking' : 'transit')
  return (
    <a className="plan-hop pt-ride muted small" href={url} target="_blank" rel="noreferrer">
      <Icon as={h.walk ? Footprints : Route} /> {h.walk ? t('{range} דק׳ הליכה', { range }) : t('{range} דק׳ נסיעה', { range })}
      <Icon as={ChevronLeft} className="plan-hop-go flip-ltr" />
    </a>
  )
}

/** Directions to a plan item; a tap here leaves the row alone (the row opens its sheet). */
function NavLink({ to, round, icon }: { to: string; round?: boolean; icon?: Entry['icon'] }) {
  return round ? (
    <a className="nav-round" href={navUrl(to)} target="_blank" rel="noreferrer" aria-label={t('ניווט')} onClick={(ev) => ev.stopPropagation()}>
      <Icon as={icon ?? Navigation} />
    </a>
  ) : (
    <a className="action nav-btn" href={navUrl(to)} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
      <Icon as={Navigation} /> {t('ניווט')}
    </a>
  )
}

type Near = { key: string; name: string; line: string | null; icon: Entry['icon']; mins: number | null; liked: boolean; card?: Candidate }

/**
 * A plan item opened: the place's card and what else there is around it (liked places first, then the rest of the
 * deck), or for a hand-written activity its own notes. A nearby card opens in the same sheet.
 */
function ItemSheet(props: {
  e: Entry
  place?: Place
  card?: Candidate
  cards: Candidate[]
  places: Place[]
  onEdit: (i: PlanItem) => void
  onRemove: (i: PlanItem) => void
  onClose: () => void
}) {
  const { e, place, card, cards, places } = props
  const i = e.item!
  const [peek, setPeek] = useState<Candidate | null>(null)
  const top = useRef<HTMLDivElement>(null)
  const nearRef = useRef<HTMLElement>(null)
  // a nearby card (and the way back) starts at its top, not where the list was scrolled to
  useEffect(() => {
    top.current?.closest('.sheet-body')?.scrollTo(0, 0)
  }, [peek])
  const near = useMemo(() => nearby(card, place, cards, places), [card, place, cards, places])
  const where = (c: { city: string | null; area: string | null }) =>
    [cityLabel(c.city ? CITY_HE[c.city] ?? c.city : null), c.area].filter(Boolean).join(' · ')

  if (peek)
    return (
      <Sheet title={peek.name} onClose={props.onClose}>
        <div ref={top} className="card-full">
          <button className="link plan-back" onClick={() => setPeek(null)}>
            <Icon as={ChevronRight} className="flip-ltr" /> {t('חזרה')} · <bdi>{e.title}</bdi>
          </button>
          <div className="muted small">{where(peek)}</div>
          <CardFull c={peek} />
        </div>
      </Sheet>
    )

  return (
    <Sheet title={e.title} onClose={props.onClose}>
      <div ref={top} className="card-full">
        <div className="muted small">
          {[e.time, CATEGORIES[i.category] ?? i.category, where(card ?? place ?? { city: null, area: null })].filter(Boolean).join(' · ')}
        </div>
        <div className="item-actions">
          {e.location && <NavLink to={e.location} />}
          <button className="action" onClick={() => props.onEdit(i)}>
            <Icon as={Pencil} /> {t('עריכה')}
          </button>
          <button
            className="action"
            onClick={() => {
              props.onClose()
              props.onRemove(i)
            }}
          >
            <Icon as={Trash2} /> {t('הסרה מהמסלול')}
          </button>
          {/* the card can run long: what is around it is one tap away, not a long scroll */}
          {near.length > 0 && (
            <button className="action" onClick={() => nearRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <Icon as={MapPin} /> {near.length === 1 ? t('מקום אחד באזור') : t('{n} מקומות באזור', { n: near.length })}
            </button>
          )}
        </div>
        {e.sub && <p className={'notes' + (i.auto ? ' plan-auto-notes' : '')} dir="auto">{keepRanges(e.sub)}</p>}
        {card ? (
          <CardFull c={card} />
        ) : (
          place?.notes && place.notes !== e.sub && <p dir="auto">{keepRanges(place.notes)}</p>
        )}
        {!card && !place?.notes && !e.sub && <p className="muted">{t('אין הערות. אפשר להוסיף בעריכה.')}</p>}
      </div>
      {near.length > 0 && (
        <section className="plan-near" ref={nearRef}>
          <h3>{t('מה עוד יש באזור')}</h3>
          <div className="card list-card">
            {near.map((n) => {
              const body = (
                <>
                  <Icon as={n.icon} />
                  <span className="plan-near-text">
                    <b dir="auto">
                      {n.name}
                      {n.liked && <Icon as={Heart} className="plan-near-liked" label={t('ברשימה שלכם')} />}
                    </b>
                    {n.line && <span className="muted small" dir="auto">{keepRanges(n.line)}</span>}
                  </span>
                  {n.mins != null && <span className="muted small plan-near-mins">{t('{n} דק׳ הליכה', { n: n.mins })}</span>}
                </>
              )
              return n.card ? (
                <button key={n.key} className="plan-near-row" onClick={() => setPeek(n.card!)}>
                  {body}
                </button>
              ) : (
                <div key={n.key} className="plan-near-row">
                  {body}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </Sheet>
  )
}

/** Within this, as the crow flies, a place counts as "around here" even in another area name. */
const NEAR_METERS = 1200

/** Liked places and cards around a place: within NEAR_METERS, or in the same area when a side has no coordinates. */
function nearby(card: Candidate | undefined, place: Place | undefined, cards: Candidate[], places: Place[]): Near[] {
  const at = card ?? place
  if (!at) return []
  // cards keep the city as a key ("tokyo"), places in Hebrew: compare in Hebrew
  const cityOf = (c: string | null) => (c ? CITY_HE[c] ?? c : '')
  const here = { lat: at.lat, lng: at.lng, area: norm(at.area), city: cityOf(at.city) }
  const liked = new Set(places.map((p) => p.candidate_id).filter(Boolean))
  const close = (o: { lat: number | null; lng: number | null; area: string | null; city: string | null }) => {
    const m = here.lat != null && here.lng != null && o.lat != null && o.lng != null ? meters(here.lat, here.lng, o.lat, o.lng) : null
    // coordinates decide when both sides have them: an area name can be loose; without them, the same area counts
    const ok = m != null ? m <= NEAR_METERS : !!here.area && norm(o.area) === here.area && cityOf(o.city) === here.city
    // ~80 m a minute, and streets are about a third longer than the straight line
    return ok ? { mins: m == null ? null : Math.max(1, Math.round((m * 1.3) / 80)) } : null
  }
  const out: Near[] = []
  for (const c of cards) {
    if (c.id === card?.id || c.id === place?.candidate_id) continue
    const n = close(c)
    if (n) out.push({ key: c.id, name: c.name, line: whatItIs(c), icon: CARD_ICON[c.category] ?? CARD_ICON.sight, liked: liked.has(c.id), card: c, ...n })
  }
  // places someone added by hand have no card: they still belong on the list
  for (const p of places) {
    if (p.candidate_id || p.id === place?.id) continue
    const n = close(p)
    if (n) out.push({ key: p.id, name: p.name, line: p.notes ? firstSentence(p.notes) : null, icon: CARD_ICON[p.category] ?? CARD_ICON.sight, liked: true, ...n })
  }
  return out.sort((a, b) => Number(b.liked) - Number(a.liked) || (a.mins ?? 99) - (b.mins ?? 99)).slice(0, 8)
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

/** Great-circle distance in meters. */
function meters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

/** A card in one line: what it serves, or what you do there. */
function whatItIs(c: Candidate) {
  const s = c.serves || c.todo || c.special || c.plan_line
  return s ? firstSentence(s) : null
}

/** The first sentence of a card's text; the row cuts it further with an ellipsis. */
function firstSentence(s: string) {
  return s.split(/(?<=[.!?])\s/)[0].replace(/\.$/, '').trim()
}

/** The planner's last word on the trip; refreshed whenever the plan changes, and the planner asked to run once a visit. */
function usePlanSummary(tripId: string, items: PlanItem[]) {
  const [summary, setSummary] = useState<PlanSummary | null>(null)
  useEffect(() => {
    // once per visit: it also runs after every swipe and booking, this catches anything that slipped by
    const key = 'replanned:' + tripId
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // no session storage: ask anyway
    }
    replan(tripId)
  }, [tripId])
  useEffect(() => {
    supabase
      .from('plan_state')
      .select('summary')
      .eq('trip_id', tripId)
      .maybeSingle()
      .then(({ data }) => data?.summary && setSummary(data.summary as PlanSummary))
  }, [tripId, items])
  return summary
}

/** Liked places in this city that the plan had no room for (or that are closed on its days), each one tap from today. */
function Spare({ trip, day, spare, places }: { trip: Trip; day: number; spare: PlanSummary['unplanned']; places: Place[] }) {
  const add = async (u: PlanSummary['unplanned'][number]) => {
    const p = places.find((x) => x.id === u.place_id)
    await mutate(
      supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        day,
        title: u.name,
        // a stand-in: the database puts the card's address here (trigger itinerary_item_address)
        location: [u.name, p?.area, p?.city].filter(Boolean).join(', '),
        category: p?.category ?? 'sight',
        place_id: u.place_id,
        who: u.who,
      }),
    )
  }
  return (
    <details className="card spare">
      <summary>
        <Icon as={Heart} className="lead" />
        <span>{spare.length === 1 ? t('מקום אחד שאהבתם, לא במסלול') : t('{n} מקומות שאהבתם, לא במסלול', { n: spare.length })}</span>
        <Icon as={ChevronDown} className="chev" />
      </summary>
      <ul>
        {spare.map((u) => (
          <li key={u.place_id}>
            <span>
              <bdi>{u.name}</bdi>
              {u.who && <span className="who-pill">{t(u.who)}</span>}
              {u.reason === 'closed' && <span className="muted small"> · {t('סגור בימים האלה')}</span>}
            </span>
            <button className="action" onClick={() => add(u)}>
              <Icon as={Plus} /> {t('ליום הזה')}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

/** First steps after landing; the check-in line gives the day's hotel booking hour when there is one. */
function ArrivalCard({ entry, checkin, hotel, dayWho, arrival, hideMine, mine }: { entry: Entry; checkin: string | null; hotel: string | null; dayWho: string | null; arrival: Arrival | null; hideMine?: boolean; mine?: string | null }) {
  const b = entry.booking!
  const airport = tokyoArrival(b)
  if (!airport) return null
  const a = ARRIVAL[airport]
  const ride = arrivalLine(arrival, (v) => t('מהשדה עד המלון כ-{n} דק׳. אחרי הגבול והמזוודות, שם בסביבות {time}', v))
  return (
    // closed to one row like the day's stops (the video's calm list); the first steps open under it
    <details className="arrival">
      <summary>
        <span className="plan-time">{entry.time}</span>
        <span className="plan-body">
          <span className="plan-title">
            <Icon as={PlaneLanding} /> {entry.title}
          </span>
          <span className="plan-sub">
            <span className="plan-kind">{t('{n} צעדים ראשונים אחרי הנחיתה', { n: a.steps.length })}</span>
            {b.who && b.who !== dayWho && !(hideMine && b.who === mine) && <span className="who-pill">{t(b.who)}</span>}
          </span>
          {ride && <span className="plan-sub arrival-ride">{ride}</span>}
        </span>
        {hotel && (
          <a className="nav-round" href={navUrl(hotel)} target="_blank" rel="noreferrer" aria-label={t('ניווט למלון')} onClick={(ev) => ev.stopPropagation()}>
            <Icon as={Navigation} />
          </a>
        )}
        <Icon as={ChevronDown} className="chev" />
      </summary>
      <ul>
        {a.steps.map((s) => (
          <li key={s.text}>
            <Icon as={s.icon} />
            <span>{s.checkin && checkin ? t('צ׳ק-אין מ-{time}, לפי ההזמנה. אפשר להשאיר מזוודות במלון לפני כן.', { time: checkin }) : s.text}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

function ItemForm(props: { tripId: string; start: string | null; numDays: number; couples: string[]; item: Partial<PlanItem>; onClose: () => void }) {
  const [f, setF] = useState<Partial<PlanItem>>(props.item)
  const set = (k: keyof PlanItem) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const save = async () => {
    if (!f.title?.trim()) return
    const row = {
      trip_id: props.tripId,
      day: Number(f.day),
      time: f.time || null,
      title: f.title.trim(),
      location: f.location || null,
      notes: f.notes || null,
      category: f.category ?? 'sight',
      who: f.who || null,
    }
    const ok = await mutate(
      f.id ? supabase.from('itinerary_items').update(row).eq('id', f.id) : supabase.from('itinerary_items').insert(row),
    )
    if (ok) props.onClose()
  }

  const remove = async () => {
    if (!f.id) return
    if (!(await ask({ title: t('למחוק את הפעילות?'), description: f.title ? String(f.title) : undefined, confirmLabel: t('מחיקה'), danger: true }))) return
    if (await mutate(supabase.from('itinerary_items').delete().eq('id', f.id))) props.onClose()
  }

  return (
    <Sheet title={f.id ? t('עריכת פעילות') : t('פעילות חדשה')} onClose={props.onClose}>
      <Field label={t('מה עושים?')}>
        <input value={f.title ?? ''} onChange={set('title')} autoFocus />
      </Field>
      <div className="row">
        <Field label={t('שעה')}>
          <input type="time" value={f.time ?? ''} onChange={set('time')} />
        </Field>
        <Field label={t('יום')}>
          <select value={f.day} onChange={set('day')}>
            {Array.from({ length: props.numDays }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {dayOption(props.start, i + 1)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {props.couples.length > 0 && (
        <Field label={t('של מי')}>
          <select value={f.who ?? ''} onChange={set('who')}>
            <option value="">{t(TOGETHER)}</option>
            {[...new Set([...props.couples, ...(f.who ? [f.who] : [])])].map((c) => (
              <option key={c} value={c}>
                {t('רק {who}', { who: t(c) })}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={t('סוג')}>
        <select value={f.category} onChange={set('category')}>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('מיקום (לחיפוש במפות)')}>
        <input value={f.location ?? ''} onChange={set('location')} dir="auto" />
      </Field>
      <Field label={t('הערות')}>
        <textarea value={f.notes ?? ''} onChange={set('notes')} rows={3} />
      </Field>
      <button className="primary" onClick={save}>
        {t('שמירה')}
      </button>
      {f.id && (
        <button className="danger" onClick={remove}>
          {t('מחיקה')}
        </button>
      )}
    </Sheet>
  )
}

function DayForm(props: { tripId: string; day: number; title: string; info?: DayInfo; couples: string[]; onClose: () => void }) {
  const [city, setCity] = useState(props.info?.city ?? '')
  const [hotel, setHotel] = useState(props.info?.hotel ?? '')
  const [notes, setNotes] = useState(props.info?.notes ?? '')
  const [who, setWho] = useState(props.info?.who ?? '')

  const save = async () => {
    const ok = await mutate(
      supabase.from('day_info').upsert({
        trip_id: props.tripId,
        day: props.day,
        city: city || null,
        hotel: hotel || null,
        notes: notes || null,
        who: who || null,
      }),
    )
    if (ok) props.onClose()
  }

  return (
    <Sheet title={props.title} onClose={props.onClose}>
      <Field label={t('עיר')}>
        <input value={city} onChange={(e) => setCity(e.target.value)} />
      </Field>
      <Field label={t('מי ביפן')}>
        <select value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">{t(TOGETHER)}</option>
          {[...new Set([...whoOptions(props.couples), ...(who ? [who] : [])])].map((w) => (
            <option key={w} value={w}>
              {t('רק {who}', { who: t(w) })}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('לינה')}>
        <input value={hotel} onChange={(e) => setHotel(e.target.value)} />
      </Field>
      <Field label={t('הערות ליום')}>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </Field>
      <button className="primary" onClick={save}>
        {t('שמירה')}
      </button>
    </Sheet>
  )
}

/** A planner warning in the app's language: the Hebrew text, or English words built from what it found. */
const ISSUE: Record<NonNullable<PlanSummary['issues']>[number]['kind'], string> = {
  overlap: t('חופף לתוכנית אחרת'),
  tight: t('אין מספיק זמן להגיע לכאן מהקודם'),
  hours: t('מחוץ לשעות הפתיחה'),
  meals: t('קרוב מדי לארוחה הקודמת'),
}

function warningText(w: PlanSummary['warnings'][number]) {
  if (!isEn || !w.kind) return w.text
  if (w.kind === 'closed_date') return 'Closed on this date'
  if (w.kind === 'closed_weekday') return `Closed on ${new Date(Date.UTC(2026, 10, 1 + (w.weekday ?? 0))).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })}s`
  return `Open only ${w.opens}–${w.closes}`
}

/**
 * The day strip stays under the slim title bar (30) and shrinks with the scroll, following the finger: the weekday and
 * city fade out over the first ~60pt and the date stays. It grows back the same way. With Reduce Motion it switches.
 */
function useStripShrink(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    // a zero-height marker where the strip naturally sits: measured live on every frame, so photos or the legend
    // loading above it later can't leave a stale starting point (the shrink used to begin long after it stuck)
    const mark = document.createElement('div')
    mark.setAttribute('aria-hidden', 'true')
    // no box of its own: the stack's 12px gap it would add is taken back
    mark.style.cssText = 'height:0;margin-bottom:-12px'
    el.before(mark)
    const update = () => {
      raf = 0
      const stick = parseFloat(getComputedStyle(el).top) || 0
      // shrinks over the last 30px before it reaches the bar, so it is already small the moment it pins
      let p = Math.max(0, Math.min(1, (stick + 30 - mark.getBoundingClientRect().top) / 30))
      if (reducedMotion()) p = p > 0.5 ? 1 : 0
      el.style.setProperty('--p', p.toFixed(3))
      el.classList.toggle('stuck', p > 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const onResize = () => update()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      mark.remove()
    }
  }, [ref])
}
