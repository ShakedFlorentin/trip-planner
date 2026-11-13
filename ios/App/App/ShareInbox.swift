import UIKit
import Capacitor

extension Notification.Name {
    /// The share extension opened the app (toogo://add): a link is waiting.
    static let toogoShared = Notification.Name("toogoShared")
}

/// Hands the link the share extension left in the shared App Group to the page. JS: `ShareInbox.take()` returns
/// `{ url }` once and clears it; the `shared` event says one is waiting (the app was opened or came to the front).
@objc(ShareInboxPlugin)
public class ShareInboxPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShareInboxPlugin"
    public let jsName = "ShareInbox"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "take", returnType: CAPPluginReturnPromise)]

    static let group = "group.com.shakedflorentin.tripplanner"
    static let key = "sharedURL"
    private var store: UserDefaults? { UserDefaults(suiteName: Self.group) }

    override public func load() {
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(check), name: UIApplication.didBecomeActiveNotification, object: nil)
        center.addObserver(self, selector: #selector(check), name: .toogoShared, object: nil)
    }

    @objc private func check() {
        if store?.string(forKey: Self.key) != nil { notifyListeners("shared", data: [:]) }
    }

    @objc func take(_ call: CAPPluginCall) {
        guard let url = store?.string(forKey: Self.key) else { return call.resolve([:]) }
        store?.removeObject(forKey: Self.key)
        call.resolve(["url": url])
    }
}

/// The app's web view, with Toogo's own plugins (share inbox, rating prompt) added to the ones Capacitor finds by itself.
class ToogoBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ShareInboxPlugin())
        bridge?.registerPluginInstance(AppReviewPlugin())
    }
}
