# Writer Documentation

Writer is an onchain writing platform. Content is permanently stored on Optimism through smart contracts, with all writes authenticated via EIP-712 signatures.

---

## Smart Contracts

### WriterFactory

Factory contract that deploys Writer + WriterStorage pairs using CREATE2 for deterministic addresses.

#### `create(title, admin, managers, salt)` → `(address, address)`

Deploy a new Writer and WriterStorage contract pair.

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | `string` | Name of the writer/publication |
| `admin` | `address` | Admin address for the writer |
| `managers` | `address[]` | Addresses granted the WRITER role |
| `salt` | `bytes32` | Salt for deterministic deployment |

**Returns:** `(address writerAddress, address storeAddress)`

**Events:** `WriterCreated(writerAddress, storeAddress, admin, title, managers)`

#### `computeWriterStorageAddress(salt)` → `address` [view]

Pre-compute the address a WriterStorage would be deployed to with the given salt.

#### `computeWriterAddress(title, admin, managers, salt)` → `address` [view]

Pre-compute the address a Writer would be deployed to with the given parameters.

---

### Writer

Main logic contract for managing entries with role-based access control. All write operations have signature variants (`*WithSig`) that accept EIP-712 typed data signatures for gasless transactions.

#### Reading

##### `getEntryCount()` → `uint256` [view]

Returns the total number of entries.

##### `getEntryIds()` → `uint256[]` [view]

Returns an array of all entry IDs.

##### `getEntry(id)` → `Entry` [view]

Returns the full entry struct including chunks, author, and timestamps.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uint256` | Entry ID |

**Returns:** `Entry { createdAtBlock, updatedAtBlock, chunks[], totalChunks, receivedChunks, author }`

##### `getEntryContent(id)` → `string` [view]

Returns the concatenated content of all chunks for an entry.

##### `getEntryChunk(id, index)` → `string` [view]

Returns a specific chunk's content.

#### Writing

##### `createWithChunk(chunkCount, content)` → `(uint256, Entry)`

Create a new entry with the first chunk of content. Caller becomes the entry author.

| Parameter | Type | Description |
|-----------|------|-------------|
| `chunkCount` | `uint256` | Total number of chunks for this entry |
| `content` | `string` | First chunk content |

**Access:** WRITER_ROLE

**Events:** `EntryCreated(id, author)`, `ChunkReceived(author, id, index, content)`

##### `createWithChunkWithSig(signature, nonce, chunkCount, content)` → `(uint256, Entry)`

Create a new entry with the first chunk via EIP-712 signature. Signer becomes the entry author.

| Parameter | Type | Description |
|-----------|------|-------------|
| `signature` | `bytes` | EIP-712 typed data signature |
| `nonce` | `uint256` | Unique nonce for replay protection |
| `chunkCount` | `uint256` | Total number of chunks |
| `content` | `string` | First chunk content |

**Access:** Signer must have WRITER_ROLE

**Events:** `EntryCreated(id, author)`, `ChunkReceived(author, id, index, content)`

##### `addChunk(id, index, content)` → `Entry`

Add a chunk to an existing entry at a specific index.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uint256` | Entry ID |
| `index` | `uint256` | Chunk index |
| `content` | `string` | Chunk content |

**Access:** Author + WRITER_ROLE

**Events:** `ChunkReceived(author, id, index, content)`

##### `addChunkWithSig(signature, nonce, id, index, content)` → `Entry`

Add a chunk to an existing entry via EIP-712 signature.

| Parameter | Type | Description |
|-----------|------|-------------|
| `signature` | `bytes` | EIP-712 typed data signature |
| `nonce` | `uint256` | Unique nonce for replay protection |
| `id` | `uint256` | Entry ID |
| `index` | `uint256` | Chunk index |
| `content` | `string` | Chunk content |

**Access:** Signer must be author + WRITER_ROLE

**Events:** `ChunkReceived(author, id, index, content)`

##### `update(id, totalChunks, content)` → `Entry`

Replace an entry's content. Clears all previous chunks and sets new content.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uint256` | Entry ID |
| `totalChunks` | `uint256` | New total chunks |
| `content` | `string` | New first chunk content |

**Access:** Author + WRITER_ROLE

**Events:** `EntryUpdated(id, author)`, `ChunkReceived(author, id, index, content)`

##### `updateWithSig(signature, nonce, id, totalChunks, content)`

Replace an entry's content via EIP-712 signature.

| Parameter | Type | Description |
|-----------|------|-------------|
| `signature` | `bytes` | EIP-712 typed data signature |
| `nonce` | `uint256` | Unique nonce for replay protection |
| `id` | `uint256` | Entry ID |
| `totalChunks` | `uint256` | New total chunks |
| `content` | `string` | New first chunk content |

**Access:** Signer must be author + WRITER_ROLE

**Events:** `EntryUpdated(id, author)`, `ChunkReceived(author, id, index, content)`

##### `remove(id)`

Delete an entry.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uint256` | Entry ID |

**Access:** Author + WRITER_ROLE

**Events:** `EntryRemoved(id, author)`

##### `removeWithSig(signature, nonce, id)`

Delete an entry via EIP-712 signature.

| Parameter | Type | Description |
|-----------|------|-------------|
| `signature` | `bytes` | EIP-712 typed data signature |
| `nonce` | `uint256` | Unique nonce for replay protection |
| `id` | `uint256` | Entry ID |

**Access:** Signer must be author + WRITER_ROLE

**Events:** `EntryRemoved(id, author)`

#### Administration

##### `setTitle(newTitle)`

Update the writer's title.

| Parameter | Type | Description |
|-----------|------|-------------|
| `newTitle` | `string` | New title |

**Access:** DEFAULT_ADMIN_ROLE

**Events:** `TitleSet(title)`

##### `setTitleWithSig(signature, nonce, newTitle)`

Update the writer's title via EIP-712 signature.

| Parameter | Type | Description |
|-----------|------|-------------|
| `signature` | `bytes` | EIP-712 typed data signature |
| `nonce` | `uint256` | Unique nonce for replay protection |
| `newTitle` | `string` | New title |

**Access:** Signer must have DEFAULT_ADMIN_ROLE

**Events:** `TitleSet(title)`

##### `replaceAdmin(newAdmin)`

Transfer admin role to a new address. Revokes admin from the caller.

| Parameter | Type | Description |
|-----------|------|-------------|
| `newAdmin` | `address` | New admin address |

**Access:** DEFAULT_ADMIN_ROLE

---

### WriterStorage

Storage contract that holds all entry data. Only the Writer logic contract can modify state, enforced by the `onlyLogic` modifier.

#### Entry Struct

```solidity
struct Entry {
    uint256 createdAtBlock;   // Block number when entry was created
    uint256 updatedAtBlock;   // Block number of last update
    string[] chunks;          // Array of content chunks
    uint256 totalChunks;      // Expected total number of chunks
    uint256 receivedChunks;   // Number of chunks received so far
    address author;           // Address of the entry author
}
```

#### Events

- `EntryCreated(uint256 indexed id, address author)`
- `EntryUpdated(uint256 indexed id, address author)`
- `EntryRemoved(uint256 indexed id, address author)`
- `EntryCompleted(uint256 indexed id, address author)` — emitted when all chunks received
- `ChunkReceived(address indexed author, uint256 indexed id, uint256 indexed index, string content)`
- `LogicSet(address indexed logicAddress)`

---

### ColorRegistry

Simple registry mapping user addresses to their chosen hex color.

#### `setHex(hexColor)`

Set your color directly.

| Parameter | Type | Description |
|-----------|------|-------------|
| `hexColor` | `bytes32` | Color in bytes32 format |

**Events:** `HexSet(user, hexColor)`

#### `setHexWithSig(signature, nonce, hexColor)`

Set your color via EIP-712 signature.

| Parameter | Type | Description |
|-----------|------|-------------|
| `signature` | `bytes` | EIP-712 signature |
| `nonce` | `uint256` | Unique nonce for replay protection |
| `hexColor` | `bytes32` | Color in bytes32 format |

**Events:** `HexSet(user, hexColor)`

#### `getPrimary(user)` → `bytes32` [view]

Get a user's hex color.

---

## API

All write operations are authenticated via EIP-712 signatures.

### Writers

#### `GET /writer/public`

List all public writers.

**Response:** `{ writers: Writer[] }`

#### `GET /writer/:address`

Get a specific writer and all its entries.

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `address` | Writer contract address |

**Response:** `{ writer: Writer }`

#### `GET /manager/:address`

Get all writers managed by an address.

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `address` | Manager wallet address |

**Response:** `{ writers: Writer[] }`

#### `POST /factory/create`

Deploy a new Writer + WriterStorage contract pair.

| Body Field | Type | Description |
|------------|------|-------------|
| `title` | `string` | Writer title |
| `admin` | `address` | Admin address |
| `managers` | `address[]` | Manager addresses |

**Response:** `{ writer: Writer }`

---

### Entries

#### `GET /writer/:address/entry/:id`

Get a confirmed entry by its onchain ID.

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `address` | Writer contract address |
| `id` | `bigint` | Onchain entry ID |

**Response:** `{ entry: Entry }`

#### `GET /writer/:address/entry/pending/:id`

Get a pending entry before onchain confirmation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `address` | Writer contract address |
| `id` | `string` | Database entry ID |

**Response:** `{ entry: Entry }`

#### `POST /writer/:address/entry/createWithChunk`

Create a new entry with the first chunk of content.

**Auth:** EIP-712 signature (signer must have WRITER_ROLE)

| Body Field | Type | Description |
|------------|------|-------------|
| `signature` | `string` | EIP-712 typed data signature |
| `nonce` | `bigint` | Unique nonce |
| `chunkCount` | `bigint` | Total chunks for this entry |
| `chunkContent` | `string` | First chunk content |

**Response:** `{ entry: Entry }`

#### `POST /writer/:address/entry/:id/update`

Update an existing entry's content.

**Auth:** EIP-712 signature (signer must be entry author)

| Body Field | Type | Description |
|------------|------|-------------|
| `signature` | `string` | EIP-712 typed data signature |
| `nonce` | `bigint` | Unique nonce |
| `totalChunks` | `bigint` | New total chunks |
| `content` | `string` | New content |

**Response:** `{ entry: Entry }`

#### `POST /writer/:address/entry/:id/delete`

Delete an entry.

**Auth:** EIP-712 signature (signer must be entry author)

| Body Field | Type | Description |
|------------|------|-------------|
| `signature` | `string` | EIP-712 typed data signature |
| `nonce` | `bigint` | Unique nonce |

**Response:** `{ writer: Writer }`

---

### Color

#### `POST /color-registry/set`

Set your primary color via EIP-712 signature.

**Auth:** EIP-712 signature

| Body Field | Type | Description |
|------------|------|-------------|
| `signature` | `string` | EIP-712 typed data signature |
| `nonce` | `bigint` | Unique nonce |
| `hexColor` | `bytes32` | Color in bytes32 format (0x-prefixed, 64 hex chars) |

**Response:** `{ user: User }`

---

### User

#### `GET /me/:address`

Get user data for an address.

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `address` | User wallet address |

**Response:** `{ user: User }`

---

## Content Encoding

Entry content stored onchain goes through a multi-step encoding pipeline before being passed to the API. The `content` / `chunkContent` fields in create and update requests contain the final encoded string — not raw markdown.

### Pipeline

```
Markdown → Compress (Brotli) → Encrypt (optional) → Prefix → Store
```

1. **Write** — Author composes content in markdown
2. **Compress** — Content is Brotli-compressed (quality 11) and Base64-encoded
3. **Encrypt** (private entries only) — Compressed content is encrypted with AES-GCM and Base64-encoded
4. **Prefix** — A version prefix is prepended to indicate the encoding format
5. **Store** — The prefixed string is signed (EIP-712) and stored onchain as the entry content

### Format Prefixes

The version prefix at the start of the stored content string indicates how to decode it:

| Prefix | Encryption | Compression | Description |
|--------|------------|-------------|-------------|
| `br:` | None | Brotli | Public entry, compressed only |
| `enc:v3:br:` | AES-GCM (v3 key) | Brotli | Private entry, current format |
| `enc:v2:br:` | AES-GCM (v2 key) | Brotli | Private entry, legacy format |
| `enc:br:` | AES-GCM (v1 key) | Brotli | Private entry, legacy format |

**Examples:**
- Public: `br:GxoAAI2pVgqN...` (Brotli-compressed, Base64-encoded markdown)
- Private: `enc:v3:br:A7f3kQ9x...` (encrypted + compressed)

### Compression

All content is compressed with [Brotli](https://github.com/nicolo-ribaudo/brotli-wasm) at quality level 11 (maximum), then Base64-encoded. This reduces onchain storage costs.

```
markdown → TextEncoder → Brotli compress → Base64 encode
```

### Encryption

Private entries are encrypted **after** compression using [AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt#aes-gcm) (128-bit key, 12-byte random IV).

```
compressed content → AES-GCM encrypt → prepend IV → Base64 encode
```

The encryption key is deterministically derived from a wallet signature:

1. User signs a fixed message with `personal_sign`
2. Signature is hashed with Keccak-256
3. First 16 bytes of the hash become the AES key

The key never leaves the client. Only the entry author can decrypt their private entries — the server and contract store opaque ciphertext.

**V1, V2, and V3 keys** differ only in the message signed during key derivation. V3 is the current default and includes a security warning to only sign on writer.place. V1 and V2 are supported for backward compatibility with older entries. A migration tool is available in the app to re-encrypt legacy entries with the V3 key.

### Decoding

To read an entry, reverse the pipeline based on the prefix:

| Prefix | Steps |
|--------|-------|
| `br:` | Strip prefix → Base64 decode → Brotli decompress |
| `enc:v3:br:` | Strip prefix → Base64 decode → AES-GCM decrypt (v3 key) → Brotli decompress |
| `enc:v2:br:` | Strip prefix → Base64 decode → AES-GCM decrypt (v2 key) → Brotli decompress |
| `enc:br:` | Strip prefix → Base64 decode → AES-GCM decrypt (v1 key) → Brotli decompress |

Public entries are decoded server-side and returned as plaintext in the `decompressed` field. Private entries are returned as the raw encoded string and decrypted client-side using the author's wallet.
