import SwiftUI
import WidgetKit

struct TranslateEntry: TimelineEntry {
    let date: Date
    let lang: String?
}

struct TranslateProvider: TimelineProvider {
    func placeholder(in context: Context) -> TranslateEntry { TranslateEntry(date: Date(), lang: nil) }
    func getSnapshot(in context: Context, completion: @escaping (TranslateEntry) -> Void) {
        completion(TranslateEntry(date: Date(), lang: Snapshot.load()?.lang))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<TranslateEntry>) -> Void) {
        // static: the app reloads it when the language changes
        completion(Timeline(entries: [TranslateEntry(date: Date(), lang: Snapshot.load()?.lang)], policy: .never))
    }
}

/// A lock-screen button for the shop counter: one tap opens the voice translator.
struct TranslateWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ToogoTranslate", provider: TranslateProvider()) { entry in
            ZStack {
                AccessoryWidgetBackground()
                TranslateContent(words: Words(lang: entry.lang))
            }
            .widgetURL(Links.translate)
            .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName(LocalizedStringKey("widget.translate.name"))
        .description(LocalizedStringKey("widget.translate.description"))
        .supportedFamilies([.accessoryCircular])
    }
}
