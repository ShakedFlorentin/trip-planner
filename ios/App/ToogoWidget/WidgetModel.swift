import Foundation

// What the app's page leaves in the shared App Group (src/widgetData.ts), and what each widget makes of it.
// Pure Foundation: the same file is compiled by the snapshot harness used for the screenshots.

enum Shared {
    static let group = "group.com.shakedflorentin.tripplanner"
    static let key = "widgetSnapshot"
    static let tokyo = TimeZone(identifier: "Asia/Tokyo")!
}

struct Stop: Codable, Equatable {
    var time: String?
    var title: String
    var done: Bool
}

struct DaySnap: Codable, Equatable {
    var date: String
    var city: String?
    var stops: [Stop]
}

struct Snapshot: Codable, Equatable {
    var v: Int
    var lang: String
    var trip: String
    var start: String?
    var numDays: Int
    var days: [DaySnap]

    static func load() -> Snapshot? {
        guard let json = UserDefaults(suiteName: Shared.group)?.string(forKey: Shared.key),
              let snap = try? JSONDecoder().decode(Snapshot.self, from: Data(json.utf8)),
              snap.v == 1 else { return nil }
        return snap
    }
}

// The trip runs on Japan's calendar, whatever the phone's time zone is (same rule as the app's currentDay()).
enum Tokyo {
    static var calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = Shared.tokyo
        return c
    }()

    private static func formatter(_ format: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = Shared.tokyo
        f.dateFormat = format
        return f
    }

    static func ymd(_ d: Date) -> String { formatter("yyyy-MM-dd").string(from: d) }
    static func hm(_ d: Date) -> String { formatter("HH:mm").string(from: d) }
    static func date(_ ymd: String, _ hm: String = "00:00") -> Date? { formatter("yyyy-MM-dd HH:mm").date(from: ymd + " " + hm) }

    static func daysBetween(_ a: String, _ b: String) -> Int? {
        guard let x = date(a), let y = date(b) else { return nil }
        return calendar.dateComponents([.day], from: x, to: y).day
    }

    static func nextMidnight(after d: Date) -> Date {
        calendar.nextDate(after: d, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) ?? d.addingTimeInterval(86_400)
    }
}

struct Next {
    var stop: Stop
    /// The moment of the stop; nil when it has no time.
    var at: Date?
}

enum TodayState: Equatable {
    /// The app has not left anything yet (not opened since the widget was added, or signed out).
    case noData
    /// A trip with no dates.
    case noDates(trip: String)
    case before(trip: String, daysLeft: Int, city: String?)
    case during(trip: String, city: String?, dayNo: Int, next: Stop?, nextAt: Date?, after: Stop?, left: Int, known: Bool)
    case finished(trip: String)
}

enum Widgets {
    /// Mirrors the app's Home: the next thing still ahead today; untimed stops wait after the timed ones.
    static func upcoming(_ stops: [Stop], nowHM: String) -> [Stop] {
        let open = stops.filter { !$0.done }
        let timed = open.filter { $0.time != nil && $0.time! >= nowHM }
        return timed + open.filter { $0.time == nil }
    }

    static func state(_ snap: Snapshot?, now: Date) -> TodayState {
        guard let snap else { return .noData }
        guard let start = snap.start else { return .noDates(trip: snap.trip) }
        let today = Tokyo.ymd(now)
        guard let diff = Tokyo.daysBetween(start, today) else { return .noData }
        let day = snap.days.first { $0.date == today }
        if diff < 0 { return .before(trip: snap.trip, daysLeft: -diff, city: snap.days.first?.city) }
        if diff >= snap.numDays { return .finished(trip: snap.trip) }
        guard let day else {
            // the app has not left today's plan yet (phone off for days): say the day, not stale stops
            return .during(trip: snap.trip, city: nil, dayNo: diff + 1, next: nil, nextAt: nil, after: nil, left: 0, known: false)
        }
        let list = upcoming(day.stops, nowHM: Tokyo.hm(now))
        let at = list.first?.time.flatMap { Tokyo.date(today, $0) }
        return .during(trip: snap.trip, city: day.city, dayNo: diff + 1, next: list.first, nextAt: at, after: list.dropFirst().first, left: list.count, known: true)
    }

    /// Minutes to a stop, rounded up to 5, when it is within the hour; nil otherwise.
    static func minutesAway(_ at: Date, now: Date) -> Int? {
        let wait = at.timeIntervalSince(now)
        guard wait > -60, wait <= 3600 else { return nil }
        return Int((max(wait, 0) / 300).rounded(.up)) * 5
    }

    /// Entries: now, a minute after each of today's stops (the app keeps a stop "next" until its minute is over), and
    /// each midnight in Tokyo, so the day changes by itself.
    static func entryDates(_ snap: Snapshot?, now: Date) -> [Date] {
        var dates: Set<Date> = [now]
        let midnight = Tokyo.nextMidnight(after: now)
        dates.insert(midnight)
        dates.insert(Tokyo.nextMidnight(after: midnight))
        if let snap {
            for day in snap.days {
                for stop in day.stops where !stop.done {
                    guard let t = stop.time, let at = Tokyo.date(day.date, t) else { continue }
                    let moved = at.addingTimeInterval(60)
                    if moved > now { dates.insert(moved) }
                }
                // every 5 minutes through the hour before the next stops, for the "in N min" line
                for stop in day.stops.filter({ !$0.done }).prefix(3) {
                    guard let t = stop.time, let at = Tokyo.date(day.date, t) else { continue }
                    for k in 1...12 where at.addingTimeInterval(Double(-k) * 300) > now { dates.insert(at.addingTimeInterval(Double(-k) * 300)) }
                }
            }
        }
        return dates.sorted().prefix(40).map { $0 }
    }
}

/// The widget's own words: the app's language (from the snapshot), not the phone's.
struct Words {
    let he: Bool
    init(lang: String?) {
        if let lang { he = lang == "he" } else { he = Locale.preferredLanguages.first?.hasPrefix("he") ?? false }
    }
    var layoutRTL: Bool { he }
    var next: String { he ? "הבא" : "Next" }
    var after: String { he ? "אחריו" : "Then" }
    var inWord: String { he ? "בעוד" : "in" }
    var minWord: String { he ? "דק׳" : "min" }
    var nowWord: String { he ? "עכשיו" : "now" }
    var expense: String { he ? "הוצאה" : "Expense" }
    var translate: String { he ? "תרגום" : "Translate" }
    var noDataTitle: String { he ? "אין עדיין טיול" : "No trip yet" }
    var noDataBody: String { he ? "פתחו את Toogo כדי לטעון את הטיול." : "Open Toogo to load your trip." }
    var noDatesTitle: String { he ? "הטיול בלי תאריכים" : "Trip has no dates" }
    var noDatesBody: String { he ? "הוסיפו תאריכים ב-Toogo." : "Add dates in Toogo." }
    var finishedTitle: String { he ? "הטיול הסתיים" : "Trip is over" }
    var finishedBody: String { he ? "מקווים שנהניתם." : "Hope it was great." }
    var nothingLeft: String { he ? "אין עוד תחנות להיום" : "Nothing left today" }
    var openForPlan: String { he ? "פתחו את Toogo לתוכנית היום" : "Open Toogo for today's plan" }
    var leftWord: String { he ? "נשארו" : "left" }
    func daysToFlight(_ n: Int) -> String {
        he ? (n == 1 ? "יום להמראה" : "ימים להמראה") : (n == 1 ? "day to the flight" : "days to the flight")
    }
    var daysShort: String { he ? "ימים" : "days" }
    func dayNumber(_ n: Int) -> String { he ? "יום \(n)" : "Day \(n)" }
    func stopsLeft(_ n: Int) -> String { he ? (n == 1 ? "תחנה" : "תחנות") : (n == 1 ? "stop" : "stops") }
}
