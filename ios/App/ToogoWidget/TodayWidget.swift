import SwiftUI
import WidgetKit

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry { TodayEntry(date: Date(), snapshot: Self.sample(now: Date())) }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        let now = Date()
        // the gallery preview shows a made-up trip; a real widget shows the real one
        completion(TodayEntry(date: now, snapshot: context.isPreview ? Self.sample(now: now) : Snapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let now = Date()
        let snap = Snapshot.load()
        let entries = Widgets.entryDates(snap, now: now).map { TodayEntry(date: $0, snapshot: snap) }
        // the app writes a new snapshot (and reloads this) whenever the plan changes; without one, look again later
        completion(Timeline(entries: entries, policy: snap == nil ? .after(now.addingTimeInterval(6 * 3600)) : .atEnd))
    }

    /// Gallery sample: a Tokyo day in the future-looking part of today. Not the owner's trip.
    static func sample(now: Date) -> Snapshot {
        let today = Tokyo.ymd(now)
        let hm = { (m: Int) in Tokyo.hm(now.addingTimeInterval(Double(m) * 60)) }
        return Snapshot(v: 1, lang: Words(lang: nil).he ? "he" : "en", trip: "Japan", start: today, numDays: 10, days: [
            DaySnap(date: today, city: "Tokyo", stops: [
                Stop(time: hm(30), title: "Senso-ji", done: false),
                Stop(time: hm(120), title: "Ramen lunch", done: false),
            ]),
        ])
    }
}

struct TodayEntryView: View {
    let entry: TodayEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let words = Words(lang: entry.snapshot?.lang)
        TodayContent(state: Widgets.state(entry.snapshot, now: entry.date), words: words, family: family, now: entry.date)
            .widgetURL(Links.plan)
            .containerBackground(for: .widget) { Theme(scheme).bg }
    }
}

struct TodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ToogoToday", provider: TodayProvider()) { entry in
            TodayEntryView(entry: entry)
        }
        .configurationDisplayName(LocalizedStringKey("widget.today.name"))
        .description(LocalizedStringKey("widget.today.description"))
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}
