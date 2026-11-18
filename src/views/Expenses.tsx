import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Meter, MeterIndicator, MeterTrack } from '@ui-sdk/react/meter'
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control'
import { Menu, MenuContent, MenuItemIndicator, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '@ui-sdk/react/menu'
import { Toggle, ToggleGroup } from '@ui-sdk/react/toggle'
import { Radio, RadioGroup } from '@ui-sdk/react/radio'
import { Checkbox, CheckboxGroup, CheckboxIndicator } from '@ui-sdk/react/checkbox'
import { supabase } from '../supabase'
import type { Expense, Member, Trip } from '../types'
import { couplesOf, fmtDay, mutate, useTripTable } from '../lib'
import { t } from '../i18n'
import { ask } from '../toast'
import { balances, convert, coupleTotals, fmtAmount, fmtMoney, parseAmount, partiesOf, settleUp, toMinor, SYMBOL, type Cur, type Transfer } from '../money'
import { Empty, Field, LoadNote, Sheet, Skeleton, useRemembered } from '../ui'
import { canSayBalanced, findSettleTwin, newExpenseCurrency } from '../screenLogic'
import { Icon, type LucideIcon } from '../icons'
import { BedDouble, Check, ChevronDown, Handshake, Minus, Package, Pencil, Plane, Plus, Trash2, ShoppingBag, Ticket, TrainFront, Utensils } from 'lucide-react'
import '../styles/expenses.css'
import { SwipeRow } from '../swipe'
import { Avatar, coupleLook } from '../avatar'
import { useQuickAdd } from '../quickAdd'

type Props = { trip: Trip; members: Member[]; userId: string }

const CATS: Record<string, { label: string; icon: LucideIcon }> = {
  food: { label: t('אוכל'), icon: Utensils },
  flight: { label: t('טיסה'), icon: Plane },
  transport: { label: t('תחבורה'), icon: TrainFront },
  lodging: { label: t('לינה'), icon: BedDouble },
  sights: { label: t('אטרקציות'), icon: Ticket },
  shopping: { label: t('קניות'), icon: ShoppingBag },
  other: { label: t('אחר'), icon: Package },
}
// the category from what was typed in "על מה" (54): a plain word list, Hebrew and English, no AI. The first kind with a
// word in the text wins; nothing matched and nothing picked saves as "אחר"
const CAT_WORDS: [string, string[]][] = [
  ['flight', ['טיסה', 'טיסות', 'flight', 'airline', 'lufthansa', 'swiss', 'el al', 'אל על']], // he-only
  ['lodging', ['מלון', 'לינה', 'airbnb', 'אירביאנבי', 'hotel', 'hostel', 'ryokan', 'ריוקאן', 'דירה', 'apartment']], // he-only
  ['transport', ['רכבת', 'מונית', 'אוטובוס', 'שינקנסן', 'סואיקה', 'מטרו', 'taxi', 'train', 'bus', 'shinkansen', 'suica', 'pasmo', 'jr', 'metro', 'subway', 'דלק', 'חניה']], // he-only
  ['food', ['ראמן', 'מסעדה', 'אוכל', 'ארוחה', 'ארוחת', 'סושי', 'קפה', 'מאפה', 'גלידה', 'בירה', 'יאקיטורי', 'אודון', 'restaurant', 'ramen', 'sushi', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'bar', 'beer', 'food', 'izakaya', 'konbini', 'סופר', '7-eleven', 'lawson']], // he-only
  ['sights', ['כרטיס', 'כניסה', 'מוזיאון', 'מקדש', 'פארק', 'אטרקציה', 'סיור', 'ticket', 'museum', 'temple', 'shrine', 'park', 'tour', 'teamlab', 'disney', 'דיסני', 'usj']], // he-only
  ['shopping', ['קניות', 'חנות', 'מתנה', 'מתנות', 'בגדים', 'shopping', 'shop', 'gift', 'uniqlo', 'don quijote', 'דון קיחוטה']], // he-only
]
const catFromWords = (text: string) => {
  const s = text.toLowerCase()
  return CAT_WORDS.find(([, words]) => words.some((w) => s.includes(w)))?.[0] ?? null
}

const flip = (c: Cur): Cur => (c === 'JPY' ? 'ILS' : 'JPY')

/** A name set apart from the text around it, so a Hebrew name inside an English line (or the reverse) keeps its order. */
const iso = (name: string) => `\u2068${name}\u2069`

/** Who paid whom, as it is said: "from Almog to Maor". */
const FromTo = ({ from, to }: { from: string; to: string }) => <>{t('מ{from} ל{to}', { from: iso(from), to: iso(to) })}</>

/** Today by the date in Japan, whatever timezone the phone is still set to. */
const japanToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })

// agorot at most, so a typed 12.345 doesn't leave a half-agora in the books
const roundFor = (n: number, currency: string) => (currency === 'JPY' ? Math.round(n) : Math.round(n * 100) / 100)

export default function Expenses({ trip, members, userId }: Props) {
  const { rows, loading, error, reload } = useTripTable<Expense>('expenses', trip.id, 'spent_on')
  const [cur, setCur] = useRemembered('expensesCurrency', 'ILS')
  const [edit, setEdit] = useState<Partial<Expense> | null>(null)
  useQuickAdd('expense', () => setEdit({}))
  const [settle, setSettle] = useState<{ t: Transfer; row?: Expense } | null>(null)
  const [editingRate, setEditingRate] = useState(false)
  // who paid, as a view filter only: the balances above always count everything
  const [payer, setPayer] = useState('all')
  // the trip row only refreshes through realtime, so show a saved rate right away
  const [savedRate, setSavedRate] = useState<number | null>(null)
  // the column defaults to 0.025; fall back to it for a trip row loaded before the column existed (e.g. a cached copy)
  const rate = savedRate ?? (Number(trip.ils_per_jpy) || 0.025)
  const show: Cur = cur === 'JPY' ? 'JPY' : 'ILS'
  const unsure = (loading || !!error) && !rows.length

  // the currency toggle lives in the sheet's title row (the slot Sheet leaves at its end side); outside a sheet it
  // sits at the top of the list
  const root = useRef<HTMLDivElement>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setSlot(root.current?.closest('.sheet')?.querySelector<HTMLElement>('[data-sheet-end]') ?? null)
  }, [])

  const nameOf = (id: string) => {
    const name = members.find((m) => m.user_id === id)?.display_name
    return name ? t(name) : t('מישהו')
  }
  const couples = couplesOf(members)
  const ids = members.map((m) => m.user_id)
  const myCouple = members.find((m) => m.user_id === userId)?.couple ?? couples[0]
  const lookOf = (id: string) => coupleLook(members.find((m) => m.user_id === id)?.couple, myCouple)

  const bal = balances(rows, ids, show, rate)
  // a couple is one wallet, so debts are settled between couples; a trip can be set to settle person by person
  // (trips.settle_by, a backend setting). A trip row cached from before the column existed counts as couples.
  const byCouple = couples.length > 1 && trip.settle_by !== 'people'
  const parties = partiesOf(members, byCouple)
  const partyOf = (id: string) => parties.find((p) => p.ids.includes(id))
  const mineKey = partyOf(userId)?.key
  const labelOf = (key: string) => {
    const label = parties.find((p) => p.key === key)?.label
    return label ? t(label) : t('מישהו')
  }
  const transfers = settleUp(bal, parties, show, rate)
  const toPay = transfers.filter((t) => t.from === mineKey)
  const toGet = transfers.filter((t) => t.to === mineKey)
  const others = transfers.filter((t) => t.from !== mineKey && t.to !== mineKey)
  const totals = coupleTotals(rows, members, bal, show, rate)
  // "we" for a couple, "you" for one person
  const we = byCouple && (partyOf(userId)?.ids.length ?? 0) > 1

  // newest first, grouped by day
  const sorted = [...rows].sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at))
  const shown = payer === 'all' ? sorted : sorted.filter((e) => e.paid_by === payer)
  const days = [...new Set(shown.map((e) => e.spent_on))]

  /** Who a split is among, as people would say it. */
  const splitLabel = (split: string[]) => {
    const has = (list: string[]) => list.length === split.length && list.every((id) => split.includes(id))
    if (has(ids)) return t('כולם')
    const couple = couples.find((c) => has(members.filter((m) => m.couple === c).map((m) => m.user_id)))
    return couple ? t(couple) : split.map(nameOf).join(', ')
  }

  // a repayment between couples is the couple's, whichever of the two handed over the money
  const whoOf = (id: string) => (byCouple ? t(partyOf(id)?.label ?? nameOf(id)) : nameOf(id))
  const money = (minor: number, c: Cur = show) => <bdi dir="ltr">{fmtMoney(minor, c)}</bdi>
  /** A transfer between parties, recorded as one person paying another: someone from each side, preferably me. */
  const asPeople = (t: Transfer): Transfer => {
    const pick = (key: string) => {
      const p = parties.find((x) => x.key === key)!
      return p.ids.includes(userId) ? userId : p.ids[0]
    }
    return { from: pick(t.from), to: pick(t.to), amount: t.amount }
  }

  // the pair card: my couple first. Only for exactly two couples; any other trip lists everyone's balance in one card.
  const pair = couples.length === 2 ? [...couples].sort((a, b) => Number(b === myCouple) - Number(a === myCouple)) : null
  const paidOf = (c: string) => totals[c]?.paid ?? 0
  const paidTotal = pair ? paidOf(pair[0]) + paidOf(pair[1]) : 0
  const share = paidTotal > 0 && pair ? Math.round((paidOf(pair[0]) / paidTotal) * 1000) / 10 : 0
  const payerLabel = payer === 'all' ? t('כולם') : nameOf(payer)

  const curToggle = (
    <SegmentedControl className="exp-seg" aria-label={t('מטבע להצגה')} value={show} onValueChange={(v) => v && setCur(v as string)}>
      <SegmentedControlIndicator className="exp-seg-ind" />
      {(['JPY', 'ILS'] as const).map((c) => (
        <SegmentedControlItem key={c} value={c} className="exp-seg-item">
          {SYMBOL[c]}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )

  return (
    <div className="exp" ref={root}>
      {slot ? createPortal(curToggle, slot) : <div className="exp-cur-row">{curToggle}</div>}

      {/* zeros and "all settled" are only true once the expenses have really loaded */}
      {!unsure && (
        <div className="exp-card">
          {pair ? (
            <>
              <div className="exp-pair">
                {pair.map((c) => {
                  const net = totals[c]?.net ?? 0
                  return (
                    <div key={c} className="exp-side">
                      <span className="muted exp-fn">{c === myCouple ? t('{name} · אתם', { name: iso(t(c)) }) : t(c)}</span>
                      <span className="exp-paid">{t('שילמו {amount}', { amount: `⁦${fmtMoney(paidOf(c), show)}⁩` })}</span>
                      <b className={'exp-net' + (net > 0 ? ' plus' : net < 0 ? ' minus' : ' muted')}>
                        <bdi dir="ltr">
                          {net > 0 ? '+' : net < 0 ? '−' : ''}
                          {fmtMoney(net, show)}
                        </bdi>
                      </b>
                    </div>
                  )
                })}
              </div>
              <Meter className="exp-meter" value={share} aria-label={t('חלק {name} מהתשלומים', { name: iso(t(pair[0])) })}>
                <MeterTrack>
                  <MeterIndicator />
                </MeterTrack>
              </Meter>
            </>
          ) : (
            <div className="exp-balances">
              {byCouple
                ? couples.map((c) => (
                    <Balance key={c} name={t(c)} net={totals[c]?.net ?? 0} note={t('שילמו {amount}', { amount: `⁦${fmtMoney(totals[c]?.paid ?? 0, show)}⁩` })} cur={show} />
                  ))
                : members.map((m) => <Balance key={m.user_id} name={t(m.display_name)} net={bal[m.user_id] ?? 0} cur={show} />)}
            </div>
          )}
          {!toPay.length && !toGet.length && canSayBalanced({ loading, error: !!error, rows: rows.length }) && <div className="exp-owe even">{t('הכול מאוזן')}</div>}
          {[...toPay, ...toGet].map((tr) => {
            const paying = tr.from === mineKey
            const other = iso(labelOf(paying ? tr.to : tr.from))
            return (
              <div key={tr.from + tr.to} className={'exp-owe ' + (paying ? 'minus' : 'plus')}>
                <span className="exp-owe-text">
                  <span>
                    {paying
                      ? we
                        ? t('אתם מחזירים ל{name}', { name: other })
                        : t('עליך להחזיר ל{name}', { name: other })
                      : we
                        ? t('{name} מחזירים לכם', { name: other })
                        : t('מגיע לך מ{name}', { name: other })}
                  </span>
                  <b className="exp-owe-amt">{money(tr.amount)}</b>
                </span>
                <button className="exp-pill" onClick={() => setSettle({ t: asPeople(tr) })}>
                  <Icon as={Check} /> {paying ? (we ? t('החזרנו') : t('החזרתי')) : we ? t('קיבלנו') : t('קיבלתי')}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {error && <LoadNote onRetry={reload} />}
      {loading && !rows.length && <Skeleton rows={3} />}
      {!loading && !error && rows.length === 0 && (
        <Empty>{t('עוד אין הוצאות. מוסיפים הוצאה, בוחרים מי שילם ובין מי מחלקים, וכאן רואים מי חייב למי.')}</Empty>
      )}

      {others.length > 0 && (
        <>
          <div className="exp-label">{t('החזרים בין האחרים')}</div>
          <div className="exp-group">
            {others.map((tr) => (
              <div key={tr.from + tr.to} className="exp-transfer">
                <span className="exp-transfer-who">
                  <span>
                    <FromTo from={labelOf(tr.from)} to={labelOf(tr.to)} />
                  </span>
                  <b className="exp-num">{money(tr.amount)}</b>
                </span>
                <button className="link exp-link" onClick={() => setSettle({ t: asPeople(tr) })}>
                  {t('הוחזר')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {rows.length > 0 && (
        <div className="exp-listhead">
          <span className="muted exp-fn">{shown.length === 1 ? t('הוצאה אחת') : t('{n} הוצאות', { n: shown.length })}</span>
          <Menu>
            <MenuTrigger className="exp-filter">
              {t('שילם: {name}', { name: iso(payerLabel) })} <Icon as={ChevronDown} />
            </MenuTrigger>
            <MenuContent className="who-menu-list" side="bottom" align="end" sideOffset={6}>
              <MenuRadioGroup value={payer} onValueChange={(v) => setPayer(String(v))}>
                {['all', ...ids].map((v) => (
                  <MenuRadioItem key={v} value={v} closeOnSelect>
                    <span>{v === 'all' ? t('כולם') : nameOf(v)}</span>
                    <MenuItemIndicator>
                      <Icon as={Check} />
                    </MenuItemIndicator>
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuContent>
          </Menu>
        </div>
      )}

      {days.map((d) => {
        const dayRows = shown.filter((e) => e.spent_on === d)
        // what was spent that day: repayments are not spending
        const dayTotal = dayRows.filter((e) => e.kind !== 'settlement').reduce((s, e) => s + toMinor(convert(Number(e.amount), e.currency, show, rate), show), 0)
        return (
          <section key={d} className="exp-day">
            <div className="exp-dayhead">
              <span>{fmtDay(new Date(d + 'T00:00:00'))}</span>
              {dayTotal > 0 && <span className="exp-num">{money(dayTotal)}</span>}
            </div>
            <div className="exp-group">
              {dayRows.map((e) => {
                const settlement = e.kind === 'settlement'
                const open = () =>
                  settlement
                    ? setSettle({ t: { from: e.paid_by, to: e.split_among[0], amount: toMinor(Number(e.amount), e.currency) }, row: e })
                    : setEdit(e)
                const remove = async () => {
                  if (await ask({ title: t('למחוק את "{title}"?', { title: settlement ? t('החזר') : e.title }), confirmLabel: t('מחיקה'), danger: true })) await mutate(supabase.from('expenses').delete().eq('id', e.id))
                }
                return (
                  <SwipeRow
                    key={e.id}
                    end={[
                      { label: t('עריכה'), icon: Pencil, tone: 'edit', onClick: open },
                      { label: t('מחיקה'), icon: Trash2, tone: 'del', onClick: remove },
                    ]}
                  >
                    <button className="exp-row" onClick={open}>
                      <Avatar name={nameOf(e.paid_by)} size="m" look={lookOf(e.paid_by)} decorative>
                        {settlement ? <Icon as={Handshake} /> : undefined}
                      </Avatar>
                      <span className="exp-main">
                        <span className="exp-title">{settlement ? t('החזר') : e.title}</span>
                        <span className="muted exp-fn">
                          {settlement ? (
                            <FromTo from={whoOf(e.paid_by)} to={whoOf(e.split_among[0])} />
                          ) : (
                            <>{t('שולם ע״י {name} · בין: {split}', { name: iso(nameOf(e.paid_by)), split: iso(splitLabel(e.split_among)) })}</>
                          )}
                        </span>
                      </span>
                      <span className="exp-amt">
                        <bdi dir="ltr">{fmtAmount(Number(e.amount), e.currency)}</bdi>
                        <span className="muted exp-fn">
                          <bdi dir="ltr">≈ {fmtMoney(toMinor(convert(Number(e.amount), e.currency, flip(e.currency), rate), flip(e.currency)), flip(e.currency))}</bdi>
                        </span>
                      </span>
                    </button>
                  </SwipeRow>
                )
              })}
            </div>
          </section>
        )
      })}

      <div className="muted exp-fn exp-rate">
        {t('שער: 100 ין =')} <bdi dir="ltr">₪{Number((rate * 100).toFixed(3))}</bdi>{' '}
        <button className="link exp-link" onClick={() => setEditingRate(true)}>
          {t('עריכה')}
        </button>
      </div>

      <div className="exp-dock">
        <button className="primary" onClick={() => setEdit({})}>
          <Icon as={Plus} /> {t('הוצאה חדשה')}
        </button>
      </div>
      {edit && <ExpenseForm trip={trip} members={members} couples={couples} userId={userId} expense={edit} rate={rate} myCouple={myCouple} shown={show} onClose={() => setEdit(null)} />}
      {settle && (
        <SettleSheet
          trip={trip}
          userId={userId}
          nameOf={whoOf}
          cur={settle.row?.currency ?? show}
          rows={rows}
          side={(id) => partyOf(id)?.key ?? id}
          {...settle}
          onClose={() => setSettle(null)}
        />
      )}
      {editingRate && (
        <RateSheet
          tripId={trip.id}
          rate={rate}
          hasSettlements={rows.some((e) => e.kind === 'settlement')}
          onSaved={setSavedRate}
          onClose={() => setEditingRate(false)}
        />
      )}
    </div>
  )
}

function Balance(props: { name: ReactNode; net: number; note?: string; cur: Cur }) {
  const { net, cur } = props
  return (
    <div className="exp-bal">
      <span>
        {props.name}
        {props.note && <span className="muted exp-fn"> · {props.note}</span>}
      </span>
      <b className={'exp-num' + (net > 0 ? ' plus' : net < 0 ? ' minus' : ' muted')}>
        <bdi dir="ltr">
          {net > 0 ? '+' : net < 0 ? '−' : ''}
          {fmtMoney(net, cur)}
        </bdi>
      </b>
    </div>
  )
}

function ExpenseForm(props: {
  trip: Trip
  members: Member[]
  couples: string[]
  userId: string
  expense: Partial<Expense>
  rate: number
  myCouple: string | undefined
  shown: Cur
  onClose: () => void
}) {
  const { expense: x, members, couples, userId, rate } = props
  // kept as typed text and read with parseAmount, exactly as before, so "12,5" and "1,200" mean what they always meant
  const [amount, setAmount] = useState(x.id ? String(x.amount) : '')
  const [currency, setCurrency] = useState<Cur>(x.currency ?? newExpenseCurrency(props.shown))
  const [title, setTitle] = useState(x.title ?? '')
  // nothing picked in advance: the words pick it, a tap overrides them
  const [picked, setPicked] = useState<string | null>(x.category ?? null)
  const guessed = x.category ? null : catFromWords(title)
  const category = picked ?? guessed ?? 'other'
  const [paidBy, setPaidBy] = useState(x.paid_by ?? userId)
  const [split, setSplit] = useState<string[]>(x.split_among ?? members.map((m) => m.user_id))
  const [date, setDate] = useState(x.spent_on ?? japanToday())
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const all = members.map((m) => m.user_id)
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))
  const nameOf = (id: string) => t(members.find((m) => m.user_id === id)?.display_name ?? '') || t('מישהו')
  const lookOf = (id: string) => coupleLook(members.find((m) => m.user_id === id)?.couple, props.myCouple)
  // one card per couple (mine first), then whoever has no couple
  const cards = [
    ...[...couples].sort((a, b) => Number(b === props.myCouple) - Number(a === props.myCouple)).map((c) => ({ key: c, label: t(c), ids: members.filter((m) => m.couple === c).map((m) => m.user_id) })),
    ...(members.some((m) => !m.couple) ? [{ key: '', label: '', ids: members.filter((m) => !m.couple).map((m) => m.user_id) }] : []),
  ]
  /** One card's checked people replace that card's part of the split; the other cards, and anyone no longer on the trip, stay. */
  const setCard = (cardIds: string[], next: string[]) =>
    setSplit([...all.filter((id) => (cardIds.includes(id) ? next.includes(id) : split.includes(id))), ...split.filter((id) => !all.includes(id))])

  const other: Cur = currency === 'JPY' ? 'ILS' : 'JPY'
  const typedNow = parseAmount(amount)
  const rounded = Number.isNaN(typedNow) ? 0 : roundFor(typedNow, currency)
  const approx = rounded > 0 ? fmtMoney(toMinor(convert(rounded, currency, other, rate), other), other) : ''

  const save = async () => {
    const typed = parseAmount(amount)
    const n = roundFor(typed, currency)
    if (amount.trim() && Number.isNaN(typed)) return setErr(t('זה לא נראה כמו סכום'))
    if (!(n > 0)) return setErr(t('צריך סכום גדול מאפס'))
    if (!split.length) return setErr(t('בחרו לפחות אדם אחד'))
    setErr('')
    setBusy(true)
    const row = {
      trip_id: props.trip.id,
      kind: 'expense' as const,
      title: title.trim() || (CATS[category]?.label ?? CATS.other.label),
      amount: n,
      currency,
      paid_by: paidBy,
      split_among: split,
      category,
      spent_on: date || japanToday(),
    }
    // the same dinner entered by two people: same payer, amount and day is almost always one expense
    if (!x.id) {
      const { data: twin } = await supabase
        .from('expenses')
        .select('title, created_by')
        .eq('trip_id', props.trip.id)
        .eq('kind', 'expense')
        .eq('paid_by', row.paid_by)
        .eq('amount', row.amount)
        .eq('currency', row.currency)
        .eq('spent_on', row.spent_on)
        .limit(1)
        .maybeSingle()
      const by = t(members.find((m) => m.user_id === twin?.created_by)?.display_name ?? '')
      const twinText = by
        ? t('כבר יש הוצאה "{title}" באותו סכום וביום, נרשמה על ידי {by}.', { title: twin?.title ?? '', by })
        : t('כבר יש הוצאה "{title}" באותו סכום וביום.', { title: twin?.title ?? '' })
      if (twin && !(await ask({ title: t('לרשום שוב?'), description: twinText, confirmLabel: t('לרשום שוב') }))) {
        setBusy(false)
        return
      }
    }
    const ok = await mutate(
      x.id
        ? supabase.from('expenses').update(row).eq('id', x.id)
        : supabase.from('expenses').insert({ ...row, created_by: userId }),
    )
    setBusy(false)
    if (ok) props.onClose()
  }

  const remove = async () => {
    if (!x.id || !(await ask({ title: t('למחוק את "{title}"?', { title: x.title ?? '' }), confirmLabel: t('מחיקה'), danger: true }))) return
    if (await mutate(supabase.from('expenses').delete().eq('id', x.id))) props.onClose()
  }

  return (
    <Sheet title={x.id ? t('עריכת הוצאה') : t('הוצאה חדשה')} onClose={props.onClose} closeLabel={t('ביטול')}>
      <div className="expf">
        <input className="expf-title" aria-label={t('על מה')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('על מה? למשל: ראמן בשינג׳וקו')} enterKeyHint="next" />

        <ToggleGroup className="expf-cats" aria-label={t('קטגוריה')} deselectable={false} value={[category]} onValueChange={(v) => v[0] && setPicked(v[0])}>
          {Object.entries(CATS).map(([k, v]) => (
            <Toggle key={k} value={k} aria-label={v.label} className="expf-cat">
              <Icon as={v.icon} size={18} />
            </Toggle>
          ))}
        </ToggleGroup>
        <p className="muted exp-fn expf-catname">
          {CATS[category]?.label ?? CATS.other.label}
          {!picked && guessed && ` · ${t('נבחר לפי מה שכתבתם')}`}
        </p>

        <div className="expf-amount">
          <input
            className="expf-num"
            aria-label={t('סכום')}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus={!x.id}
          />
          <SegmentedControl className="exp-seg" aria-label={t('מטבע')} value={currency} onValueChange={(v) => v && setCurrency(v as Cur)}>
            <SegmentedControlIndicator className="exp-seg-ind" />
            {(['JPY', 'ILS'] as const).map((c) => (
              <SegmentedControlItem key={c} value={c} className="exp-seg-item">
                {SYMBOL[c]}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        {approx && (
          <p className="muted exp-fn expf-approx">
            <bdi dir="ltr">≈ {approx}</bdi>
          </p>
        )}

        <div className="exp-label" id="expf-paid">
          {t('מי שילם')}
        </div>
        <RadioGroup className="expf-cards" aria-labelledby="expf-paid" value={paidBy} onValueChange={(v) => setPaidBy(String(v))}>
          {cards.map((c) => (
            <div key={c.key} className="expf-card">
              <div className="expf-people">
                {c.ids.map((id) => (
                  <Radio
                    key={id}
                    value={id}
                    render={(p) => (
                      <button {...p} type="button" className="expf-person">
                        <span className="expf-ava">
                          <Avatar name={nameOf(id)} size="l" look={lookOf(id)} decorative />
                          {paidBy === id && (
                            <span className="expf-badge" aria-hidden="true">
                              <Icon as={Check} />
                            </span>
                          )}
                        </span>
                        <span className="expf-name">{id === userId ? `${nameOf(id)} ${t('(אני)')}` : nameOf(id)}</span>
                      </button>
                    )}
                  />
                ))}
              </div>
              {c.label && <span className="muted exp-fn expf-couple">{c.label}</span>}
            </div>
          ))}
        </RadioGroup>

        <div className="expf-splithead">
          <span className="exp-label" id="expf-split">
            {t('מחלקים בין')}
          </span>
          <span className="expf-quick">
            <button type="button" className="link exp-link" aria-pressed={same(split, all)} onClick={() => setSplit(all)}>
              {t('כולם')}
            </button>
            <button type="button" className="link exp-link" aria-pressed={same(split, [userId])} onClick={() => setSplit([userId])}>
              {t('רק אני')}
            </button>
          </span>
        </div>
        <div className="expf-cards" role="group" aria-labelledby="expf-split">
          {cards.map((c) => (
            <div key={c.key} className="expf-card">
              <CheckboxGroup
                className="expf-checks"
                aria-label={c.label || t('מחלקים בין')}
                value={split.filter((id) => c.ids.includes(id))}
                allValues={c.ids}
                onValueChange={(next) => setCard(c.ids, next as string[])}
              >
                <div className="expf-people">
                  {c.ids.map((id) => (
                    <label key={id} className="expf-person" data-on={split.includes(id) ? '' : undefined}>
                      <span className="expf-ava">
                        <Avatar name={nameOf(id)} size="l" look={lookOf(id)} decorative />
                        <Checkbox value={id} className="expf-check" aria-label={nameOf(id)}>
                          <CheckboxIndicator>
                            <Icon as={Check} />
                          </CheckboxIndicator>
                        </Checkbox>
                      </span>
                      <span className="expf-name">{nameOf(id)}</span>
                    </label>
                  ))}
                </div>
                {c.label && (
                  <label className="expf-couple expf-parent">
                    <Checkbox parent className="expf-check" aria-label={c.label}>
                      <CheckboxIndicator>{(s) => <Icon as={s.indeterminate ? Minus : Check} />}</CheckboxIndicator>
                    </Checkbox>
                    <span className="muted exp-fn">{c.label}</span>
                  </label>
                )}
              </CheckboxGroup>
            </div>
          ))}
        </div>

        <label className="expf-date">
          <span>{t('תאריך')}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {x.id && (
          <button className="danger" onClick={remove}>
            {t('מחיקה')}
          </button>
        )}
      </div>
      <div className="exp-dock">
        {err && (
          <p className="msg" role="alert">
            {err}
          </p>
        )}
        <button className="primary" onClick={save} disabled={busy}>
          {busy ? t('שומר…') : t('שמירה')}
        </button>
      </div>
    </Sheet>
  )
}

/** Confirms a repayment (amount editable) and records it as a settlement; with `row`, edits one already recorded. */
function SettleSheet(props: {
  trip: Trip
  userId: string
  nameOf: (id: string) => string
  t: Transfer
  row?: Expense
  cur: Cur
  rows: Expense[]
  side: (id: string) => string
  onClose: () => void
}) {
  const { t: tr, row, cur } = props
  const [amount, setAmount] = useState(String(tr.amount / (cur === 'JPY' ? 1 : 100)))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const typed = parseAmount(amount)
    const n = roundFor(typed, cur)
    if (amount.trim() && Number.isNaN(typed)) return setErr(t('זה לא נראה כמו סכום'))
    if (!(n > 0)) return setErr(t('צריך סכום גדול מאפס'))
    // the payer's "החזרתי" and the receiver's "קיבלתי" are two taps on one repayment: ask before the second is added
    if (!row) {
      const day = japanToday()
      const twin = findSettleTwin(props.rows, { from: tr.from, to: tr.to, currency: cur, day, now: Date.now() }, props.side)
      if (twin) {
        const by = props.nameOf(twin.created_by ?? twin.paid_by)
        const text = t('כבר נרשם היום החזר באותו כיוון, על ידי {by}, על {amount}. אם הכסף הועבר פעם אחת, אין צורך לרשום עוד פעם.', {
          by: iso(by),
          amount: `⁦${fmtAmount(Number(twin.amount), twin.currency)}⁩`,
        })
        if (!(await ask({ title: t('לרשום החזר נוסף?'), description: text, confirmLabel: t('לרשום שוב') }))) return
      }
    }
    setBusy(true)
    const fields = { amount: n }
    const ok = await mutate(
      row
        ? supabase.from('expenses').update(fields).eq('id', row.id)
        : supabase.from('expenses').insert({
            ...fields,
            trip_id: props.trip.id,
            kind: 'settlement',
            title: 'החזר', // he-only
            currency: cur,
            paid_by: tr.from,
            split_among: [tr.to],
            spent_on: japanToday(),
            created_by: props.userId,
          }),
    )
    setBusy(false)
    if (ok) props.onClose()
  }

  const remove = async () => {
    if (!row || !(await ask({ title: t('למחוק את ההחזר?'), confirmLabel: t('מחיקה'), danger: true }))) return
    if (await mutate(supabase.from('expenses').delete().eq('id', row.id))) props.onClose()
  }

  return (
    <Sheet title={row ? t('עריכת החזר') : t('רישום החזר')} onClose={props.onClose}>
      <p className="exp-settle-who">
        <b>
          <FromTo from={props.nameOf(tr.from)} to={props.nameOf(tr.to)} />
        </b>
      </p>
      <Field label={t('כמה הוחזר ({cur})', { cur: SYMBOL[cur] })}>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
      </Field>
      {err && <p className="msg" role="alert">{err}</p>}
      <button className="primary" onClick={save} disabled={busy}>
        {busy ? t('שומר…') : row ? t('שמירה') : t('רישום ההחזר')}
      </button>
      {row && (
        <button className="danger" onClick={remove}>
          {t('מחיקה')}
        </button>
      )}
    </Sheet>
  )
}

/** Edits the trip's shekel-per-yen rate; people think in shekels per ¥100. */
function RateSheet(props: { tripId: string; rate: number; hasSettlements: boolean; onSaved: (r: number) => void; onClose: () => void }) {
  const [v, setV] = useState(String(Number((props.rate * 100).toFixed(3))))
  const [err, setErr] = useState('')

  const save = async () => {
    const n = parseAmount(v)
    // 100 yen has been worth between one and five shekels for decades; anything far outside is a typo
    if (!(n >= 0.5 && n <= 20)) return setErr(t('השער לא נראה הגיוני. 100 ין זה בערך 2.5 שקלים'))
    const rate = Math.round((n / 100) * 1e6) / 1e6
    // a new rate is applied to every past amount, repaid debts included: a changed rate must be a choice
    if (props.hasSettlements && rate !== props.rate && !(await ask({ title: t('לשנות את השער?'), description: t('שינוי השער משנה גם חובות שכבר הוחזרו. היתרות בין כולם יחושבו מחדש לפי השער החדש.'), confirmLabel: t('לשנות את השער') }))) return
    if (await mutate(supabase.from('trips').update({ ils_per_jpy: rate }).eq('id', props.tripId))) {
      props.onSaved(rate)
      props.onClose()
    }
  }

  return (
    <Sheet title={t('שער החליפין')} onClose={props.onClose}>
      <p className="muted small">{t('כמה שקלים שווים 100 ין. אותו שער לכולם, וכל ההמרות במסך לפיו.')}</p>
      {props.hasSettlements && (
        <p className="msg" role="note">
          {t('שינוי השער משנה גם חובות שכבר הוחזרו. היתרות בין כולם יחושבו מחדש לפי השער החדש.')}
        </p>
      )}
      <Field label={t('שקלים ל־100 ין')}>
        <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} dir="ltr" />
      </Field>
      {err && <p className="msg" role="alert">{err}</p>}
      <button className="primary" onClick={save}>
        {t('שמירה')}
      </button>
    </Sheet>
  )
}
