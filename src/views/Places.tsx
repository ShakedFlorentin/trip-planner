import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hapticSelect } from '../haptics'
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control'
import { supabase } from '../supabase'
import { AUDIENCES, CATEGORIES, type Candidate, type DayInfo, type ItineraryItem, type Member, type Place, type Swipe, type Trip } from '../types'
import { cityHe, cityLabel, couplesOf, dayDate, localizeCard, dayOption, errorText, fmtDay, keepRanges, mapsUrl, mutate, safeUrl, useMediaIndex, useTripHasBaby, useTripTable, withMedia } from '../lib'
import { isEn, t } from '../i18n'
import { Baby as BabyIcon, Star, CalendarCheck, Check, ChevronLeft, Clock, Globe, Heart, Lightbulb, List, Map as MapIcon, MapPin, Navigation, Pencil, Play, Plus, Trash2, Undo2 } from 'lucide-react'
import { EmptyState, Field, Skeleton, LoadNote, Sheet, useRemembered } from '../ui'
import { CATEGORY_ICON, Icon } from '../icons'
import '../styles/game.css'
import { VideoSheet, videoEmbed } from '../media'
import PlacesMap from './PlacesMap'
import AddPlace from './AddPlace'
import { RateBox, StarsInput, useRatings, type Ratings } from './Ratings'
import { SwipeRow } from '../swipe'
import { RingsIcon } from '../rings'
import { AREAS, areaOf } from '../areas'
import { validWho, type Who } from '../who'
import { placeWhoOk } from './placeWho'
import { ratingRow } from './ratingRow'
import UnderlineTabs from './UnderlineTabs'
import WhoTextMenu from './WhoTextMenu'
import { BeenThere, PlaceHero, PlaceMenu } from './PlaceCardParts'
import '../styles/redesign.css'
import '../styles/places.css'
import QuickFab from './QuickFab'
import { takeSharedLink, useQuickAdd } from '../quickAdd'
import { askDelete, say } from '../toast'

const PLACE_TABS: Record<string, string> = {
  '': t('הכל'),
  food: t('אוכל'),
  sight: t('אטרקציות'),
  shopping: t('קניות'),
  nightlife: t('ברים ולילה'),
  transport: t('תחבורה'),
  other: t('אחר'),
}

const CITY_ORDER = ['טוקיו', 'יוקוהמה', 'קיוטו', 'נארה', 'אוסקה', 'טיולי יום', 'טיול יום'] // he-only

type Props = { trip: Trip; me: string; userId: string; members: Member[]; onOpenDay: (day: number) => void; onOpenSwipe?: () => void }

export default function Places({ trip, me, userId, members, onOpenDay, onOpenSwipe }: Props) {
  const { rows: rawRows, loading, error, reload } = useTripTable<Place>('places', trip.id)
  const media = useMediaIndex()
  const hasBaby = useTripHasBaby(trip.id)
  // places with neither a match nor an author were pre-seeded with the trip, before anyone chose anything
  const rows = useMemo(
    () => rawRows.filter((p) => p.candidate_id || p.added_by).map((p) => withMedia(p, media)),
    [rawRows, media],
  )
  const { rows: items } = useTripTable<ItineraryItem>('itinerary_items', trip.id, 'sort')
  const { rows: swipes } = useTripTable<Swipe>('swipes', trip.id)
  // the raw card rows: a matched place's notes are copied from its card, and show in English from the card's `en`
  const { rows: cards } = useTripTable<Candidate>('candidates', trip.id)
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  // ratings sit on the shared library card, so the next trip with the same place sees them; a card made only for this
  // trip has none, and its place gets no stars. One query for every visited place.
  const libOf = (p: Place) => (p.candidate_id && cardById.get(p.candidate_id)?.library_id) || null
  const ratings = useRatings(rows.filter((p) => p.visited).map(libOf))
  const [view, setView] = useState<'list' | 'map'>('list')
  const [cat, setCat] = useRemembered('placesTab', '')
  const couples = couplesOf(members)
  const myCouple = members.find((m) => m.user_id === userId)?.couple ?? null
  const [savedWho, setWhose] = useRemembered('placesWho', 'mine')
  const whose: Who = validWho(savedWho, couples, myCouple)
  // a place both couples liked is on each couple's list too ("שקד ומאור + אלמוג ושניר")
  const whoOk = (p: Place) => placeWhoOk(p.who, whose, myCouple)
  const [edit, setEdit] = useState<Partial<Place> | null>(null)
  const [adding, setAdding] = useState(false)
  // the link shared into the app from another app's Share menu, filled in on the add-place sheet
  const [sharedLink, setSharedLink] = useState('')
  useQuickAdd('place', () => {
    setSharedLink(takeSharedLink())
    setAdding(true)
  })
  const [planning, setPlanning] = useState<Place | null>(null)
  // keep ids, not rows, so the open sheets show live data (visited, edits, deletion)
  const [readId, setReadId] = useState<string | null>(null)
  const [rateId, setRateId] = useState<string | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const onPick = useCallback((p: Place) => {
    setPickedId(p.id)
  }, [])

  const filtered = rows.filter(whoOk)
  // one tab per kind of place; the rarer kinds only once something is filed under them
  const tabs = Object.fromEntries(
    Object.entries(PLACE_TABS).filter(([k]) => !['transport', 'other', 'nightlife'].includes(k) || rows.some((p) => p.category === k)),
  )
  const current = tabs[cat] ? cat : ''
  const shown = filtered.filter((p) => !current || p.category === current)
  const picked = shown.find((p) => p.id === pickedId) ?? null
  const plannedDay = new Map<string, number>()
  for (const i of items) if (i.place_id && !plannedDay.has(i.place_id)) plannedDay.set(i.place_id, i.day)
  const read = readId ? rows.find((p) => p.id === readId) : undefined
  const rating = rateId ? rows.find((p) => p.id === rateId) : undefined

  // city → places. One flat list per city (the neighbourhood is on each row's quiet line); the places already
  // been to fold away under "Been there" at the bottom. The city is the Hebrew name whichever way the row stores it.
  const cityRank = (p: Place) => rank(cityHe(p.city))
  const areaRank = (p: Place) => {
    const a = areaOf(cityHe(p.city), p.area)
    const i = a ? (AREAS[cityHe(p.city)] ?? []).indexOf(a) : -1
    return i === -1 ? 99 : i
  }
  const groups = new Map<string, Place[]>()
  const been: Place[] = []
  for (const p of [...shown].sort((a, b) => cityRank(a) - cityRank(b) || areaRank(a) - areaRank(b))) {
    if (p.visited) {
      been.push(p)
      continue
    }
    const c = cityHe(p.city) || 'אחר' // he-only
    groups.set(c, [...(groups.get(c) ?? []), p])
  }

  const visit = async (p: Place) => {
    const ok = await setVisited(p)
    // right after marking a place visited: how was it, and a tip for the next travellers (48)
    if (ok && !p.visited && libOf(p)) setRateId(p.id)
  }
  const remove = async (p: Place) => {
    if (await askDelete(t('למחוק את "{name}"?', { name: p.name }))) await mutate(supabase.from('places').delete().eq('id', p.id))
  }
  const likedByMe = new Set(swipes.filter((s) => s.user_id === userId && s.liked && !s.skipped).map((s) => s.candidate_id))
  const row = (p: Place, first = false, withCity = false) => (
    <PlaceRow
      key={p.id}
      hint={first}
      p={p}
      withCity={withCity}
      day={plannedDay.get(p.id)}
      start={trip.start_date}
      liked={p.candidate_id ? likedByMe.has(p.candidate_id) : p.added_by === me}
      onOpen={() => setReadId(p.id)}
      onEdit={() => setEdit(p)}
      onRemove={() => remove(p)}
      onVisit={() => visit(p)}
    />
  )
  let firstRow = true

  return (
    <div className={'stack places pl-screen' + (view === 'map' ? ' map-mode' : '')}>
      {/* whose places as a quiet text menu at the start, the List / Map switch at the end */}
      <div className="lt-bar">
        {couples.length > 1 ? (
          <WhoTextMenu
            label={t('של מי')}
            couples={couples}
            mine={myCouple}
            value={whose}
            onChange={setWhose}
            suffix={shown.length === 1 ? t('מקום אחד') : t('{n} מקומות', { n: shown.length })}
          />
        ) : (
          <span className="who-text static">{shown.length === 1 ? t('מקום אחד') : t('{n} מקומות', { n: shown.length })}</span>
        )}
        <SegmentedControl className="pl-seg" aria-label={t('תצוגה')} value={view} onValueChange={(v) => v && (hapticSelect(), setView(v as 'list' | 'map'))}>
          <SegmentedControlIndicator className="pl-seg-ind" />
          <SegmentedControlItem value="list" className="pl-seg-item">
            <Icon as={List} size={18} /> {t('רשימה')}
          </SegmentedControlItem>
          <SegmentedControlItem value="map" className="pl-seg-item">
            <Icon as={MapIcon} size={18} /> {t('מפה')}
          </SegmentedControlItem>
        </SegmentedControl>
      </div>
      <UnderlineTabs label={t('סוג מקום')} tabs={Object.entries(tabs).map(([k, v]): [string, string] => [k, v])} value={current} onChange={setCat} />

      {view === 'map' ? (
        <>
          <PlacesMap places={shown} onPick={onPick} start={trip.start_date} numDays={trip.num_days} tripId={trip.id} />
          {picked && <div className="map-picked">{row(picked, false, true)}</div>}
        </>
      ) : (
        <>
          {error && <LoadNote onRetry={reload} />}
          {loading && !rows.length && <Skeleton rows={4} />}
          {!loading && !error && shown.length === 0 && (
            <EmptyState
              icon={MapPin}
              title={rows.length ? t('אין מקומות בסינון הזה') : t('עוד אין מקומות')}
              line={rows.length ? undefined : t('מקום שקיבל מאצ׳ בגילוי יופיע כאן')}
              action={
                rows.length
                  ? { label: t('להציג את כל המקומות'), onClick: () => (setCat(''), setWhose('all')) }
                  : onOpenSwipe
                    ? { label: t('לגלות מקומות'), onClick: onOpenSwipe }
                    : undefined
              }
            />
          )}
          {[...groups].map(([c, ps]) => (
            <section key={c} className="pl-city-block">
              <h2 className="pl-city">
                {cityLabel(c)} <span className="pl-city-n">{ps.length}</span>
              </h2>
              <div className="group pl-group">
                {ps.map((p) => {
                  const r = row(p, firstRow)
                  firstRow = false
                  return r
                })}
              </div>
            </section>
          ))}
          {been.length > 0 && (
            <BeenThere count={been.length}>
              <div className="group pl-group">{been.map((p) => row(p, false, true))}</div>
            </BeenThere>
          )}
        </>
      )}

      {/* the + is the shared quick-add button; the page pads for it, so it covers no row */}
      <QuickFab
        label={t('הצעת מקום')}
        onTap={() => {
          setSharedLink('')
          setAdding(true)
        }}
      />
      {adding && <AddPlace tripId={trip.id} userId={userId} me={me} initial={sharedLink} onClose={() => setAdding(false)} />}
      {read && (
        <PlaceSheet
          p={read}
          card={read.candidate_id ? cardById.get(read.candidate_id) : undefined}
          hasBaby={hasBaby}
          day={plannedDay.get(read.id)}
          start={trip.start_date}
          likedBy={likersOf(read, swipes, members)}
          ratings={ratings}
          libraryId={libOf(read)}
          tripId={trip.id}
          userId={userId}
          onEdit={() => {
            setReadId(null)
            setEdit(read)
          }}
          onRemove={() => {
            setReadId(null)
            void remove(read)
          }}
          onVisit={() => visit(read)}
          onPlan={() => setPlanning(read)}
          onOpenDay={(d) => {
            setReadId(null)
            onOpenDay(d)
          }}
          onClose={() => setReadId(null)}
        />
      )}
      {rating && libOf(rating) && (
        <RateSheet p={rating} libraryId={libOf(rating)!} tripId={trip.id} userId={userId} ratings={ratings} hasBaby={hasBaby} onClose={() => setRateId(null)} />
      )}
      {edit && (
        <PlaceForm
          hasBaby={hasBaby}
          tripId={trip.id}
          me={me}
          place={edit}
          places={rows}
          card={edit.candidate_id ? cardById.get(edit.candidate_id) : undefined}
          onClose={() => setEdit(null)}
        />
      )}
      {planning && (
        <AddToDay
          hasBaby={hasBaby}
          trip={trip}
          place={planning}
          card={planning.candidate_id ? cardById.get(planning.candidate_id) : undefined}
          onClose={() => setPlanning(null)}
        />
      )}
    </div>
  )
}

/** Who liked a place: the names of everyone who said yes to its card. */
function likersOf(p: Place, swipes: Swipe[], members: Member[]) {
  if (!p.candidate_id) return []
  return swipes
    .filter((s) => s.candidate_id === p.candidate_id && s.liked && !s.skipped)
    .map((s) => members.find((m) => m.user_id === s.user_id)?.display_name)
    .filter((n): n is string => !!n)
}

/**
 * Tick or untick "we were there". The time of the visit (visited_at) is sent only when the rows we got carry that
 * column, so nothing breaks before the database has it; the server's trigger sets it too.
 */
async function setVisited(p: Place) {
  const next = !p.visited
  const row = 'visited_at' in p ? { visited: next, visited_at: next ? new Date().toISOString() : null } : { visited: next }
  let { error } = await supabase.from('places').update(row).eq('id', p.id)
  if (error && /visited_at/.test(error.message)) ({ error } = await supabase.from('places').update({ visited: next }).eq('id', p.id))
  if (error) say(errorText(error.message), { error: true })
  return !error
}

/** The card's "what it is" line (46): what's special about it, else its short description. */
function whatLine(card?: Candidate) {
  const c = card && localizeCard(card)
  return c?.special || c?.hype || null
}

/**
 * A place in the list (the quiet list): a category tile, the name, one quiet line (neighbourhood and kind), the plan
 * day as a small tag, a small heart when you liked it, and a chevron. No photo thumbnails: a weak photo is worse than
 * none, and the big photo is on the place's own card. "ביקרנו" is a swipe toward the start side (like "read" in
 * Mail), or the button on the card; edit and remove are the swipe toward the end side.
 */
function PlaceRow(props: {
  p: Place
  hint?: boolean
  /** you liked its card (or added it yourself) */
  liked: boolean
  /** the city goes in the quiet line (the Been-there list and the map card mix cities) */
  withCity?: boolean
  day?: number
  start: string | null
  onOpen: () => void
  onEdit: () => void
  onRemove: () => void
  onVisit: () => void
}) {
  const { p } = props
  const area = areaOf(cityHe(p.city), p.area)
  const sub = [props.withCity && cityLabel(p.city), area ? (isEn ? area.en : area.he) : p.area, p.category !== 'other' && CATEGORIES[p.category]].filter(Boolean).join(' · ')
  return (
    <SwipeRow
      hint={props.hint}
      start={{ label: p.visited ? t('לא ביקרנו') : t('ביקרנו'), icon: p.visited ? Undo2 : Check, tone: 'ok', onClick: props.onVisit }}
      end={[
        { label: t('עריכה'), icon: Pencil, tone: 'edit', onClick: props.onEdit },
        { label: t('מחיקה'), icon: Trash2, tone: 'del', onClick: props.onRemove },
      ]}
    >
      <div className={'pl-row' + (p.visited ? ' visited' : '')}>
        {/* a real button for the row, so Space and Enter open it; the swipe works around it */}
        <button className="pl-main" onClick={props.onOpen}>
          <span className="pl-tile" aria-hidden="true">
            <Icon as={CATEGORY_ICON[p.category] ?? MapPin} size={18} />
          </span>
          <span className="pl-body">
            <span className="pl-name" dir="auto">
              {p.name}
            </span>
            {sub && <span className="pl-sub">{sub}</span>}
          </span>
          {props.day ? <span className="pl-tag">{props.start ? fmtDay(dayDate(props.start, props.day)) : t('יום {day}', { day: props.day })}</span> : null}
          {props.liked && <Icon as={Heart} className="pl-heart" size={18} aria-label={t('אהבתם')} />}
          <Icon as={ChevronLeft} className="chev flip-ltr" size={18} />
        </button>
      </div>
    </SwipeRow>
  )
}

/**
 * The place opened, as a place card (Apple Maps): its photo on top when it is a good one, the subtitle, four labelled
 * actions (Directions is the one filled button), an inset list (In the plan, Takes, On the list of, Liked by), what
 * it is, the tip and the baby note as quiet callouts. Edit and Delete are behind "⋯".
 */
function PlaceSheet(props: {
  p: Place
  card?: Candidate
  hasBaby: boolean
  day?: number
  start: string | null
  likedBy: string[]
  ratings: Ratings
  libraryId: string | null
  tripId: string
  userId: string
  onEdit: () => void
  onRemove: () => void
  onVisit: () => void
  onPlan: () => void
  onOpenDay: (day: number) => void
  onClose: () => void
}) {
  const { p, card, day } = props
  const [video, setVideo] = useState(false)
  const notes = notesFor(p.notes, card, props.hasBaby)
  const tip = notesShown(notes)
  const baby = props.hasBaby ? babyLine(notes) : null
  const area = areaOf(cityHe(p.city), p.area)
  const where = [cityLabel(p.city), area ? (isEn ? area.en : area.he) : p.area].filter(Boolean).join(' · ')
  const tags = [p.category !== 'other' && CATEGORIES[p.category], p.audience && AUDIENCES[p.audience]].filter(Boolean).join(' · ')
  const what = whatLine(card)
  // the saved Google Maps link, else a search for the name when the place has a known spot
  const maps = safeUrl(p.url) || (p.lat != null ? mapsUrl(p.name) : null)
  const website = safeUrl(card?.website_url)
  const vid = videoEmbed(p)
  const takes = card?.time_needed
  const who = p.who ? p.who.split(' + ').map((w) => t(w)).join(' + ') : ''
  return (
    <Sheet title={p.name} onClose={props.onClose}>
      {!!p.photos?.[0] && <PlaceHero src={p.photos[0]} />}
      <div className="pc">
        <div className="pc-top">
          <div className="pc-sub">
            {where && <div dir="auto">{where}</div>}
            {tags && <div>{tags}</div>}
          </div>
          <PlaceMenu onEdit={props.onEdit} onDelete={props.onRemove} />
        </div>
        <div className="pc-acts">
          {maps && (
            <a className="pc-act primary" href={maps} target="_blank" rel="noreferrer">
              <Icon as={Navigation} size={22} />
              <span>{t('ניווט')}</span>
            </a>
          )}
          <button className="pc-act" aria-pressed={p.visited} onClick={props.onVisit}>
            <Icon as={p.visited ? Undo2 : Check} size={22} />
            <span>{p.visited ? t('לא ביקרנו') : t('ביקרנו')}</span>
          </button>
          {website && (
            <a className="pc-act" href={website} target="_blank" rel="noreferrer">
              <Icon as={Globe} size={22} />
              <span>{t('אתר')}</span>
            </a>
          )}
          {vid && (
            <button className="pc-act" onClick={() => setVideo(true)}>
              <Icon as={Play} size={22} />
              <span>{t('סרטון')}</span>
            </button>
          )}
        </div>
        {(day || !p.visited || takes || who || props.likedBy.length > 0) && (
          <div className="group pc-info">
            {day ? (
              <button className="group-row" onClick={() => props.onOpenDay(day)}>
                <Icon as={CalendarCheck} size={18} />
                <span className="k">{t('במסלול')}</span>
                <span className="v">{props.start ? fmtDay(dayDate(props.start, day)) : t('יום {day}', { day })}</span>
                <Icon as={ChevronLeft} className="chev flip-ltr" size={18} />
              </button>
            ) : (
              !p.visited && (
                <button className="group-row" onClick={props.onPlan}>
                  <Icon as={Plus} size={18} />
                  <span className="k pc-link">{t('הוספה למסלול')}</span>
                  <Icon as={ChevronLeft} className="chev flip-ltr" size={18} />
                </button>
              )
            )}
            {takes && (
              <div className="group-row">
                <Icon as={Clock} size={18} />
                <span className="k">{t('לוקח')}</span>
                <span className="v" dir="auto">{takes}</span>
              </div>
            )}
            {who && (
              <div className="group-row">
                <RingsIcon one />
                <span className="k">{t('ברשימה של')}</span>
                <span className="v"><bdi>{who}</bdi></span>
              </div>
            )}
            {props.likedBy.length > 0 && (
              <div className="group-row">
                <Icon as={Heart} size={18} />
                <span className="k">{t('נאהב על ידי')}</span>
                <span className="v">{props.likedBy.map((n) => t(n)).join(' · ')}</span>
              </div>
            )}
          </div>
        )}
        {what && <p className="pc-what" dir="auto">{keepRanges(what)}</p>}
        {tip && (
          <p className="pc-callout" dir="auto">
            <Icon as={Lightbulb} size={18} />
            <span>{keepRanges(tip)}</span>
          </p>
        )}
        {baby && (
          <p className="pc-callout" dir="auto">
            <Icon as={BabyIcon} size={18} />
            <span>{keepRanges(baby)}</span>
          </p>
        )}
        {p.visited && props.libraryId && <RateBox libraryId={props.libraryId} tripId={props.tripId} userId={props.userId} ratings={props.ratings} />}
      </div>
      {video && vid && <VideoSheet media={vid} title={p.name} onClose={() => setVideo(false)} />}
    </Sheet>
  )
}

/**
 * Right after marking a place visited (48): how was it, with the stars and the note box already open. "אחר כך"
 * leaves it for later; the card then reads "✓ ביקרנו · + דירוג וטיפ".
 */
function RateSheet(props: { p: Place; libraryId: string; tripId: string; userId: string; ratings: Ratings; hasBaby: boolean; onClose: () => void }) {
  const mine = props.ratings.of(props.libraryId).find((r) => r.user_id === props.userId)
  const loaded = props.ratings.loaded(props.libraryId)
  const [stars, setStars] = useState(mine?.stars ?? 0)
  const [note, setNote] = useState(mine?.note ?? '')
  // what the person changed themselves; the saved rating, once it is read, only fills in what they have not touched
  const touched = useRef({ stars: false, note: false })
  useEffect(() => {
    if (!mine) return
    if (!touched.current.stars) setStars(mine.stars)
    if (!touched.current.note) setNote(mine.note ?? '')
  }, [mine?.stars, mine?.note])
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!stars || saving) return
    setSaving(true)
    // before the saved rating is read, a note nobody typed is not sent, so it cannot wipe the one already saved
    const row = ratingRow(
      { library_id: props.libraryId, trip_id: props.tripId },
      stars,
      note.trim().slice(0, 500) || null,
      loaded || touched.current.note,
    )
    if (await mutate(supabase.from('place_ratings').upsert(row, { onConflict: 'library_id,user_id' }))) {
      props.ratings.put({ note: mine?.note ?? null, ...row, user_id: props.userId, updated_at: new Date().toISOString() })
      props.onClose()
    }
    setSaving(false)
  }
  return (
    <Sheet
      title={t('איך היה ב-{name}?', { name: '\u2068' + props.p.name + '\u2069' })}
      onClose={props.onClose}
      closeLabel={t('אחר כך')}
      action={{ label: t('שמירה'), onClick: save, disabled: !stars || saving }}
    >
      <div className="rate-nudge">
        <StarsInput value={stars} onChange={(n) => { touched.current.stars = true; setStars(n) }} />
        <textarea
          className="grow"
          value={note}
          onChange={(e) => { touched.current.note = true; setNote(e.target.value) }}
          maxLength={500}
          rows={3}
          dir="auto"
          aria-label={t('טיפ למטיילים הבאים')}
          placeholder={
            props.hasBaby ? t('טיפ למטיילים הבאים: מה שווה, מה לדלג, איך היה עם התינוק') : t('טיפ למטיילים הבאים: מה שווה, מה לדלג')
          }
        />
      </div>
    </Sheet>
  )
}

// the baby line a match copies from its card into the place's notes: "<tip>\nעם התינוק: <baby notes>"
const BABY_HE = 'עם התינוק:' // he-only
const BABY_EN = 'With the baby:'

/**
 * A place's notes in the app's language. Notes a match copied from its card (exactly the card's Hebrew tip and baby
 * line) show in English from the card's `en`; notes people wrote themselves show as written.
 */
function notesFor(notes: string | null | undefined, card: Candidate | undefined, hasBaby: boolean) {
  return (isEn && notesEn(notes, card, hasBaby)) || (notes ?? null)
}

/** The English of notes a match copied from the card; null for notes people wrote (or a card without English). */
function notesEn(notes: string | null | undefined, card: Candidate | undefined, hasBaby: boolean) {
  if (!notes || !card?.en) return null
  const he = [card.tip, card.baby_notes && BABY_HE + ' ' + card.baby_notes].filter(Boolean).join('\n')
  if (notes !== he) return null
  const tip = card.en.tip ?? card.tip
  const baby = hasBaby ? (card.en.baby_notes ?? card.baby_notes) : null
  return [tip, baby && BABY_EN + ' ' + baby].filter(Boolean).join('\n') || null
}

/** The baby line of a place's notes, without its "עם התינוק:" label. */
const babyLine = (notes: string | null) =>
  notes
    ?.split('\n')
    .find((l) => l.startsWith(BABY_HE) || l.startsWith(BABY_EN))
    ?.replace(BABY_HE, '')
    .replace(BABY_EN, '')
    .trim() || null

const notesShown = (notes: string | null) =>
  notes
    ?.split('\n')
    .filter((l) => !l.startsWith(BABY_HE) && !l.startsWith(BABY_EN))
    .join('\n')
    .trim() || null

function rank(city: string | null) {
  const i = CITY_ORDER.indexOf(city ?? '')
  return i === -1 ? 99 : i
}

/**
 * Editing a place (50, 51). "ביטול" and "שמירה" sit in the title row, so a long note can't push Save off the screen.
 * City and neighbourhood are full rows that open pickers: the trip's cities, and the city's clean neighbourhoods (47)
 * with "אחרת…" to type one. The notes grow with the text; with a baby, "עם התינוק" has its own box.
 */
function PlaceForm(props: { hasBaby: boolean; tripId: string; me: string; place: Partial<Place>; places: Place[]; card?: Candidate; onClose: () => void }) {
  // in English a matched place's copied notes show in English; untouched, they are saved back as they were
  const [shownNotes] = useState(() => notesFor(props.place.notes, props.card, props.hasBaby))
  const [tipStart] = useState(() => notesShown(shownNotes) ?? '')
  const [babyStart] = useState(() => babyLine(shownNotes) ?? '')
  const [f, setF] = useState<Partial<Place>>({ ...props.place })
  const [tip, setTip] = useState(tipStart)
  const [baby, setBaby] = useState(babyStart)
  const [picking, setPicking] = useState<'' | 'city' | 'area'>('')
  const { rows: days } = useTripTable<DayInfo>('day_info', props.tripId, 'day')
  const set = (k: keyof Place) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const tripCities = [...new Set([...days.flatMap((d) => (d.city ?? '').split(' / ').map((c) => c.trim())), ...props.places.map((p) => p.city ?? '')].filter(Boolean))].sort(
    (a, b) => rank(a) - rank(b),
  )
  const area = areaOf(cityHe(f.city), f.area)

  const save = async () => {
    // editing only: a place gets into the trip through the game (swipe and match), never from this form
    if (!f.id || !f.name?.trim()) return
    const untouched = tip === tipStart && baby === babyStart
    const notes = untouched ? props.place.notes : [tip.trim(), props.hasBaby && baby.trim() && BABY_HE + ' ' + baby.trim()].filter(Boolean).join('\n')
    const row = {
      trip_id: props.tripId,
      name: f.name.trim(),
      city: f.city || null,
      area: f.area || null,
      category: f.category ?? 'other',
      audience: f.audience || null,
      url: f.url || null,
      notes: notes || null,
    }
    const ok = await mutate(supabase.from('places').update(row).eq('id', f.id))
    if (ok) props.onClose()
  }

  const remove = async () => {
    if (f.id && (await askDelete(t('למחוק את "{name}"?', { name: f.name ?? '' }))) && (await mutate(supabase.from('places').delete().eq('id', f.id)))) props.onClose()
  }

  return (
    <Sheet title={t('עריכת מקום')} onClose={props.onClose} closeLabel={t('ביטול')} action={{ label: t('שמירה'), onClick: save, disabled: !f.name?.trim() }}>
      <Field label={t('שם')}>
        <input value={f.name ?? ''} onChange={set('name')} dir="auto" />
      </Field>
      <div className="group">
        <button className="group-row" onClick={() => setPicking('city')}>
          <span className="k">{t('עיר')}</span>
          <span className="v">{f.city ? cityLabel(f.city) : t('לבחירה')}</span>
          <Icon as={ChevronLeft} className="chev flip-ltr" />
        </button>
        <button className="group-row" onClick={() => setPicking('area')} disabled={!f.city}>
          <span className="k">{t('שכונה')}</span>
          <span className="v">{area ? (isEn ? area.en : area.he) : f.area || t('לבחירה')}</span>
          <Icon as={ChevronLeft} className="chev flip-ltr" />
        </button>
        <label className="group-row">
          <span className="k">{t('סוג')}</span>
          <select value={f.category ?? 'other'} onChange={set('category')}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="group-row">
          <span className="k">{t('למי זה מתאים?')}</span>
          <select value={f.audience ?? ''} onChange={set('audience')}>
            <option value="">—</option>
            {Object.entries(AUDIENCES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Field label={t('קישור (Google Maps / אתר / טיקטוק)')}>
        <input type="url" value={f.url ?? ''} onChange={set('url')} dir="ltr" />
      </Field>
      <Field label={t('הערות')}>
        <GrowArea value={tip} onChange={setTip} />
      </Field>
      {props.hasBaby && (
        <Field label={t('עם התינוק')}>
          <GrowArea value={baby} onChange={setBaby} />
        </Field>
      )}
      {f.id && (
        <button className="danger" onClick={remove}>
          <Icon as={Trash2} /> {t('מחיקת המקום')}
        </button>
      )}
      {picking === 'city' && (
        <PickSheet
          title={t('עיר')}
          value={f.city ?? ''}
          options={tripCities.map((c) => ({ value: c, label: cityLabel(c) }))}
          onPick={(c) => {
            setF({ ...f, city: c, area: c === f.city ? f.area : null })
            setPicking('')
          }}
          onClose={() => setPicking('')}
        />
      )}
      {picking === 'area' && (
        <PickSheet
          title={t('שכונה')}
          value={area?.key ?? f.area ?? ''}
          options={(AREAS[f.city ?? ''] ?? []).map((a) => ({
            value: a.key,
            label: isEn ? a.en : a.he,
            sub: isEn ? undefined : a.en,
            count: props.places.filter((p) => p.city === f.city && areaOf(p.city, p.area)?.key === a.key).length,
          }))}
          other
          onPick={(a) => {
            setF({ ...f, area: a })
            setPicking('')
          }}
          onClose={() => setPicking('')}
        />
      )}
    </Sheet>
  )
}

/** A text box that grows with its text, like Notes: no scrolling inside it (51). */
function GrowArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return <textarea ref={ref} className="grow" value={value} onChange={(e) => onChange(e.target.value)} rows={2} dir="auto" />
}

/** A list to pick from, iOS style: a check on the current one; `other` adds "אחרת…" to type a value. */
function PickSheet(props: {
  title: string
  value: string
  options: { value: string; label: string; sub?: string; count?: number }[]
  other?: boolean
  onPick: (v: string) => void
  onClose: () => void
}) {
  const known = props.options.some((o) => o.value === props.value)
  const [typing, setTyping] = useState(props.other && !!props.value && !known ? props.value : null)
  return (
    <Sheet title={props.title} onClose={props.onClose}>
      <div className="group">
        {props.options.map((o) => (
          <button key={o.value} className="group-row" onClick={() => props.onPick(o.value)}>
            <span className="k">
              {o.label} {o.sub && <span className="area-en">{o.sub}</span>}
            </span>
            {o.count !== undefined && <span className="v">{o.count}</span>}
            {props.value === o.value && <Icon as={Check} className="pick-check" />}
          </button>
        ))}
        {props.other &&
          (typing === null ? (
            <button className="group-row" onClick={() => setTyping('')}>
              <span className="k">{t('אחרת…')}</span>
            </button>
          ) : (
            <div className="group-row">
              <input
                value={typing}
                onChange={(e) => setTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && typing.trim() && props.onPick(typing.trim())}
                dir="auto"
                autoFocus
                placeholder={t('שם השכונה')}
                style={{ textAlign: 'start' }}
              />
              <button className="link" disabled={!typing.trim()} onClick={() => props.onPick(typing.trim())}>
                {t('אישור')}
              </button>
            </div>
          ))}
      </div>
    </Sheet>
  )
}

function AddToDay(props: { hasBaby: boolean; trip: Trip; place: Place; card?: Candidate; onClose: () => void }) {
  const [day, setDay] = useState(1)
  const [time, setTime] = useState('')
  const { rows: days } = useTripTable<DayInfo>('day_info', props.trip.id, 'day')

  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const add = async () => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
    const p = props.place
    // a place on one couple's list is theirs; otherwise a day only one couple is in Japan is theirs, else everyone's
    const who = p.who ?? days.find((d) => d.day === day)?.who ?? null
    const ok = await mutate(
      supabase.from('itinerary_items').insert({
        trip_id: props.trip.id,
        day,
        time: time || null,
        title: p.name,
        // a stand-in: the database puts the card's address here (trigger itinerary_item_address)
        location: [p.name, p.area, p.city].filter(Boolean).join(', '),
        notes: p.notes,
        // the same notes in English, for whoever uses the app in English
        notes_en: notesEn(p.notes, props.card, props.hasBaby),
        category: p.category,
        place_id: p.id,
        who,
      }),
    )
    if (ok) props.onClose()
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <Sheet title={t('הוספת "{name}" למסלול', { name: props.place.name })} onClose={props.onClose}>
      <div className="row">
        <Field label={t('יום')}>
          <select value={day} onChange={(e) => setDay(+e.target.value)}>
            {Array.from({ length: props.trip.num_days }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {dayOption(props.trip.start_date, i + 1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('שעה (לא חובה)')}>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <button className="primary" onClick={add} disabled={busy}>
        {t('הוספה')}
      </button>
    </Sheet>
  )
}

/**
 * In the evening of a trip day (48): the places visited today and not rated yet, one tap each. No push messages: it
 * waits on Home.
 */
export function EveningRate({ trip, userId }: { trip: Trip; userId: string }) {
  const { rows: places } = useTripTable<Place>('places', trip.id)
  const { rows: cards } = useTripTable<Candidate>('candidates', trip.id)
  const hasBaby = useTripHasBaby(trip.id)
  const lib = new Map(cards.map((c) => [c.id, c.library_id]))
  const libOf = (p: Place) => (p.candidate_id && lib.get(p.candidate_id)) || null
  const todayTokyo = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
  const visited = places.filter(
    (p) => p.visited && libOf(p) && p.visited_at && new Date(p.visited_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' }) === todayTokyo,
  )
  const ratings = useRatings(visited.map(libOf))
  const [rateId, setRateId] = useState<string | null>(null)
  const unrated = visited.filter((p) => !ratings.of(libOf(p)!).some((r) => r.user_id === userId))
  const rating = rateId ? places.find((p) => p.id === rateId) : undefined
  if (!unrated.length && !rating) return null
  return (
    <section className="card">
      <h3>{t('איך היה היום?')}</h3>
      <p className="muted small">{t('דרגו את המקומות שהייתם בהם היום, וכתבו טיפ למטיילים הבאים.')}</p>
      <div className="chips">
        {unrated.map((p) => (
          <button key={p.id} className="chip" onClick={() => setRateId(p.id)}>
            <Icon as={Star} /> <bdi>{p.name}</bdi>
          </button>
        ))}
      </div>
      {rating && libOf(rating) && (
        <RateSheet p={rating} libraryId={libOf(rating)!} tripId={trip.id} userId={userId} ratings={ratings} hasBaby={hasBaby} onClose={() => setRateId(null)} />
      )}
    </section>
  )
}
