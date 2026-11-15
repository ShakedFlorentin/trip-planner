import SwiftUI
import WidgetKit

@main
struct ToogoWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        TranslateWidget()
    }
}
