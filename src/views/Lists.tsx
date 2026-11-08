import { FormEvent, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { itemDone, type ChecklistItem, type Member } from '../types'
import { couplesOf, keepRanges, mutate, useTripTable } from '../lib'
import { Empty } from '../ui'
import { Icon } from '../icons'
import { t } from '../i18n'
import { Check, Plus, Trash2 } from 'lucide-react'
import { SwipeRow } from '../swipe'

const LISTS: { id: string; label: string }[] = [
  { id: 'todo', label: t('לפני הטיסה') },
  { id: 'packing', label: t('ציוד') },
  { id: 'shopping', label: t('לקנות ביפן') },
]

/** How long a deleted item can still be brought back (55). */
const UNDO_MS = 4500

export default function Lists({ tripId, members, userId }: { tripId: string; members: Member[]; userId: string }) {
  const { rows } = useTripTable<ChecklistItem>('checklist_items', tripId)
  const [list, setList] = useState('todo')
  const [text, setText] = useState('')
  const [assignee, setAssignee] = useState('')
  const [each, setEach] = useState(false)
  // a deleted item waits a few seconds before it really goes, so "ביטול" can bring it back (55)
  const [gone, setGone] = useState<ChecklistItem | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const couples = couplesOf(members)
  const myCouple = members.find((m) => m.user_id === userId)?.couple ?? null
  const others = couples.filter((c) => c !== myCouple)
  // packing is each couple's own; the other lists are the trip's
  const perCouple = list === 'packing'

  const done = (i: ChecklistItem) => itemDone(i, myCouple)
  const inList = (id: string) => rows.filter((r) => r.list === id && (id !== 'packing' || !r.couple || r.couple === myCouple) && r.id !== gone?.id)
  const items = inList(list).sort((a, b) => Number(done(a)) - Number(done(b)))

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    const ok = await mutate(
      supabase.from('checklist_items').insert({
        trip_id: tripId,
        list,
        text: text.trim(),
        assignee: assignee || null,
        couple: perCouple ? myCouple : null,
        each: !perCouple && each,
      }),
    )
    if (ok) {
      setText('')
      setEach(false)
      setAssignee('')
    }
  }

  const toggle = (i: ChecklistItem) => {
    if (!i.each) return mutate(supabase.from('checklist_items').update({ done: !i.done }).eq('id', i.id))
    if (!myCouple) return
    const was = i.done_couples ?? []
    const next = was.includes(myCouple) ? was.filter((c) => c !== myCouple) : [...was, myCouple]
    return mutate(supabase.from('checklist_items').update({ done_couples: next }).eq('id', i.id))
  }

  const finish = (i: ChecklistItem | null) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (i) void mutate(supabase.from('checklist_items').delete().eq('id', i.id))
  }
  const remove = (i: ChecklistItem) => {
    // a second delete settles the first one
    finish(gone)
    setGone(i)
    timer.current = setTimeout(() => {
      finish(i)
      setGone(null)
    }, UNDO_MS)
  }
  const undo = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setGone(null)
  }
  // leaving the screen with an undo still showing: the delete goes through
  const goneRef = useRef(gone)
  goneRef.current = gone
  useEffect(() => () => finish(goneRef.current), []) // eslint-disable-line react-hooks/exhaustive-deps

  const typing = !!text.trim()
  return (
    <div className="stack">
      {/* each list's progress is a ring in its own tab (56): Toogo red, a full green ring and ✓ once it's all done */}
      <div className="segmented list-tabs" role="tablist">
        {LISTS.map((l) => {
          const all = inList(l.id)
          const left = all.filter((i) => !done(i)).length
          const finished = all.length > 0 && left === 0
          return (
            <button key={l.id} role="tab" aria-selected={list === l.id} className={list === l.id ? 'on' : ''} onClick={() => setList(l.id)}>
              <Ring part={all.length ? (all.length - left) / all.length : 0} done={finished} />
              <span className="list-name">{l.label}</span>
              {finished ? <Icon as={Check} className="list-ok" /> : left > 0 && <span className="list-left">{left}</span>}
            </button>
          )
        })}
      </div>
      {perCouple && myCouple && <p className="muted small">{t('הציוד של {who}. לכל זוג רשימה משלו.', { who: t(myCouple) })}</p>}

      <form className="add-row" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('להוסיף…')} enterKeyHint="done" />
        <button className="primary" aria-label={t('הוספה')} disabled={!typing}>
          <Icon as={Plus} size="1.25em" />
        </button>
      </form>
      {/* the choices open only while typing (57), centred, two equal boxes */}
      {typing && (
        <div className="add-choices">
          {!perCouple && couples.length > 1 && (
            <>
              <p className="add-q">{t('מי צריך לסמן?')}</p>
              <div className="add-two">
                <button type="button" className={each ? 'on' : ''} aria-pressed={each} onClick={() => setEach(true)}>
                  <b>{t('כל זוג לעצמו')}</b>
                  <span>{t('כמו ביטוח או טופס כניסה')}</span>
                </button>
                <button type="button" className={!each ? 'on' : ''} aria-pressed={!each} onClick={() => setEach(false)}>
                  <b>{t('מספיק שאחד יסמן')}</b>
                  <span>{t('כמו הזמנת מסעדה')}</span>
                </button>
              </div>
            </>
          )}
          <p className="add-q">{t('מי אחראי?')}</p>
          <div className="chips add-who">
            <button type="button" className={'chip' + (!assignee ? ' on' : '')} onClick={() => setAssignee('')}>
              {perCouple ? t('שנינו') : t('כולם')}
            </button>
            {members
              .filter((m) => !perCouple || m.couple === myCouple)
              .map((m) => (
                <button key={m.user_id} type="button" className={'chip' + (assignee === m.display_name ? ' on' : '')} onClick={() => setAssignee(m.display_name)}>
                  {m.display_name}
                </button>
              ))}
          </div>
        </div>
      )}

      {items.length === 0 && <Empty>{t('הרשימה ריקה')}</Empty>}
      {items.map((i) => {
        const isDone = done(i)
        return (
          <SwipeRow key={i.id} end={[{ label: t('מחיקה'), icon: Trash2, tone: 'del', onClick: () => remove(i) }]}>
            <div className={'item card slim' + (isDone ? ' done' : '')}>
              <button
                className="check"
                // on an item each couple ticks, my circle ticks my couple (79)
                aria-label={i.each ? (isDone ? t('לבטל את הסימון שלנו') : t('לסמן שאנחנו סיימנו')) : isDone ? t('לבטל סימון') : t('לסמן כבוצע')}
                aria-pressed={isDone}
                onClick={() => toggle(i)}
              >
                {isDone ? <Icon as={Check} size="1em" strokeWidth={3} /> : null}
              </button>
              <div className="item-body">
                {keepRanges(i.text)}
                {i.assignee && <span className="chip tiny">{i.assignee}</span>}
                {i.each && others.length > 0 && (
                  <div className="muted small">
                    {t('הסימון שלכם')}
                    {others.map((c) => (
                      <span key={c} className="couple-mark">
                        {' · '}
                        {(i.done_couples ?? []).includes(c) ? t('{who}: סימנו ✓', { who: t(c) }) : t('{who}: עוד לא', { who: t(c) })}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SwipeRow>
        )
      })}

      {gone && (
        <div className="undo-bar" role="status">
          <span>{t('נמחק: {text}', { text: gone.text })}</span>
          <button className="link" onClick={undo}>
            {t('ביטול')}
          </button>
        </div>
      )}
    </div>
  )
}

/** A small progress ring with the logo ring's thickness (outer 48, hole 28: the stroke is a fifth of the width). */
function Ring({ part, done }: { part: number; done: boolean }) {
  const r = 7.6
  const c = 2 * Math.PI * r
  return (
    <svg className={'list-ring' + (done ? ' done' : '')} viewBox="0 0 20 20" aria-hidden="true">
      <circle className="track" cx="10" cy="10" r={r} />
      {(done || part > 0) && <circle className="fill" cx="10" cy="10" r={r} strokeDasharray={`${c * (done ? 1 : part)} ${c}`} />}
    </svg>
  )
}
