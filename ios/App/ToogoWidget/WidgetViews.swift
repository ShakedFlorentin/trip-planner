import SwiftUI
import WidgetKit

// The widgets' drawing. Colours are the app's tokens (src/styles.css :root): system font, calm, the accent used for one
// thing at a time. Lock-screen families use the system's own styles so they tint correctly. No background here:
// the widget adds it with containerBackground (and the screenshot harness draws its own).

private func hex(_ v: UInt32) -> Color {
    Color(red: Double((v >> 16) & 255) / 255, green: Double((v >> 8) & 255) / 255, blue: Double(v & 255) / 255)
}

struct Theme {
    let dark: Bool
    init(_ scheme: ColorScheme) { dark = scheme == .dark }
    var bg: Color { dark ? hex(0x1c1c1e) : .white }
    var fill: Color { dark ? hex(0x2c2c2e) : hex(0xf2f2f7) }
    var text: Color { dark ? .white : .black }
    var muted: Color { dark ? hex(0xa1a1a8) : hex(0x636366) }
    var accent: Color { dark ? hex(0xff4f6d) : hex(0xbc002d) }
}

enum Links {
    static let plan = URL(string: "toogo://plan")!
    static let expense = URL(string: "toogo://add-expense")!
    static let translate = URL(string: "toogo://translate")!
}

struct TodayContent: View {
    let state: TodayState
    let words: Words
    let family: WidgetFamily
    let now: Date
    @Environment(\.colorScheme) private var scheme
    private var th: Theme { Theme(scheme) }

    var body: some View {
        Group {
            switch family {
            case .systemMedium: medium
            case .accessoryRectangular: rectangular
            case .accessoryCircular: circular
            default: small
            }
        }
        .environment(\.layoutDirection, words.layoutRTL ? .rightToLeft : .leftToRight)
        .environment(\.locale, Locale(identifier: words.he ? "he" : "en"))
    }

    // MARK: pieces

    private func message(_ symbol: String, _ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol).font(.title3).foregroundStyle(th.muted)
            Spacer(minLength: 0)
            Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(th.text)
            Text(body).font(.footnote).foregroundStyle(th.muted).lineLimit(3)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    /// "in 25 min": whole minutes in steps of 5, only when the stop is within the hour. The timeline has an entry every
    /// 5 minutes before a stop (Widgets.entryDates), so the number is right when it is drawn.
    private func inMinutes(_ at: Date?) -> Text? {
        guard let at, let n = Widgets.minutesAway(at, now: now) else { return nil }
        return Text(n == 0 ? words.nowWord : "\(words.inWord) \(n) \(words.minWord)")
    }

    private func nextBlock(_ stop: Stop, at: Date?, titleLines: Int) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(words.next).font(.caption).foregroundStyle(th.muted)
            if let time = stop.time {
                Text(time).font(.title2.weight(.semibold)).foregroundStyle(th.accent).monospacedDigit()
            }
            Text(stop.title).font(.subheadline.weight(.semibold)).foregroundStyle(th.text).lineLimit(titleLines)
            if let soon = inMinutes(at) { soon.font(.caption).foregroundStyle(th.muted) }
        }
    }

    private func pill(_ symbol: String, _ label: String, _ url: URL) -> some View {
        Link(destination: url) {
            HStack(spacing: 6) {
                Image(systemName: symbol).font(.footnote.weight(.semibold)).foregroundStyle(th.accent)
                Text(label).font(.footnote.weight(.medium)).foregroundStyle(th.text).lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: 38)
            .background(th.fill, in: Capsule())
        }
    }

    private func headline(_ city: String?, _ dayNo: Int) -> Text {
        Text([city, words.dayNumber(dayNo)].compactMap { $0 }.joined(separator: " · "))
    }

    // MARK: small

    @ViewBuilder private var small: some View {
        switch state {
        case .noData: message("suitcase", words.noDataTitle, words.noDataBody)
        case .noDates: message("calendar", words.noDatesTitle, words.noDatesBody)
        case .finished: message("checkmark.circle", words.finishedTitle, words.finishedBody)
        case let .before(trip, daysLeft, city):
            VStack(alignment: .leading, spacing: 0) {
                Text(trip).font(.caption).foregroundStyle(th.muted).lineLimit(1)
                Spacer(minLength: 0)
                Text("\(daysLeft)").font(.system(size: 54, weight: .semibold)).foregroundStyle(th.accent).monospacedDigit()
                Text(words.daysToFlight(daysLeft)).font(.footnote).foregroundStyle(th.muted)
                if let city { Text(city).font(.subheadline.weight(.semibold)).foregroundStyle(th.text).lineLimit(1).padding(.top, 4) }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        case let .during(_, city, dayNo, next, nextAt, _, _, known):
            VStack(alignment: .leading, spacing: 0) {
                headline(city, dayNo).font(.caption).foregroundStyle(th.muted).lineLimit(1)
                Spacer(minLength: 0)
                if let next {
                    nextBlock(next, at: nextAt, titleLines: 2)
                } else if known {
                    Image(systemName: "checkmark.circle").font(.title3).foregroundStyle(th.muted)
                    Text(words.nothingLeft).font(.subheadline.weight(.semibold)).foregroundStyle(th.text).padding(.top, 4)
                } else {
                    Text(words.openForPlan).font(.subheadline.weight(.semibold)).foregroundStyle(th.text)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
    }

    // MARK: medium

    @ViewBuilder private var medium: some View {
        switch state {
        case .noData: message("suitcase", words.noDataTitle, words.noDataBody)
        case .noDates: message("calendar", words.noDatesTitle, words.noDatesBody)
        case .finished: message("checkmark.circle", words.finishedTitle, words.finishedBody)
        case let .before(trip, daysLeft, city):
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 0) {
                    Text("\(daysLeft)").font(.system(size: 64, weight: .semibold)).foregroundStyle(th.accent).monospacedDigit()
                    Text(words.daysToFlight(daysLeft)).font(.subheadline).foregroundStyle(th.muted)
                }
                Spacer(minLength: 8)
                VStack(alignment: .trailing, spacing: 2) {
                    if let city { Text(city).font(.headline).foregroundStyle(th.text).lineLimit(1) }
                    Text(trip).font(.footnote).foregroundStyle(th.muted).lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        case let .during(_, city, dayNo, next, nextAt, after, _, known):
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 0) {
                    headline(city, dayNo).font(.caption).foregroundStyle(th.muted).lineLimit(1)
                    Spacer(minLength: 4)
                    if let next {
                        nextBlock(next, at: nextAt, titleLines: 1)
                        if let after {
                            Text([words.after, after.time].compactMap { $0 }.joined(separator: " ") + " · " + after.title)
                                .font(.footnote).foregroundStyle(th.muted).lineLimit(1).padding(.top, 6)
                        }
                    } else {
                        Text(known ? words.nothingLeft : words.openForPlan).font(.subheadline.weight(.semibold)).foregroundStyle(th.text)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                VStack(spacing: 8) {
                    pill("plus", words.expense, Links.expense)
                    pill("character.bubble", words.translate, Links.translate)
                }
                .frame(width: 118)
                .frame(maxHeight: .infinity, alignment: .center)
            }
        }
    }

    // MARK: lock screen

    @ViewBuilder private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            switch state {
            case .noData:
                Text(words.noDataTitle).font(.headline)
                Text(words.noDataBody).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            case .noDates:
                Text(words.noDatesTitle).font(.headline)
                Text(words.noDatesBody).font(.caption).foregroundStyle(.secondary)
            case .finished:
                Text(words.finishedTitle).font(.headline)
                Text(words.finishedBody).font(.caption).foregroundStyle(.secondary)
            case let .before(trip, daysLeft, _):
                Text("\(daysLeft) " + words.daysToFlight(daysLeft)).font(.headline).widgetAccentable().lineLimit(1)
                Text(trip).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            case let .during(_, city, dayNo, next, nextAt, _, _, known):
                if let next {
                    Text([words.next, next.time].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
                    Text(next.title).font(.headline).widgetAccentable().lineLimit(1)
                    if let soon = inMinutes(nextAt) { soon.font(.caption).foregroundStyle(.secondary) }
                    else if let city { Text(city).font(.caption).foregroundStyle(.secondary).lineLimit(1) }
                } else {
                    Text(known ? words.nothingLeft : words.openForPlan).font(.headline).lineLimit(2)
                    headline(city, dayNo).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder private var circular: some View {
        VStack(spacing: 0) {
            switch state {
            case let .before(_, daysLeft, _):
                Text("\(daysLeft)").font(.title2.weight(.semibold)).monospacedDigit().widgetAccentable()
                Text(words.daysShort).font(.system(size: 10))
            case let .during(_, _, _, _, _, _, left, known) where known:
                Text("\(left)").font(.title2.weight(.semibold)).monospacedDigit().widgetAccentable()
                Text(words.stopsLeft(left)).font(.system(size: 10))
            case .finished:
                Image(systemName: "checkmark").font(.title3.weight(.semibold))
            default:
                Image(systemName: "airplane").font(.title3)
            }
        }
        .environment(\.layoutDirection, words.layoutRTL ? .rightToLeft : .leftToRight)
    }
}

struct TranslateContent: View {
    let words: Words
    var body: some View {
        VStack(spacing: 1) {
            Image(systemName: "character.bubble").font(.title3.weight(.semibold)).widgetAccentable()
            Text(words.translate).font(.system(size: 10, weight: .medium)).lineLimit(1).minimumScaleFactor(0.7)
        }
        .padding(.horizontal, 4)
        .environment(\.layoutDirection, words.layoutRTL ? .rightToLeft : .leftToRight)
    }
}
