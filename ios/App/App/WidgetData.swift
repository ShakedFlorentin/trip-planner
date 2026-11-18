import UIKit
import WidgetKit
import Capacitor

/// Hands the page's small trip snapshot to the home-screen and lock-screen widgets through the shared App Group.
/// JS: `WidgetData.set({ json })` writes it and asks WidgetKit to redraw; `WidgetData.clear()` removes it (sign-out,
/// leaving the trip). The page sends nothing the widgets do not draw. Widgets exist from iOS 17; on older phones the
/// data is still written and nothing reads it.
@objc(WidgetDataPlugin)
public class WidgetDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetDataPlugin"
    public let jsName = "WidgetData"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    static let group = "group.com.shakedflorentin.tripplanner"
    static let key = "widgetSnapshot"
    /// A snapshot is a few hundred bytes to a few kB; anything bigger is a bug, not a trip.
    static let maxBytes = 32_000
    private var store: UserDefaults? { UserDefaults(suiteName: Self.group) }

    @objc func set(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), json.utf8.count <= Self.maxBytes else {
            return call.reject("json missing or too large")
        }
        store?.set(json, forKey: Self.key)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        store?.removeObject(forKey: Self.key)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
