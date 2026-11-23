import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { reducedMotion } from './spring'

// Does nothing on the web, with reduced motion on, or if the phone refuses; never throws, never waits.
const run = (go: () => Promise<void>) => {
  try {
    if (!Capacitor.isNativePlatform() || reducedMotion()) return
    go().catch(() => {})
  } catch {
    // no feel is better than an error
  }
}

/** A light tap: a swipe crossing its threshold, or leaving by a button. */
export const hapticLight = () => run(() => Haptics.impact({ style: ImpactStyle.Light }))
/** The soft tick of a choice changing: tab bar, segmented controls, chips. */
export const hapticSelect = () => run(() => Haptics.selectionChanged())
/** A match. */
export const hapticSuccess = () => run(() => Haptics.notification({ type: NotificationType.Success }))
