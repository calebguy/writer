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

##### `addChunk(id, index, content)` → `Entry`

Add a chunk to an existing entry at a specific index.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uint256` | Entry ID |
| `index` | `uint256` | Chunk index |
| `content` | `string` | Chunk content |

**Access:** Author + WRITER_ROLE

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

##### `remove(id)`

Delete an entry.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `uint256` | Entry ID |

**Access:** Author + WRITER_ROLE

**Events:** `EntryRemoved(id, author)`

#### Administration

##### `setTitle(newTitle)`

Update the writer's title.

| Parameter | Type | Description |
|-----------|------|-------------|
| `newTitle` | `string` | New title |

**Access:** DEFAULT_ADMIN_ROLE

**Events:** `TitleSet(title)`

##### `replaceAdmin(newAdmin)`

Transfer admin role to a new address. Revokes admin from the caller.

| Parameter | Type | Description |
|-----------|------|-------------|
| `newAdmin` | `address` | New admin address |

**Access:** DEFAULT_ADMIN_ROLE

#### Signature Variants

All write functions have `*WithSig` variants that accept an EIP-712 signature and nonce:

- `createWithChunkWithSig(signature, nonce, chunkCount, content)`
- `addChunkWithSig(signature, nonce, id, index, content)`
- `updateWithSig(signature, nonce, id, totalChunks, content)`
- `removeWithSig(signature, nonce, id)`
- `setTitleWithSig(signature, nonce, newTitle)`

These enable gasless transactions — the server recovers the signer, validates their role, and relays the transaction via Syndicate.

---

### WriterStorage

Storage contract that holds all entry data. Only the Writer logic contract can modify state. Uses a proxy pattern to separate logic from storage.

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

Simple registry mapping user addresses to their chosen hex color. Supports both direct calls and EIP-712 signature-based updates.

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

All write operations are authenticated via EIP-712 signatures — the server recovers the signer address from the signature and validates permissions. Transactions are relayed to Optimism via Syndicate.

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
| `isPrivate` | `boolean?` | Whether the writer is private |

**Response:** `{ writer: Writer }`

#### `DELETE /writer/:address`

Delete a writer.

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

### Saved

#### `GET /saved/:userAddress`

Get all saved writers and entries for a user.

**Response:** `{ writers: SavedWriter[], entries: SavedEntry[] }`

#### `POST /saved/:userAddress/writer/:address`

Save a writer.

**Response:** `{ ok: true }`

#### `DELETE /saved/:userAddress/writer/:address`

Unsave a writer.

**Response:** `{ ok: true }`

#### `POST /saved/:userAddress/entry/:id`

Save an entry.

**Response:** `{ ok: true }`

#### `DELETE /saved/:userAddress/entry/:id`

Unsave an entry.

**Response:** `{ ok: true }`

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
