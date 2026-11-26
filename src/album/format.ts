import { locale } from '../i18n'

/** A moment as 24-hour clock time in the given zone ("13:40"). */
export function clock(ms: number, tz: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms))
}

/** "Saturday · 15/12" / "שבת · 15.12" for a YYYY-MM-DD date. */
export function dayLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.toLocaleDateString(locale, { weekday: 'long' })} · ${d.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })}`
}

/** "12–28 December" / "12–28 בדצמבר" for two YYYY-MM-DD dates. */
export function rangeLabel(a: string, b: string) {
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }) as Intl.DateTimeFormat & { formatRange(a: Date, b: Date): string }
  return fmt.formatRange(new Date(a + 'T12:00:00'), new Date(b + 'T12:00:00'))
}
