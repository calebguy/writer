import Foundation
import PrivySDK

@MainActor
final class PrivySessionModel: ObservableObject {
    let configuration: WriterConfiguration

    @Published private(set) var authSummary = "Not checked"
    @Published private(set) var userId: String?
    @Published private(set) var walletAddress: String?
    @Published private(set) var statusMessage: String?
    @Published private(set) var errorMessage: String?
    @Published private(set) var isWorking = false
    @Published private(set) var smsCodeSentTo: String?
    @Published private(set) var smsResendAvailableAt: Date?

    private let privy: Privy

    init(configuration: WriterConfiguration) {
        self.configuration = configuration
        let config = PrivyConfig(
            appId: configuration.privyAppId,
            appClientId: configuration.privyClientId
        )
        self.privy = PrivySdk.initialize(config: config)
    }

    func refreshAuthState() async {
        errorMessage = nil
        let state = await privy.getAuthState()
        authSummary = String(describing: state)
        await syncUserSnapshot()
    }

    func sendSMSCode(to phoneNumber: String) async {
        let trimmedPhoneNumber = phoneNumber.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedPhoneNumber.isEmpty else {
            errorMessage = WriterIOSAppError.emptyPhoneNumber.localizedDescription
            return
        }
        guard !isWorking else { return }
        if let smsResendAvailableAt, smsResendAvailableAt > Date() {
            let seconds = max(1, Int(ceil(smsResendAvailableAt.timeIntervalSinceNow)))
            statusMessage = "Code already sent. Try again in \(seconds)s."
            return
        }

        await run("Sent code to \(trimmedPhoneNumber)") {
            try await privy.sms.sendCode(to: trimmedPhoneNumber)
            smsCodeSentTo = trimmedPhoneNumber
            smsResendAvailableAt = Date().addingTimeInterval(30)
        }
    }

    func verifySMSCode(_ code: String, sentTo phoneNumber: String) async {
        await run("Logged in") {
            _ = try await privy.sms.loginWithCode(code, sentTo: phoneNumber)
            await syncUserSnapshot()
        }
    }

    func createEthereumWallet() async {
        await run("Ethereum wallet ready") {
            guard let user = await privy.getUser() else { throw WriterIOSAppError.missingAuthenticatedUser }
            _ = try await user.createEthereumWallet()
            await syncUserSnapshot()
        }
    }

    func accessToken() async throws -> String {
        guard let user = await privy.getUser() else { throw WriterIOSAppError.missingAuthenticatedUser }
        return try await user.getAccessToken()
    }

    func signCreateWithChunk(writer: Writer, content: String) async throws -> SignedCreateWithChunk {
        let wallet = try await ethereumWallet()
        let nonce = Self.randomNonce()
        let chunkCount = 1
        let typedData = try WriterTypedDataFactory.makeCreateWithChunkPayload(
            writerAddress: writer.address,
            legacyDomain: writer.legacyDomain,
            targetChainID: configuration.targetChainID,
            nonce: nonce,
            chunkContent: content,
            chunkCount: chunkCount
        )
        let signature = try await signTypedData(typedData, walletAddress: wallet.address, provider: wallet.provider)
        return SignedCreateWithChunk(signature: signature, nonce: nonce, chunkCount: chunkCount, chunkContent: content)
    }

    func signUpdate(writer: Writer, entryId: Int, content: String) async throws -> SignedUpdateEntry {
        let wallet = try await ethereumWallet()
        let nonce = Self.randomNonce()
        let totalChunks = 1
        let typedData = try WriterTypedDataFactory.makeUpdatePayload(
            writerAddress: writer.address,
            legacyDomain: writer.legacyDomain,
            targetChainID: configuration.targetChainID,
            nonce: nonce,
            entryId: entryId,
            content: content,
            totalChunks: totalChunks
        )
        let signature = try await signTypedData(typedData, walletAddress: wallet.address, provider: wallet.provider)
        return SignedUpdateEntry(signature: signature, nonce: nonce, totalChunks: totalChunks, content: content)
    }

    func signRemove(writer: Writer, entryId: Int) async throws -> SignedRemoveEntry {
        let wallet = try await ethereumWallet()
        let nonce = Self.randomNonce()
        let typedData = try WriterTypedDataFactory.makeRemovePayload(
            writerAddress: writer.address,
            legacyDomain: writer.legacyDomain,
            targetChainID: configuration.targetChainID,
            nonce: nonce,
            id: entryId
        )
        let signature = try await signTypedData(typedData, walletAddress: wallet.address, provider: wallet.provider)
        return SignedRemoveEntry(signature: signature, nonce: nonce)
    }

    func setError(_ error: Error) {
        errorMessage = error.localizedDescription
    }

    func setStatus(_ message: String) {
        statusMessage = message
    }

    private func run(_ successMessage: String, operation: () async throws -> Void) async {
        isWorking = true
        errorMessage = nil
        statusMessage = nil
        defer { isWorking = false }

        do {
            try await operation()
            statusMessage = successMessage
            await refreshAuthState()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func syncUserSnapshot() async {
        guard let user = await privy.getUser() else {
            userId = nil
            walletAddress = nil
            return
        }
        userId = user.id
        walletAddress = user.embeddedEthereumWallets.first?.address
    }

    private func ethereumWallet() async throws -> EmbeddedEthereumWallet {
        guard let user = await privy.getUser() else { throw WriterIOSAppError.missingAuthenticatedUser }
        guard let wallet = user.embeddedEthereumWallets.first else { throw WriterIOSAppError.missingEthereumWallet }
        return wallet
    }

    private func signTypedData(
        _ typedData: String,
        walletAddress: String,
        provider: EmbeddedEthereumWalletProvider
    ) async throws -> String {
        let request = EthereumRpcRequest(
            method: "eth_signTypedData_v4",
            params: [walletAddress, typedData]
        )
        return try await provider.request(request)
    }

    private static func randomNonce() -> Int {
        Int.random(in: 0...9_007_199_254_740_991)
    }
}

enum WriterIOSAppError: LocalizedError {
    case emptyPhoneNumber
    case missingAuthenticatedUser
    case missingEthereumWallet

    var errorDescription: String? {
        switch self {
        case .emptyPhoneNumber:
            return "Enter a phone number before requesting a code."
        case .missingAuthenticatedUser:
            return "Log in before continuing."
        case .missingEthereumWallet:
            return "Create an Ethereum wallet before signing."
        }
    }
}
