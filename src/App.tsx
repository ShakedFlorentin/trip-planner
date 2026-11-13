import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { supabase } from './supabase'
import { setOutboxUser } from './outbox'
import { t } from './i18n'
import type { Member, Trip } from './types'
import { clearCache, currentDay, readCache, replan, useTripHasBaby, writeCache } from './lib'
import { Wand2 } from 'lucide-react'
import { OfflineBanner } from './offline'
import Login, { inviteInUrl } from './views/Login'
import TripPicker from './views/TripPicker'
import Home from './views/Home'
import Itinerary from './views/Itinerary'
import Bookings from './views/Bookings'
import Places from './views/Places'
import { PrefsSheet, ToolSheet, type MoreTab } from './views/More'
import Menu from './views/Menu'
import Settings from './views/Settings'
import ReportSheet from './views/Report'
import SwipeGame from './views/Swipe'
import Onboarding, { useProfile } from './views/Onboarding'
import Search, { type SearchTarget } from './views/Search'
import SharedPlan, { ImportShared, forgetPendingShare, pendingShare, slugInUrl } from './views/SharedPlan'
import { Loading } from './rings'
import { useQuickAddRoute } from './quickAdd'
import { useSettings, useSettingsKnown } from './settings'
import { isNative } from './native'
import Guest from './views/Guest'
import GuestImport from './views/GuestImport'
import { forgetGuest, pendingGuest } from './guest'
import { track } from './track'
import { askForRating } from './rating'
import Guide, { GUIDE_READY, guideUnseen, onGuideOpen } from './views/Guide'

// solid glyphs, like Music's tab bar: every tab carries the same weight and only the colour marks the open one.
// The glyphs differ in width (the pin is narrow, the ticket wide), so `nudge` moves each one by a fraction of a pixel
// along the bar, toward the next tab, to leave the same empty space between every two icons
const TABS = [
  { id: 'home', label: t('בית'), d: 'M10.7 3.6a2 2 0 0 1 2.6 0l7.3 6.2a1 1 0 0 1-1.3 1.5l-.3-.3V19a2 2 0 0 1-2 2h-2.5a.5.5 0 0 1-.5-.5V16a2 2 0 0 0-4 0v4.5a.5.5 0 0 1-.5.5H7a2 2 0 0 1-2-2v-8l-.3.3a1 1 0 0 1-1.3-1.5Z', nudge: 0.1 },
  { id: 'swipe', label: t('גילוי'), d: 'M12.6 2.4c.4-.3 1-.2 1.2.3.6 2 1.9 3.3 3.2 4.7 1.6 1.7 3 3.6 3 6.6 0 4.4-3.6 7.5-8 7.5s-8-3.1-8-7.3c0-2.6 1.1-4.5 2.6-6.1.4-.4 1-.2 1.2.3.3 1 .9 1.9 1.7 2.3.2-3.4 1.6-6.3 3.1-8.3Z', nudge: -0.4 },
  { id: 'plan', label: t('מסלול'), d: 'M8 2.5a1 1 0 0 1 1 1V5h6V3.5a1 1 0 1 1 2 0V5h1.5A2.5 2.5 0 0 1 21 7.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-11A2.5 2.5 0 0 1 5.5 5H7V3.5a1 1 0 0 1 1-1ZM5 10v8.5c0 .3.2.5.5.5h13c.3 0 .5-.2.5-.5V10ZM7 12h2.5v2.5H7Zm3.75 0h2.5v2.5h-2.5Zm3.75 0H17v2.5h-2.5ZM7 15.5h2.5V18H7Zm3.75 0h2.5V18h-2.5Z', nudge: -0.7 },
  { id: 'bookings', label: t('הזמנות'), d: 'M4 5.5h16A1.5 1.5 0 0 1 21.5 7v2.6a.6.6 0 0 1-.5.6 1.8 1.8 0 0 0 0 3.6.6.6 0 0 1 .5.6V17a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 17v-2.6a.6.6 0 0 1 .5-.6 1.8 1.8 0 0 0 0-3.6.6.6 0 0 1-.5-.6V7A1.5 1.5 0 0 1 4 5.5ZM14.25 7.5h1.5v2h-1.5Zm0 3.5h1.5v2h-1.5Zm0 3.5h1.5v2h-1.5Z', nudge: 0.6 },
  { id: 'places', label: t('מקומות'), d: 'M12 2a7.5 7.5 0 0 1 7.5 7.5c0 5.6-6 11.1-6.8 11.8a1 1 0 0 1-1.4 0C10.5 20.6 4.5 15.1 4.5 9.5A7.5 7.5 0 0 1 12 2Zm0 4.6a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Z', nudge: 0.3 },
] as const
type Tab = (typeof TABS)[number]['id']

// who was signed in, so the app still opens when an expired login can't be refreshed without a network
const UID_KEY = 'userId'

// a shared plan's link (?share=…) opens the read-only page for anyone, before the login gate.
// The guide video plays over everything the first time the app opens on this device (after the opening rings, before
// signing in), and again whenever the ☰ menu asks for it; a shared plan's visitor is not shown it on their own.
export default function App() {
  const [slug] = useState(slugInUrl)
  const [guide, setGuide] = useState(() => GUIDE_READY && !slug && guideUnseen())
  useEffect(() => onGuideOpen(() => setGuide(true)), [])
  return (
    <>
      {slug ? <SharedPlan slug={slug} /> : <AppMain />}
      {guide && <Guide onClose={() => setGuide(false)} />}
    </>
  )
}

function AppMain() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  // joined with an invite code: asked the getting-to-know-you questions before anything else
  const [invited, setInvited] = useState(false)
  // came in through Google with no invite (open sign-up): asked the same questions first, but joins no one's trip
  const [fresh, setFresh] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      const id = data.session?.user.id ?? null
      if (id) writeCache(UID_KEY, id)
      // a refresh that failed for lack of network is not a sign-out: carry on as the same user
      const offlineId = !id && error?.name === 'AuthRetryableFetchError' ? readCache<string>(UID_KEY)?.data : null
      setInvited(!!data.session?.user.user_metadata?.invite)
      setFresh(isNewOAuth(data.session?.user))
      setOutboxUser(id ?? offlineId ?? null)
      setUserId(id ?? offlineId ?? null)
    })
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      // the first event repeats getSession above, which also knows about the offline case
      if (e === 'INITIAL_SESSION') return
      if (e === 'SIGNED_OUT') {
        clearCache()
        window.caches?.delete('docs').catch(() => {})
        // nothing of this account is left for whoever signs in next on this device
        forgetPendingShare()
        try {
          for (const k of ['tripId', 'invite', 'translator-turns', 'guest']) localStorage.removeItem(k)
        } catch {
          // nothing remembered to forget
        }
      }
      if (s) writeCache(UID_KEY, s.user.id)
      if (e === 'SIGNED_IN' && s) countSignIn(s.user)
      setInvited(!!s?.user.user_metadata?.invite)
      setFresh(isNewOAuth(s?.user))
      setOutboxUser(s?.user.id ?? null)
      setUserId(s?.user.id ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (userId === undefined) return <Loading />
  if (!userId) return <SignedOut />
  return invited || fresh ? <ProfileGate key={userId} userId={userId} invited={invited} /> : <TripGate userId={userId} />
}

/**
 * Someone who joined by invitation answers the questionnaire on their first visit, before the trips. The original
 * members have no invite, so they never pass through here. When the server can't be asked and there is no saved copy,
 * the app opens anyway rather than locking them out.
 */
function ProfileGate({ userId, invited }: { userId: string; invited: boolean }) {
  const { profile, failed, saved } = useProfile(userId)
  if (profile === undefined) return <Loading />
  // answered already as a visitor: the answers come in with the rest (GuestImport), no need to ask again
  if (!invited && pendingGuest()?.answers) return <TripGate userId={userId} />
  if (!profile?.completed_at && !(failed && !profile))
    return <Onboarding userId={userId} initial={profile?.answers ?? pendingGuest()?.answers} onDone={saved} />
  return <TripGate userId={userId} invited={invited} />
}

/**
 * Not signed in. With guest mode on (app_settings features.guest_mode) a visitor starts with the questionnaire and
 * real cards (Guest) and signs in only to save; an invite link, "I already have an account" or guest mode off go
 * straight to sign-in. On a first visit the switch is read before choosing, so nobody sees the wrong screen flash.
 */
/** A Google account with no invite: made through open sign-up (the database only lets those in while it is open). */
/** Once per account per open: how they signed in, and whether the account was just made (its first sign-in). */
const counted = new Set<string>()
function countSignIn(u: { id: string; created_at?: string; app_metadata?: { provider?: string }; user_metadata?: { invite?: string } }) {
  if (counted.has(u.id)) return
  counted.add(u.id)
  const made = u.created_at ? Date.now() - new Date(u.created_at).getTime() < 10 * 60_000 : false
  track(made ? 'sign_up' : 'sign_in', { provider: u.app_metadata?.provider ?? 'email', invite: !!u.user_metadata?.invite, guest: !!pendingGuest() })
}

function isNewOAuth(u: { app_metadata?: { provider?: string }; user_metadata?: { invite?: string } } | null | undefined) {
  return !!u && u.app_metadata?.provider === 'google' && !u.user_metadata?.invite
}

function SignedOut() {
  const { features } = useSettings()
  const known = useSettingsKnown()
  const [login, setLogin] = useState(() => !!inviteInUrl())
  const shows = !known ? null : features.guest_mode && !login ? 'guest' : 'login'
  useEffect(() => {
    if (shows) track('signed_out_view', { shows, invite: !!inviteInUrl() })
  }, [shows])
  if (!known) return <Loading />
  if (features.guest_mode && !login) return <Guest onSignIn={() => setLogin(true)} />
  return <Login onGuest={features.guest_mode ? () => setLogin(false) : undefined} google={features.google_signin && !isNative} />
}

function savedTrip() {
  try {
    return localStorage.getItem('tripId')
  } catch {
    return null
  }
}

function TripGate({ userId, invited = false }: { userId: string; invited?: boolean }) {
  // open on the last trip at once (no waiting for a network that may not be there); the check below corrects it
  const [tripId, setTripId] = useState<string | null | undefined>(() => savedTrip() ?? undefined)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // a shared plan the person asked to copy before signing in: offered once they are in
  const [offer, setOffer] = useState(pendingShare)
  // what a visitor answered and liked before making the account: carried into it once the trip is known. Someone who
  // came by invite joins their friend's trip instead (their answers already went into the questionnaire), so it's dropped
  const [guest, setGuest] = useState(() => (invited ? null : pendingGuest()))
  useEffect(() => {
    if (invited) forgetGuest()
  }, [invited])

  const choose = (id: string | null) => {
    try {
      // '' remembers that the trip was left on purpose, so the next launch opens the trip list instead of it
      localStorage.setItem('tripId', id ?? '')
    } catch {
      // the choice just won't be remembered
    }
    setTripId(id)
  }

  useEffect(() => {
    setFailed(false)
    supabase
      .from('members')
      .select('trip_id')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        const saved = savedTrip()
        if (saved === '') return setTripId(null)
        // offline or a server hiccup is not "you have no trip": keep the last trip, or offer a retry
        if (error) {
          if (saved) setTripId(saved)
          else setFailed(true)
          return
        }
        const ids = (data ?? []).map((m) => m.trip_id as string)
        choose(saved && ids.includes(saved) ? saved : (ids[0] ?? null))
      })
  }, [userId, attempt])

  if (offer)
    return (
      <ImportShared
        slug={offer}
        userId={userId}
        onDone={(id) => {
          setOffer(null)
          choose(id)
        }}
        onSkip={() => {
          forgetPendingShare()
          setOffer(null)
        }}
      />
    )
  if (failed) return <LoadError onRetry={() => setAttempt((a) => a + 1)} />
  if (tripId === undefined) return <Loading />
  if (guest)
    return (
      <GuestImport
        userId={userId}
        guest={guest}
        tripId={tripId}
        onDone={(id) => {
          setGuest(null)
          choose(id)
        }}
      />
    )
  if (!tripId) return <TripPicker onPick={choose} />
  return <TripApp tripId={tripId} userId={userId} onLeave={() => choose(null)} />
}

function TripApp(props: { tripId: string; userId: string; onLeave: () => void }) {
  const { tripId } = props
  // the last good copy opens the app with no network
  const [tripCache] = useState(() => readCache<Trip>('trip:' + tripId))
  const [trip, setTrip] = useState<Trip | null>(tripCache?.data ?? null)
  const [members, setMembers] = useState<Member[]>(() => readCache<Member[]>('members:' + tripId)?.data ?? [])
  const [tab, setTab] = useState<Tab>('home')
  // the ☰ menu and what it opens: each is a sheet over the current page, so closing it returns to the same place (5)
  const [menu, setMenu] = useState(false)
  const [tool, setTool] = useState<MoreTab | null>(null)
  // which screens and tools get used (src/track.ts)
  useEffect(() => track('screen', { tab }), [tab])
  useEffect(() => {
    if (tool) track('tool', { tool })
  }, [tool])
  const [settings, setSettings] = useState(false)
  const [prefs, setPrefs] = useState(false)
  const [reporting, setReporting] = useState(false)
  // a short message at the bottom ("מעדכנים את המסלול…")
  const [toast, setToast] = useState('')
  // the wand's wait for the planner: one run at a time, dropped when the trip changes or the app closes
  const wandRun = useRef<{ stop: () => void } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(
    () => () => {
      wandRun.current?.stop()
      clearTimeout(toastTimer.current)
    },
    [tripId],
  )
  const wand = () => {
    if (wandRun.current) return
    clearTimeout(toastTimer.current)
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = {
      stop: () => {
        stopped = true
        clearTimeout(timer)
        if (wandRun.current === run) wandRun.current = null
      },
    }
    wandRun.current = run
    const finish = (msg: string) => {
      run.stop()
      setToast(msg)
      toastTimer.current = setTimeout(() => setToast(''), 2000)
    }
    setToast(t('מעדכנים את המסלול, כמה שניות…'))
    const read = async () => {
      try {
        const { data } = await supabase.from('plan_state').select('ran_at, dirty, error').eq('trip_id', tripId).maybeSingle()
        return data
      } catch {
        return null
      }
    }
    void (async () => {
      // what the row says before the tap, so an old error or run time is not taken for the answer (and no clock skew)
      const before = await read()
      if (stopped) return
      await replan(tripId)
      const deadline = Date.now() + 30_000
      const poll = async () => {
        if (stopped) return
        const row = await read()
        if (stopped) return
        if (row?.error && row.error !== before?.error) return finish(t('לא הצלחנו לעדכן את המסלול, נסו שוב'))
        if (row?.ran_at && row.ran_at !== before?.ran_at && !row.dirty) {
          finish(t('המסלול עודכן'))
          // a finished plan is a good moment: after the message, the app may ask for a rating (src/rating.ts)
          return askForRating(2400)
        }
        if (Date.now() >= deadline) return finish(t('לא הצלחנו לעדכן את המסלול, נסו שוב'))
        timer = setTimeout(poll, 1000)
      }
      timer = setTimeout(poll, 1000)
    })()
  }
  const [searching, setSearching] = useState(false)
  // a card picked in search, for Discover to open
  const [showCard, setShowCard] = useState<string | null>(null)
  const cardShown = useCallback(() => setShowCard(null), [])
  const [day, setDay] = useState(1)
  const hasBaby = useTripHasBaby(tripId)
  // the large title scrolls away with the page and a small one shows in the slim bar (9)
  const [compact, setCompact] = useState(false)
  // the wheel on the + adds from anywhere: open the screen that adds it, and that screen opens its form
  useQuickAddRoute((kind) => {
    setMenu(false)
    setSearching(false)
    if (kind === 'expense' || kind === 'list') return setTool(kind === 'expense' ? 'money' : 'lists')
    setTool(null)
    setTab(kind === 'place' ? 'places' : 'bookings')
  })
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 34)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // when the trip and members shown were last confirmed by the server; the banner shows while they're a saved copy
  const [syncedAt, setSyncedAt] = useState<number | null>(tripCache?.at ?? null)
  const [stale, setStale] = useState(!!tripCache)

  useEffect(() => {
    const load = async () => {
      const [t, m] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('members').select('*').eq('trip_id', tripId).order('joined_at'),
      ])
      if (t.data) {
        setTrip(t.data as Trip)
        writeCache('trip:' + tripId, t.data)
      }
      if (m.data) {
        setMembers(m.data as Member[])
        writeCache('members:' + tripId, m.data)
      }
      setFailed(!!t.error)
      setStale(!!t.error || !!m.error)
      if (!t.error && !m.error) setSyncedAt(Date.now())
    }
    load()
    // catch up after the phone wakes or comes back online, when realtime events may have been missed
    const refresh = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [tripId, attempt])

  useEffect(() => {
    if (trip) setDay(currentDay(trip.start_date, trip.num_days) ?? 1)
  }, [trip?.start_date, trip?.num_days])

  if (!trip) return failed ? <LoadError onRetry={() => setAttempt((a) => a + 1)} /> : <Loading />
  const me = members.find((m) => m.user_id === props.userId)?.display_name ?? ''
  const openDay = (d: number) => {
    setDay(d)
    setTab('plan')
  }
  const openMore = (s: MoreTab) => setTool(s)
  const openResult = (to: SearchTarget) => {
    setSearching(false)
    if (to.tab === 'plan') openDay(to.day)
    else if (to.tab === 'lists') openMore('lists')
    else setTab(to.tab)
    if (to.tab === 'swipe' && to.card) setShowCard(to.card)
  }

  return (
    <div className="app">
      <header className={'topbar' + (compact ? ' compact' : '')}>
        <span className="topbar-title" aria-hidden={!compact}>
          {TABS.find((t) => t.id === tab)?.label}
        </span>
        {/* search lives in the top bar, beside the menu (the tab bar is the video's flat bar, with no room for it) */}
        <button className="menu-btn" aria-label={t('חיפוש')} onClick={() => setSearching(true)}>
          <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM21 21l-5.2-5.2" />
          </svg>
        </button>
        {/* re-plan (41): a button, never a pull, so a plan you like can't change by an accidental pull */}
        {tab === 'plan' && (
          <button
            className="menu-btn"
            aria-label={t('סידור המסלול מחדש')}
            onClick={wand}
          >
            <Wand2 size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        <button className="menu-btn" aria-label={t('תפריט')} onClick={() => setMenu(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>
      <OfflineBanner since={stale ? syncedAt : null} />
      <main className={'tab-' + tab}>
        <h1 className="large-title">{TABS.find((t) => t.id === tab)?.label}</h1>
        {tab === 'home' && (
          <Home
            trip={trip}
            members={members}
            me={me}
            userId={props.userId}
            onOpenDay={openDay}
            onOpenMore={openMore}
            onOpenPlaces={() => setTab('places')}
            onOpenSettings={() => setSettings(true)}
          />
        )}
        {tab === 'swipe' && <SwipeGame trip={trip} userId={props.userId} members={members} showCard={showCard} onCardShown={cardShown} onOpenPlaces={() => setTab('places')} />}
        {tab === 'plan' && <Itinerary trip={trip} day={day} setDay={setDay} members={members} userId={props.userId} />}
        {tab === 'bookings' && <Bookings trip={trip} members={members} userId={props.userId} />}
        {tab === 'places' && <Places trip={trip} me={me} userId={props.userId} members={members} onOpenDay={openDay} />}
      </main>
      {/* a flat, full-width iOS tab bar, as in the promo video: icon over a small label, red when current */}
      <nav className="tabbar" aria-label={t('ניווט ראשי')}>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true" style={{ '--nudge': t.nudge } as CSSProperties}>
              <path d={t.d} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {menu && (
        <Menu
          me={me}
          hasBaby={hasBaby}
          onClose={() => setMenu(false)}
          onTool={setTool}
          onPrefs={() => setPrefs(true)}
          onSettings={() => setSettings(true)}
          onLeave={props.onLeave}
          onReport={() => setReporting(true)}
        />
      )}
      {tool && <ToolSheet trip={trip} members={members} userId={props.userId} sub={tool} onClose={() => setTool(null)} />}
      {settings && <Settings trip={trip} me={me} userId={props.userId} onClose={() => setSettings(false)} />}
      {prefs && <PrefsSheet userId={props.userId} onClose={() => setPrefs(false)} />}
      {reporting && (
        <ReportSheet trip={trip} me={me} from={(tool && MORE_LABEL[tool]) || TABS.find((x) => x.id === tab)?.label || tab} onClose={() => setReporting(false)} />
      )}
      {searching && <Search tripId={trip.id} start={trip.start_date} members={members} onClose={() => setSearching(false)} onPick={openResult} />}
    </div>
  )
}

const MORE_LABEL: Record<MoreTab, string> = { money: t('כסף'), lists: t('רשימות'), info: t('חירום'), say: t('תרגום'), baby: t('תינוק') }


function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="center stack" role="alert">
      <p>{t('אין חיבור לשרת. בדקו את האינטרנט.')}</p>
      <button className="primary" onClick={onRetry}>
        {t('נסו שוב')}
      </button>
    </div>
  )
}
