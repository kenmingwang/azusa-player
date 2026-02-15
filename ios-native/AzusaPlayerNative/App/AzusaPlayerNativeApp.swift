import SwiftUI

@main
struct AzusaPlayerNativeApp: App {
    @StateObject private var vm = PlayerViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(vm)
        }
    }
}
