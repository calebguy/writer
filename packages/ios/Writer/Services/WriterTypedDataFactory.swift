import Foundation

struct SignedCreateWithChunk {
    let signature: String
    let nonce: Int
    let chunkCount: Int
    let chunkContent: String
}

struct SignedUpdateEntry {
    let signature: String
    let nonce: Int
    let totalChunks: Int
    let content: String
}

struct SignedRemoveEntry {
    let signature: String
    let nonce: Int
}

enum WriterTypedDataFactory {
    static func makeCreateWithChunkPayload(
        writerAddress: String,
        legacyDomain: Bool,
        targetChainID: Int,
        nonce: Int,
        chunkContent: String,
        chunkCount: Int = 1
    ) throws -> String {
        try encode(
            EIP712Payload(
                types: .createWithChunk(legacyDomain: legacyDomain),
                primaryType: "CreateWithChunk",
                domain: .writer(address: writerAddress, legacyDomain: legacyDomain, targetChainID: targetChainID),
                message: CreateWithChunkMessage(nonce: nonce, chunkCount: chunkCount, chunkContent: chunkContent)
            )
        )
    }

    static func makeUpdatePayload(
        writerAddress: String,
        legacyDomain: Bool,
        targetChainID: Int,
        nonce: Int,
        entryId: Int,
        content: String,
        totalChunks: Int = 1
    ) throws -> String {
        try encode(
            EIP712Payload(
                types: .update(legacyDomain: legacyDomain),
                primaryType: "Update",
                domain: .writer(address: writerAddress, legacyDomain: legacyDomain, targetChainID: targetChainID),
                message: UpdateMessage(nonce: nonce, entryId: entryId, totalChunks: totalChunks, content: content)
            )
        )
    }

    static func makeRemovePayload(
        writerAddress: String,
        legacyDomain: Bool,
        targetChainID: Int,
        nonce: Int,
        id: Int
    ) throws -> String {
        try encode(
            EIP712Payload(
                types: .remove(legacyDomain: legacyDomain),
                primaryType: "Remove",
                domain: .writer(address: writerAddress, legacyDomain: legacyDomain, targetChainID: targetChainID),
                message: RemoveMessage(nonce: nonce, id: id)
            )
        )
    }

    private static func encode<T: Encodable>(_ value: T) throws -> String {
        let data = try JSONEncoder().encode(value)
        guard let json = String(data: data, encoding: .utf8) else {
            throw WriterTypedDataError.encodingFailed
        }
        return json
    }
}

private struct EIP712Payload<Message: Encodable>: Encodable {
    let types: EIP712Types
    let primaryType: String
    let domain: EIP712Domain
    let message: Message
}

private struct EIP712Types: Encodable {
    let EIP712Domain: [EIP712Field]
    let CreateWithChunk: [EIP712Field]?
    let Update: [EIP712Field]?
    let Remove: [EIP712Field]?

    static func createWithChunk(legacyDomain: Bool) -> EIP712Types {
        EIP712Types(
            EIP712Domain: domainFields(legacyDomain: legacyDomain),
            CreateWithChunk: [
                EIP712Field(name: "nonce", type: "uint256"),
                EIP712Field(name: "chunkCount", type: "uint256"),
                EIP712Field(name: "chunkContent", type: "string")
            ],
            Update: nil,
            Remove: nil
        )
    }

    static func update(legacyDomain: Bool) -> EIP712Types {
        EIP712Types(
            EIP712Domain: domainFields(legacyDomain: legacyDomain),
            CreateWithChunk: nil,
            Update: [
                EIP712Field(name: "nonce", type: "uint256"),
                EIP712Field(name: "entryId", type: "uint256"),
                EIP712Field(name: "totalChunks", type: "uint256"),
                EIP712Field(name: "content", type: "string")
            ],
            Remove: nil
        )
    }

    static func remove(legacyDomain: Bool) -> EIP712Types {
        EIP712Types(
            EIP712Domain: domainFields(legacyDomain: legacyDomain),
            CreateWithChunk: nil,
            Update: nil,
            Remove: [
                EIP712Field(name: "nonce", type: "uint256"),
                EIP712Field(name: "id", type: "uint256")
            ]
        )
    }

    private static func domainFields(legacyDomain: Bool) -> [EIP712Field] {
        if legacyDomain {
            return [
                EIP712Field(name: "name", type: "string"),
                EIP712Field(name: "version", type: "string"),
                EIP712Field(name: "chainId", type: "uint256"),
                EIP712Field(name: "verifyingContract", type: "address")
            ]
        }
        return [
            EIP712Field(name: "name", type: "string"),
            EIP712Field(name: "version", type: "string"),
            EIP712Field(name: "verifyingContract", type: "address")
        ]
    }
}

private struct EIP712Field: Encodable {
    let name: String
    let type: String
}

private struct EIP712Domain: Encodable {
    let name: String
    let version: String
    let chainId: Int?
    let verifyingContract: String

    static func writer(address: String, legacyDomain: Bool, targetChainID: Int) -> EIP712Domain {
        EIP712Domain(
            name: "Writer",
            version: "1",
            chainId: legacyDomain ? targetChainID : nil,
            verifyingContract: address
        )
    }
}

private struct CreateWithChunkMessage: Encodable {
    let nonce: Int
    let chunkCount: Int
    let chunkContent: String
}

private struct UpdateMessage: Encodable {
    let nonce: Int
    let entryId: Int
    let totalChunks: Int
    let content: String
}

private struct RemoveMessage: Encodable {
    let nonce: Int
    let id: Int
}

enum WriterTypedDataError: LocalizedError {
    case encodingFailed

    var errorDescription: String? { "Failed to encode Writer typed data." }
}
