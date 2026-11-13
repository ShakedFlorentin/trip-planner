import UIKit
import StoreKit
import Capacitor

/// Apple's own rating prompt, nothing before it. JS: `AppReview.request()`. Apple decides whether it shows (at most
/// three times a year per person); the page decides when to ask (src/rating.ts: after a match or an updated plan).
@objc(AppReviewPlugin)
public class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReview"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)]

    @objc func request(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let scene = UIApplication.shared.connectedScenes
                .first { $0.activationState == .foregroundActive } as? UIWindowScene
            if let scene { SKStoreReviewController.requestReview(in: scene) }
            call.resolve(["asked": scene != nil])
        }
    }
}
