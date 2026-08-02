import Foundation

@MainActor
final class WriterAPIClient: ObservableObject {
    @Published private(set) var publicWriters: [WriterSummary] = []
    @Published private(set) var homeWriters: [Writer] = []
    @Published private(set) var selectedWriter: Writer?
    @Published private(set) var selectedEntry: Entry?
    @Published private(set) var errorMessage: String?
    @Published private(set) var isLoading = false
    @Published private(set) var isMutating = false

    private let configuration: WriterConfiguration
    private let decoder: JSONDecoder
    private let encoder = JSONEncoder()

    init(configuration: WriterConfiguration) {
        self.configuration = configuration
        self.decoder = JSONDecoder()
    }

    func loadPublicWriters() async {
        await load {
            publicWriters = try await get("writer/public", as: PublicWritersResponse.self).writers
        }
    }

    func loadHomeWriters(managerAddress: String) async {
        await load {
            homeWriters = try await get("manager/\(managerAddress)", as: WritersResponse.self).writers
        }
    }

    func loadWriter(address: String) async -> Writer? {
        do {
            let writer = try await get("writer/\(address)", as: WriterResponse.self).writer
            selectedWriter = writer
            return writer
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    func loadEntry(writerAddress: String, entryId: Int) async -> Entry? {
        do {
            let entry = try await get("writer/\(writerAddress)/entry/\(entryId)", as: EntryResponse.self).entry
            selectedEntry = entry
            return entry
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    func createPlace(title: String, admin: String, authToken: String) async throws -> Writer {
        try await mutate {
            let response = try await post(
                "factory/create",
                body: FactoryCreateRequest(admin: admin, managers: [admin], title: title),
                authToken: authToken,
                as: WriterResponse.self
            )
            homeWriters.insert(response.writer, at: 0)
            return response.writer
        }
    }

    func createEntry(writer: Writer, signed: SignedCreateWithChunk, authToken: String) async throws {
        try await mutate {
            _ = try await post(
                "writer/\(writer.address)/entry/createWithChunk",
                body: CreateEntryRequest(
                    signature: signed.signature,
                    nonce: signed.nonce,
                    chunkCount: signed.chunkCount,
                    chunkContent: signed.chunkContent
                ),
                authToken: authToken,
                as: PendingResponse.self
            )
            _ = await loadWriter(address: writer.address)
        }
    }

    func updateEntry(writer: Writer, entryId: Int, signed: SignedUpdateEntry, authToken: String) async throws {
        try await mutate {
            _ = try await post(
                "writer/\(writer.address)/entry/\(entryId)/update",
                body: UpdateEntryRequest(
                    signature: signed.signature,
                    nonce: signed.nonce,
                    totalChunks: signed.totalChunks,
                    content: signed.content
                ),
                authToken: authToken,
                as: PendingResponse.self
            )
            _ = await loadWriter(address: writer.address)
            _ = await loadEntry(writerAddress: writer.address, entryId: entryId)
        }
    }

    func deleteEntry(writer: Writer, entryId: Int, signed: SignedRemoveEntry, authToken: String) async throws {
        try await mutate {
            _ = try await post(
                "writer/\(writer.address)/entry/\(entryId)/delete",
                body: DeleteEntryRequest(signature: signed.signature, nonce: signed.nonce),
                authToken: authToken,
                as: PendingResponse.self
            )
            _ = await loadWriter(address: writer.address)
        }
    }

    private func load(_ operation: () async throws -> Void) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await operation()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func mutate<T>(_ operation: () async throws -> T) async throws -> T {
        isMutating = true
        errorMessage = nil
        defer { isMutating = false }
        do {
            return try await operation()
        } catch {
            errorMessage = error.localizedDescription
            throw error
        }
    }

    private func get<T: Decodable>(_ path: String, as type: T.Type) async throws -> T {
        let url = configuration.apiBaseURL.appending(path: path)
        let (data, response) = try await URLSession.shared.data(from: url)
        try validate(response: response, data: data)
        return try decoder.decode(type, from: data)
    }

    private func post<Body: Encodable, Response: Decodable>(
        _ path: String,
        body: Body,
        authToken: String,
        as type: Response.Type
    ) async throws -> Response {
        let url = configuration.apiBaseURL.appending(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try encoder.encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        return try decoder.decode(type, from: data)
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { throw WriterAPIError.badResponse }
        guard (200..<300).contains(http.statusCode) else {
            if let apiError = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw WriterAPIError.server(apiError.error)
            }
            throw WriterAPIError.httpStatus(http.statusCode)
        }
    }
}

struct PublicWritersResponse: Decodable {
    let writers: [WriterSummary]
}

struct WritersResponse: Decodable {
    let writers: [Writer]
}

struct WriterResponse: Decodable {
    let writer: Writer
}

struct EntryResponse: Decodable {
    let entry: Entry
}

struct PendingResponse: Decodable {
    let pending: PendingTransaction?
}

struct PendingTransaction: Decodable {
    let transactionId: String?
    let author: String?
}

struct WriterSummary: Decodable, Identifiable {
    let address: String
    let title: String
    let publicCount: Int?
    let entryCount: Int?

    var id: String { address }
}

struct Writer: Decodable, Identifiable, Hashable {
    let address: String
    let storageAddress: String?
    let storageId: String?
    let publicWritable: Bool
    let legacyDomain: Bool
    let title: String
    let admin: String?
    let managers: [String]
    let createdAtHash: String?
    let transactionId: String?
    let entries: [Entry]

    var id: String { address }
    var visibleEntries: [Entry] { entries.filter { !$0.isDeleted } }
    var isPending: Bool { createdAtHash == nil }

    enum CodingKeys: String, CodingKey {
        case address, storageAddress, storageId, publicWritable, legacyDomain, title, admin, managers, createdAtHash, transactionId, entries
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        address = try container.decode(String.self, forKey: .address)
        storageAddress = try container.decodeIfPresent(String.self, forKey: .storageAddress)
        storageId = try container.decodeIfPresent(String.self, forKey: .storageId)
        publicWritable = try container.decodeIfPresent(Bool.self, forKey: .publicWritable) ?? false
        legacyDomain = try container.decodeIfPresent(Bool.self, forKey: .legacyDomain) ?? true
        title = try container.decodeIfPresent(String.self, forKey: .title) ?? "Untitled"
        admin = try container.decodeIfPresent(String.self, forKey: .admin)
        managers = try container.decodeIfPresent([String].self, forKey: .managers) ?? []
        createdAtHash = try container.decodeIfPresent(String.self, forKey: .createdAtHash)
        transactionId = try container.decodeIfPresent(String.self, forKey: .transactionId)
        entries = try container.decodeIfPresent([Entry].self, forKey: .entries) ?? []
    }
}

struct Entry: Decodable, Identifiable, Hashable {
    let id: Int
    let onChainId: String?
    let author: String?
    let raw: String?
    let decompressed: String?
    let version: String?
    let deletedAt: String?
    let deletedAtHash: String?
    let createdAtHash: String?
    let updatedAtHash: String?
    let createdAtTransactionId: String?
    let updatedAtTransactionId: String?
    let storageId: String?

    var isDeleted: Bool { deletedAt != nil || deletedAtHash != nil }
    var isPending: Bool { createdAtHash == nil }
    var isPrivate: Bool { version?.hasPrefix("enc:") == true || raw?.hasPrefix("enc:") == true }
    var displayContent: String { decompressed ?? raw ?? "" }
    var chainId: Int? { Int(onChainId ?? "") }

    func isAuthored(by address: String?) -> Bool {
        guard let address, let author else { return false }
        return author.lowercased() == address.lowercased()
    }
}

struct FactoryCreateRequest: Encodable {
    let admin: String
    let managers: [String]
    let title: String
}

struct CreateEntryRequest: Encodable {
    let signature: String
    let nonce: Int
    let chunkCount: Int
    let chunkContent: String
}

struct UpdateEntryRequest: Encodable {
    let signature: String
    let nonce: Int
    let totalChunks: Int
    let content: String
}

struct DeleteEntryRequest: Encodable {
    let signature: String
    let nonce: Int
}

struct APIErrorResponse: Decodable {
    let error: String
}

enum WriterAPIError: LocalizedError {
    case badResponse
    case httpStatus(Int)
    case server(String)

    var errorDescription: String? {
        switch self {
        case .badResponse:
            return "Writer API returned an unexpected response."
        case .httpStatus(let status):
            return "Writer API request failed with HTTP \(status)."
        case .server(let message):
            return message
        }
    }
}
