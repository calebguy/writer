import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var session: PrivySessionModel
    @EnvironmentObject private var api: WriterAPIClient

    var body: some View {
        TabView {
            HomeScreen()
                .tabItem { Label("Home", systemImage: "house") }
            ExploreScreen()
                .tabItem { Label("Explore", systemImage: "safari") }
            AccountScreen()
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
        .task {
            await session.refreshAuthState()
            await api.loadPublicWriters()
            if let address = session.walletAddress {
                await api.loadHomeWriters(managerAddress: address)
            }
        }
    }
}

private struct HomeScreen: View {
    @EnvironmentObject private var session: PrivySessionModel
    @EnvironmentObject private var api: WriterAPIClient
    @State private var showingCreatePlace = false

    var body: some View {
        NavigationStack {
            Group {
                if session.userId == nil {
                    LoginCard()
                        .padding()
                } else if session.walletAddress == nil {
                    CreateWalletPrompt()
                        .padding()
                } else if api.isLoading && api.homeWriters.isEmpty {
                    ProgressView("Loading your places…")
                } else if api.homeWriters.isEmpty {
                    EmptyPlacesView { showingCreatePlace = true }
                        .padding()
                } else {
                    WriterListView(writers: api.homeWriters)
                }
            }
            .navigationTitle("Home")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingCreatePlace = true } label: {
                        Image(systemName: "plus")
                    }
                    .disabled(session.walletAddress == nil)
                }
                ToolbarItem(placement: .topBarLeading) {
                    RefreshButton {
                        if let address = session.walletAddress {
                            await api.loadHomeWriters(managerAddress: address)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingCreatePlace) {
                CreatePlaceView()
            }
            .task(id: session.walletAddress) {
                if let address = session.walletAddress {
                    await api.loadHomeWriters(managerAddress: address)
                }
            }
        }
    }
}

private struct ExploreScreen: View {
    @EnvironmentObject private var api: WriterAPIClient

    var body: some View {
        NavigationStack {
            Group {
                if api.isLoading && api.publicWriters.isEmpty {
                    ProgressView("Loading public places…")
                } else if api.publicWriters.isEmpty {
                    ContentUnavailableView("No public places yet", systemImage: "safari")
                } else {
                    List(api.publicWriters) { writer in
                        NavigationLink(value: writer.address) {
                            WriterSummaryRow(writer: writer)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Explore")
            .navigationDestination(for: String.self) { address in
                PlaceDetailView(address: address)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    RefreshButton { await api.loadPublicWriters() }
                }
            }
            .task { await api.loadPublicWriters() }
        }
    }
}

private struct AccountScreen: View {
    @EnvironmentObject private var session: PrivySessionModel

    var body: some View {
        NavigationStack {
            List {
                if session.configuration.requiresSetup {
                    Section("Configuration") {
                        Label("Set PrivyAppID and PrivyClientID in Info.plist.", systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                    }
                }

                Section("Privy") {
                    LabeledContent("State", value: session.authSummary)
                    if let userId = session.userId {
                        LabeledContent("User", value: userId)
                    }
                    if let walletAddress = session.walletAddress {
                        LabeledContent("Wallet", value: walletAddress.shortHex)
                    }
                }

                if session.userId == nil {
                    Section("Sign in") { SMSLoginView() }
                } else if session.walletAddress == nil {
                    Section("Wallet") { CreateWalletPrompt() }
                }

                if let message = session.statusMessage {
                    Section { Text(message).foregroundStyle(.secondary) }
                }
                if let error = session.errorMessage {
                    Section { Text(error).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Account")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    RefreshButton { await session.refreshAuthState() }
                }
            }
        }
    }
}

private struct PlaceDetailView: View {
    @EnvironmentObject private var session: PrivySessionModel
    @EnvironmentObject private var api: WriterAPIClient
    let address: String

    @State private var writer: Writer?
    @State private var showingCreateEntry = false

    var body: some View {
        Group {
            if let writer {
                List {
                    Section {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(writer.title)
                                .font(.title2.weight(.semibold))
                            Text(writer.address.shortHex)
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                            if writer.isPending {
                                Label("Pending onchain confirmation", systemImage: "clock")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    if writer.visibleEntries.isEmpty {
                        Section {
                            ContentUnavailableView("No entries yet", systemImage: "square.and.pencil")
                        }
                    } else {
                        Section("Entries") {
                            ForEach(writer.visibleEntries) { entry in
                                if let entryId = entry.chainId {
                                    NavigationLink {
                                        EntryDetailView(writer: writer, entryId: entryId, warmEntry: entry)
                                    } label: {
                                        EntryRow(entry: entry)
                                    }
                                } else {
                                    EntryRow(entry: entry)
                                }
                            }
                        }
                    }
                }
                .refreshable { await reload() }
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { showingCreateEntry = true } label: {
                            Image(systemName: "square.and.pencil")
                        }
                        .disabled(!canCreateEntries(writer))
                    }
                }
            } else {
                ProgressView("Loading place…")
            }
        }
        .navigationTitle("Place")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingCreateEntry) {
            if let writer {
                EntryEditorView(mode: .create(writer)) {
                    await reload()
                }
            }
        }
        .task(id: address) { await reload() }
    }

    private func reload() async {
        writer = await api.loadWriter(address: address)
    }

    private func canCreateEntries(_ writer: Writer) -> Bool {
        guard let walletAddress = session.walletAddress?.lowercased() else { return false }
        return writer.publicWritable || writer.managers.map { $0.lowercased() }.contains(walletAddress)
    }
}

private struct EntryDetailView: View {
    @EnvironmentObject private var session: PrivySessionModel
    @EnvironmentObject private var api: WriterAPIClient

    let writer: Writer
    let entryId: Int
    let warmEntry: Entry?

    @State private var entry: Entry?
    @State private var showingEdit = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if let entry {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if entry.isPrivate {
                            Label("Private entry", systemImage: "lock")
                                .foregroundStyle(.secondary)
                        }
                        Text(entry.displayContent)
                            .font(.body)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Divider()
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Author: \((entry.author ?? "unknown").shortHex)")
                            if entry.isPending { Text("Pending confirmation") }
                        }
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                    }
                    .padding()
                }
                .toolbar {
                    if entry.isAuthored(by: session.walletAddress) {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Edit") { showingEdit = true }
                        }
                    }
                }
            } else {
                ProgressView("Loading entry…")
            }
        }
        .navigationTitle("Entry")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingEdit) {
            if let entry {
                EntryEditorView(mode: .edit(writer, entry)) {
                    await reload()
                } onDelete: {
                    dismiss()
                }
            }
        }
        .task { await reload() }
    }

    private func reload() async {
        entry = await api.loadEntry(writerAddress: writer.address, entryId: entryId) ?? warmEntry
    }
}

private struct CreatePlaceView: View {
    @EnvironmentObject private var session: PrivySessionModel
    @EnvironmentObject private var api: WriterAPIClient
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Place title") {
                    TextEditor(text: $title)
                        .frame(minHeight: 140)
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Create Place")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await create() } }
                        .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || api.isMutating)
                }
            }
        }
    }

    private func create() async {
        guard let address = session.walletAddress else { return }
        do {
            let token = try await session.accessToken()
            _ = try await api.createPlace(title: title.trimmingCharacters(in: .whitespacesAndNewlines), admin: address, authToken: token)
            await api.loadHomeWriters(managerAddress: address)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private enum EntryEditorMode {
    case create(Writer)
    case edit(Writer, Entry)

    var writer: Writer {
        switch self {
        case .create(let writer), .edit(let writer, _): return writer
        }
    }

    var entry: Entry? {
        if case .edit(_, let entry) = self { return entry }
        return nil
    }
}

private struct EntryEditorView: View {
    @EnvironmentObject private var session: PrivySessionModel
    @EnvironmentObject private var api: WriterAPIClient
    @Environment(\.dismiss) private var dismiss

    let mode: EntryEditorMode
    let onSave: () async -> Void
    var onDelete: (() -> Void)? = nil

    @State private var markdown: String
    @State private var errorMessage: String?
    @State private var isDeleting = false

    init(mode: EntryEditorMode, onSave: @escaping () async -> Void, onDelete: (() -> Void)? = nil) {
        self.mode = mode
        self.onSave = onSave
        self.onDelete = onDelete
        _markdown = State(initialValue: mode.entry?.displayContent ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(mode.entry == nil ? "New entry" : "Edit entry") {
                    TextEditor(text: $markdown)
                        .frame(minHeight: 260)
                }

                Section {
                    Text("Private/encrypted entries are not in the native app yet. This editor writes public plaintext content.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }

                if mode.entry != nil {
                    Section {
                        Button("Delete Entry", role: .destructive) {
                            Task { await deleteEntry() }
                        }
                        .disabled(isDeleting || api.isMutating)
                    }
                }
            }
            .navigationTitle(mode.entry == nil ? "Create Entry" : "Edit Entry")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(markdown.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || api.isMutating)
                }
            }
        }
    }

    private func save() async {
        let content = markdown.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let token = try await session.accessToken()
            switch mode {
            case .create(let writer):
                let signed = try await session.signCreateWithChunk(writer: writer, content: content)
                try await api.createEntry(writer: writer, signed: signed, authToken: token)
            case .edit(let writer, let entry):
                guard let entryId = entry.chainId else { return }
                let signed = try await session.signUpdate(writer: writer, entryId: entryId, content: content)
                try await api.updateEntry(writer: writer, entryId: entryId, signed: signed, authToken: token)
            }
            await onSave()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteEntry() async {
        guard case .edit(let writer, let entry) = mode, let entryId = entry.chainId else { return }
        isDeleting = true
        defer { isDeleting = false }
        do {
            let token = try await session.accessToken()
            let signed = try await session.signRemove(writer: writer, entryId: entryId)
            try await api.deleteEntry(writer: writer, entryId: entryId, signed: signed, authToken: token)
            onDelete?()
            await onSave()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct WriterListView: View {
    let writers: [Writer]

    var body: some View {
        List(writers) { writer in
            NavigationLink {
                PlaceDetailView(address: writer.address)
            } label: {
                WriterRow(title: writer.title, address: writer.address, count: writer.visibleEntries.count, isPending: writer.isPending)
            }
        }
        .listStyle(.plain)
    }
}

private struct WriterSummaryRow: View {
    let writer: WriterSummary

    var body: some View {
        WriterRow(title: writer.title, address: writer.address, count: writer.publicCount ?? writer.entryCount, isPending: false)
    }
}

private struct WriterRow: View {
    let title: String
    let address: String
    let count: Int?
    let isPending: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
                .lineLimit(3)
            HStack {
                Text(address.shortHex)
                Spacer()
                if let count { Text("\(count) entries") }
                if isPending { Image(systemName: "clock") }
            }
            .font(.caption.monospaced())
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

private struct EntryRow: View {
    let entry: Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                if entry.isPrivate { Image(systemName: "lock") }
                Text(entry.displayContent.isEmpty ? "Untitled entry" : entry.displayContent)
                    .lineLimit(3)
            }
            HStack {
                if let author = entry.author { Text(author.shortHex) }
                Spacer()
                if entry.isPending { Text("pending") }
            }
            .font(.caption.monospaced())
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

private struct LoginCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Write today, forever")
                .font(.title.weight(.semibold))
            Text("Sign in to see your places and create onchain entries.")
                .foregroundStyle(.secondary)
            SMSLoginView()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct EmptyPlacesView: View {
    let create: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label("No places yet", systemImage: "square.grid.2x2")
        } description: {
            Text("Create your first place to start writing onchain.")
        } actions: {
            Button("Create Place", action: create)
                .buttonStyle(.borderedProminent)
        }
    }
}

private struct CreateWalletPrompt: View {
    @EnvironmentObject private var session: PrivySessionModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Create your embedded wallet")
                .font(.title2.weight(.semibold))
            Text("Writer uses your wallet to sign place and entry writes.")
                .foregroundStyle(.secondary)
            Button("Create Ethereum Wallet") {
                Task { await session.createEthereumWallet() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(session.isWorking)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct SMSLoginView: View {
    @EnvironmentObject private var session: PrivySessionModel
    @State private var phoneNumber = ""
    @State private var code = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Phone number (+14155552671)", text: $phoneNumber)
                .textContentType(.telephoneNumber)
                .keyboardType(.phonePad)
                .textInputAutocapitalization(.never)
                .textFieldStyle(.roundedBorder)

            HStack {
                Button(session.smsCodeSentTo == nil ? "Send code" : "Resend code") {
                    Task { await session.sendSMSCode(to: phoneNumber) }
                }
                .disabled(session.isWorking || phoneNumber.isEmpty)

                TextField("Code", text: $code)
                    .textContentType(.oneTimeCode)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 110)

                Button("Verify") {
                    Task { await session.verifySMSCode(code, sentTo: session.smsCodeSentTo ?? phoneNumber) }
                }
                .disabled(session.isWorking || (session.smsCodeSentTo ?? phoneNumber).isEmpty || code.isEmpty)
            }

            if let sentTo = session.smsCodeSentTo {
                Text("Use the newest code sent to \(sentTo).")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct RefreshButton: View {
    let action: () async -> Void
    @State private var isRefreshing = false

    var body: some View {
        Button {
            Task {
                isRefreshing = true
                await action()
                isRefreshing = false
            }
        } label: {
            if isRefreshing {
                ProgressView()
            } else {
                Image(systemName: "arrow.clockwise")
            }
        }
        .disabled(isRefreshing)
    }
}

private extension String {
    var shortHex: String {
        guard count > 10 else { return self }
        return "\(prefix(6))…\(suffix(4))"
    }
}
