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
- **Agent Payments:** x402 for programmatic create/update/delete flows

### Database (packages/db)
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Drizzle

### Blockchain (packages/chain)
- **Language:** Solidity ^0.8.13
- **Chain:** Optimism (L2)
- **Tooling:** Foundry

### Ingestor (packages/ingestor)
- **Runtime:** Bun
- **Purpose:** Syncs onchain events to database via viem (catchup + WebSocket realtime)

### CLI (packages/cli)
- **Runtime:** Bun
- **Purpose:** x402-powered command line client for agents/scripts to list Places, create Places, create/edit/delete entries

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
│   ├── ingestor/            # Onchain event ingestor (viem)
│   ├── cli/                 # x402 CLI + agent skill docs
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
- Onchain entry IDs may be `0`; do not validate them as positive-only
- All writes require EIP-712 signatures from the author

### Privacy & Encryption
- **Public entries:** Stored as plaintext, discoverable on explore page
- **Private entries:** AES-GCM encrypted before storage
- Encryption key derived from wallet signature
- Format: `enc:v5:br:{base64(iv + ciphertext)}` (versioned, Brotli compressed, encrypted)

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
5. Ingestor updates status when confirmed onchain

### Agent / x402 Write Operations
Programmatic agent writes use x402 endpoints instead of Privy browser auth:
1. Agent/CLI prepares request and x402 payment using the payer private key
2. Entry create/update/delete also sign EIP-712 typed data with the same key
3. Server verifies the x402 payer matches the requested admin or recovered signer
4. Transaction is simulated, relayed through Syndicate, and recorded as `source: "x402"`
5. Ingestor confirms the onchain event and updates indexed state

Important invariants:
- Place creation: x402 payer must equal the requested admin address.
- Entry create/update/delete: x402 payer must equal the recovered EIP-712 signer.
- Entry update/delete: recovered signer must match the existing entry author.
- x402 flows return pending transaction IDs before indexing completes.

### Endpoints
- `GET /writer/public` - List public writers
- `GET /writer/:address` - Get writer with entries
- `GET /writer/:address/:id.md` - Web raw markdown URL for public/plaintext entries (returns 403 for encrypted entries)
- `POST /factory/create` - Create new writer (Privy/frontend auth)
- `POST /writer/:address/entry/createWithChunk` - Create entry (Privy/frontend auth)
- `POST /writer/:address/entry/:id/update` - Update entry (Privy/frontend auth)
- `POST /writer/:address/entry/:id/delete` - Delete entry (Privy/frontend auth)

### Agent / x402 Endpoints
- `POST /x402/factory/create` - Create Place; payer becomes admin and sole manager
- `POST /x402/writer/:address/entry/createWithChunk` - Create entry with EIP-712 `CreateWithChunk` signature
- `POST /x402/writer/:address/entry/:id/update` - Replace entry content with EIP-712 `Update` signature
- `POST /x402/writer/:address/entry/:id/delete` - Delete entry with EIP-712 `Remove` signature

### Agent Docs
- Public agent guide: `packages/web/public/agents.md` → `https://writer.place/agents.md`
- Plain-text agent summary: `packages/web/public/agents.txt` → `https://writer.place/agents.txt`
- LLM summary: `packages/web/public/llms.txt` → `https://writer.place/llms.txt`
- Local agent skill: `packages/cli/skills/writer/SKILL.md`

Keep these files synchronized whenever x402 endpoints, CLI commands, payment/signature requirements, content encoding, or safety policy changes.

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
- `X402_PAY_TO_ADDRESS` - Address receiving x402 payments
- `X402_NETWORK` - CAIP-2 x402 payment network (default `eip155:8453`)
- `X402_FACILITATOR_URL` - x402 facilitator URL
- `X402_PLACE_CREATE_PRICE` - Price for `POST /x402/factory/create`
- `X402_ENTRY_CREATE_PRICE` - Price for x402 entry creation
- `X402_ENTRY_UPDATE_PRICE` - Price for x402 entry updates
- `X402_ENTRY_DELETE_PRICE` - Price for x402 entry deletion

### Ingestor
- `DATABASE_URL` - PostgreSQL connection string
- `RPC_URL` - Optimism HTTP RPC endpoint
- `WS_RPC_URL` - Optimism WebSocket RPC endpoint
- `TARGET_CHAIN_ID` - Chain ID to sync
- `FACTORY_ADDRESS` - WriterFactory contract address
- `OLD_FACTORY_ADDRESS` - (optional) Legacy WriterFactory address
- `COLOR_REGISTRY_ADDRESS` - ColorRegistry contract address
- `START_BLOCK` - Initial block to sync from when no cursor exists
- `HEALTH_PORT` - (optional) Port for health check server (default 3001)

## Frontend Auth Pattern

Auth uses a **server-hint + client-reactive** model:
- `layout.tsx` calls `getAuthHint()` (cookie presence check — `privy-id-token || privy-session`) and passes the boolean through `Providers`, which exposes it via `AuthHintContext`.
- Client components call `useIsLoggedIn()` (in `packages/web/src/hooks/useIsLoggedIn.ts`). The hook merges the SSR hint with Privy's live state: `ready ? authenticated : hint`.
- Why `privy-session`, not just `privy-id-token`: the id-token cookie is short-lived (~1hr); `privy-session` is long-lived (~30d) and is what Privy uses to resurrect the id-token client-side. Checking both avoids the "sign in" → "write" flash when a logged-in user returns after the id-token expired.
- Use `getAuthenticatedUser()` only when you actually need a *verified* user object (e.g., for `user.wallet.address` server-side). For UI "is this person logged in?" questions, use `getAuthHint()` / `useIsLoggedIn()` — no network round-trip.

**Privy `useLogin` caveat:** Do NOT use `useLogin({ onComplete })` for side effects like `window.location.reload()` — the `onComplete` callback can fire on mount when Privy auto-detects an existing session, causing infinite reload loops. Use `usePrivy().login` instead when you don't need the callback, or guard with a ref tracking explicit user interaction.

## Wallet Signing UX

User-initiated writes (create/update/remove entries) sign EIP-712 payloads. The signing UX depends on wallet type:

- **Privy embedded wallet** (`wallet.walletClientType === "privy"`): signs silently, no user prompt. Proceed with the optimistic flow immediately — clear input, show pending card, run the mutation. A loader here would flash unnecessarily and break the "instant" feel.
- **External wallets** (MetaMask, WalletConnect, Coinbase, etc.): signing triggers a popup/app prompt the user must act on. Show a loader (e.g., `CreateInput`'s `isLoading` overlay) for the *signing window only*, so the user has visible feedback that we're waiting on their wallet.

Implementation pattern: track an `isSigning` state, set it true *only* when `walletClientType !== "privy"`, wrap just the sign call in `try/finally` (not compression/encryption — those are fast). Writer creation (`factoryCreate`) does not sign, so no loader logic is needed there.

## Optimistic Create Mutations

Writer and entry creations use TanStack Query's `onMutate` for optimistic insertion:
- `onMutate` inserts a pending placeholder into the relevant cache (`["get-writers", address]` or `["writer", writerAddress]`) with `createdAtHash: null`.
- `onError` restores the snapshot taken in `onMutate`.
- `onSettled` invalidates to let the server row replace the optimistic one.
- The UI renders a per-card spinner while `createdAtHash` is null; a background poller waits for the indexer/ingestor to confirm.
- **Do not** gate the insertion on the POST's 200 response (the old `onSuccess` pattern). The chain is the source of truth; the POST is just "accepted for relay."

### Gate polling on in-flight create mutations

The ingestor-confirmation poller (`refetchInterval` on the writer list and writer page) MUST be gated on `useIsMutating` for the matching create mutation key. If polling is allowed to fire while `/create` or `/createWithChunk` is in flight, the server returns a list without the new row (API writes are synchronous, so it only lands after the POST resolves) and React Query replaces the optimistic cache with the server response — causing a visible flash where the pending card disappears and then reappears after `onSettled` invalidates.

Pattern (already applied in `WriterList.tsx` and `app/writer/[address]/page.tsx`):

```ts
const isCreatingWriter = useIsMutating({ mutationKey: ["create-from-factory"] }) > 0;
// ...
refetchInterval: isPolling && !isCreatingWriter ? POLLING_INTERVAL : false,
```

```ts
const isCreatingEntry = useIsMutating({ mutationKey: ["create-with-chunk", address] }) > 0;
// ...
refetchInterval: shouldPoll && !isCreatingEntry ? 3000 : false,
```

Writes are synchronous server-side, so `onSettled`'s invalidation is the correct moment to pull server truth; polling only exists to await onchain ingestion populating `createdAtHash` / `onChainId`. Do not remove these gates when refactoring.

## Architecture Decisions

1. **Dual Contract Model:** Separates logic (Writer) from state (WriterStorage)
2. **CREATE2 Addresses:** Predictable addresses before deployment
3. **Signature-Based Auth:** Users sign with existing wallets, no centralized keys
4. **Compression + Encryption:** Reduces onchain storage costs
5. **Soft Deletes:** Maintains blockchain history integrity (delete from the chain but visible in block history)
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
encryptContent(content, key)  // Returns "enc:v5:br:..."
decryptContent(encrypted, key) // Returns plaintext
```

### Agent CLI
```bash
# packages/cli
bun writer list --pk 0x...
bun writer create-place --pk 0x... --title "My Place"
bun writer create-entry --pk 0x... --writer 0x... --content-file ./entry.md
bun writer edit-entry --pk 0x... --writer 0x... --entry-id 1 --content-file ./entry.md
bun writer delete-entry --pk 0x... --writer 0x... --entry-id 1
```

The CLI submits raw markdown/plaintext unless callers pre-encode or encrypt content. Do not use raw CLI publishing for secrets or private user data.

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
