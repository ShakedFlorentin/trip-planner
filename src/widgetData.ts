import { Capacitor, registerPlugin } from '@capacitor/core'
import type { WidgetSnapshot } from './widgetSnapshot'

/** Home-screen and lock-screen widgets exist in the iOS app only; the web build never touches any of this. */
export const widgetsOn = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

/** The app's own plugin (ios/App/App/WidgetData.swift): writes to the shared App Group and redraws the widgets. */
const WidgetData = registerPlugin<{ set(o: { json: string }): Promise<void>; clear(): Promise<void> }>('WidgetData')

let last = ''

/** Gives the widgets this snapshot; the same one twice in a row is not sent again. Never throws. */
export async function pushWidgetData(snap: WidgetSnapshot) {
  if (!widgetsOn) return
  const json = JSON.stringify(snap)
  if (json === last) return
  last = json
  try {
    await WidgetData.set({ json })
  } catch {
    // an app build from before the widgets has no such plugin
    last = ''
  }
}

/** Takes the trip off the widgets (signed out, left the trip). */
export async function clearWidgetData() {
  if (!widgetsOn) return
  last = ''
  try {
    await WidgetData.clear()
  } catch {
    // same: nothing to clear
  }
}
