/**
 * Whether a place shows for the chosen "whose" chip (same chips as who.tsx: all, mine, a couple's name, group).
 * `who` is empty (together), one couple, or "A + B" when both couples liked it. The "ביחד" chip (group) shows the
 * together ones and the ones both couples liked; any other chip shows a place when one of its couples matches.
 */
export function placeWhoOk(who: string | null | undefined, mode: string, mine: string | null) {
  const names = (who ?? '').split(' + ').map((w) => w.trim()).filter(Boolean)
  if (!names.length || mode === 'all') return true
  if (mode === 'group') return names.length > 1
  return names.some((w) => (mode === 'mine' ? !!mine && w === mine : w === mode))
}
