import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { t } from '../i18n'
import { writeCache } from '../lib'
import { forgetGuest, type GuestState } from '../guest'
import type { Profile } from '../types'

/**
 * Right after a visitor signs in: what they did before an account becomes theirs. Their answers become their profile
 * (unless they already have one), they get a trip (their first one, or a new "Japan"), the library cards reach it, and
 * each card they swiped gets their vote. Then the phone forgets it. A step that fails can be tried again or skipped.
 */
export default function GuestImport({ userId, guest, tripId, onDone }: { userId: string; guest: GuestState; tripId: string | null; onDone: (tripId: string | null) => void }) {
  const [err, setErr] = useState('')
  const [attempt, setAttempt] = useState(0)
  const running = useRef(false)

  useEffect(() => {
    if (running.current) return
    running.current = true
    setErr('')
    ;(async () => {
      try {
        onDone(await carry(userId, guest, tripId))
        forgetGuest()
      } catch (e) {
        console.error('guest import', e)
        setErr(t('לא הצלחנו לשמור את מה שאהבתם. נסו שוב.'))
      } finally {
        running.current = false
      }
    })()
  }, [attempt])

  if (!err)
    return (
      <div className="center" role="status">
        {t('שומרים את מה שאהבתם…')}
      </div>
    )
  return (
    <div className="center stack" role="alert">
      <p>{err}</p>
      <button className="primary" onClick={() => setAttempt((a) => a + 1)}>
        {t('לנסות שוב')}
      </button>
      <button
        className="link"
        onClick={() => {
          forgetGuest()
          onDone(tripId)
        }}
      >
        {t('לוותר ולהמשיך')}
      </button>
    </div>
  )
}

async function carry(userId: string, g: GuestState, tripId: string | null): Promise<string> {
  const now = new Date().toISOString()
  // the questionnaire: theirs from before the account, unless the account already answered it
  if (g.answers) {
    const { data: had } = await supabase.from('profiles').select('completed_at').eq('user_id', userId).maybeSingle()
    if (!had?.completed_at) {
      const row: Profile = { user_id: userId, answers: g.answers, completed_at: now, updated_at: now }
      const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' })
      if (error) throw error
      writeCache('profile:' + userId, row)
    }
  }
  // the trip: theirs, or a new one named for Japan
  let tid = tripId
  if (!tid) {
    const { data: s } = await supabase.auth.getSession()
    const u = s.session?.user
    const name = ((u?.user_metadata?.name as string | undefined) ?? '').trim() || (u?.email ?? '').split('@')[0] || t('אני')
    const made = await supabase.rpc('create_trip', { trip_name: t('יפן'), name, start: null })
    if (made.error || !made.data) throw made.error ?? new Error('no trip')
    tid = made.data as string
  }
  // the votes: the library cards come into the trip (the cities they picked included), then each swiped one gets theirs
  if (g.seen.length) {
    const synced = await supabase.rpc('sync_library', { tid })
    if (synced.error) throw synced.error
    const { data: cards, error } = await supabase.from('candidates').select('id, library_id').eq('trip_id', tid).in('library_id', g.seen)
    if (error) throw error
    const liked = new Set(g.liked)
    const rows = (cards ?? []).map((c) => ({ trip_id: tid, candidate_id: c.id as string, user_id: userId, liked: liked.has(c.library_id as string) }))
    if (rows.length) {
      // a vote the account already gave on the same card stays as it was
      const put = await supabase.from('swipes').upsert(rows, { onConflict: 'candidate_id,user_id', ignoreDuplicates: true })
      if (put.error) throw put.error
    }
  }
  try {
    localStorage.setItem('tripId', tid)
  } catch {
    // the app opens on the trip list instead
  }
  return tid
}
