import { useEffect, useMemo, useState } from 'react'
import { Heart, SlidersHorizontal, Sparkles, Users, CalendarDays } from 'lucide-react'
import { t } from '../i18n'
import { Icon, type LucideIcon } from '../icons'
import { EmptyState, Sheet } from '../ui'
import { Loading } from '../rings'
import { guestCityInUrl, guestDeck, loadGuestCards, readGuest, writeGuest, type GuestState } from '../guest'
import type { Answers, Candidate } from '../types'
import Onboarding from './Onboarding'
import LoginCarousel from './LoginCarousel'
import { Card } from './Swipe'
import { ToogoLogo } from './Login'
import '../styles/game.css'
import '../styles/guest.css'

// after this many swipes (and again every PROMPT_EVERY more) the visitor is asked to sign in and keep what they liked
const PROMPT_AFTER = 8
const PROMPT_EVERY = 12

/**
 * Toogo before an account (app_settings features.guest_mode): a welcome, the questionnaire, then real cards for the
 * cities they picked, swiped like Discover. What they answer and like stays on the phone (src/guest.ts); signing in
 * keeps it (GuestImport). A guide page's link opens it on its city (?city=kyoto).
 */
export default function Guest({ onSignIn }: { onSignIn: () => void }) {
  const [g, setG] = useState<GuestState>(readGuest)
  const [step, setStep] = useState<'welcome' | 'questions' | 'cards'>(() => (readGuest().answers ? 'cards' : 'welcome'))
  const city = useMemo(guestCityInUrl, [])
  const update = (next: GuestState) => {
    writeGuest(next)
    setG(next)
  }

  if (step === 'welcome') return <Welcome city={city} onStart={() => setStep('questions')} onSignIn={onSignIn} />
  if (step === 'questions' || !g.answers)
    return (
      <Onboarding
        userId=""
        initial={g.answers ?? (city ? { cities: [city as Answers['cities'][number]] } : null)}
        keep={(row) => {
          update({ ...g, answers: row.answers as Answers })
          return true
        }}
        onDone={() => setStep('cards')}
        onClose={() => setStep(g.answers ? 'cards' : 'welcome')}
      />
    )
  return <GuestCards g={g} update={update} onPrefs={() => setStep('questions')} onSignIn={onSignIn} />
}

/** What Toogo is, in three lines, over the same app screens as the sign-in page, and one button to start. */
function Welcome({ city, onStart, onSignIn }: { city: string | null; onStart: () => void; onSignIn: () => void }) {
  const lines: { icon: LucideIcon; text: string }[] = [
    { icon: Heart, text: t('מחליקים על מקומות ביפן שמתאימים לכם') },
    { icon: Users, text: t('רואים על מה כל מי שנוסע איתכם הסכים') },
    { icon: CalendarDays, text: t('מקבלים תוכנית יום אחרי יום, ואיפה כדאי לישון') },
  ]
  return (
    <div className="login guest-welcome">
      <ToogoLogo />
      <p className="guest-lead">{t('מתכננים את יפן ביחד')}</p>
      <LoginCarousel />
      <ul className="guest-lines">
        {lines.map((l) => (
          <li key={l.text}>
            <Icon as={l.icon} /> <span>{l.text}</span>
          </li>
        ))}
      </ul>
      <button className="primary" onClick={onStart}>
        {city ? t('בואו נתחיל') : t('בואו נתחיל, בחינם')}
      </button>
      <p className="small muted guest-note">{t('כמה שאלות קצרות ואז מקומות אמיתיים. בלי חשבון, עד שתרצו לשמור.')}</p>
      <button className="link" onClick={onSignIn}>
        {t('כבר יש לי חשבון')}
      </button>
    </div>
  )
}

/** Discover for a visitor: their cards, like / skip, a count of what they liked and "save your trip". */
function GuestCards({ g, update, onPrefs, onSignIn }: { g: GuestState; update: (g: GuestState) => void; onPrefs: () => void; onSignIn: () => void }) {
  const [cards, setCards] = useState<Candidate[] | null>(null)
  const [ask, setAsk] = useState(false)
  const [swiped, setSwiped] = useState(0)
  const cities = g.answers?.cities ?? []
  useEffect(() => {
    let live = true
    setCards(null)
    loadGuestCards(cities).then((c) => live && setCards(c))
    return () => {
      live = false
    }
  }, [cities.join()])

  const deck = useMemo(() => (cards ? guestDeck(cards, g) : []), [cards, g])
  const swipe = async (c: Candidate, liked: boolean) => {
    update({ ...g, liked: liked ? [...g.liked, c.id] : g.liked, seen: [...g.seen, c.id] })
    const n = swiped + 1
    setSwiped(n)
    if (n === PROMPT_AFTER || (n > PROMPT_AFTER && (n - PROMPT_AFTER) % PROMPT_EVERY === 0)) setAsk(true)
    return true
  }
  const undo = () => {
    const last = g.seen[g.seen.length - 1]
    if (!last) return
    update({ ...g, liked: g.liked.filter((x) => x !== last), seen: g.seen.slice(0, -1) })
    setSwiped((n) => Math.max(0, n - 1))
  }

  if (!cards) return <Loading />
  return (
    <div className="guest-screen">
      <header className="guest-top">
        <button className="guest-prefs" onClick={onPrefs} aria-label={t('שינוי ההעדפות')}>
          <Icon as={SlidersHorizontal} />
        </button>
        <span className="guest-count">
          <Icon as={Heart} /> {g.liked.length === 1 ? t('אהבתם מקום אחד') : t('אהבתם {n} מקומות', { n: g.liked.length })}
        </span>
        <button className="primary guest-save" onClick={() => setAsk(true)}>
          {t('שמירת הטיול')}
        </button>
      </header>
      <div className="deck">
        {!deck.length && (
          <div className="empty">
            <EmptyState
              icon={Sparkles}
              title={t('ראיתם את כל המקומות שמתאימים לכם')}
              line={t('שמרו את הטיול כדי לראות על מה כולם הסכימו, ולקבל תוכנית יום אחרי יום.')}
              action={{ label: t('שמירת הטיול'), onClick: () => setAsk(true) }}
            />
          </div>
        )}
        {deck
          .slice(0, 2)
          .reverse()
          .map((c, i, arr) => (
            <Card key={c.id} c={c} likedBy={[]} top={i === arr.length - 1} onSwipe={(liked) => swipe(c, liked)} />
          ))}
      </div>
      {deck.length > 0 && (
        <div className="swipe-buttons">
          <button className="round small-round" onClick={undo} disabled={!g.seen.length} aria-label={t('ביטול החלקה אחרונה')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
          </button>
          <button className="round nope" onClick={() => deck[0] && swipe(deck[0], false)} aria-label={t('דלג')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <button className="round like" onClick={() => deck[0] && swipe(deck[0], true)} aria-label={t('אהבתי')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path className="fill" d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 4 4.5 7.2 4.5c1.9 0 3.4 1 4.8 2.8 1.4-1.8 2.9-2.8 4.8-2.8 3.2 0 5.6 3.2 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" /></svg>
          </button>
          <span className="round small-round guest-spacer" aria-hidden="true" />
        </div>
      )}
      {ask && (
        <Sheet title={t('שומרים את הטיול?')} onClose={() => setAsk(false)}>
          <div className="stack guest-ask">
            <p>
              {g.liked.length
                ? g.liked.length === 1
                  ? t('אהבתם מקום אחד. התחברו כדי לשמור אותו, ולתכנן מכאן ביחד:')
                  : t('אהבתם {n} מקומות. התחברו כדי לשמור אותם, ולתכנן מכאן ביחד:', { n: g.liked.length })
                : t('התחברו כדי לשמור את מה שתאהבו, ולתכנן מכאן ביחד:')}
            </p>
            <ul className="guest-lines">
              <li>
                <Icon as={Users} /> <span>{t('מזמינים את מי שנוסע איתכם להצביע, ורואים על מה הסכמתם')}</span>
              </li>
              <li>
                <Icon as={CalendarDays} /> <span>{t('מקבלים תוכנית יום אחרי יום, ואיפה כדאי לישון')}</span>
              </li>
            </ul>
            <button className="primary" onClick={onSignIn}>
              {t('התחברות ושמירה')}
            </button>
            <button className="link" onClick={() => setAsk(false)}>
              {t('עוד כמה מקומות')}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
