import UIKit
import UniformTypeIdentifiers

/// Toogo in the iPhone Share menu. It takes the shared link (an Instagram or TikTok post, a Google Maps place, any
/// page), leaves it where the app finds it (UserDefaults of the shared App Group, key `sharedURL`) and opens Toogo,
/// which shows the add-place sheet with the link filled in. Nothing is looked up here: the person still taps to add.
final class ShareViewController: UIViewController {
    static let group = "group.com.shakedflorentin.tripplanner"
    static let key = "sharedURL"

    private let label = UILabel()
    private var hebrew: Bool { Locale.preferredLanguages.first?.hasPrefix("he") ?? false }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .preferredFont(forTextStyle: .headline)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.text = hebrew ? "פותחים את Toogo…" : "Opening Toogo…"
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        Task { await handle() }
    }

    private func handle() async {
        guard let link = await sharedLink() else {
            await finish(after: 1.6, saying: hebrew ? "לא נמצא קישור לשתף" : "No link to share")
            return
        }
        UserDefaults(suiteName: Self.group)?.set(link.absoluteString, forKey: Self.key)
        if openApp(URL(string: "toogo://add")!) {
            await finish(after: 0.3, saying: nil)
        } else {
            // the link is saved either way: the app picks it up the next time it opens
            await finish(after: 1.8, saying: hebrew ? "נשמר. פתחו את Toogo כדי להוסיף את המקום" : "Saved. Open Toogo to add the place")
        }
    }

    @MainActor
    private func finish(after seconds: Double, saying text: String?) async {
        if let text { label.text = text }
        try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
        extensionContext?.completeRequest(returningItems: nil)
    }

    /// The first web link shared: a URL item, or the first http(s) address in shared text (Instagram sends both).
    private func sharedLink() async -> URL? {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        for p in providers where p.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            if let item = try? await p.loadItem(forTypeIdentifier: UTType.url.identifier) {
                if let url = item as? URL, Self.isWeb(url) { return url }
                if let s = item as? String, let url = Self.firstLink(in: s) { return url }
                if let d = item as? Data, let s = String(data: d, encoding: .utf8), let url = Self.firstLink(in: s) { return url }
            }
        }
        for p in providers where p.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            if let s = try? await p.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String, let url = Self.firstLink(in: s) {
                return url
            }
        }
        return nil
    }

    private static func isWeb(_ url: URL) -> Bool { ["http", "https"].contains(url.scheme?.lowercased() ?? "") }

    private static func firstLink(in text: String) -> URL? {
        let found = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
            .matches(in: text, range: NSRange(text.startIndex..., in: text))
        return found?.compactMap(\.url).first(where: isWeb)
    }

    /// Opens the app. An extension has no UIApplication.shared, so the app object is found up the responder chain and
    /// asked to open the link (the way share extensions open their app). False when there is none to ask.
    private func openApp(_ url: URL) -> Bool {
        var responder: UIResponder? = self
        let selector = sel_registerName("openURL:options:completionHandler:")
        while let r = responder {
            if let app = r as? UIApplication, app.responds(to: selector) {
                typealias Open = @convention(c) (AnyObject, Selector, URL, NSDictionary, AnyObject?) -> Void
                unsafeBitCast(app.method(for: selector), to: Open.self)(app, selector, url, NSDictionary(), nil)
                return true
            }
            responder = r.next
        }
        return false
    }
}
