import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import { AUDIENCES, CATEGORIES, type Candidate, type DayInfo, type GuidePlace, type ItineraryItem, type Member, type Place, type Swipe, type Trip } from '../types'
import { cityLabel, couplesOf, dayDate, localizeCard, dayOption, errorText, fmtDay, keepRanges, mapsUrl, mutate, normName, useMediaIndex, useTripHasBaby, useTripTable, withMedia } from '../lib'
import { isEn, t } from '../i18n'
import { Baby as BabyIcon, Star, BookOpen, CalendarCheck, Check, ChevronDown, ChevronLeft, Heart, Lightbulb, List, Map as MapIcon, MapPin, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { Empty, Field, LoadNote, Sheet, useRemembered } from '../ui'
import { CATEGORY_ICON, Icon } from '../icons'
import '../styles/game.css'
import { MediaActions, Thumb } from '../media'
import PlacesMap from './PlacesMap'
import AddPlace from './AddPlace'
import { RateBox, StarsInput, useRatings, type Ratings } from './Ratings'
import { SwipeRow } from '../swipe'
import { RingsIcon } from '../rings'
import { AREAS, areaOf } from '../areas'
import { shows, validWho, whoChoices, whoLabel, type Who } from '../who'
import QuickFab from './QuickFab'
import { takeSharedLink, useQuickAdd } from '../quickAdd'

const PLACE_TABS: Record<string, string> = {
  '': t('הכל'),
  food: t('אוכל'),
  sight: t('אטרקציות'),
  shopping: t('קניות'),
  nightlife: t('ברים ולילה'),
  transport: t('תחבורה'),
  other: t('אחר'),
}

// the Ptitim map's folders, filed under the Places tabs
const GUIDE_TAB: Record<string, string> = { 'חנויות': 'shopping', 'איזורים ואתרים': 'sight' } // he-only
const guideTab = (g: GuidePlace) => GUIDE_TAB[g.folder] ?? 'food'
const guideCategory = (g: GuidePlace) =>
  g.folder === 'חנויות' ? 'shopping' : g.folder === 'איזורים ואתרים' ? 'sight' : g.folder.startsWith('קפה') ? 'cafe' : 'food' // he-only
const PTITIM_URL = 'https://www.ptitim.com/tokyoguide'

const CITY_ORDER = ['טוקיו', 'יוקוהמה', 'קיוטו', 'נארה', 'אוסקה', 'טיולי יום', 'טיול יום'] // he-only

type Props = { trip: Trip; me: string; userId: string; members: Member[]; onOpenDay: (day: number) => void }

export default function Places({ trip, me, userId, members, onOpenDay }: Props) {
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
  const whoOk = (p: Place) => !p.who || p.who.split(' + ').some((w) => shows(w, whose, myCouple)) || shows(null, whose, myCouple)
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
    setGuidePick(null)
  }, [])
  // the Ptitim blog's Tokyo map as an optional layer, loaded the first time it's turned on
  const [showGuide, setShowGuide] = useRemembered('guideLayer', '')
  const [guide, setGuide] = useState<GuidePlace[]>([])
  const [guidePick, setGuidePick] = useState<GuidePlace | null>(null)
  const onPickGuide = useCallback((g: GuidePlace) => {
    setPickedId(null)
    setGuidePick(g)
  }, [])
  useEffect(() => {
    if (!showGuide || guide.length) return
    supabase
      .from('guide_places')
      .select('id, source, folder, name, note, lat, lng')
      .then(({ data }) => setGuide((data as GuidePlace[]) ?? []))
  }, [showGuide, guide.length])

  const filtered = rows.filter(whoOk)
  // one tab per kind of place; the rarer kinds only once something is filed under them
  const tabs = Object.fromEntries(
    Object.entries(PLACE_TABS).filter(([k]) => !['transport', 'other', 'nightlife'].includes(k) || rows.some((p) => p.category === k)),
  )
  const counts = Object.fromEntries(Object.keys(tabs).map((k) => [k, filtered.filter((p) => !k || p.category === k).length]))
  const current = tabs[cat] ? cat : ''
  const shown = filtered.filter((p) => !current || p.category === current)
  const picked = shown.find((p) => p.id === pickedId) ?? null
  const plannedDay = new Map<string, number>()
  for (const i of items) if (i.place_id && !plannedDay.has(i.place_id)) plannedDay.set(i.place_id, i.day)
  const read = readId ? rows.find((p) => p.id === readId) : undefined
  const rating = rateId ? rows.find((p) => p.id === rateId) : undefined
  const guideShown = useMemo(() => {
    if (!showGuide) return []
    const mine = new Set(rows.map((p) => p.name.toLowerCase()))
    return guide.filter((g) => (!current || guideTab(g) === current) && !mine.has(g.name.toLowerCase()))
  }, [showGuide, guide, rows, current])

  // city → clean neighbourhood (47) → places; a place whose area fits none keeps its own heading
  const groups = new Map<string, Map<string, { title: ReactNode; ps: Place[] }>>()
  // cities in route order, neighbourhoods in their list's order, places not yet visited first
  const areaRank = (p: Place) => {
    const a = areaOf(p.city, p.area)
    const i = a ? (AREAS[p.city ?? ''] ?? []).indexOf(a) : -1
    return i === -1 ? 99 : i
  }
  for (const p of [...shown].sort((a, b) => rank(a.city) - rank(b.city) || areaRank(a) - areaRank(b) || Number(a.visited) - Number(b.visited))) {
    const c = p.city || 'אחר' // he-only
    if (!groups.has(c)) groups.set(c, new Map())
    const areas = groups.get(c)!
    const area = areaOf(p.city, p.area)
    const key = area?.key ?? p.area ?? '—'
    if (!areas.has(key))
      areas.set(key, {
        title: area ? (
          isEn ? (
            area.en
          ) : (
            <>
              {area.he} <span className="area-en">{area.en}</span>
            </>
          )
        ) : (
          <bdi>{p.area}</bdi>
        ),
        ps: [],
      })
    areas.get(key)!.ps.push(p)
  }

  const visit = async (p: Place) => {
    const ok = await setVisited(p)
    // right after marking a place visited: how was it, and a tip for the next travellers (48)
    if (ok && !p.visited && libOf(p)) setRateId(p.id)
  }
  const remove = async (p: Place) => {
    if (confirm(t('למחוק את "{name}"?', { name: p.name }))) await mutate(supabase.from('places').delete().eq('id', p.id))
  }
  const likedByMe = new Set(swipes.filter((s) => s.user_id === userId && s.liked && !s.skipped).map((s) => s.candidate_id))
  const row = (p: Place, first = false) => (
    <PlaceRow
      key={p.id}
      hint={first}
      p={p}
      liked={p.candidate_id ? likedByMe.has(p.candidate_id) : p.added_by === me}
      onOpen={() => setReadId(p.id)}
      onEdit={() => setEdit(p)}
      onRemove={() => remove(p)}
      onVisit={() => visit(p)}
    />
  )
  let firstRow = true

  return (
    <div className={'stack places' + (view === 'map' ? ' map-mode' : '')}>
      {/* one row of controls (40): whose list as one chip at the start, then the kinds of place */}
      <div className="tabs-bar" role="tablist" aria-label={t('סוג מקום')}>
        {couples.length > 1 && <WhoMenu couples={couples} mine={myCouple} value={whose} onChange={setWhose} />}
        {Object.entries(tabs).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={current === k} className={'chip' + (current === k ? ' on' : '')} onClick={() => setCat(k)}>
            {CATEGORY_ICON[k] && <Icon as={CATEGORY_ICON[k]} />} {v}
            {!!counts[k] && <span className="count">{counts[k]}</span>}
          </button>
        ))}
      </div>

      {view === 'map' ? (
        <>
          <PlacesMap places={shown} onPick={onPick} guide={guideShown} onPickGuide={onPickGuide} start={trip.start_date} numDays={trip.num_days} tripId={trip.id} />
          <button className={'chip map-guide' + (showGuide ? ' on' : '')} aria-pressed={!!showGuide} onClick={() => setShowGuide(showGuide ? '' : '1')}>
            <Icon as={BookOpen} /> {t('המפה של פתיתים')} {showGuide && guideShown.length ? `(${guideShown.length})` : ''}
          </button>
          {guidePick && !picked && <GuideCard g={guidePick} tripId={trip.id} userId={userId} me={me} onClose={() => setGuidePick(null)} />}
          {picked && <div className="map-picked">{row(picked)}</div>}
        </>
      ) : (
        <>
          {error && <LoadNote onRetry={reload} />}
          {!loading && !error && shown.length === 0 && (
            <Empty>{rows.length ? t('אין מקומות בסינון הזה') : t('עוד אין מקומות. מקום שקיבל מאצ׳ בגילוי יופיע כאן')}</Empty>
          )}
          {[...groups].map(([c, areas]) => (
            <section key={c} className="stack">
              <h2 className="group-title">{cityLabel(c)}</h2>
              {[...areas].map(([a, g]) => (
                <div key={a} className="stack">
                  {a !== '—' && (
                    <div className="area-title">
                      <span>{g.title}</span>
                      <span className="area-count">{g.ps.length}</span>
                    </div>
                  )}
                  {g.ps.map((p) => {
                    const r = row(p, firstRow)
                    firstRow = false
                    return r
                  })}
                </div>
              ))}
            </section>
          ))}
        </>
      )}

      {/* list or map: a floating button above the tab bar, Airbnb style (40, 49) */}
      <button className="view-toggle glass" onClick={() => setView(view === 'map' ? 'list' : 'map')}>
        <Icon as={view === 'map' ? List : MapIcon} /> {view === 'map' ? t('רשימה') : t('מפה')}
      </button>
      <QuickFab
        label={t('הוספת מקום')}
        onTap={() => {
          setSharedLink('')
          setAdding(true)
        }}
      />
      {adding && <AddPlace tripId={trip.id} userId={userId} me={me} defaultTo="list" initial={sharedLink} onClose={() => setAdding(false)} />}
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

/** "שלנו ▾": whose places, as one chip that opens the choices (40). */
function WhoMenu({ couples, mine, value, onChange }: { couples: string[]; mine: string | null; value: Who; onChange: (w: Who) => void }) {
  const [at, setAt] = useState<{ top: number; start: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const open = () => {
    const r = btn.current!.getBoundingClientRect()
    // under the chip, lined up with its start edge (right in Hebrew, left in English)
    setAt({ top: r.bottom + 6, start: isEn ? r.left : window.innerWidth - r.right })
  }
  return (
    <span className="who-menu">
      <button ref={btn} className={'chip' + (value !== 'all' ? ' on' : '')} aria-haspopup="menu" aria-expanded={!!at} onClick={open}>
        {whoLabel(value)} <Icon as={ChevronDown} />
      </button>
      {at &&
        createPortal(
          <>
            <span className="who-menu-shade" onClick={() => setAt(null)} />
            <span className="who-menu-list" role="menu" style={{ top: at.top, insetInlineStart: at.start }}>
              {whoChoices(couples, mine).map((w) => (
                <button
                  key={w}
                  role="menuitemradio"
                  aria-checked={value === w}
                  onClick={() => {
                    onChange(w)
                    setAt(null)
                  }}
                >
                  <span>{whoLabel(w)}</span>
                  {value === w && <Icon as={Check} />}
                </button>
              ))}
            </span>
          </>,
          document.body,
        )}
    </span>
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
  if (error) alert(errorText(error.message))
  return !error
}

/** "במסלול: יום ג׳, 15.12" (42), or the day number when the trip has no dates. */
function plannedText(day: number, start: string | null) {
  return t('במסלול: {day}', { day: start ? fmtDay(dayDate(start, day)) : t('יום {day}', { day }) })
}

/** The card's "what it is" line (46): what's special about it, else its short description. */
function whatLine(card?: Candidate) {
  const c = card && localizeCard(card)
  return c?.special || c?.hype || null
}

/**
 * A place in the list. No circle (48): "ביקרנו" is a swipe toward the start side (like "read" in Mail), or the button in
 * the read view; edit and remove are the swipe toward the end side. A tap opens the read view (44).
 */
function PlaceRow(props: {
  p: Place
  hint?: boolean
  /** you liked its card (or added it yourself) */
  liked: boolean
  onOpen: () => void
  onEdit: () => void
  onRemove: () => void
  onVisit: () => void
}) {
  const { p } = props
  const area = areaOf(p.city, p.area)
  const sub = [area ? (isEn ? area.en : area.he) : p.area, p.category !== 'other' && CATEGORIES[p.category]].filter(Boolean).join(' · ')
  return (
    <SwipeRow
      hint={props.hint}
      start={{ label: p.visited ? t('לא ביקרנו') : t('ביקרנו'), icon: p.visited ? Undo2 : Check, tone: 'ok', onClick: props.onVisit }}
      end={[
        { label: t('עריכה'), icon: Pencil, tone: 'edit', onClick: props.onEdit },
        { label: t('מחיקה'), icon: Trash2, tone: 'del', onClick: props.onRemove },
      ]}
    >
      {/* the promo video's place row: photo, bold name, one quiet line, a green "visited" badge once visited, and a heart (red when
          you liked it). What it is, the tip, the plan day, the links and the stars are in the place's sheet (a tap) */}
      <div className={'place-row' + (p.visited ? ' visited' : '')} onClick={props.onOpen}>
        <Thumb photos={p.photos} icon={CATEGORY_ICON[p.category] ?? MapPin} />
        <div className="place-body">
          <div className="place-name" dir="auto">
            {p.name}
          </div>
          {sub && <div className="place-sub">{sub}</div>}
          {p.visited && (
            <span className="place-been">
              <Icon as={Check} /> {t('ביקרנו')}
            </span>
          )}
        </div>
        <Heart className={'place-heart' + (props.liked ? ' on' : '')} aria-label={props.liked ? t('אהבתם') : undefined} aria-hidden={!props.liked} />
      </div>
    </SwipeRow>
  )
}

/**
 * The place opened (44): to read before anything else. Photo, name, city and neighbourhood, its plan day, what it is,
 * the whole tip and the baby note, who liked it, map/site/video, and "ביקרנו". "עריכה" in the title row opens the form.
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
  onVisit: () => void
  onPlan: () => void
  onOpenDay: (day: number) => void
  onClose: () => void
}) {
  const { p, card, day } = props
  const notes = notesFor(p.notes, card, props.hasBaby)
  const tip = notesShown(notes)
  const baby = props.hasBaby ? babyLine(notes) : null
  const area = areaOf(p.city, p.area)
  const where = [cityLabel(p.city), area ? (isEn ? area.en : area.he) : p.area].filter(Boolean).join(' · ')
  const tags = [p.category !== 'other' && CATEGORIES[p.category], p.audience && AUDIENCES[p.audience]].filter(Boolean).join(' · ')
  const what = whatLine(card)
  return (
    <Sheet title={p.name} onClose={props.onClose} action={{ label: t('עריכה'), onClick: props.onEdit }}>
      {!!p.photos?.length && <img className="place-photo" src={p.photos[0]} alt="" referrerPolicy="no-referrer" />}
      <div className="place-read">
        {where && <div className="muted">{where}</div>}
        {tags && <div className="muted small">{tags}</div>}
        {day ? (
          <button className="place-status" onClick={() => props.onOpenDay(day)}>
            <Icon as={CalendarCheck} /> {plannedText(day, props.start)} <Icon as={ChevronLeft} className="flip-ltr" />
          </button>
        ) : (
          !p.visited && (
            <button className="action plan-add" onClick={props.onPlan}>
              <Icon as={Plus} /> {t('הוספה למסלול')}
            </button>
          )
        )}
        {what && <p className="place-what">{keepRanges(what)}</p>}
        {tip && (
          <p className="notes place-tip" dir="auto">
            <Icon as={Lightbulb} />
            <span>{keepRanges(tip)}</span>
          </p>
        )}
        {baby && (
          <p className="notes place-tip" dir="auto">
            <Icon as={BabyIcon} />
            <span>{keepRanges(baby)}</span>
          </p>
        )}
        {p.who && (
          <div className="muted small">
            <RingsIcon one /> <bdi>{p.who.split(' + ').map((w) => t(w)).join(' + ')}</bdi>
          </div>
        )}
        {props.likedBy.length > 0 && (
          <div className="muted small">
            <Icon as={Heart} /> {t('אהבו: {names}', { names: props.likedBy.map((n) => t(n)).join(' · ') })}
          </div>
        )}
        <MediaActions name={p.name} maps={p.url || null} m={{ ...p, lat: p.url ? null : p.lat, lng: p.url ? null : p.lng }} round />
        <button className={p.visited ? 'secondary' : 'primary'} onClick={props.onVisit}>
          <Icon as={p.visited ? Undo2 : Check} /> {p.visited ? t('לא ביקרנו') : t('ביקרנו')}
        </button>
        {p.visited && props.libraryId && <RateBox libraryId={props.libraryId} tripId={props.tripId} userId={props.userId} ratings={props.ratings} />}
      </div>
    </Sheet>
  )
}

/**
 * Right after marking a place visited (48): how was it, with the stars and the note box already open. "אחר כך"
 * leaves it for later; the card then reads "✓ ביקרנו · + דירוג וטיפ".
 */
function RateSheet(props: { p: Place; libraryId: string; tripId: string; userId: string; ratings: Ratings; hasBaby: boolean; onClose: () => void }) {
  const mine = props.ratings.of(props.libraryId).find((r) => r.user_id === props.userId)
  const [stars, setStars] = useState(mine?.stars ?? 0)
  const [note, setNote] = useState(mine?.note ?? '')
  const save = async () => {
    if (!stars) return
    const row = { library_id: props.libraryId, trip_id: props.tripId, stars, note: note.trim().slice(0, 500) || null }
    if (await mutate(supabase.from('place_ratings').upsert(row, { onConflict: 'library_id,user_id' }))) {
      props.ratings.put({ ...row, user_id: props.userId, updated_at: new Date().toISOString() })
      props.onClose()
    }
  }
  return (
    <Sheet
      title={t('איך היה ב-{name}?', { name: '\u2068' + props.p.name + '\u2069' })}
      onClose={props.onClose}
      closeLabel={t('אחר כך')}
      action={{ label: t('שמירה'), onClick: save, disabled: !stars }}
    >
      <div className="rate-nudge">
        <StarsInput value={stars} onChange={setStars} />
        <textarea
          className="grow"
          value={note}
          onChange={(e) => setNote(e.target.value)}
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
  const area = areaOf(f.city, f.area)

  const save = async () => {
    if (!f.name?.trim()) return
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
    const ok = await mutate(f.id ? supabase.from('places').update(row).eq('id', f.id) : supabase.from('places').insert({ ...row, added_by: props.me }))
    if (ok) props.onClose()
  }

  const remove = async () => {
    if (f.id && confirm(t('למחוק את "{name}"?', { name: f.name ?? '' })) && (await mutate(supabase.from('places').delete().eq('id', f.id)))) props.onClose()
  }

  return (
    <Sheet title={f.id ? t('עריכת מקום') : t('מקום חדש')} onClose={props.onClose} closeLabel={t('ביטול')} action={{ label: t('שמירה'), onClick: save, disabled: !f.name?.trim() }}>
      <Field label={t('שם')}>
        <input value={f.name ?? ''} onChange={set('name')} dir="auto" autoFocus={!f.id} />
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

  const add = async () => {
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
      <button className="primary" onClick={add}>
        {t('הוספה')}
      </button>
    </Sheet>
  )
}

/** A place from the Ptitim map: Gal's note, a link, and a way to put it in the game. */
function GuideCard({ g, tripId, userId, me, onClose }: { g: GuidePlace; tripId: string; userId: string; me: string; onClose: () => void }) {
  const [state, setState] = useState<'' | 'busy' | 'added' | 'there'>('')
  useEffect(() => setState(''), [g.id])
  const suggest = async () => {
    setState('busy')
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        trip_id: tripId,
        name: g.name,
        city: 'tokyo',
        category: guideCategory(g),
        lat: g.lat,
        lng: g.lng,
        hype: g.note ? 'גל מפתיתים: ' + g.note.replace(/\s*\n\s*/g, ' ') : null, // he-only
        sources: [PTITIM_URL],
        added_by: me,
      })
      .select('id')
      .single()
    // 23505: it's already in the game under the same name
    let id: string | undefined = data?.id
    if (error) {
      if (error.code !== '23505') {
        setState('')
        alert(errorText(error.message))
        return
      }
      // already in the game: find that card and like it, same as AddPlace's "same place"
      const { data: same } = await supabase.from('candidates').select('id, name').eq('trip_id', tripId).ilike('name', g.name.replace(/[%_\\]/g, '\\$&'))
      id = (same ?? []).find((c) => normName(c.name) === normName(g.name))?.id ?? same?.[0]?.id
      if (!id) {
        setState('there')
        return
      }
    }
    const { error: likeErr } = await supabase.from('swipes').upsert({ trip_id: tripId, candidate_id: id, user_id: userId, liked: true })
    if (likeErr) {
      setState('')
      alert(errorText(likeErr.message))
      return
    }
    setState(error ? 'there' : 'added')
  }
  return (
    <div className="card place-row stack">
      <div className="row">
        <b dir="auto">{g.name}</b>
        <span className="muted small">{t(g.folder)}</span>
      </div>
      {g.note && <p dir="auto" className="small" style={{ whiteSpace: 'pre-line' }}>{g.note}</p>}
      <div className="row">
        <a className="chip" href={mapsUrl(g.name + ' Tokyo')} target="_blank" rel="noreferrer">
          <Icon as={MapPin} /> {t('גוגל מפות')}
        </a>
        {state === 'added' ? (
          <span className="small">{t('נוסף לגילוי עם הלייק שלך')}</span>
        ) : state === 'there' ? (
          <span className="small">{t('כבר בגילוי, עם הלייק שלך')}</span>
        ) : (
          <button className="chip" disabled={state === 'busy'} onClick={suggest}>
            <Icon as={Heart} /> {t('הוספה לגילוי')}
          </button>
        )}
        <button className="link small" onClick={onClose}>{t('סגירה')}</button>
      </div>
      <a className="small muted" href={PTITIM_URL} target="_blank" rel="noreferrer">{t('מתוך המדריך של פתיתים')}</a>
    </div>
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
