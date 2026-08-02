import SwiftUI

@main
struct WriterApp: App {
    @StateObject private var session = PrivySessionModel(configuration: .fromBundle())
    @StateObject private var api = WriterAPIClient(configuration: .fromBundle())

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(session)
                .environmentObject(api)
                .task {
                    await session.refreshAuthState()
                    await api.loadPublicWriters()
                }
        }
    }
}
