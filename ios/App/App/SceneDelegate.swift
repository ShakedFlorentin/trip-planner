import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ToogoBridgeViewController()
        window?.makeKeyAndVisible()

        // launched by a quick action or a toogo:// link: the page takes it once it is up (QuickAction.take)
        if let shortcut = connectionOptions.shortcutItem { QuickActionStore.handle(shortcut: shortcut) }
        for context in connectionOptions.urlContexts { QuickActionStore.handle(url: context.url) }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    /// A home-screen quick action chosen while the app was already running.
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(QuickActionStore.handle(shortcut: shortcutItem))
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts { QuickActionStore.handle(url: context.url) }
        // toogo://add: the share extension left a link for the add-place sheet
        if URLContexts.contains(where: { $0.url.scheme == "toogo" }) {
            NotificationCenter.default.post(name: .toogoShared, object: nil)
        }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
