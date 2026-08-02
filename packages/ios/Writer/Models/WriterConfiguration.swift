import Foundation

struct WriterConfiguration {
    let privyAppId: String
    let privyClientId: String
    let apiBaseURL: URL
    let targetChainID: Int
    let bundleIdentifier: String
    let urlScheme: String

    var requiresSetup: Bool {
        privyAppId.isPlaceholder || privyClientId.isPlaceholder
    }

    static func fromBundle(_ bundle: Bundle = .main) -> WriterConfiguration {
        let info = bundle.infoDictionary ?? [:]
        let appId = info["PrivyAppID"] as? String ?? ""
        let clientId = info["PrivyClientID"] as? String ?? ""
        let apiBase = info["WriterAPIBaseURL"] as? String ?? "https://api.writer.place"
        let targetChainID = Int(info["WriterTargetChainID"] as? String ?? "10") ?? 10
        let bundleIdentifier = bundle.bundleIdentifier ?? "place.writer.ios"
        let urlScheme = info["WriterURLScheme"] as? String ?? "writer"

        return WriterConfiguration(
            privyAppId: appId,
            privyClientId: clientId,
            apiBaseURL: URL(string: apiBase) ?? URL(string: "https://api.writer.place")!,
            targetChainID: targetChainID,
            bundleIdentifier: bundleIdentifier,
            urlScheme: urlScheme
        )
    }
}

private extension String {
    var isPlaceholder: Bool {
        isEmpty || uppercased().hasPrefix("YOUR_")
    }
}
