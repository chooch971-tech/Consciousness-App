import SwiftUI

@main
struct CascadeIdleApp: App {
    @State private var engine = GameEngine()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(engine)
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:
                engine.applyOfflineProgress()
                engine.start()
            case .inactive, .background:
                engine.stop()
            @unknown default:
                break
            }
        }
    }
}
