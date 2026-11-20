import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../supabase'
import type { Candidate, Place } from '../types'
import { errorText, useTripTable } from '../lib'
import { t } from '../i18n'
import { Icon } from '../icons'
import { StarsInput, useRatings } from './Ratings'
import { PhotoPicker } from './PlacePhotos'
import { sendPhotos } from './photoSend'
import { useProfile } from './Onboarding'
import '../styles/ratings.css'
import { say } from '../toast'

// The day after a visit Home asks, once, how it was: stars and one quick question. Never required: the card can be
// dismissed, and a dismissal is remembered on this phone only.

const DISMISSED = 'reviewDismissed'
const WINDOW_MS = 7 * 86400000

const readDismissed = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(DISMISSED) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

type Question = { key: string; ask: string; options: { value: string; label: string }[] }

/** The quick question for a kind of place; null when there is none for it. */
function questionFor(category: string): Question | null {
  if (category === 'food' || category === 'cafe' || category === 'nightlife')
    return {
      key: 'worth_wait',
      ask: t('האם זה היה שווה את ההמתנה?'),
      options: [
        { value: 'yes', label: t('כן') },
        { value: 'meh', label: t('בינוני') },
        { value: 'no', label: t('לא') },
        { value: 'none', label: t('לא חיכינו') },
      ],
    }
  if (category === 'sight' || category === 'experience')
    return {
      key: 'crowd',
      ask: t('כמה היה עמוס?'),
      options: [
        { value: 'quiet', label: t('שקט') },
        { value: 'ok', label: t('בסדר') },
        { value: 'packed', label: t('עמוס מאוד') },
      ],
    }
  if (category === 'shopping')
    return {
      key: 'prices',
      ask: t('איך היו המחירים?'),
      options: [
        { value: 'cheap', label: t('זול') },
        { value: 'fair', label: t('הוגן') },
        { value: 'pricey', label: t('יקר') },
      ],
    }
  return null
}

const STROLLER: Question = {
  key: 'stroller',
  ask: t('היה נוח לעגלה?'),
  options: [
    { value: 'yes', label: t('כן') },
    { value: 'some', label: t('בקושי') },
    { value: 'no', label: t('לא') },
  ],
}

/** "How was X?" for the most recent place visited yesterday or earlier that you haven't rated or dismissed. */
export default function ReviewCard({ tripId, userId }: { tripId: string; userId: string }) {
  const { rows: places } = useTripTable<Place>('places', tripId)
  const { rows: cards } = useTripTable<Candidate>('candidates', tripId)
  const { profile } = useProfile(userId)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [stars, setStars] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [thanks, setThanks] = useState(false)
  // photos to send with the review: they stay picked when one fails, and the card stays open for the retry
  const [files, setFiles] = useState<File[]>([])
  const [rights, setRights] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')
  const [ratingDone, setRatingDone] = useState(false)
  // once the rating is saved the place counts as rated and would drop out of the list: keep it while photos wait
  const [pinned, setPinned] = useState<string | null>(null)

  const due = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    return places
      .filter((p) => p.visited && p.visited_at)
      .map((p) => ({ p, at: Date.parse(p.visited_at!), card: cards.find((c) => c.id === p.candidate_id) }))
      // the day after: visited before today began, and not so long ago that it is forgotten
      .filter((x) => x.card?.library_id && x.at < startOfToday && Date.now() - x.at < WINDOW_MS)
      .sort((a, b) => b.at - a.at)
  }, [places, cards])
  const ratings = useRatings(due.map((x) => x.card!.library_id))

  const next =
    due.find((x) => x.p.id === pinned) ??
    due.find((x) => !dismissed.includes(x.p.id) && !ratings.of(x.card!.library_id!).some((r) => r.user_id === userId))
  if (!next && !thanks) return null
  if (!next) return <section className="card review-card" role="status">{t('תודה! הדירוג נשמר.')}</section>

  const { p, card } = next
  const category = p.category && p.category !== 'other' ? p.category : (card?.category ?? p.category)
  const questions = [questionFor(category), profile?.answers?.with?.includes('baby') ? STROLLER : null].filter((q): q is Question => !!q)

  const resetPhotos = () => {
    setFiles([])
    setRights(false)
    setPhotoMsg('')
    setRatingDone(false)
    setPinned(null)
  }

  const dismiss = () => {
    const all = [...dismissed, p.id]
    setDismissed(all)
    setStars(0)
    setAnswers({})
    resetPhotos()
    try {
      localStorage.setItem(DISMISSED, JSON.stringify(all))
    } catch {
      // it will simply be asked again next time
    }
  }

  const save = async () => {
    if (!stars || busy || (files.length && !rights)) return
    setBusy(true)
    setPhotoMsg('')
    // the rating goes first and stays saved whatever happens to the photos; a retry sends the photos only
    if (!ratingDone) {
      const row: Record<string, unknown> = { library_id: card!.library_id!, trip_id: tripId, stars }
      const table = () => supabase.from('place_ratings')
      let { error } = await table().upsert(Object.keys(answers).length ? { ...row, answers } : row, { onConflict: 'library_id,user_id' })
      // the answers column isn't there yet: keep the stars
      if (error && /answers/.test(error.message)) ({ error } = await table().upsert(row, { onConflict: 'library_id,user_id' }))
      if (error) {
        setBusy(false)
        return void say(errorText(error.message), { error: true })
      }
      if (files.length) setPinned(p.id)
      setRatingDone(true)
      ratings.put({ library_id: card!.library_id!, trip_id: tripId, stars, user_id: userId, note: null, answers, updated_at: new Date().toISOString() })
    }
    if (files.length) {
      const r = await sendPhotos(files, { tripId, libraryId: card!.library_id! })
      setFiles(r.failed)
      if (r.failed.length) {
        setBusy(false)
        return setPhotoMsg(
          r.capped
            ? t('יש כבר 20 תמונות שמחכות לאישור. הדירוג נשמר, ושאר התמונות יישארו כאן לניסיון מאוחר יותר.')
            : r.failed.length === 1
              ? t('לא הצלחתי לשלוח תמונה אחת. אפשר לנסות שוב.')
              : t('לא הצלחתי לשלוח {n} תמונות. אפשר לנסות שוב.', { n: r.failed.length }),
        )
      }
    }
    setBusy(false)
    resetPhotos()
    setStars(0)
    setAnswers({})
    setThanks(true)
    setTimeout(() => setThanks(false), 2500)
  }

  return (
    <section className="card review-card">
      <div className="row spread">
        <h3 dir="auto">{/^[\p{L}\p{N}]/u.test(p.name.trim()) && !/^[\u0590-\u05FF]/.test(p.name.trim()) ? t('איך היה ב-{name}?', { name: p.name }) : t('איך היה ב{name}?', { name: p.name })}</h3>
        <button className="review-x" aria-label={t('לא עכשיו')} onClick={dismiss}>
          <Icon as={X} />
        </button>
      </div>
      <StarsInput value={stars} onChange={(n) => { setStars(n); setRatingDone(false) }} />
      {stars > 0 &&
        questions.map((q) => (
          <div key={q.key} className="review-q">
            <span className="small">{q.ask}</span>
            <div className="chips" role="group" aria-label={q.ask}>
              {q.options.map((o) => (
                <button
                  key={o.value}
                  className={'chip' + (answers[q.key] === o.value ? ' on' : '')}
                  aria-pressed={answers[q.key] === o.value}
                  onClick={() => { setRatingDone(false); setAnswers((a) => (a[q.key] === o.value ? Object.fromEntries(Object.entries(a).filter(([k]) => k !== q.key)) : { ...a, [q.key]: o.value })) }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      <PhotoPicker files={files} onChange={setFiles} rights={rights} onRights={setRights} disabled={busy} />
      {photoMsg && <p className="msg" role="alert">{photoMsg}</p>}
      <div className="row">
        <button className="primary" disabled={!stars || busy || (files.length > 0 && !rights)} onClick={save}>
          {t('שליחה')}
        </button>
        <button className="link small" onClick={dismiss}>
          {t('לא עכשיו')}
        </button>
      </div>
    </section>
  )
}
