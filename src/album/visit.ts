/** A card's "time needed" text ("1-2 hours", "30-45 דקות", "כשעה") as minutes, the longer end of a range; null when it says nothing usable. */
export function visitMinutes(text: string | null | undefined): number | null {
  const s = (text ?? '').toLowerCase()
  if (!s.trim()) return null
  const num = '(\\d+(?:\\.\\d+)?)'
  const range = (unit: string) => new RegExp(`${num}\\s*[-–]\\s*${num}\\s*(?:${unit})`).exec(s)
  const one = (unit: string) => new RegExp(`${num}\\s*(?:${unit})`).exec(s)
  const hours = 'hours?|hrs?|שעות|שעה' // he-only
  const mins = 'minutes?|mins?|דקות|דק' // he-only
  const rh = range(hours)
  if (rh) return Math.round(Number(rh[2]) * 60)
  const rm = range(mins)
  if (rm) return Math.round(Number(rm[2]))
  const oh = one(hours)
  if (oh) return Math.round(Number(oh[1]) * 60)
  const om = one(mins)
  if (om) return Math.round(Number(om[1]))
  if (/שעתיים|two hours/.test(s)) return 120 // he-only
  if (/חצי שעה|half an? hour/.test(s)) return 30 // he-only
  if (/שעה|an hour|one hour/.test(s)) return 60 // he-only
  return null
}
