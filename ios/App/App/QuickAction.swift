import UIKit
import AppIntents
import Capacitor

extension Notification.Name {
    /// A quick action, a toogo:// link, a widget tap or an App Intent asked the page to open something.
    static let toogoAction = Notification.Name("toogoAction")
}

/// What the home-screen quick actions, the toogo:// links (widgets), and the App Intents ask the page to open.
/// "add-expense": the new-expense form. "translate": the Translate tool. "plan": the Plan tab at today.
enum QuickActionStore {
    static let known: Set<String> = ["add-expense", "translate", "plan"]
    /// Waits here until the page takes it: the page may not be loaded yet when the app is launched by the action.
    static var pending: String?

    static func post(_ action: String) {
        guard known.contains(action) else { return }
        pending = action
        NotificationCenter.default.post(name: .toogoAction, object: nil)
    }

    /// toogo://add-expense, toogo://translate, toogo://plan (toogo://add belongs to the share extension).
    @discardableResult
    static func handle(url: URL) -> Bool {
        guard url.scheme == "toogo", let host = url.host, known.contains(host) else { return false }
        post(host)
        return true
    }

    /// Shortcut item types end in the action: com.shakedflorentin.tripplanner.add-expense
    @discardableResult
    static func handle(shortcut: UIApplicationShortcutItem) -> Bool {
        guard let action = shortcut.type.split(separator: ".").last.map(String.init), known.contains(action) else { return false }
        post(action)
        return true
    }
}

/// Hands the page the action waiting for it. JS: `QuickAction.take()` returns `{ action }` once and clears it; the
/// `action` event says one is waiting (the app was opened or came to the front with it).
@objc(QuickActionPlugin)
public class QuickActionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "QuickActionPlugin"
    public let jsName = "QuickAction"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "take", returnType: CAPPluginReturnPromise)]

    override public func load() {
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(check), name: UIApplication.didBecomeActiveNotification, object: nil)
        center.addObserver(self, selector: #selector(check), name: .toogoAction, object: nil)
    }

    @objc private func check() {
        if QuickActionStore.pending != nil { notifyListeners("action", data: [:]) }
    }

    @objc func take(_ call: CAPPluginCall) {
        guard let action = QuickActionStore.pending else { return call.resolve([:]) }
        QuickActionStore.pending = nil
        call.resolve(["action": action])
    }
}

// Siri and Shortcuts (iOS 16+; the app itself still runs on iOS 15). Both open the app; the page does the rest.
@available(iOS 16.0, *)
struct AddExpenseIntent: AppIntent {
    static let title: LocalizedStringResource = "Add expense"
    static let description = IntentDescription("Open Toogo on the new-expense form.")
    static let openAppWhenRun = true

    @MainActor func perform() async throws -> some IntentResult {
        QuickActionStore.post("add-expense")
        return .result()
    }
}

@available(iOS 16.0, *)
struct TranslateIntent: AppIntent {
    static let title: LocalizedStringResource = "Translate"
    static let description = IntentDescription("Open Toogo's Hebrew and Japanese voice translator.")
    static let openAppWhenRun = true

    @MainActor func perform() async throws -> some IntentResult {
        QuickActionStore.post("translate")
        return .result()
    }
}

@available(iOS 16.0, *)
struct ToogoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddExpenseIntent(),
            phrases: ["Add an expense in \(.applicationName)", "Add expense to \(.applicationName)"],
            shortTitle: "Add expense",
            systemImageName: "plus.circle")
        AppShortcut(
            intent: TranslateIntent(),
            phrases: ["Translate with \(.applicationName)", "Open translator in \(.applicationName)"],
            shortTitle: "Translate",
            systemImageName: "character.bubble")
    }
}
