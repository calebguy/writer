# Writer - Onchain Writing Platform

> "Write today, forever"

Writer is an onchain writing platform that allows users to create, edit, and share writing entries stored on the blockchain with optional encryption for privacy.

## Project Overview

Writer enables users to create "places" (smart contract-backed writers) where they can publish entries that are permanently stored onchain. Entries can be public for discovery or encrypted for private journaling. The platform emphasizes ownership, permanence, and privacy through cryptographic guarantees.

## Tech Stack

### Frontend (packages/web)
- **Framework:** Next.js 15 with React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4.0
- **Auth:** Privy (SMS, email, wallet login)
- **State:** TanStack React Query with polling
- **Editor:** TipTap (rich text/markdown)
- **Blockchain:** wagmi/viem for Ethereum

### Backend (packages/server)
- **Runtime:** Bun
- **Framework:** Hono
- **Validation:** Zod
- **Transaction Relay:** Syndicate SDK

### Database (packages/db)
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Drizzle

### Blockchain (packages/chain)
- **Language:** Solidity ^0.8.13
- **Chain:** Optimism (L2)
- **Tooling:** Foundry

### Indexer (packages/indexer)
- **Framework:** Ponder
- **Purpose:** Syncs onchain events to database

## Project Structure

```
writer/
├── packages/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # Pages (home, explore, writer)
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   └── utils/       # API, auth, encryption, signing
│   ├── server/              # Hono API server
│   │   └── src/
│   │       ├── server.ts    # API endpoints
│   │       └── helpers.ts   # Signature recovery
│   ├── db/                  # Database schema & migrations
│   │   └── src/
│   │       ├── schema.ts    # Drizzle schema
│   │       └── relations.ts # ORM relationships
│   ├── chain/               # Solidity smart contracts
│   │   └── src/
│   │       ├── WriterFactory.sol
│   │       ├── Writer.sol
│   │       └── WriterStorage.sol
│   ├── indexer/             # Ponder event indexer
│   └── utils/               # Shared ABIs and utilities
```

## Key Concepts

### Writers (Places)
- Each writer is a smart contract pair (Writer + WriterStorage)
- Created via WriterFactory using CREATE2 (deterministic addresses)
- Has admin and manager roles for access control
- Can be marked public or private

### Entries
- Writing content stored as "entries" within a writer
- Supports chunked storage for large content
- Tracked with both database ID and onChainId
- All writes require EIP-712 signatures from the author

### Privacy & Encryption
- **Public entries:** Stored as plaintext, discoverable on explore page
- **Private entries:** AES-GCM encrypted before storage
- Encryption key derived from wallet signature
- Format: `enc:v2:br:{base64-data}` (versioned, Brotli compressed)

### Caching Strategy
- **Public entries:** IndexedDB (persistent)
- **Private entries:** In-memory only (security-first, cleared on logout)

## Smart Contracts

### WriterFactory.sol
Creates Writer + WriterStorage pairs with deterministic addresses.

### Writer.sol
Main logic contract with role-based access control:
- `createWithChunk()` - Create entry with initial content
- `update()` - Update existing entry
- `remove()` - Soft delete entry
- All operations have signature variants (`*WithSig`)

### WriterStorage.sol
Holds entry state (content chunks, author, timestamps).

## API Patterns

### Authentication
All protected routes check `privy-id-token` cookie via Privy server auth.

### Write Operations
1. Frontend signs EIP-712 typed data
2. Backend validates signature and recovers signer
3. Transaction relayed via Syndicate
4. Database record created with pending status
5. Indexer updates status when confirmed onchain

### Endpoints
- `GET /writer/public` - List public writers
- `GET /writer/:address` - Get writer with entries
- `POST /factory/create` - Create new writer
- `POST /writer/:address/entry/createWithChunk` - Create entry
- `POST /writer/:address/entry/:id/update` - Update entry
- `POST /writer/:address/entry/:id/delete` - Delete entry

## Development

```bash
# Install dependencies
bun install

# Run all services
bun dev

# Run database migrations
bun db:migrate

# Format code
bun run format
```

## Environment Variables

### Web
- `NEXT_PUBLIC_BASE_URL` - API server URL
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy app ID

### Server
- `DATABASE_URL` - PostgreSQL connection string
- `SYNDICATE_PROJECT_ID` - Syndicate project ID
- `FACTORY_ADDRESS` - WriterFactory contract address

### Indexer
- `RPC_URL` - Optimism RPC endpoint
- `FACTORY_ADDRESS` - WriterFactory contract address

## Architecture Decisions

1. **Dual Contract Model:** Separates logic (Writer) from state (WriterStorage)
2. **CREATE2 Addresses:** Predictable addresses before deployment
3. **Signature-Based Auth:** Users sign with existing wallets, no centralized keys
4. **Compression + Encryption:** Reduces onchain storage costs
5. **Soft Deletes:** Maintains blockchain history integrity
6. **Syndicate Relay:** Abstracts transaction complexity from users

## Code Patterns

### Signing (Frontend)
```typescript
// packages/web/src/utils/signer.ts
signCreateWithChunk({ storageAddress, totalChunks, content, nonce })
signUpdate({ storageAddress, id, totalChunks, content, nonce })
signRemove({ storageAddress, id, nonce })
```

### Encryption (Frontend)
```typescript
// packages/web/src/utils/utils.ts
encryptContent(content, key)  // Returns "enc:v2:br:..."
decryptContent(encrypted, key) // Returns plaintext
```

### API Calls (Frontend)
```typescript
// packages/web/src/utils/api.ts
const client = hc<AppType>(BASE_URL)
client.writer[":address"].$get({ param: { address } })
```

## Database Schema

- **writer:** Contract address, title, admin, managers, privacy flag
- **entry:** Content entries linked to writers via storageAddress
- **chunk:** Content chunks for large entries
- **syndicate_tx:** Transaction tracking (pending → confirmed)
- **user:** User preferences (color)
